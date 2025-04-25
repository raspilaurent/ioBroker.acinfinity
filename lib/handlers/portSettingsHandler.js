/**
 * PortSettingsHandler für AC Infinity Adapter
 * Verarbeitet Änderungen an den erweiterten Port-Einstellungen
 */

"use strict";

const { 
    ADVANCED_SETTINGS_KEY, 
    DEVICE_LOAD_TYPE_OPTIONS,
    DYNAMIC_RESPONSE_OPTIONS 
} = require('../constants');

class PortSettingsHandler {
    /**
     * Erstellt einen neuen PortSettingsHandler
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
        this.adapter.log.debug("API-Client erfolgreich an PortSettingsHandler übergeben");
    }

    /**
     * Verarbeitet Änderungen an erweiterten Port-Einstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {Array} path - Pfadkomponenten
     * @param {any} value - Neuer Wert
     */
    async handlePortAdvancedSettingsChange(deviceId, portId, path, value) {
        if (path.length < 1) {
            this.adapter.log.warn(`Ungültiger Pfad für erweiterte Port-Einstellungen: ${path.join('.')}`);
            return;
        }
        
        const setting = path[0];
        const statePath = `devices.${deviceId}.ports.${portId}.settings.${setting}`;
        
        // UI sofort aktualisieren, um Flackern zu vermeiden
        await this.stateManager.updateUIState(statePath, value);
        
        try {
            // Prüfen, ob der Client gesetzt ist
            if (!this.client) {
                throw new Error("API-Client nicht gesetzt. Kann Port-Einstellungen nicht aktualisieren.");
            }

            // Hole den Port-Namen für den Aktualisierungsaufruf
            let portName = await this.adapter.getStateAsync(`devices.${deviceId}.ports.${portId}.info.name`);
            portName = portName && portName.val ? portName.val : `Port ${portId}`;
            
            // Aktuelle Temperatureinheit abrufen
            const tempUnitState = await this.adapter.getStateAsync(`devices.${deviceId}.settings.temperatureUnit`);
            const isUnitC = tempUnitState && tempUnitState.val === "C";
            
            this.adapter.log.debug(`Verarbeite Port-Einstellungsänderung: deviceId=${deviceId}, portId=${portId}, setting=${setting}, value=${value}`);
            
            try {
                switch (setting) {
                    case 'deviceType': {
                        // Finde die Last-Typ-ID für den angegebenen Gerätetyp-Namen
                        let loadTypeId = null;
                        for (const [id, name] of Object.entries(DEVICE_LOAD_TYPE_OPTIONS)) {
                            if (name === value) {
                                loadTypeId = parseInt(id);
                                break;
                            }
                        }
                        
                        if (loadTypeId !== null) {
                            this.adapter.log.debug(`Sende Gerätetyp an API: deviceId=${deviceId}, portId=${portId}, type=${value}, loadTypeId=${loadTypeId}`);
                            await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                                [ADVANCED_SETTINGS_KEY.DEVICE_LOAD_TYPE, loadTypeId]
                            ]);
                            this.adapter.log.debug(`API-Antwort für Gerätetyp erfolgreich`);
                        } else {
                            this.adapter.log.warn(`Ungültiger Gerätetyp: ${value}`);
                        }
                        break;
                    }
                        
                    case 'dynamicResponse': {
                        const responseTypeIndex = DYNAMIC_RESPONSE_OPTIONS.indexOf(value);
                        if (responseTypeIndex >= 0) {
                            this.adapter.log.debug(`Sende dynamischen Antworttyp an API: deviceId=${deviceId}, portId=${portId}, type=${value}, index=${responseTypeIndex}`);
                            await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                                [ADVANCED_SETTINGS_KEY.DYNAMIC_RESPONSE_TYPE, responseTypeIndex]
                            ]);
                            this.adapter.log.debug(`API-Antwort für dynamischen Antworttyp erfolgreich`);
                        } else {
                            this.adapter.log.warn(`Ungültiger dynamischer Antworttyp: ${value}`);
                        }
                        break;
                    }
                        
