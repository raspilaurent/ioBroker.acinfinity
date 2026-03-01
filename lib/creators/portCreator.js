/**
 * PortCreator für AC Infinity Adapter
 * Verantwortlich für das Erstellen von Port-Strukturen in ioBroker
 */

"use strict";

const {
    MODE_OPTIONS,
    SETTINGS_MODE_OPTIONS,
    DYNAMIC_RESPONSE_OPTIONS,
    DEVICE_LOAD_TYPE_OPTIONS
} = require("../constants");

class PortCreator {
    /**
     * Erstellt einen neuen PortCreator
     * @param {object} stateManager - Referenz zum StateManager
     */
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.adapter = stateManager.adapter;
        this.stateCreator = stateManager.stateCreator;
    }

    /**
     * Erstellt einen Port-Kanal für ein Gerät
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {string} portName - Port-Name
     * @returns {Promise<void>}
     */
    async createPortChannel(deviceId, portId, portName) {
        // Erstelle Port-Channel
        await this.stateCreator.createChannel(`devices.${deviceId}.ports.${portId}`, portName || `Port ${portId}`, {
            portId: portId
        });

        // Erstelle Port-Unterkanäle
        await this.createPortInfoChannel(deviceId, portId);
        await this.createPortModeChannel(deviceId, portId);
        await this.createPortSettingsChannel(deviceId, portId);
    }

    /**
     * Erstellt einen Port-Kanal für ein Gerät
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @returns {Promise<void>}
     */
    async createPortInfoChannel(deviceId, portId) {
        // Erstelle Port-Info-Kanal
        await this.stateCreator.createChannel(`devices.${deviceId}.ports.${portId}.info`, "Information");

        // Erstelle Port-Info-States
        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.ports.${portId}.info.name`,
                name: "Name",
                type: "string",
                role: "text"
            },
            {
                id: `devices.${deviceId}.ports.${portId}.info.online`,
                name: "Online",
                type: "boolean",
                role: "indicator.connected"
            },
            {
                id: `devices.${deviceId}.ports.${portId}.info.power`,
                name: "Aktuelle Leistung (0-10)",
                type: "number",
                role: "value.power",
                common: { min: 0, max: 10 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.info.state`,
                name: "Status",
                type: "boolean",
                role: "switch.power"
            },
            {
                id: `devices.${deviceId}.ports.${portId}.info.remainingTime`,
                name: "Verbleibende Zeit",
                type: "number",
                role: "value.interval",
                unit: "s"
            },
            {
                id: `devices.${deviceId}.ports.${portId}.info.nextStateChange`,
                name: "Nächste Statusänderung",
                type: "string",
                role: "date.start"
            }
        ]);
    }

    /**
     * Erstellt einen Modus-Kanal für einen Port
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @returns {Promise<void>}
     */
    async createPortModeChannel(deviceId, portId) {
        // Erstelle Port-Mode-Kanal
        await this.stateCreator.createChannel(`devices.${deviceId}.ports.${portId}.mode`, "Modus-Einstellungen");

        // Erstelle Port-Mode-States
        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.ports.${portId}.mode.active`,
                name: "Aktiver Modus",
                type: "string",
                role: "text",
                write: true,
                states: MODE_OPTIONS
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.onSpeed`,
                name: "Ein-Geschwindigkeit (0-10)",
                type: "number",
                role: "level",
                write: true,
                common: { min: 0, max: 10 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.offSpeed`,
                name: "Aus-Geschwindigkeit (0-10)",
                type: "number",
                role: "level",
                write: true,
                common: { min: 0, max: 10 }
            }
        ]);

        // Erstelle Unterkanäle für verschiedene Modi
        await this.createTimerModeChannel(deviceId, portId);
        await this.createCycleModeChannel(deviceId, portId);
        await this.createScheduleModeChannel(deviceId, portId);
        await this.createAutoModeChannel(deviceId, portId);
        await this.createVpdModeChannel(deviceId, portId);
    }

    /**
     * Erstellt einen Timer-Modus-Unterkanal
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @returns {Promise<void>}
     */
    async createTimerModeChannel(deviceId, portId) {
        await this.stateCreator.createChannel(`devices.${deviceId}.ports.${portId}.mode.timer`, "Timer-Modus");

        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.ports.${portId}.mode.timer.toOnMinutes`,
                name: "Minuten bis Ein (0-1440)",
                type: "number",
                role: "value.interval",
                unit: "min",
                write: true,
                common: { min: 0, max: 1440 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.timer.toOffMinutes`,
                name: "Minuten bis Aus (0-1440)",
                type: "number",
                role: "value.interval",
                unit: "min",
                write: true,
                common: { min: 0, max: 1440 }
            }
        ]);
    }

    /**
     * Erstellt einen Zyklus-Modus-Unterkanal
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @returns {Promise<void>}
     */
    async createCycleModeChannel(deviceId, portId) {
        await this.stateCreator.createChannel(`devices.${deviceId}.ports.${portId}.mode.cycle`, "Zyklus-Modus");

        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.ports.${portId}.mode.cycle.onMinutes`,
                name: "Minuten Ein (0-1440)",
                type: "number",
                role: "value.interval",
                unit: "min",
                write: true,
                common: { min: 0, max: 1440 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.cycle.offMinutes`,
                name: "Minuten Aus (0-1440)",
                type: "number",
                role: "value.interval",
                unit: "min",
                write: true,
                common: { min: 0, max: 1440 }
            }
        ]);
    }

    /**
     * Erstellt einen Zeitplan-Modus-Unterkanal
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @returns {Promise<void>}
     */
    async createScheduleModeChannel(deviceId, portId) {
        await this.stateCreator.createChannel(`devices.${deviceId}.ports.${portId}.mode.schedule`, "Zeitplan-Modus");

        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.ports.${portId}.mode.schedule.startEnabled`,
                name: "Startzeit aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.schedule.startTime`,
                name: "Startzeit",
                type: "string",
                role: "value.time",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.schedule.endEnabled`,
                name: "Endzeit aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.schedule.endTime`,
                name: "Endzeit",
                type: "string",
                role: "value.time",
                write: true
            }
        ]);
    }

    /**
     * Erstellt einen Auto-Modus-Unterkanal
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @returns {Promise<void>}
     */
    async createAutoModeChannel(deviceId, portId) {
        await this.stateCreator.createChannel(`devices.${deviceId}.ports.${portId}.mode.auto`, "Auto-Modus");

        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.settingsMode`,
                name: "Einstellungsmodus",
                type: "string",
                role: "text",
                write: true,
                states: SETTINGS_MODE_OPTIONS
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.tempHighEnabled`,
                name: "Temperatur-Hochgrenze aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.tempHighTrigger`,
                name: "Temperatur-Hochgrenze (0-90)",
                type: "number",
                role: "value.temperature",
                unit: "°C",
                write: true,
                common: { min: 0, max: 90 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.tempLowEnabled`,
                name: "Temperatur-Tiefgrenze aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.tempLowTrigger`,
                name: "Temperatur-Tiefgrenze (0-90)",
                type: "number",
                role: "value.temperature",
                unit: "°C",
                write: true,
                common: { min: 0, max: 90 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.humidityHighEnabled`,
                name: "Feuchtigkeit-Hochgrenze aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.humidityHighTrigger`,
                name: "Feuchtigkeit-Hochgrenze (0-100)",
                type: "number",
                role: "value.humidity",
                unit: "%",
                write: true,
                common: { min: 0, max: 100 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.humidityLowEnabled`,
                name: "Feuchtigkeit-Tiefgrenze aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.humidityLowTrigger`,
                name: "Feuchtigkeit-Tiefgrenze (0-100)",
                type: "number",
                role: "value.humidity",
                unit: "%",
                write: true,
                common: { min: 0, max: 100 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.targetTempEnabled`,
                name: "Zieltemperatur aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.targetTemp`,
                name: "Zieltemperatur (0-90)",
                type: "number",
                role: "value.temperature",
                unit: "°C",
                write: true,
                common: { min: 0, max: 90 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.targetHumidityEnabled`,
                name: "Zielfeuchtigkeit aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.auto.targetHumidity`,
                name: "Zielfeuchtigkeit (0-100)",
                type: "number",
                role: "value.humidity",
                unit: "%",
                write: true,
                common: { min: 0, max: 100 }
            }
        ]);
    }

    /**
     * Erstellt einen VPD-Modus-Unterkanal
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @returns {Promise<void>}
     */
    async createVpdModeChannel(deviceId, portId) {
        await this.stateCreator.createChannel(`devices.${deviceId}.ports.${portId}.mode.vpd`, "VPD-Modus");

        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.ports.${portId}.mode.vpd.settingsMode`,
                name: "Einstellungsmodus",
                type: "string",
                role: "text",
                write: true,
                states: SETTINGS_MODE_OPTIONS
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.vpd.highEnabled`,
                name: "VPD-Hochgrenze aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.vpd.highTrigger`,
                name: "VPD-Hochgrenze (0-9.9)",
                type: "number",
                role: "value",
                unit: "kPa",
                write: true,
                common: { min: 0, max: 9.9 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.vpd.lowEnabled`,
                name: "VPD-Tiefgrenze aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.vpd.lowTrigger`,
                name: "VPD-Tiefgrenze (0-9.9)",
                type: "number",
                role: "value",
                unit: "kPa",
                write: true,
                common: { min: 0, max: 9.9 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.vpd.targetEnabled`,
                name: "Ziel-VPD aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.mode.vpd.target`,
                name: "Ziel-VPD (0-9.9)",
                type: "number",
                role: "value",
                unit: "kPa",
                write: true,
                common: { min: 0, max: 9.9 }
            }
        ]);
    }

    /**
     * Erstellt einen Einstellungskanal für einen Port
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @returns {Promise<void>}
     */
    async createPortSettingsChannel(deviceId, portId) {
        await this.stateCreator.createChannel(`devices.${deviceId}.ports.${portId}.settings`, "Erweiterte Einstellungen");

        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.ports.${portId}.settings.deviceType`,
                name: "Gerätetyp",
                type: "number",
                role: "value",
                write: true,
                states: Object.keys(DEVICE_LOAD_TYPE_OPTIONS).map(key => parseInt(key, 10)),
                common: {
                    // Mapping der numerischen IDs zu Gerätetypnamen
                    states: DEVICE_LOAD_TYPE_OPTIONS
                }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.settings.dynamicResponse`,
                name: "Dynamische Reaktion",
                type: "string",
                role: "text",
                write: true,
                states: DYNAMIC_RESPONSE_OPTIONS
            },
            {
                id: `devices.${deviceId}.ports.${portId}.settings.dynamicTransitionTemp`,
                name: "Übergangstemperatur (0-20)",
                type: "number",
                role: "value.temperature",
                unit: "°",
                write: true,
                common: { min: 0, max: 20 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.settings.dynamicTransitionHumidity`,
                name: "Übergangsfeuchtigkeit (0-10)",
                type: "number",
                role: "value.humidity",
                unit: "%",
                write: true,
                common: { min: 0, max: 10 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.settings.dynamicTransitionVPD`,
                name: "Übergangs-VPD (0-1)",
                type: "number",
                role: "value",
                unit: "kPa",
                write: true,
                common: { min: 0, max: 1 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.settings.dynamicBufferTemp`,
                name: "Puffertemperatur (0-20)",
                type: "number",
                role: "value.temperature",
                unit: "°",
                write: true,
                common: { min: 0, max: 20 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.settings.dynamicBufferHumidity`,
                name: "Pufferfeuchtigkeit (0-10)",
                type: "number",
                role: "value.humidity",
                unit: "%",
                write: true,
                common: { min: 0, max: 10 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.settings.dynamicBufferVPD`,
                name: "Puffer-VPD (0-1)",
                type: "number",
                role: "value",
                unit: "kPa",
                write: true,
                common: { min: 0, max: 1 }
            },
            {
                id: `devices.${deviceId}.ports.${portId}.settings.sunriseTimerEnabled`,
                name: "Sonnenaufgang/Sonnenuntergang-Timer aktiviert",
                type: "boolean",
                role: "switch.enable",
                write: true
            },
            {
                id: `devices.${deviceId}.ports.${portId}.settings.sunriseTimerMinutes`,
                name: "Sonnenaufgang/Sonnenuntergang-Timer Minuten (0-360)",
                type: "number",
                role: "value.interval",
                unit: "min",
                write: true,
                common: { min: 0, max: 360 }
            }
        ]);
    }
}

module.exports = PortCreator;
