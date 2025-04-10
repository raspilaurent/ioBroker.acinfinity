/**
 * PortUpdater für AC Infinity Adapter
 * Verantwortlich für das Aktualisieren von Port-Daten in ioBroker
 */

"use strict";

const { 
    MODE_OPTIONS, 
    SETTINGS_MODE_OPTIONS,
    DEVICE_LOAD_TYPE_OPTIONS,
    DYNAMIC_RESPONSE_OPTIONS,
    PORT_CONTROL_KEY,
    ADVANCED_SETTINGS_KEY,
    SCHEDULE_DISABLED_VALUE
} = require('../constants');

class PortUpdater {
    /**
     * Erstellt einen neuen PortUpdater
     * @param {object} stateManager - Referenz zum StateManager
     */
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.adapter = stateManager.adapter;
    }

    /**
     * Aktualisiert Port-Daten mit den neuesten Werten
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} portData - Port-Datenobjekt
     * @returns {Promise<void>}
     */
    async updatePortData(deviceId, portId, portData) {
        try {
            // Aktualisiere grundlegende Port-Informationen
            await this.updatePortInfoStates(deviceId, portId, portData);
            
            // Aktualisiere Modus-Informationen, falls verfügbar
            if (typeof portData.curMode === 'number' || typeof portData.atType === 'number') {
                await this.updatePortModeStates(deviceId, portId, portData);
            }
        } catch (error) {
            this.adapter.log.error(`Fehler beim Aktualisieren der Port-Daten für ${deviceId}.${portId}: ${error.message}`);
        }
    }

    /**
     * Aktualisiert die grundlegenden Port-Informationen
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} portData - Port-Datenobjekt
     * @returns {Promise<void>}
     */
    async updatePortInfoStates(deviceId, portId, portData) {
        await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.info.name`, portData.portName);
        await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.info.online`, portData.online === 1);
        await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.info.power`, portData.speak);
        await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.info.state`, portData.loadState === 1);
        
        if (typeof portData.remainTime === 'number') {
            await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.info.remainingTime`, portData.remainTime);
            
            if (portData.remainTime > 0) {
                const now = new Date();
                const nextChange = new Date(now.getTime() + portData.remainTime * 1000);
                await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.info.nextStateChange`, nextChange.toISOString());
            } else {
                await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.info.nextStateChange`, null);
            }
        }
    }

    /**
     * Aktualisiert die Modus-Informationen des Ports
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} portData - Port-Datenobjekt
     * @returns {Promise<void>}
     */
    async updatePortModeStates(deviceId, portId, portData) {
        // Modus-Index (API verwendet 1-basierte Modi, unser Array ist 0-basiert)
        const modeIndex = portData.atType ? (portData.atType - 1) : (portData.curMode - 1);
        if (modeIndex >= 0 && modeIndex < MODE_OPTIONS.length) {
            await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.mode.active`, MODE_OPTIONS[modeIndex]);
        }
        
        // Geschwindigkeitseinstellungen
        if (typeof portData.speak === 'number') {
            const isOn = (portData.atType === 2 || portData.curMode === 2);
            
            // Wenn der Ventilator eingeschaltet ist oder der Geschwindigkeitswert > 0
            if (isOn && portData.speak > 0) {
                await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.mode.onSpeed`, portData.speak);
            } else if (isOn && portData.speak === 0) {
                // Wenn der Ventilator eingeschaltet ist, aber die Geschwindigkeit 0 ist,
                // dann rufen wir den aktuellen Wert ab und behalten ihn bei
                const currentSpeed = await this.adapter.getStateAsync(`devices.${deviceId}.ports.${portId}.mode.onSpeed`);
                if (!currentSpeed || currentSpeed.val === 0) {
                    // Nur wenn noch kein Wert gesetzt ist oder der aktuelle Wert 0 ist, 
                    // setzen wir einen Standardwert
                    await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.mode.onSpeed`, 3);
                }
            }
        }
        
        // Aktualisiere auch offSpeed - Wichtig für Automationen!
        if (portData.offSpead !== undefined) {
            // Direkte Aktualisierung, wenn der Wert im Hauptobjekt vorhanden ist
            await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.mode.offSpeed`, portData.offSpead);
            this.adapter.log.debug(`offSpeed aktualisiert von portData.offSpead: ${portData.offSpead}`);
        } else if (portData.onSpead !== undefined && typeof portData.onSpead === 'number') {
            // Wenn der onSpead-Wert existiert, könnte der offSpeed-Wert ebenfalls dort sein
            const offSpeed = portData.offSpead !== undefined ? portData.offSpead : 0;
            await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.mode.offSpeed`, offSpeed);
            this.adapter.log.debug(`offSpeed aktualisiert auf Basis von onSpead: ${offSpeed}`);
        }
    }

    /**
     * Aktualisiert die Port-Einstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} settings - Einstellungsobjekt
     * @returns {Promise<void>}
     */
    async updatePortSettings(deviceId, portId, settings) {
        if (!settings) {
            this.adapter.log.warn(`Erhielt leere Einstellungen für Port ${deviceId}.${portId}`);
            return;
        }
        
        this.adapter.log.debug(`Aktualisiere Port-Einstellungen für ${deviceId}.${portId}: ${JSON.stringify(settings).substring(0, 500)}...`);
        
        try {
            // Explizit nach offSpead im settings-Objekt suchen und aktualisieren
            if (settings.offSpead !== undefined) {
                await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.mode.offSpeed`, settings.offSpead);
                this.adapter.log.debug(`offSpeed aktualisiert aus Settings: ${settings.offSpead}`);
            }
            
            // Aktualisiere Gerätetyp
            if (typeof settings[PORT_CONTROL_KEY.DEVICE_LOAD_TYPE] === 'number') {
                const deviceTypeId = settings[PORT_CONTROL_KEY.DEVICE_LOAD_TYPE];
                if (deviceTypeId in DEVICE_LOAD_TYPE_OPTIONS) {
                    await this.stateManager.updateState(
                        `devices.${deviceId}.ports.${portId}.settings.deviceType`, 
                        deviceTypeId
                    );
                }
            }
            
            // Aktualisiere dynamische Reaktion
            if (typeof settings[ADVANCED_SETTINGS_KEY.DYNAMIC_RESPONSE_TYPE] === 'number') {
                const responseTypeIndex = settings[ADVANCED_SETTINGS_KEY.DYNAMIC_RESPONSE_TYPE];
                if (responseTypeIndex < DYNAMIC_RESPONSE_OPTIONS.length) {
                    await this.stateManager.updateState(
                        `devices.${deviceId}.ports.${portId}.settings.dynamicResponse`, 
                        DYNAMIC_RESPONSE_OPTIONS[responseTypeIndex]
                    );
                }
            }
            
            // Weitere Methoden zur Aktualisierung verschiedener Einstellungen aufrufen
            await this.updatePortModeSettings(deviceId, portId, settings);
            
        } catch (error) {
            this.adapter.log.error(`Fehler beim Aktualisieren der Port-Einstellungen für ${deviceId}.${portId}: ${error.message}`);
        }
    }

    /**
     * Aktualisiert die Port-Modus-Einstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} settings - Einstellungsobjekt
     * @returns {Promise<void>}
     */
    async updatePortModeSettings(deviceId, portId, settings) {
        // Überprüfe und aktualisiere offSpead/onSpead direkt aus den Einstellungen
        if (settings[PORT_CONTROL_KEY.OFF_SPEED] !== undefined) {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.offSpeed`, 
                settings[PORT_CONTROL_KEY.OFF_SPEED]
            );
            this.adapter.log.debug(`offSpeed aktualisiert aus PORT_CONTROL_KEY.OFF_SPEED: ${settings[PORT_CONTROL_KEY.OFF_SPEED]}`);
        }
        
        if (settings[PORT_CONTROL_KEY.ON_SPEED] !== undefined) {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.onSpeed`, 
                settings[PORT_CONTROL_KEY.ON_SPEED]
            );
        }
        
        // Aktualisiere Timer-Einstellungen
        if (typeof settings[PORT_CONTROL_KEY.TIMER_DURATION_TO_ON] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.timer.toOnMinutes`, 
                Math.floor(settings[PORT_CONTROL_KEY.TIMER_DURATION_TO_ON] / 60)
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.TIMER_DURATION_TO_OFF] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.timer.toOffMinutes`, 
                Math.floor(settings[PORT_CONTROL_KEY.TIMER_DURATION_TO_OFF] / 60)
            );
        }
        
        // Aktualisiere Zyklus-Einstellungen
        if (typeof settings[PORT_CONTROL_KEY.CYCLE_DURATION_ON] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.cycle.onMinutes`, 
                Math.floor(settings[PORT_CONTROL_KEY.CYCLE_DURATION_ON] / 60)
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.CYCLE_DURATION_OFF] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.cycle.offMinutes`, 
                Math.floor(settings[PORT_CONTROL_KEY.CYCLE_DURATION_OFF] / 60)
            );
        }
        
        // Zusätzliche Aktualisierungsmethoden
        await this.updateScheduleSettings(deviceId, portId, settings);
        await this.updateAutoModeSettings(deviceId, portId, settings);
        await this.updateVpdModeSettings(deviceId, portId, settings);
    }

    /**
     * Aktualisiert die Zeitplan-Einstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} settings - Einstellungsobjekt
     * @returns {Promise<void>}
     */
    async updateScheduleSettings(deviceId, portId, settings) {
        const startTime = settings[PORT_CONTROL_KEY.SCHEDULED_START_TIME];
        const endTime = settings[PORT_CONTROL_KEY.SCHEDULED_END_TIME];
        
        if (typeof startTime === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.schedule.startEnabled`, 
                startTime !== SCHEDULE_DISABLED_VALUE
            );
            
            if (startTime !== SCHEDULE_DISABLED_VALUE) {
                const hours = Math.floor(startTime / 60);
                const minutes = startTime % 60;
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.mode.schedule.startTime`, 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                );
            }
        }
        
        if (typeof endTime === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.schedule.endEnabled`, 
                endTime !== SCHEDULE_DISABLED_VALUE
            );
            
            if (endTime !== SCHEDULE_DISABLED_VALUE) {
                const hours = Math.floor(endTime / 60);
                const minutes = endTime % 60;
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.mode.schedule.endTime`, 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                );
            }
        }
    }

    /**
     * Aktualisiert die Auto-Modus-Einstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} settings - Einstellungsobjekt
     * @returns {Promise<void>}
     */
    async updateAutoModeSettings(deviceId, portId, settings) {
        // Einstellungsmodus
        if (typeof settings[PORT_CONTROL_KEY.AUTO_SETTINGS_MODE] === 'number') {
            const settingsMode = settings[PORT_CONTROL_KEY.AUTO_SETTINGS_MODE];
            if (settingsMode >= 0 && settingsMode < SETTINGS_MODE_OPTIONS.length) {
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.mode.auto.settingsMode`, 
                    SETTINGS_MODE_OPTIONS[settingsMode]
                );
            }
        }
        
        // Temperatur-Hochgrenze
        if (typeof settings[PORT_CONTROL_KEY.AUTO_TEMP_HIGH_ENABLED] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.tempHighEnabled`, 
                settings[PORT_CONTROL_KEY.AUTO_TEMP_HIGH_ENABLED] === 1
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.AUTO_TEMP_HIGH_TRIGGER] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.tempHighTrigger`, 
                settings[PORT_CONTROL_KEY.AUTO_TEMP_HIGH_TRIGGER]
            );
        }
        
        // Temperatur-Tiefgrenze
        if (typeof settings[PORT_CONTROL_KEY.AUTO_TEMP_LOW_ENABLED] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.tempLowEnabled`, 
                settings[PORT_CONTROL_KEY.AUTO_TEMP_LOW_ENABLED] === 1
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.AUTO_TEMP_LOW_TRIGGER] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.tempLowTrigger`, 
                settings[PORT_CONTROL_KEY.AUTO_TEMP_LOW_TRIGGER]
            );
        }
        
        // Feuchtigkeit-Hochgrenze
        if (typeof settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_HIGH_ENABLED] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.humidityHighEnabled`, 
                settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_HIGH_ENABLED] === 1
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_HIGH_TRIGGER] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.humidityHighTrigger`, 
                settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_HIGH_TRIGGER]
            );
        }
        
        // Feuchtigkeit-Tiefgrenze
        if (typeof settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_LOW_ENABLED] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.humidityLowEnabled`, 
                settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_LOW_ENABLED] === 1
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_LOW_TRIGGER] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.humidityLowTrigger`, 
                settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_LOW_TRIGGER]
            );
        }
        
        // Zieltemperatur
        if (typeof settings[PORT_CONTROL_KEY.AUTO_TARGET_TEMP_ENABLED] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.targetTempEnabled`, 
                settings[PORT_CONTROL_KEY.AUTO_TARGET_TEMP_ENABLED] === 1
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.AUTO_TARGET_TEMP] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.targetTemp`, 
                settings[PORT_CONTROL_KEY.AUTO_TARGET_TEMP]
            );
        }
        
        // Zielfeuchtigkeit
        if (typeof settings[PORT_CONTROL_KEY.AUTO_TARGET_HUMIDITY_ENABLED] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.targetHumidityEnabled`, 
                settings[PORT_CONTROL_KEY.AUTO_TARGET_HUMIDITY_ENABLED] === 1
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.AUTO_TARGET_HUMIDITY] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.auto.targetHumidity`, 
                settings[PORT_CONTROL_KEY.AUTO_TARGET_HUMIDITY]
            );
        }
    }

    /**
     * Aktualisiert die VPD-Modus-Einstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} settings - Einstellungsobjekt
     * @returns {Promise<void>}
     */
    async updateVpdModeSettings(deviceId, portId, settings) {
        // Einstellungsmodus
        if (typeof settings[PORT_CONTROL_KEY.VPD_SETTINGS_MODE] === 'number') {
            const vpdSettingsMode = settings[PORT_CONTROL_KEY.VPD_SETTINGS_MODE];
            if (vpdSettingsMode >= 0 && vpdSettingsMode < SETTINGS_MODE_OPTIONS.length) {
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.mode.vpd.settingsMode`, 
                    SETTINGS_MODE_OPTIONS[vpdSettingsMode]
                );
            }
        }
        
        // VPD-Hochgrenze
        if (typeof settings[PORT_CONTROL_KEY.VPD_HIGH_ENABLED] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.vpd.highEnabled`, 
                settings[PORT_CONTROL_KEY.VPD_HIGH_ENABLED] === 1
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.VPD_HIGH_TRIGGER] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.vpd.highTrigger`, 
                parseFloat((settings[PORT_CONTROL_KEY.VPD_HIGH_TRIGGER] / 10).toFixed(1))
            );
        }
        
        // VPD-Tiefgrenze
        if (typeof settings[PORT_CONTROL_KEY.VPD_LOW_ENABLED] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.vpd.lowEnabled`, 
                settings[PORT_CONTROL_KEY.VPD_LOW_ENABLED] === 1
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.VPD_LOW_TRIGGER] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.vpd.lowTrigger`, 
                parseFloat((settings[PORT_CONTROL_KEY.VPD_LOW_TRIGGER] / 10).toFixed(1))
            );
        }
        
        // Ziel-VPD
        if (typeof settings[PORT_CONTROL_KEY.VPD_TARGET_ENABLED] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.vpd.targetEnabled`, 
                settings[PORT_CONTROL_KEY.VPD_TARGET_ENABLED] === 1
            );
        }
        
        if (typeof settings[PORT_CONTROL_KEY.VPD_TARGET] === 'number') {
            await this.stateManager.updateState(
                `devices.${deviceId}.ports.${portId}.mode.vpd.target`, 
                parseFloat((settings[PORT_CONTROL_KEY.VPD_TARGET] / 10).toFixed(1))
            );
        }
    }

    /**
     * Aktualisiert die erweiterten Port-Einstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} settings - Einstellungsobjekt
     * @returns {Promise<void>}
     */
    async updateAdvancedPortSettings(deviceId, portId, settings) {
        if (!settings) {
            this.adapter.log.warn(`Erhielt leere erweiterte Einstellungen für Port ${deviceId}.${portId}`);
            return;
        }
        
        this.adapter.log.debug(`Aktualisiere erweiterte Port-Einstellungen für ${deviceId}.${portId}: ${JSON.stringify(settings).substring(0, 500)}...`);
        
        try {
            // Gerätetyp
            const loadType = settings[ADVANCED_SETTINGS_KEY.DEVICE_LOAD_TYPE];
            if (typeof loadType === 'number' && loadType in DEVICE_LOAD_TYPE_OPTIONS) {
                const deviceType = DEVICE_LOAD_TYPE_OPTIONS[loadType];
                await this.stateManager.updateState(`devices.${deviceId}.ports.${portId}.settings.deviceType`, loadType);
            }
            
            // Dynamischer Antworttyp
            const dynamicResponseType = settings[ADVANCED_SETTINGS_KEY.DYNAMIC_RESPONSE_TYPE];
            if (typeof dynamicResponseType === 'number' && dynamicResponseType < DYNAMIC_RESPONSE_OPTIONS.length) {
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.settings.dynamicResponse`, 
                    DYNAMIC_RESPONSE_OPTIONS[dynamicResponseType]
                );
            }
            
            // Temperatur-dynamische Einstellungen basierend auf Temperatureinheit
            const tempUnit = settings[ADVANCED_SETTINGS_KEY.TEMP_UNIT];
            
            if (tempUnit !== undefined) {
                const transitionTemp = tempUnit > 0 
                    ? settings[ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_TEMP] 
                    : settings[ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_TEMP_F];
                
                const bufferTemp = tempUnit > 0 
                    ? settings[ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_TEMP] 
                    : settings[ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_TEMP_F];
                
                if (transitionTemp !== undefined) {
                    await this.stateManager.updateState(
                        `devices.${deviceId}.ports.${portId}.settings.dynamicTransitionTemp`, 
                        transitionTemp
                    );
                }
                
                if (bufferTemp !== undefined) {
                    await this.stateManager.updateState(
                        `devices.${deviceId}.ports.${portId}.settings.dynamicBufferTemp`, 
                        bufferTemp
                    );
                }
            }
            
            // Feuchtigkeit-dynamische Einstellungen
            if (typeof settings[ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_HUMIDITY] === 'number') {
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.settings.dynamicTransitionHumidity`, 
                    settings[ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_HUMIDITY]
                );
            }
            
            if (typeof settings[ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_HUMIDITY] === 'number') {
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.settings.dynamicBufferHumidity`, 
                    settings[ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_HUMIDITY]
                );
            }
            
            // VPD-dynamische Einstellungen (gespeichert als Zehntel-Prozent)
            if (typeof settings[ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_VPD] === 'number') {
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.settings.dynamicTransitionVPD`, 
                    parseFloat((settings[ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_VPD] / 10).toFixed(1))
                );
            }
            
            if (typeof settings[ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_VPD] === 'number') {
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.settings.dynamicBufferVPD`, 
                    parseFloat((settings[ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_VPD] / 10).toFixed(1))
                );
            }
            
            // Sunrise-Timer-Einstellungen
            if (typeof settings[ADVANCED_SETTINGS_KEY.SUNRISE_TIMER_ENABLED] === 'number') {
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.settings.sunriseTimerEnabled`, 
                    settings[ADVANCED_SETTINGS_KEY.SUNRISE_TIMER_ENABLED] === 1
                );
            }
            
            if (typeof settings[ADVANCED_SETTINGS_KEY.SUNRISE_TIMER_DURATION] === 'number') {
                await this.stateManager.updateState(
                    `devices.${deviceId}.ports.${portId}.settings.sunriseTimerMinutes`, 
                    settings[ADVANCED_SETTINGS_KEY.SUNRISE_TIMER_DURATION]
                );
            }
        } catch (error) {
            this.adapter.log.error(`Fehler beim Aktualisieren erweiterter Port-Einstellungen für ${deviceId}.${portId}: ${error.message}`);
        }
    }
}

module.exports = PortUpdater;