                    case 'dynamicTransitionTemp': {
                        const transitionTempValue = parseInt(value);
                        this.adapter.log.debug(`Sende dynamische Übergangstemperatur an API: deviceId=${deviceId}, portId=${portId}, temp=${transitionTempValue}, isUnitC=${isUnitC}`);
                        
                        if (isUnitC) {
                            await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                                [ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_TEMP, transitionTempValue],
                                [ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_TEMP_F, transitionTempValue * 2]
                            ]);
                        } else {
                            await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                                [ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_TEMP, Math.floor(transitionTempValue / 2)],
                                [ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_TEMP_F, transitionTempValue]
                            ]);
                        }
                        
                        this.adapter.log.debug(`API-Antwort für dynamische Übergangstemperatur erfolgreich`);
                        break;
                    }
                        
                    case 'dynamicBufferTemp': {
                        const bufferTempValue = parseInt(value);
                        this.adapter.log.debug(`Sende dynamische Puffertemperatur an API: deviceId=${deviceId}, portId=${portId}, temp=${bufferTempValue}, isUnitC=${isUnitC}`);
                        
                        if (isUnitC) {
                            await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                                [ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_TEMP, bufferTempValue],
                                [ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_TEMP_F, bufferTempValue * 2]
                            ]);
                        } else {
                            await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                                [ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_TEMP, Math.floor(bufferTempValue / 2)],
                                [ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_TEMP_F, bufferTempValue]
                            ]);
                        }
                        
                        this.adapter.log.debug(`API-Antwort für dynamische Puffertemperatur erfolgreich`);
                        break;
                    }
                        
                    // Weitere Fälle für andere Einstellungen...
                    case 'dynamicTransitionHumidity': {
                        this.adapter.log.debug(`Sende dynamische Übergangsfeuchtigkeit an API: deviceId=${deviceId}, portId=${portId}, humidity=${parseInt(value)}`);
                        await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                            [ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_HUMIDITY, parseInt(value)]
                        ]);
                        this.adapter.log.debug(`API-Antwort für dynamische Übergangsfeuchtigkeit erfolgreich`);
                        break;
                    }
                        
                    case 'dynamicBufferHumidity': {
                        this.adapter.log.debug(`Sende dynamische Pufferfeuchtigkeit an API: deviceId=${deviceId}, portId=${portId}, humidity=${parseInt(value)}`);
                        await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                            [ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_HUMIDITY, parseInt(value)]
                        ]);
                        this.adapter.log.debug(`API-Antwort für dynamische Pufferfeuchtigkeit erfolgreich`);
                        break;
                    }
                        
                    case 'dynamicTransitionVPD': {
                        const transitionVpdValue = Math.round(parseFloat(value) * 10);
                        this.adapter.log.debug(`Sende dynamisches Übergangs-VPD an API: deviceId=${deviceId}, portId=${portId}, vpd=${value}, scaledValue=${transitionVpdValue}`);
                        await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                            [ADVANCED_SETTINGS_KEY.DYNAMIC_TRANSITION_VPD, transitionVpdValue]
                        ]);
                        this.adapter.log.debug(`API-Antwort für dynamisches Übergangs-VPD erfolgreich`);
                        break;
                    }
                        
                    case 'dynamicBufferVPD': {
                        const bufferVpdValue = Math.round(parseFloat(value) * 10);
                        this.adapter.log.debug(`Sende dynamisches Puffer-VPD an API: deviceId=${deviceId}, portId=${portId}, vpd=${value}, scaledValue=${bufferVpdValue}`);
                        await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                            [ADVANCED_SETTINGS_KEY.DYNAMIC_BUFFER_VPD, bufferVpdValue]
                        ]);
                        this.adapter.log.debug(`API-Antwort für dynamisches Puffer-VPD erfolgreich`);
                        break;
                    }
                        
                    case 'sunriseTimerEnabled': {
                        this.adapter.log.debug(`Sende Sonnenaufgang/Sonnenuntergang-Timer-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                        await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                            [ADVANCED_SETTINGS_KEY.SUNRISE_TIMER_ENABLED, value ? 1 : 0]
                        ]);
                        this.adapter.log.debug(`API-Antwort für Sonnenaufgang/Sonnenuntergang-Timer-Aktivierung erfolgreich`);
                        break;
                    }
                        
                    case 'sunriseTimerMinutes': {
                        this.adapter.log.debug(`Sende Sonnenaufgang/Sonnenuntergang-Timer-Minuten an API: deviceId=${deviceId}, portId=${portId}, minutes=${parseInt(value)}`);
                        await this.client.updateAdvancedSettings(deviceId, portId, portName, [
                            [ADVANCED_SETTINGS_KEY.SUNRISE_TIMER_DURATION, parseInt(value)]
                        ]);
                        this.adapter.log.debug(`API-Antwort für Sonnenaufgang/Sonnenuntergang-Timer-Minuten erfolgreich`);
                        break;
                    }
                        
                    default:
                        this.adapter.log.warn(`Unbekannte erweiterte Port-Einstellung: ${setting}`);
                }
            } catch (error) {
                this.adapter.log.error(`API-Fehler beim Aktualisieren der Port-Einstellung ${setting}: ${error.message}`);
                if (error.response) {
                    this.adapter.log.error(`API-Antwort: ${JSON.stringify(error.response.data || {})}`);
                }
            }
            
            // Aktualisierung der Daten auslösen, um die Zustände zu aktualisieren
            await this.stateManager.refreshWithThrottle();
        } catch (error) {
            this.adapter.log.error(`Fehler beim Aktualisieren erweiterter Port-Einstellungen: ${error.message}`);
        }
    }
}

module.exports = PortSettingsHandler;