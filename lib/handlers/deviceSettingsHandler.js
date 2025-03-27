/**
 * DeviceSettingsHandler für AC Infinity Adapter
 * Verarbeitet Änderungen an den Geräteeinstellungen
 */

"use strict";

const { 
    ADVANCED_SETTINGS_KEY, 
    OUTSIDE_CLIMATE_OPTIONS 
} = require('../constants');

class DeviceSettingsHandler {
    /**
     * Erstellt einen neuen DeviceSettingsHandler
     * @param {object} stateManager - Referenz zum StateManager
     */
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.adapter = stateManager.adapter;
        this.client = null; // API-Client-Referenz wird später gesetzt
    }

    /**
     * Setzt den API-Client für diesen Handler
     * @param {object} client - AC Infinity API-Client
     */
    setClient(client) {
        this.client = client;
        this.adapter.log.debug("API-Client erfolgreich an DeviceSettingsHandler übergeben");
    }

    /**
     * Verarbeitet Änderungen an Geräteeinstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {Array} path - Pfadkomponenten
     * @param {any} value - Neuer Wert
     */
    async handleDeviceSettingsChange(deviceId, path, value) {
        const settingName = path[0];
        
        try {
            // Prüfen, ob der Client gesetzt ist
            if (!this.client) {
                throw new Error("API-Client nicht gesetzt. Kann Geräteeinstellungen nicht aktualisieren.");
            }

            // Hole den Gerätenamen für den Aktualisierungsaufruf
            let deviceName = await this.adapter.getStateAsync(`devices.${deviceId}.info.name`);
            deviceName = deviceName && deviceName.val ? deviceName.val : `Gerät ${deviceId}`;
            
            switch (settingName) {
                case 'temperatureCalibration':
                    // UI sofort aktualisieren, um Flackern zu vermeiden
                    await this.stateManager.updateUIState(`devices.${deviceId}.settings.temperatureCalibration`, parseInt(value));
                    
                    this.adapter.log.debug(`Sende Temperaturkalibrierung an API: deviceId=${deviceId}, value=${value}`);
                    try {
                        await this.client.updateAdvancedSettings(deviceId, 0, deviceName, [
                            [ADVANCED_SETTINGS_KEY.CALIBRATE_TEMP, parseInt(value)],
                            [ADVANCED_SETTINGS_KEY.CALIBRATE_TEMP_F, parseInt(value)]
                        ]);
                        this.adapter.log.debug(`API-Antwort für Temperaturkalibrierung erfolgreich`);
                    } catch (error) {
                        this.adapter.log.error(`API-Fehler bei Temperaturkalibrierung: ${error.message}`);
                        if (error.response) {
                            this.adapter.log.error(`API-Antwort: ${JSON.stringify(error.response.data || {})}`);
                        }
                    }
                    break;
                    
                case 'humidityCalibration':
                    await this.stateManager.updateUIState(`devices.${deviceId}.settings.humidityCalibration`, parseInt(value));
                    
                    this.adapter.log.debug(`Sende Feuchtigkeitskalibrierung an API: deviceId=${deviceId}, value=${value}`);
                    try {
                        await this.client.updateAdvancedSettings(deviceId, 0, deviceName, [
                            [ADVANCED_SETTINGS_KEY.CALIBRATE_HUMIDITY, parseInt(value)]
                        ]);
                        this.adapter.log.debug(`API-Antwort für Feuchtigkeitskalibrierung erfolgreich`);
                    } catch (error) {
                        this.adapter.log.error(`API-Fehler bei Feuchtigkeitskalibrierung: ${error.message}`);
                        if (error.response) {
                            this.adapter.log.error(`API-Antwort: ${JSON.stringify(error.response.data || {})}`);
                        }
                    }
                    break;
                    
                case 'vpdLeafTemperatureOffset':
                    await this.stateManager.updateUIState(`devices.${deviceId}.settings.vpdLeafTemperatureOffset`, parseInt(value));
                    
                    this.adapter.log.debug(`Sende VPD-Blatttemperaturversatz an API: deviceId=${deviceId}, value=${value}`);
                    try {
                        await this.client.updateAdvancedSettings(deviceId, 0, deviceName, [
                            [ADVANCED_SETTINGS_KEY.VPD_LEAF_TEMP_OFFSET, parseInt(value)],
                            [ADVANCED_SETTINGS_KEY.VPD_LEAF_TEMP_OFFSET_F, parseInt(value)]
                        ]);
                        this.adapter.log.debug(`API-Antwort für VPD-Blatttemperaturversatz erfolgreich`);
                    } catch (error) {
                        this.adapter.log.error(`API-Fehler bei VPD-Blatttemperaturversatz: ${error.message}`);
                        if (error.response) {
                            this.adapter.log.error(`API-Antwort: ${JSON.stringify(error.response.data || {})}`);
                        }
                    }
                    break;
                    
                case 'outsideTemperature':
                    await this.stateManager.updateUIState(`devices.${deviceId}.settings.outsideTemperature`, value);
                    
                    const tempCompareIndex = OUTSIDE_CLIMATE_OPTIONS.indexOf(value);
                    if (tempCompareIndex >= 0) {
                        this.adapter.log.debug(`Sende Außentemperatureinstellung an API: deviceId=${deviceId}, value=${value}, index=${tempCompareIndex}`);
                        try {
                            await this.client.updateAdvancedSettings(deviceId, 0, deviceName, [
                                [ADVANCED_SETTINGS_KEY.OUTSIDE_TEMP_COMPARE, tempCompareIndex]
                            ]);
                            this.adapter.log.debug(`API-Antwort für Außentemperatureinstellung erfolgreich`);
                        } catch (error) {
                            this.adapter.log.error(`API-Fehler bei Außentemperatureinstellung: ${error.message}`);
                            if (error.response) {
                                this.adapter.log.error(`API-Antwort: ${JSON.stringify(error.response.data || {})}`);
                            }
                        }
                    } else {
                        this.adapter.log.warn(`Ungültiger Wert für Außentemperatur: ${value}`);
                    }
                    break;
                    
                case 'outsideHumidity':
                    await this.stateManager.updateUIState(`devices.${deviceId}.settings.outsideHumidity`, value);
                    
                    const humidityCompareIndex = OUTSIDE_CLIMATE_OPTIONS.indexOf(value);
                    if (humidityCompareIndex >= 0) {
                        this.adapter.log.debug(`Sende Außenfeuchtigkeitseinstellung an API: deviceId=${deviceId}, value=${value}, index=${humidityCompareIndex}`);
                        try {
                            await this.client.updateAdvancedSettings(deviceId, 0, deviceName, [
                                [ADVANCED_SETTINGS_KEY.OUTSIDE_HUMIDITY_COMPARE, humidityCompareIndex]
                            ]);
                            this.adapter.log.debug(`API-Antwort für Außenfeuchtigkeitseinstellung erfolgreich`);
                        } catch (error) {
                            this.adapter.log.error(`API-Fehler bei Außenfeuchtigkeitseinstellung: ${error.message}`);
                            if (error.response) {
                                this.adapter.log.error(`API-Antwort: ${JSON.stringify(error.response.data || {})}`);
                            }
                        }
                    } else {
                        this.adapter.log.warn(`Ungültiger Wert für Außenfeuchtigkeit: ${value}`);
                    }
                    break;
                    
                default:
                    this.adapter.log.warn(`Unbekannte Geräteeinstellung: ${settingName}`);
            }
            
            // Aktualisierung der Daten auslösen, um die Zustände zu aktualisieren
            await this.stateManager.refreshWithThrottle();
        } catch (error) {
            this.adapter.log.error(`Fehler beim Aktualisieren der Geräteeinstellungen: ${error.message}`);
        }
    }
}

module.exports = DeviceSettingsHandler;