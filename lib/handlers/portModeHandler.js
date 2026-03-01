/**
 * PortModeHandler für AC Infinity Adapter
 * Verarbeitet Änderungen an den Port-Modi und deren Einstellungen
 */

'use strict';

const {
    MODE_OPTIONS,
    SETTINGS_MODE_OPTIONS,
    SCHEDULE_DISABLED_VALUE,
    SCHEDULE_MIDNIGHT_VALUE,
    SCHEDULE_EOD_VALUE,
} = require('../constants');

class PortModeHandler {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.adapter = stateManager.adapter;
        this.client = null;

        // Debounce: pending timers and in-progress flags
        this.pendingUpdates = new Map();
        this.processingUpdates = new Map();
    }

    setClient(client) {
        this.client = client;
        this.adapter.log.debug('API-Client erfolgreich an PortModeHandler übergeben');
    }

    /**
     * Entry point: debounce and delegate to processPortModeUpdate
     */
    async handlePortModeChange(deviceId, portId, path, value) {
        if (path.length < 1) {
            this.adapter.log.warn(`Ungültiger Pfad für Port-Modus: ${path.join('.')}`);
            return;
        }

        const settingType = path[0];

        try {
            if (!this.client) {
                throw new Error('API-Client nicht gesetzt.');
            }

            const normalizedDeviceId = String(deviceId);
            const normalizedPortId = Number(portId);
            const updateKey = `${normalizedDeviceId}_${normalizedPortId}_${settingType}`;

            if (this.processingUpdates.has(updateKey)) {
                this.adapter.log.debug(`Überspringe doppeltes Update: ${updateKey}`);
                return;
            }

            if (this.pendingUpdates.has(updateKey)) {
                clearTimeout(this.pendingUpdates.get(updateKey));
            }

            const timerId = setTimeout(async () => {
                try {
                    this.pendingUpdates.delete(updateKey);
                    this.processingUpdates.set(updateKey, true);
                    await this.processPortModeUpdate(normalizedDeviceId, normalizedPortId, settingType, path, value);
                } catch (error) {
                    this.adapter.log.error(`Fehler bei Update ${updateKey}: ${error.message}`);
                } finally {
                    this.processingUpdates.delete(updateKey);
                }
            }, 200);

            this.pendingUpdates.set(updateKey, timerId);
        } catch (error) {
            this.adapter.log.error(`Fehler beim Port-Modus-Update: ${error.message}`);
        }
    }

    /**
     * Reads current onSpeed and offSpeed from ioBroker states
     */
    async getCurrentSpeeds(deviceId, portId) {
        const onSpeedState = await this.adapter.getStateAsync(`devices.${deviceId}.ports.${portId}.mode.onSpeed`);
        const onSpeed =
            onSpeedState && typeof onSpeedState.val === 'number' && onSpeedState.val > 0 ? onSpeedState.val : 3;

        const offSpeedState = await this.adapter.getStateAsync(`devices.${deviceId}.ports.${portId}.mode.offSpeed`);
        const offSpeed = offSpeedState && typeof offSpeedState.val === 'number' ? offSpeedState.val : 0;

        return { onSpeed, offSpeed };
    }

    /**
     * Reads current active mode atType from ioBroker state
     */
    async getCurrentAtType(deviceId, portId) {
        const modeState = await this.adapter.getStateAsync(`devices.${deviceId}.ports.${portId}.mode.active`);
        const modeName = modeState ? modeState.val : 'On';
        const modeIndex = MODE_OPTIONS.indexOf(modeName);
        return modeIndex >= 0 ? modeIndex + 1 : 2; // fallback: On (2)
    }

    /**
     * Core update dispatcher
     */
    async processPortModeUpdate(deviceId, portId, settingType, path, value) {
        // Skip if state is already confirmed with this value
        const currentStateId = `devices.${deviceId}.ports.${portId}.mode.${settingType}`;
        const currentState = await this.adapter.getStateAsync(currentStateId);
        if (currentState && currentState.val === value && currentState.ack) {
            this.adapter.log.debug(`Überspringe bereits bestätigtes Update: ${currentStateId}`);
            return;
        }

        switch (settingType) {
            case 'active':
                await this.handleActiveModeChange(deviceId, portId, value);
                break;

            case 'onSpeed':
                await this.handleOnSpeedChange(deviceId, portId, value);
                break;

            case 'offSpeed':
                await this.handleOffSpeedChange(deviceId, portId, value);
                break;

            default:
                if (['timer', 'cycle', 'schedule', 'auto', 'vpd'].includes(settingType) && path.length > 1) {
                    await this.handleNestedPortSettingsChange(deviceId, portId, settingType, path.slice(1), value);
                } else {
                    this.adapter.log.warn(`Unbekannter Port-Modus-Einstellungstyp: ${settingType}`);
                }
        }

        // Trigger a throttled data refresh after write
        setTimeout(() => {
            this.stateManager.refreshWithThrottle();
        }, 1000);
    }

    /**
     * Handles mode selection changes — all 8 modes supported
     */
    async handleActiveModeChange(deviceId, portId, value) {
        const modeName = String(value);
        const modeIndex = MODE_OPTIONS.indexOf(modeName);

        if (modeIndex < 0) {
            this.adapter.log.warn(`Ungültiger Modus-Wert: "${modeName}". Gültige Werte: ${MODE_OPTIONS.join(', ')}`);
            return;
        }

        const atType = modeIndex + 1;
        const { onSpeed, offSpeed } = await this.getCurrentSpeeds(deviceId, portId);

        // Optimistic UI update
        await this.stateManager.updateUIState(`devices.${deviceId}.ports.${portId}.mode.active`, modeName);

        this.adapter.log.info(
            `Modus-Wechsel: Gerät=${deviceId}, Port=${portId}, Modus="${modeName}" (atType=${atType})`,
        );

        try {
            const success = await this.client.setDeviceMode(deviceId, portId, atType, onSpeed, offSpeed);
            if (success) {
                await this.adapter.setStateAsync(`devices.${deviceId}.ports.${portId}.mode.active`, {
                    val: modeName,
                    ack: true,
                });
            }
        } catch (error) {
            this.adapter.log.error(`Fehler beim Modus-Wechsel: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handles onSpeed changes
     */
    async handleOnSpeedChange(deviceId, portId, value) {
        const speedValue = parseInt(value);
        if (isNaN(speedValue) || speedValue < 0 || speedValue > 10) {
            this.adapter.log.warn(`Ungültiger onSpeed-Wert: ${value}`);
            return;
        }

        await this.stateManager.updateUIState(`devices.${deviceId}.ports.${portId}.mode.onSpeed`, speedValue);

        const atType = await this.getCurrentAtType(deviceId, portId);
        const { offSpeed } = await this.getCurrentSpeeds(deviceId, portId);

        this.adapter.log.info(`onSpeed-Wechsel: Gerät=${deviceId}, Port=${portId}, Speed=${speedValue}`);

        try {
            const success = await this.client.setDeviceMode(deviceId, portId, atType, speedValue, offSpeed);
            if (success) {
                await this.adapter.setStateAsync(`devices.${deviceId}.ports.${portId}.mode.onSpeed`, {
                    val: speedValue,
                    ack: true,
                });
            }
        } catch (error) {
            this.adapter.log.error(`Fehler beim onSpeed-Wechsel: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handles offSpeed changes
     */
    async handleOffSpeedChange(deviceId, portId, value) {
        const speedValue = parseInt(value);
        if (isNaN(speedValue) || speedValue < 0 || speedValue > 10) {
            this.adapter.log.warn(`Ungültiger offSpeed-Wert: ${value}`);
            return;
        }

        await this.stateManager.updateUIState(`devices.${deviceId}.ports.${portId}.mode.offSpeed`, speedValue);

        const atType = await this.getCurrentAtType(deviceId, portId);
        const { onSpeed } = await this.getCurrentSpeeds(deviceId, portId);

        this.adapter.log.info(`offSpeed-Wechsel: Gerät=${deviceId}, Port=${portId}, Speed=${speedValue}`);

        try {
            const success = await this.client.setDeviceMode(deviceId, portId, atType, onSpeed, speedValue);
            if (success) {
                await this.adapter.setStateAsync(`devices.${deviceId}.ports.${portId}.mode.offSpeed`, {
                    val: speedValue,
                    ack: true,
                });
            }
        } catch (error) {
            this.adapter.log.error(`Fehler beim offSpeed-Wechsel: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handles nested settings (timer/cycle/schedule/auto/vpd sub-parameters)
     */
    async handleNestedPortSettingsChange(deviceId, portId, category, path, value) {
        if (path.length < 1) {
            this.adapter.log.warn(`Ungültiger Pfad für verschachtelte Einstellung: ${category}`);
            return;
        }

        const setting = path[0];
        const statePath = `devices.${deviceId}.ports.${portId}.mode.${category}.${setting}`;

        await this.stateManager.updateUIState(statePath, value);

        // Fetch current settings once, apply modification in-place, send
        const currentSettings = await this.client.getDeviceModeSettings(deviceId, portId);

        delete currentSettings.devMacAddr;
        delete currentSettings.ipcSetting;
        delete currentSettings.devSetting;

        this.adapter.log.debug(`Verarbeite ${category}.${setting} = ${value}`);

        switch (category) {
            case 'timer':
                this.applyTimerSetting(currentSettings, setting, value);
                break;
            case 'cycle':
                this.applyCycleSetting(currentSettings, setting, value);
                break;
            case 'schedule':
                this.applyScheduleSetting(currentSettings, setting, value);
                break;
            case 'auto':
                this.applyAutoSetting(currentSettings, setting, value);
                break;
            case 'vpd':
                this.applyVpdSetting(currentSettings, setting, value);
                break;
            default:
                this.adapter.log.warn(`Unbekannte Kategorie: ${category}`);
                return;
        }

        try {
            await this.client.updateDeviceModeSettings(deviceId, portId, Object.entries(currentSettings));
            this.adapter.log.debug(`${category}.${setting} erfolgreich gesetzt`);
        } catch (apiError) {
            this.adapter.log.error(`API-Fehler bei ${category}.${setting}: ${apiError.message}`);
        }
    }

    // ── Timer ────────────────────────────────────────────────────────────────

    applyTimerSetting(settings, setting, value) {
        switch (setting) {
            case 'toOnMinutes':
                settings.acitveTimerOn = parseInt(value) * 60;
                break;
            case 'toOffMinutes':
                settings.acitveTimerOff = parseInt(value) * 60;
                break;
            default:
                this.adapter.log.warn(`Unbekannte Timer-Einstellung: ${setting}`);
        }
    }

    // ── Cycle ─────────────────────────────────────────────────────────────────

    applyCycleSetting(settings, setting, value) {
        switch (setting) {
            case 'onMinutes':
                settings.activeCycleOn = parseInt(value) * 60;
                break;
            case 'offMinutes':
                settings.activeCycleOff = parseInt(value) * 60;
                break;
            default:
                this.adapter.log.warn(`Unbekannte Zyklus-Einstellung: ${setting}`);
        }
    }

    // ── Schedule ──────────────────────────────────────────────────────────────

    applyScheduleSetting(settings, setting, value) {
        switch (setting) {
            case 'startEnabled':
                settings.schedStartTime = value ? SCHEDULE_MIDNIGHT_VALUE : SCHEDULE_DISABLED_VALUE;
                break;
            case 'endEnabled':
                settings.schedEndtTime = value ? SCHEDULE_EOD_VALUE : SCHEDULE_DISABLED_VALUE;
                break;
            case 'startTime': {
                const parts = String(value).split(':');
                if (parts.length === 2) {
                    settings.schedStartTime = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                } else {
                    this.adapter.log.warn(`Ungültiges Zeitformat: ${value}`);
                }
                break;
            }
            case 'endTime': {
                const parts = String(value).split(':');
                if (parts.length === 2) {
                    settings.schedEndtTime = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                } else {
                    this.adapter.log.warn(`Ungültiges Zeitformat: ${value}`);
                }
                break;
            }
            default:
                this.adapter.log.warn(`Unbekannte Zeitplan-Einstellung: ${setting}`);
        }
    }

    // ── Auto ──────────────────────────────────────────────────────────────────

    applyAutoSetting(settings, setting, value) {
        switch (setting) {
            case 'settingsMode': {
                const idx = SETTINGS_MODE_OPTIONS.indexOf(value);
                if (idx >= 0) {
                    settings.settingMode = idx;
                }
                break;
            }
            case 'tempHighEnabled':
                settings.activeHt = value ? 1 : 0;
                break;
            case 'tempHighTrigger': {
                const c = parseInt(value);
                settings.devHt = c;
                settings.devHtf = Math.round(c * 1.8 + 32);
                break;
            }
            case 'tempLowEnabled':
                settings.activeLt = value ? 1 : 0;
                break;
            case 'tempLowTrigger': {
                const c = parseInt(value);
                settings.devLt = c;
                settings.devLtf = Math.round(c * 1.8 + 32);
                break;
            }
            case 'humidityHighEnabled':
                settings.activeHh = value ? 1 : 0;
                break;
            case 'humidityHighTrigger':
                settings.devHh = parseInt(value);
                break;
            case 'humidityLowEnabled':
                settings.activeLh = value ? 1 : 0;
                break;
            case 'humidityLowTrigger':
                settings.devLh = parseInt(value);
                break;
            case 'targetTempEnabled':
                settings.targetTSwitch = value ? 1 : 0;
                break;
            case 'targetTemp': {
                const c = parseInt(value);
                settings.targetTemp = c;
                settings.targetTempF = Math.round(c * 1.8 + 32);
                break;
            }
            case 'targetHumidityEnabled':
                settings.targetHumiSwitch = value ? 1 : 0;
                break;
            case 'targetHumidity':
                settings.targetHumi = parseInt(value);
                break;
            default:
                this.adapter.log.warn(`Unbekannte Auto-Einstellung: ${setting}`);
        }
    }

    // ── VPD ───────────────────────────────────────────────────────────────────

    applyVpdSetting(settings, setting, value) {
        switch (setting) {
            case 'settingsMode': {
                const idx = SETTINGS_MODE_OPTIONS.indexOf(value);
                if (idx >= 0) {
                    settings.vpdSettingMode = idx;
                }
                break;
            }
            case 'highEnabled':
                settings.activeHtVpd = value ? 1 : 0;
                break;
            case 'highTrigger':
                settings.activeHtVpdNums = Math.round(parseFloat(value) * 10);
                break;
            case 'lowEnabled':
                settings.activeLtVpd = value ? 1 : 0;
                break;
            case 'lowTrigger':
                settings.activeLtVpdNums = Math.round(parseFloat(value) * 10);
                break;
            case 'targetEnabled':
                settings.targetVpdSwitch = value ? 1 : 0;
                break;
            case 'target':
                settings.targetVpd = Math.round(parseFloat(value) * 10);
                break;
            default:
                this.adapter.log.warn(`Unbekannte VPD-Einstellung: ${setting}`);
        }
    }
}

module.exports = PortModeHandler;
