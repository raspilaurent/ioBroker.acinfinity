/**
 * DeviceUpdater für AC Infinity Adapter
 * Verantwortlich für das Aktualisieren von Gerätedaten in ioBroker
 */

"use strict";

const { 
    OUTSIDE_CLIMATE_OPTIONS, 
    ADVANCED_SETTINGS_KEY 
} = require('../constants');

class DeviceUpdater {
    /**
     * Erstellt einen neuen DeviceUpdater
     * @param {object} stateManager - Referenz zum StateManager
     */
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.adapter = stateManager.adapter;
    }

    /**
     * Wandelt einen numerischen Gerätetyp in einen benutzerfreundlichen Namen um
     * @param {number} deviceType - Numerischer Gerätetyp
     * @returns {string} - Benutzerfreundlicher Name des Gerätetyps
     */
    getDeviceModelByType(deviceType) {
        switch (deviceType) {
            case 11:
                return "UIS Controller 69 Pro (CTR69P)";
            case 18:
                return "UIS CONTROLLER 69 Pro+ (CTR69Q)";
            default:
                return `UIS Controller Typ ${deviceType}`;
        }
    }

    /**
     * Aktualisiert Gerätedaten mit den neuesten Werten
     * @param {string} deviceId - Geräte-ID
     * @param {object} device - Geräteobjekt mit den neuen Daten
     * @returns {Promise<void>}
     */
    async updateDeviceData(deviceId, device) {
        try {
            this.adapter.log.debug(`Aktualisiere Gerätedaten für ${deviceId}: ${JSON.stringify(device).substring(0, 500)}...`);
            
            // Aktualisiere Info-Zustände
            await this.updateInfoStates(deviceId, device);
            
            // Aktualisiere Sensor-Zustände
            await this.updateSensorStates(deviceId, device);
        } catch (error) {
            this.adapter.log.error(`Fehler beim Aktualisieren der Gerätedaten für ${deviceId}: ${error.message}`);
        }
    }

    /**
     * Aktualisiert die Info-Zustände des Geräts
     * @param {string} deviceId - Geräte-ID
     * @param {object} device - Geräteobjekt
     * @returns {Promise<void>}
     */
    async updateInfoStates(deviceId, device) {
        await this.stateManager.updateState(`devices.${deviceId}.info.name`, device.devName);
        await this.stateManager.updateState(`devices.${deviceId}.info.online`, device.online === 1);
        await this.stateManager.updateState(`devices.${deviceId}.info.mac`, device.devMacAddr);
        
        // Ermittle die numerische Gerätetypnummer
        let deviceTypeNum = 0;
        if (typeof device.devType === 'number') {
            deviceTypeNum = device.devType;
        } else if (typeof device.devType === 'string') {
            // Versuche, die Zahl zu extrahieren
            const match = device.devType.match(/\d+/);
            if (match) {
                deviceTypeNum = parseInt(match[0], 10);
            }
        }
        
        // Verwende zusätzlich den beschreibenden Namen als Text-Beschreibung
        const deviceTypeStr = this.getDeviceModelByType(deviceTypeNum);
        
        // Setze den numerischen Gerätetyp
        await this.stateManager.updateState(`devices.${deviceId}.info.deviceType`, deviceTypeNum);
        
        // Optional: Füge eine zusätzliche Beschreibung hinzu
        if (deviceTypeStr !== `UIS Controller Typ ${deviceTypeNum}`) {
            this.adapter.setObjectNotExistsAsync(`devices.${deviceId}.info.deviceTypeDescription`, {
                type: 'state',
                common: {
                    name: 'Device Type Description',
                    type: 'string',
                    role: 'text',
                    read: true,
                    write: false
                },
                native: {}
            });
            await this.stateManager.updateState(`devices.${deviceId}.info.deviceTypeDescription`, deviceTypeStr);
        }
        
        // Prüfen, wo die Firmware- und Hardwaredaten zu finden sind
        if (device.deviceInfo) {
            // Prüfen der verschiedenen möglichen Orte für die Versionsinformationen
            const firmwareVersion = device.deviceInfo.firmwareVersion || device.firmwareVersion || 
                                  (device.deviceInfo.versions ? device.deviceInfo.versions.firmware : null);
            
            const hardwareVersion = device.deviceInfo.hardwareVersion || device.hardwareVersion || 
                                  (device.deviceInfo.versions ? device.deviceInfo.versions.hardware : null);
            
            await this.stateManager.updateState(`devices.${deviceId}.info.firmware`, firmwareVersion);
            await this.stateManager.updateState(`devices.${deviceId}.info.hardware`, hardwareVersion);
        } else {
            // Alternativ, falls deviceInfo nicht existiert, versuche direkt auf die Eigenschaften zuzugreifen
            await this.stateManager.updateState(`devices.${deviceId}.info.firmware`, device.firmwareVersion);
            await this.stateManager.updateState(`devices.${deviceId}.info.hardware`, device.hardwareVersion);
        }
        
        // Füge zusätzliches Debug-Logging hinzu, um die aktuelle Datenstruktur zu verstehen
        this.adapter.log.debug(`Device info structure for ${deviceId}: ${JSON.stringify(device)}`);
    }

    /**
     * Aktualisiert die Sensor-Zustände des Geräts
     * @param {string} deviceId - Geräte-ID
     * @param {object} device - Geräteobjekt
     * @returns {Promise<void>}
     */
    async updateSensorStates(deviceId, device) {
        // Temperatur und Feuchtigkeit können entweder direkt im Gerät oder in deviceInfo sein
        const temperature = device.temperature !== undefined ? device.temperature : 
                           (device.deviceInfo && device.deviceInfo.temperature);
        const humidity = device.humidity !== undefined ? device.humidity : 
                         (device.deviceInfo && device.deviceInfo.humidity);
        const vpd = device.vpdnums !== undefined ? device.vpdnums : 
                   (device.deviceInfo && device.deviceInfo.vpdnums);
        
        this.adapter.log.debug(`Sensorwerte für Gerät ${deviceId}: temperature=${temperature}, humidity=${humidity}, vpd=${vpd}`);
        
        // Aktualisiere Sensorwerte mit sorgfältiger Prüfung
        if (typeof temperature === 'number') {
            await this.stateManager.updateState(`devices.${deviceId}.sensors.temperature`, parseFloat((temperature / 100).toFixed(2)));
        }
        
        if (typeof humidity === 'number') {
            await this.stateManager.updateState(`devices.${deviceId}.sensors.humidity`, parseFloat((humidity / 100).toFixed(2)));
        }
        
        if (typeof vpd === 'number') {
            await this.stateManager.updateState(`devices.${deviceId}.sensors.vpd`, parseFloat((vpd / 100).toFixed(2)));
        }
    }

    /**
     * Aktualisiert die erweiterten Geräteeinstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {object} settings - Einstellungsobjekt
     * @returns {Promise<void>}
     */
    async updateAdvancedSettings(deviceId, settings) {
        if (!settings) {
            this.adapter.log.warn(`Erhielt leere erweiterte Einstellungen für ${deviceId}`);
            return;
        }
        
        this.adapter.log.debug(`Aktualisiere erweiterte Einstellungen für ${deviceId}: ${JSON.stringify(settings).substring(0, 500)}...`);
        
        try {
            // Temperatureinheit (1 = Celsius, 0 = Fahrenheit)
            if (typeof settings[ADVANCED_SETTINGS_KEY.TEMP_UNIT] === 'number') {
                await this.stateManager.updateState(`devices.${deviceId}.settings.temperatureUnit`, 
                    settings[ADVANCED_SETTINGS_KEY.TEMP_UNIT] > 0 ? "C" : "F");
            }
            
            // Verwende je nach Temperatureinheit den passenden Kalibrierungswert
            const tempUnit = settings[ADVANCED_SETTINGS_KEY.TEMP_UNIT];
            
            if (tempUnit !== undefined) {
                const tempCalibration = tempUnit > 0 
                    ? settings[ADVANCED_SETTINGS_KEY.CALIBRATE_TEMP] 
                    : settings[ADVANCED_SETTINGS_KEY.CALIBRATE_TEMP_F];
                
                if (tempCalibration !== undefined) {
                    await this.stateManager.updateState(`devices.${deviceId}.settings.temperatureCalibration`, 
                        tempCalibration);
                }
            }
            
            // Feuchtigkeitskalibrierung
            if (typeof settings[ADVANCED_SETTINGS_KEY.CALIBRATE_HUMIDITY] === 'number') {
                await this.stateManager.updateState(`devices.${deviceId}.settings.humidityCalibration`, 
                    settings[ADVANCED_SETTINGS_KEY.CALIBRATE_HUMIDITY]);
            }
            
            // VPD-Blatttemperatur-Offset
            if (tempUnit !== undefined) {
                const vpdLeafOffset = tempUnit > 0 
                    ? settings[ADVANCED_SETTINGS_KEY.VPD_LEAF_TEMP_OFFSET] 
                    : settings[ADVANCED_SETTINGS_KEY.VPD_LEAF_TEMP_OFFSET_F];
                
                if (vpdLeafOffset !== undefined) {
                    await this.stateManager.updateState(`devices.${deviceId}.settings.vpdLeafTemperatureOffset`, 
                        vpdLeafOffset);
                }
            }
            
            // Außenklima-Einstellungen
            const outsideTempCompare = settings[ADVANCED_SETTINGS_KEY.OUTSIDE_TEMP_COMPARE];
            if (typeof outsideTempCompare === 'number' && outsideTempCompare < OUTSIDE_CLIMATE_OPTIONS.length) {
                await this.stateManager.updateState(`devices.${deviceId}.settings.outsideTemperature`, 
                    OUTSIDE_CLIMATE_OPTIONS[outsideTempCompare]);
            }
            
            const outsideHumidityCompare = settings[ADVANCED_SETTINGS_KEY.OUTSIDE_HUMIDITY_COMPARE];
            if (typeof outsideHumidityCompare === 'number' && outsideHumidityCompare < OUTSIDE_CLIMATE_OPTIONS.length) {
                await this.stateManager.updateState(`devices.${deviceId}.settings.outsideHumidity`, 
                    OUTSIDE_CLIMATE_OPTIONS[outsideHumidityCompare]);
            }
        } catch (error) {
            this.adapter.log.error(`Fehler beim Aktualisieren erweiterter Geräteeinstellungen für ${deviceId}: ${error.message}`);
        }
    }
}

module.exports = DeviceUpdater;