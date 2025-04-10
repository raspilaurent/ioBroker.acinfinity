/**
 * PortModeHandler für AC Infinity Adapter
 * Verarbeitet Änderungen an den Port-Modi und deren Einstellungen
 */

"use strict";

const { 
    PORT_CONTROL_KEY,
    MODE_OPTIONS,
    SETTINGS_MODE_OPTIONS,
    SCHEDULE_DISABLED_VALUE,
    SCHEDULE_MIDNIGHT_VALUE,
    SCHEDULE_EOD_VALUE,
    API_BASE_URL,
    API_ENDPOINTS
} = require('../constants');

class PortModeHandler {
    /**
     * Erstellt einen neuen PortModeHandler
     * @param {object} stateManager - Referenz zum StateManager
     */
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.adapter = stateManager.adapter;
        this.client = null; // API-Client-Referenz wird später gesetzt
        
        // Debounce-Mechanismus hinzufügen
        this.pendingUpdates = new Map(); // Speichert ausstehende Updates
        this.processingUpdates = new Map(); // Speichert gerade verarbeitete Updates
    }

    /**
     * Setzt den API-Client für diesen Handler
     * @param {object} client - AC Infinity API-Client
     */
    setClient(client) {
        this.client = client;
        this.adapter.log.debug("API-Client erfolgreich an PortModeHandler übergeben");
    }

    /**
     * Verarbeitet Änderungen an Port-Modi
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {Array} path - Pfadkomponenten
     * @param {any} value - Neuer Wert
     */
    async handlePortModeChange(deviceId, portId, path, value) {
        if (path.length < 1) {
            this.adapter.log.warn(`Ungültiger Pfad für Port-Modus: ${path.join('.')}`);
            return;
        }
        
        const settingType = path[0];
        
        try {
            // Prüfen, ob der Client gesetzt ist
            if (!this.client) {
                throw new Error("API-Client nicht gesetzt. Kann Port-Modi nicht aktualisieren.");
            }
    
            // Sicherstellen, dass deviceId und portId korrekt formatiert sind
            const normalizedDeviceId = deviceId.toString();
            const normalizedPortId = Number(portId);
            
            // Erstelle einen eindeutigen Schlüssel für dieses Update
            const updateKey = `${normalizedDeviceId}_${normalizedPortId}_${settingType}`;
            
            // Prüfe, ob eine Aktualisierung für diesen Wert bereits verarbeitet wird
            if (this.processingUpdates.has(updateKey)) {
                this.adapter.log.debug(`Überspringe doppelte Aktualisierung: ${updateKey} mit Wert ${value}`);
                return;
            }
            
            // Prüfe, ob ein ausstehender Timer für dieses Update existiert
            if (this.pendingUpdates.has(updateKey)) {
                // Wenn ja, löschen wir den alten Timer
                clearTimeout(this.pendingUpdates.get(updateKey));
                this.adapter.log.debug(`Ersetze ausstehende Aktualisierung für: ${updateKey}`);
            }
            
            // Erstelle einen neuen Timer mit Debounce von 200ms
            const timerId = setTimeout(async () => {
                try {
                    // Timer ist abgelaufen, entferne das ausstehende Update
                    this.pendingUpdates.delete(updateKey);
                    
                    // Markiere als in Bearbeitung
                    this.processingUpdates.set(updateKey, true);
                    
                    // Detailliertes Logging für alle Anfragen
                    this.adapter.log.debug(`Verarbeite Port-Modus-Änderung: Gerät=${normalizedDeviceId}, Port=${normalizedPortId}, Pfad=${path.join('.')}, Wert=${value}`);
                    
                    await this.processPortModeUpdate(normalizedDeviceId, normalizedPortId, settingType, path, value);
                    
                } catch (error) {
                    this.adapter.log.error(`Fehler bei Aktualisierung ${updateKey}: ${error.message}`);
                } finally {
                    // Entferne das Processing-Flag, egal was passiert
                    this.processingUpdates.delete(updateKey);
                }
            }, 200);
            
            // Speichere den Timer
            this.pendingUpdates.set(updateKey, timerId);
            
        } catch (error) {
            this.adapter.log.error(`Fehler beim Aktualisieren der Port-Modus-Einstellungen: ${error.message}`);
            if (error.stack) {
                this.adapter.log.debug(`Stack-Trace: ${error.stack}`);
            }
        }
    }

    /**
     * Verarbeitet ein Port-Modus-Update nach Debouncing
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {string} settingType - Einstellungstyp 
     * @param {Array} path - Pfadkomponenten
     * @param {any} value - Neuer Wert
     */
    async processPortModeUpdate(deviceId, portId, settingType, path, value) {
        try {
            // Hole zuerst den aktuellen Wert, um unnötige Updates zu vermeiden
            const currentStateId = `devices.${deviceId}.ports.${portId}.mode.${settingType}`;
            const currentState = await this.adapter.getStateAsync(currentStateId);
            
            // Wenn der aktuelle Wert bereits dem gewünschten Wert entspricht und bestätigt ist, überspringen
            if (currentState && currentState.val === value && currentState.ack) {
                this.adapter.log.debug(`Überspringe Update für ${currentStateId}, Wert ist bereits ${value} mit ack=true`);
                return;
            }
            
            // Die bestehende Logik für verschiedene Einstellungstypen
            switch (settingType) {
                case 'active': {
                    // Konvertiere Wert in korrekte Form
                    const strValue = String(value).toLowerCase();
                    const boolValue = strValue === "true" || strValue === "1" || strValue === "on";
                    const modeValue = boolValue ? "On" : "Off";
                    
                    this.adapter.log.info(`Verarbeite active-Änderung: ${value} -> ${modeValue}`);
                    // Verwende die spezialisierte Methode für Moduswechsel
                    const success = await this.handleActiveMode(deviceId, portId, modeValue);
                    
                    // Bestätige den State, wenn erfolgreich
                    if (success) {
                        await this.adapter.setStateAsync(`devices.${deviceId}.ports.${portId}.mode.active`, 
                            { val: modeValue, ack: true });
                    }
                    break;
                }
                
                case 'onSpeed': {
                    const speedValue = parseInt(value);
                    if (!isNaN(speedValue) && speedValue >= 0 && speedValue <= 10) {
                        // UI sofort aktualisieren, um Flackern zu vermeiden
                        await this.stateManager.updateUIState(`devices.${deviceId}.ports.${portId}.mode.onSpeed`, speedValue);
                        
                        this.adapter.log.debug(`Setze onSpeed: deviceId=${deviceId}, portId=${portId}, value=${speedValue}`);
                        
                        try {
                            // Direkten curl-Befehl für Geschwindigkeitsänderung verwenden
                            const settings = await this.client.getDeviceModeSettings(deviceId, portId);
                            const modeSetid = settings.modeSetid;
                            const vpdnums = settings.vpdnums || 107;
                            
                            // Aktuellen Modus beibehalten, nur Geschwindigkeit ändern
                            const currentMode = settings.atType || 2; // Standardmäßig "On"
                            
                            const cmd = `curl -X POST "http://www.acinfinityserver.com/api/dev/addDevMode" -H "User-Agent: ACController/1.8.5 (com.acinfinity.humiture; build:500; iOS 17.0.1) Alamofire/5.7.1" -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" -H "token: ${this.client.token}" -d "modeSetid=${modeSetid}&devId=${deviceId}&externalPort=${portId}&offSpead=0&onSpead=${speedValue}&atType=${currentMode}&speak=${speedValue}&curMode=${currentMode}&vpdstatus=0&vpdnums=${vpdnums}"`;
                            
                            this.adapter.log.debug(`Führe curl-Befehl für Geschwindigkeitsänderung aus: ${cmd}`);
                            
                            require('child_process').exec(cmd, async (error, stdout, stderr) => {
                                if (error) {
                                    this.adapter.log.error(`Curl Fehler: ${error.message}`);
                                    return;
                                }
                                
                                try {
                                    const response = JSON.parse(stdout);
                                    if (response && response.code === 200) {
                                        this.adapter.log.info(`Geschwindigkeit erfolgreich auf ${speedValue} geändert`);
                                        
                                        // State als bestätigt markieren
                                        await this.adapter.setStateAsync(`devices.${deviceId}.ports.${portId}.mode.onSpeed`, 
                                            { val: speedValue, ack: true });
                                    } else {
                                        this.adapter.log.error(`API-Fehler bei Geschwindigkeitsänderung: ${JSON.stringify(response)}`);
                                    }
                                } catch (parseError) {
                                    this.adapter.log.error(`Fehler beim Parsen der API-Antwort: ${parseError.message}`);
                                }
                            });
                        } catch (error) {
                            this.adapter.log.error(`Fehler beim Aktualisieren der Lüftergeschwindigkeit: ${error.message}`);
                        }
                    } else {
                        this.adapter.log.warn(`Ungültiger onSpeed-Wert: ${value}`);
                    }
                    break;
                }
                
                case 'offSpeed': {
                    const speedValue = parseInt(value);
                    if (!isNaN(speedValue) && speedValue >= 0 && speedValue <= 10) {
                        // Verwende die spezielle Methode für offSpeed
                        const success = await this.handleOffSpeedChange(deviceId, portId, speedValue);
                        
                        // Bestätige den State, wenn erfolgreich
                        if (success) {
                            await this.adapter.setStateAsync(`devices.${deviceId}.ports.${portId}.mode.offSpeed`, 
                                { val: speedValue, ack: true });
                        }
                    } else {
                        this.adapter.log.warn(`Ungültiger offSpeed-Wert: ${value}`);
                    }
                    break;
                }
                
                // Verschachtelte Einstellungen verarbeiten
                default:
                    if (['timer', 'cycle', 'schedule', 'auto', 'vpd'].includes(settingType) && path.length > 1) {
                        const category = settingType;
                        const subPath = path.slice(1); // Alle Elemente nach dem Kategorienamen
                        await this.handleNestedPortSettingsChange(deviceId, portId, category, subPath, value);
                    } else {
                        this.adapter.log.warn(`Unbekannter Port-Modus-Einstellungstyp: ${settingType}`);
                    }
            }
            
            // Aktualisierung der Daten mit Verzögerung auslösen
            // Wir warten länger als die Standard-Debounce-Zeit
            setTimeout(() => {
                this.stateManager.refreshWithThrottle();
            }, 1000);
            
        } catch (error) {
            this.adapter.log.error(`API-Fehler beim Aktualisieren der Port-Modus-Einstellung ${settingType}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Spezialisierte Methode für den Moduswechsel (besonders für Ein/Aus)
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {string} value - Neuer Moduswert
     * @returns {Promise<boolean>} - True bei Erfolg
     */
    async handleActiveMode(deviceId, portId, value) {
        // UI sofort aktualisieren, um Flackern zu vermeiden
        await this.stateManager.updateUIState(`devices.${deviceId}.ports.${portId}.mode.active`, value);
        
        const turnOn = (value === "On");
        this.adapter.log.info(`Setting device ${deviceId}, port ${portId} to ${turnOn ? 'On' : 'Off'}`);
        
        try {
            // Verwende direkt curl für zuverlässige Steuerung
            // Settings holen für die modeSetid
            const settings = await this.client.getDeviceModeSettings(deviceId, portId);
            const modeSetid = settings.modeSetid;
            const vpdnums = settings.vpdnums || 107;
            
            // Parameter festlegen
            const mode = turnOn ? 2 : 1;      // 1=Aus, 2=Ein
            
            // Hole den aktuellen onSpeed-Wert
            const onSpeedState = await this.adapter.getStateAsync(`devices.${deviceId}.ports.${portId}.mode.onSpeed`);
            const onSpeed = (onSpeedState && typeof onSpeedState.val === 'number' && onSpeedState.val > 0) ? 
                onSpeedState.val : 3; // Fallback auf 3 (mittlere Geschwindigkeit)
            
            // WICHTIGE ÄNDERUNG: 
            // Verwende "speak=0" wenn ausgeschaltet, aber behalte den onSpeed-Wert bei
            const speakValue = turnOn ? onSpeed : 0;
            const onSpeedValue = onSpeed; // Behalte den onSpeed Wert immer bei
            
            this.adapter.log.debug(`Mode change - onSpeed: ${onSpeedValue}, speak: ${speakValue}, Mode: ${mode}, turnOn: ${turnOn}`);
            
            // Hole offSpeed Wert
            const offSpeedState = await this.adapter.getStateAsync(`devices.${deviceId}.ports.${portId}.mode.offSpeed`);
            const offSpeedValue = (offSpeedState && typeof offSpeedState.val === 'number') ? 
                offSpeedState.val : 0;
            
            const cmd = `curl -X POST "http://www.acinfinityserver.com/api/dev/addDevMode" -H "User-Agent: ACController/1.8.5 (com.acinfinity.humiture; build:500; iOS 17.0.1) Alamofire/5.7.1" -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" -H "token: ${this.client.token}" -d "modeSetid=${modeSetid}&devId=${deviceId}&externalPort=${portId}&offSpead=${offSpeedValue}&onSpead=${onSpeedValue}&atType=${mode}&speak=${speakValue}&curMode=${mode}&vpdstatus=0&vpdnums=${vpdnums}"`;
            
            this.adapter.log.debug(`Executing curl command: ${cmd}`);
            
            return new Promise((resolve, reject) => {
                require('child_process').exec(cmd, async (error, stdout, stderr) => {
                    if (error) {
                        this.adapter.log.error(`Curl command error: ${error.message}`);
                        reject(error);
                        return;
                    }
                    
                    try {
                        const response = JSON.parse(stdout);
                        if (response && response.code === 200) {
                            this.adapter.log.info(`Successfully set device ${deviceId}, port ${portId} to ${turnOn ? 'On' : 'Off'}`);
                            
                            // State als bestätigt markieren
                            await this.adapter.setStateAsync(`devices.${deviceId}.ports.${portId}.mode.active`, 
                                { val: value, ack: true });
                            
                            // Hier NICHT den onSpeed-Wert aktualisieren, wenn wir ausschalten
                            // Wir aktualisieren nur den Gerätestatus
                            
                            resolve(true);
                        } else {
                            this.adapter.log.error(`API error: ${JSON.stringify(response)}`);
                            reject(new Error(`API error: ${response.msg || 'Unknown error'}`));
                        }
                    } catch (parseError) {
                        this.adapter.log.error(`Error parsing API response: ${parseError.message}`);
                        reject(parseError);
                    }
                });
            });
        } catch (error) {
            this.adapter.log.error(`Error controlling device ${deviceId}, port ${portId}: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Spezialisierte Methode für die Änderung der Aus-Geschwindigkeit
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {number} value - Neuer Geschwindigkeitswert
     * @returns {Promise<boolean>} - True bei Erfolg
     */
    async handleOffSpeedChange(deviceId, portId, value) {
        // UI sofort aktualisieren, um Flackern zu vermeiden
        await this.stateManager.updateUIState(`devices.${deviceId}.ports.${portId}.mode.offSpeed`, parseInt(value));
        
        try {
            // Settings holen für die modeSetid
            const settings = await this.client.getDeviceModeSettings(deviceId, portId);
            const modeSetid = settings.modeSetid;
            const vpdnums = settings.vpdnums || 107;
            
            // Hole den aktuellen Modus und onSpeed-Wert
            const currentModeState = await this.adapter.getStateAsync(`devices.${deviceId}.ports.${portId}.mode.active`);
            const currentMode = currentModeState && currentModeState.val ? 
                MODE_OPTIONS.indexOf(currentModeState.val) + 1 : 1; // Default zu "Off" (1) wenn nicht bekannt
            
            const onSpeedState = await this.adapter.getStateAsync(`devices.${deviceId}.ports.${portId}.mode.onSpeed`);
            const onSpeed = (onSpeedState && typeof onSpeedState.val === 'number') ? 
                onSpeedState.val : 3; // Default zu 3 wenn nicht bekannt
            
            // Aktuelle Sprechgeschwindigkeit basierend auf Modus
            const speakValue = currentMode === 2 ? onSpeed : 0;
            
            // Neuer offSpeed-Wert vom Benutzer
            const offSpeedValue = parseInt(value);
            
            this.adapter.log.debug(`Changing offSpeed - offSpeed: ${offSpeedValue}, onSpeed: ${onSpeed}, speak: ${speakValue}, Mode: ${currentMode}`);
            
            // API-Aufruf mit explizitem offSpead-Parameter
            const cmd = `curl -X POST "http://www.acinfinityserver.com/api/dev/addDevMode" -H "User-Agent: ACController/1.8.5 (com.acinfinity.humiture; build:500; iOS 17.0.1) Alamofire/5.7.1" -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" -H "token: ${this.client.token}" -d "modeSetid=${modeSetid}&devId=${deviceId}&externalPort=${portId}&offSpead=${offSpeedValue}&onSpead=${onSpeed}&atType=${currentMode}&speak=${speakValue}&curMode=${currentMode}&vpdstatus=0&vpdnums=${vpdnums}"`;
            
            this.adapter.log.debug(`Executing curl command for offSpeed change: ${cmd}`);
            
            return new Promise((resolve, reject) => {
                require('child_process').exec(cmd, async (error, stdout, stderr) => {
                    if (error) {
                        this.adapter.log.error(`Curl command error: ${error.message}`);
                        reject(error);
                        return;
                    }
                    
                    try {
                        const response = JSON.parse(stdout);
                        if (response && response.code === 200) {
                            this.adapter.log.info(`Successfully set offSpeed for device ${deviceId}, port ${portId} to ${offSpeedValue}`);
                            
                            // Wichtig: Setze den State als bestätigt mit dem neuen Wert
                            await this.adapter.setStateAsync(
                                `devices.${deviceId}.ports.${portId}.mode.offSpeed`, 
                                { val: offSpeedValue, ack: true }
                            );
                            
                            // Erzeuge offSpeedCache-State, falls er noch nicht existiert
                            const stateObj = {
                                type: 'state',
                                common: {
                                    name: 'Cached Off Speed',
                                    type: 'number',
                                    role: 'level',
                                    read: true,
                                    write: false
                                },
                                native: {}
                            };
                            
                            try {
                                await this.adapter.setObjectNotExistsAsync(
                                    `devices.${deviceId}.ports.${portId}.mode.offSpeedCache`, 
                                    stateObj
                                );
                            } catch (objError) {
                                this.adapter.log.warn(`Couldn't create offSpeedCache state: ${objError.message}`);
                            }
                            
                            // Verhindere, dass der nächste Update-Zyklus den Wert überschreibt
                            // Speichere den Wert in den lokalen Cache
                            await this.adapter.setStateAsync(
                                `devices.${deviceId}.ports.${portId}.mode.offSpeedCache`, 
                                { val: offSpeedValue, ack: true }
                            );
                            
                            resolve(true);
                        } else {
                            this.adapter.log.error(`API error: ${JSON.stringify(response)}`);
                            reject(new Error(`API error: ${response.msg || 'Unknown error'}`));
                        }
                    } catch (parseError) {
                        this.adapter.log.error(`Error parsing API response: ${parseError.message}`);
                        reject(parseError);
                    }
                });
            });
        } catch (error) {
            this.adapter.log.error(`Error setting offSpeed for device ${deviceId}, port ${portId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verarbeitet Änderungen an verschachtelten Port-Einstellungen
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {string} category - Einstellungskategorie
     * @param {Array} path - Pfadkomponenten
     * @param {any} value - Neuer Wert
     */
    async handleNestedPortSettingsChange(deviceId, portId, category, path, value) {
        if (path.length < 1) {
            this.adapter.log.warn(`Ungültiger Pfad für verschachtelte Port-Einstellungen: ${path.join('.')}`);
            return;
        }
        
        const setting = path[0];
        const statePath = `devices.${deviceId}.ports.${portId}.mode.${category}.${setting}`;
        
        // UI sofort aktualisieren, um Flackern zu vermeiden
        await this.stateManager.updateUIState(statePath, value);
        
        try {
            this.adapter.log.debug(`Verarbeite verschachtelte Port-Einstellung: deviceId=${deviceId}, portId=${portId}, category=${category}, setting=${setting}, value=${value}`);
            
            // Hole aktuelle vollständige Einstellungen für alle Kategorien
            const currentSettings = await this.client.getDeviceModeSettings(deviceId, portId);
            
            // Entferne unerwünschte Felder
            if (currentSettings.devMacAddr) delete currentSettings.devMacAddr;
            if (currentSettings.ipcSetting) delete currentSettings.ipcSetting;
            if (currentSettings.devSetting) delete currentSettings.devSetting;
            
            switch (category) {
                case 'timer':
                    switch (setting) {
                        case 'toOnMinutes':
                            this.adapter.log.debug(`Sende Timer-Minuten-bis-Ein an API: deviceId=${deviceId}, portId=${portId}, minutes=${parseInt(value)}`);
                            currentSettings[PORT_CONTROL_KEY.TIMER_DURATION_TO_ON] = parseInt(value) * 60;
                            break;
                            
                        case 'toOffMinutes':
                            this.adapter.log.debug(`Sende Timer-Minuten-bis-Aus an API: deviceId=${deviceId}, portId=${portId}, minutes=${parseInt(value)}`);
                            currentSettings[PORT_CONTROL_KEY.TIMER_DURATION_TO_OFF] = parseInt(value) * 60;
                            break;
                            
                        default:
                            this.adapter.log.warn(`Unbekannte Timer-Einstellung: ${setting}`);
                            return;
                    }
                    break;
                    
                case 'cycle':
                    switch (setting) {
                        case 'onMinutes':
                            this.adapter.log.debug(`Sende Zyklus-Minuten-Ein an API: deviceId=${deviceId}, portId=${portId}, minutes=${parseInt(value)}`);
                            currentSettings[PORT_CONTROL_KEY.CYCLE_DURATION_ON] = parseInt(value) * 60;
                            break;
                            
                        case 'offMinutes':
                            this.adapter.log.debug(`Sende Zyklus-Minuten-Aus an API: deviceId=${deviceId}, portId=${portId}, minutes=${parseInt(value)}`);
                            currentSettings[PORT_CONTROL_KEY.CYCLE_DURATION_OFF] = parseInt(value) * 60;
                            break;
                            
                        default:
                            this.adapter.log.warn(`Unbekannte Zyklus-Einstellung: ${setting}`);
                            return;
                    }
                    break;
                    
                case 'schedule':
                    switch (setting) {
                        case 'startEnabled':
                            this.adapter.log.debug(`Sende Zeitplan-Start-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                            currentSettings[PORT_CONTROL_KEY.SCHEDULED_START_TIME] = value ? SCHEDULE_MIDNIGHT_VALUE : SCHEDULE_DISABLED_VALUE;
                            break;
                            
                        case 'endEnabled':
                            this.adapter.log.debug(`Sende Zeitplan-Ende-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                            currentSettings[PORT_CONTROL_KEY.SCHEDULED_END_TIME] = value ? SCHEDULE_EOD_VALUE : SCHEDULE_DISABLED_VALUE;
                            break;
                            
                        case 'startTime':
                            // HH:MM-Format parsen
                            const startParts = value.split(':');
                            if (startParts.length === 2) {
                                const hours = parseInt(startParts[0]);
                                const minutes = parseInt(startParts[1]);
                                const totalMinutes = hours * 60 + minutes;
                                
                                this.adapter.log.debug(`Sende Zeitplan-Startzeit an API: deviceId=${deviceId}, portId=${portId}, time=${value}, totalMinutes=${totalMinutes}`);
                                currentSettings[PORT_CONTROL_KEY.SCHEDULED_START_TIME] = totalMinutes;
                            } else {
                                this.adapter.log.warn(`Ungültiges Zeitformat: ${value}`);
                                return;
                            }
                            break;
                            
                        case 'endTime':
                            // HH:MM-Format parsen
                            const endParts = value.split(':');
                            if (endParts.length === 2) {
                                const hours = parseInt(endParts[0]);
                                const minutes = parseInt(endParts[1]);
                                const totalMinutes = hours * 60 + minutes;
                                
                                this.adapter.log.debug(`Sende Zeitplan-Endzeit an API: deviceId=${deviceId}, portId=${portId}, time=${value}, totalMinutes=${totalMinutes}`);
                                currentSettings[PORT_CONTROL_KEY.SCHEDULED_END_TIME] = totalMinutes;
                            } else {
                                this.adapter.log.warn(`Ungültiges Zeitformat: ${value}`);
                                return;
                            }
                            break;
                            
                        default:
                            this.adapter.log.warn(`Unbekannte Zeitplan-Einstellung: ${setting}`);
                            return;
                    }
                    break;
                    
                case 'auto':
                    await this.updateAutoModeSettings(currentSettings, deviceId, portId, setting, value);
                    break;
                    
                case 'vpd':
                    await this.updateVpdModeSettings(currentSettings, deviceId, portId, setting, value);
                    break;
                    
                default:
                    this.adapter.log.warn(`Unbekannte Einstellungskategorie für den Port: ${category}`);
                    return;
            }
            
            // Sende aktualisierte Einstellungen an die API
            try {
                await this.client.updateDeviceModeSettings(
                    deviceId, 
                    portId, 
                    Object.entries(currentSettings).map(([key, value]) => [key, value])
                );
                this.adapter.log.debug(`API-Antwort für ${category}.${setting} erfolgreich`);
                
                // Überprüfe das Ergebnis nach einer kurzen Verzögerung
                setTimeout(async () => {
                    try {
                        const newSettings = await this.client.getDeviceModeSettings(deviceId, portId);
                        this.adapter.log.debug(`Einstellungen nach ${category}.${setting}-Änderung: ${JSON.stringify(newSettings)}`);
                    } catch (checkError) {
                        this.adapter.log.error(`Fehler beim Prüfen der neuen Einstellungen: ${checkError.message}`);
                    }
                }, 2000);
            } catch (apiError) {
                this.adapter.log.error(`API-Fehler bei ${category}.${setting}: ${apiError.message}`);
                if (apiError.response) {
                    this.adapter.log.error(`API-Antwort Fehler: ${JSON.stringify(apiError.response.data || {})}`);
                }
            }
            
        } catch (error) {
            this.adapter.log.error(`Fehler beim Aktualisieren der verschachtelten Port-Einstellung ${category}.${setting}: ${error.message}`);
            if (error.response) {
                this.adapter.log.error(`API-Antwort: ${JSON.stringify(error.response.data || {})}`);
            }
            if (error.stack) {
                this.adapter.log.error(`Stack-Trace: ${error.stack}`);
            }
        }
    }

    /**
     * Aktualisiert Auto-Modus-Einstellungen in den bestehenden Einstellungen
     * @param {object} settings - Einstellungsobjekt zum Aktualisieren
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {string} setting - Einstellung
     * @param {any} value - Neuer Wert
     */
    async updateAutoModeSettings(settings, deviceId, portId, setting, value) {
        this.adapter.log.debug(`Verarbeite Auto-Modus-Einstellung: deviceId=${deviceId}, portId=${portId}, setting=${setting}, value=${value}`);
        
        switch (setting) {
            case 'settingsMode':
                const autoModeIndex = SETTINGS_MODE_OPTIONS.indexOf(value);
                if (autoModeIndex >= 0) {
                    this.adapter.log.debug(`Sende Auto-Modus-Einstellungsmodus an API: deviceId=${deviceId}, portId=${portId}, mode=${value}, index=${autoModeIndex}`);
                    settings[PORT_CONTROL_KEY.AUTO_SETTINGS_MODE] = autoModeIndex;
                } else {
                    this.adapter.log.warn(`Ungültiger Auto-Modus-Wert: ${value}`);
                }
                break;
                
            case 'tempHighEnabled':
                this.adapter.log.debug(`Sende Temperatur-Hochgrenze-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                settings[PORT_CONTROL_KEY.AUTO_TEMP_HIGH_ENABLED] = value ? 1 : 0;
                break;
                
            case 'tempHighTrigger':
                const tempHighC = parseInt(value);
                const tempHighF = Math.round(tempHighC * 1.8 + 32);
                
                this.adapter.log.debug(`Sende Temperatur-Hochgrenze an API: deviceId=${deviceId}, portId=${portId}, tempC=${tempHighC}, tempF=${tempHighF}`);
                settings[PORT_CONTROL_KEY.AUTO_TEMP_HIGH_TRIGGER] = tempHighC;
                settings[PORT_CONTROL_KEY.AUTO_TEMP_HIGH_TRIGGER_F] = tempHighF;
                break;
                
            case 'tempLowEnabled':
                this.adapter.log.debug(`Sende Temperatur-Tiefgrenze-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                settings[PORT_CONTROL_KEY.AUTO_TEMP_LOW_ENABLED] = value ? 1 : 0;
                break;
                
            case 'tempLowTrigger':
                const tempLowC = parseInt(value);
                const tempLowF = Math.round(tempLowC * 1.8 + 32);
                
                this.adapter.log.debug(`Sende Temperatur-Tiefgrenze an API: deviceId=${deviceId}, portId=${portId}, tempC=${tempLowC}, tempF=${tempLowF}`);
                settings[PORT_CONTROL_KEY.AUTO_TEMP_LOW_TRIGGER] = tempLowC;
                settings[PORT_CONTROL_KEY.AUTO_TEMP_LOW_TRIGGER_F] = tempLowF;
                break;
                
            case 'humidityHighEnabled':
                this.adapter.log.debug(`Sende Feuchtigkeit-Hochgrenze-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_HIGH_ENABLED] = value ? 1 : 0;
                break;
                
            case 'humidityHighTrigger':
                this.adapter.log.debug(`Sende Feuchtigkeit-Hochgrenze an API: deviceId=${deviceId}, portId=${portId}, humidity=${parseInt(value)}`);
                settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_HIGH_TRIGGER] = parseInt(value);
                break;
                
            case 'humidityLowEnabled':
                this.adapter.log.debug(`Sende Feuchtigkeit-Tiefgrenze-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_LOW_ENABLED] = value ? 1 : 0;
                break;
                
            case 'humidityLowTrigger':
                this.adapter.log.debug(`Sende Feuchtigkeit-Tiefgrenze an API: deviceId=${deviceId}, portId=${portId}, humidity=${parseInt(value)}`);
                settings[PORT_CONTROL_KEY.AUTO_HUMIDITY_LOW_TRIGGER] = parseInt(value);
                break;
                
            case 'targetTempEnabled':
                this.adapter.log.debug(`Sende Zieltemperatur-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                settings[PORT_CONTROL_KEY.AUTO_TARGET_TEMP_ENABLED] = value ? 1 : 0;
                break;
                
            case 'targetTemp':
                const targetTempC = parseInt(value);
                const targetTempF = Math.round(targetTempC * 1.8 + 32);
                
                this.adapter.log.debug(`Sende Zieltemperatur an API: deviceId=${deviceId}, portId=${portId}, tempC=${targetTempC}, tempF=${targetTempF}`);
                settings[PORT_CONTROL_KEY.AUTO_TARGET_TEMP] = targetTempC;
                settings[PORT_CONTROL_KEY.AUTO_TARGET_TEMP_F] = targetTempF;
                break;
                
            case 'targetHumidityEnabled':
                this.adapter.log.debug(`Sende Zielfeuchtigkeit-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                settings[PORT_CONTROL_KEY.AUTO_TARGET_HUMIDITY_ENABLED] = value ? 1 : 0;
                break;
                
            case 'targetHumidity':
                this.adapter.log.debug(`Sende Zielfeuchtigkeit an API: deviceId=${deviceId}, portId=${portId}, humidity=${parseInt(value)}`);
                settings[PORT_CONTROL_KEY.AUTO_TARGET_HUMIDITY] = parseInt(value);
                break;
                
            default:
                this.adapter.log.warn(`Unbekannte Auto-Einstellung: ${setting}`);
        }
    }

    /**
     * Aktualisiert VPD-Modus-Einstellungen in den bestehenden Einstellungen
     * @param {object} settings - Einstellungsobjekt zum Aktualisieren
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {string} setting - Einstellung
     * @param {any} value - Neuer Wert
     */
    async updateVpdModeSettings(settings, deviceId, portId, setting, value) {
        this.adapter.log.debug(`Verarbeite VPD-Modus-Einstellung: deviceId=${deviceId}, portId=${portId}, setting=${setting}, value=${value}`);
        
        switch (setting) {
            case 'settingsMode':
                const vpdModeIndex = SETTINGS_MODE_OPTIONS.indexOf(value);
                if (vpdModeIndex >= 0) {
                    this.adapter.log.debug(`Sende VPD-Modus-Einstellungsmodus an API: deviceId=${deviceId}, portId=${portId}, mode=${value}, index=${vpdModeIndex}`);
                    settings[PORT_CONTROL_KEY.VPD_SETTINGS_MODE] = vpdModeIndex;
                } else {
                    this.adapter.log.warn(`Ungültiger VPD-Modus-Wert: ${value}`);
                }
                break;
                
            case 'highEnabled':
                this.adapter.log.debug(`Sende VPD-Hochgrenze-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                settings[PORT_CONTROL_KEY.VPD_HIGH_ENABLED] = value ? 1 : 0;
                break;
                
            case 'highTrigger':
                const highTriggerValue = Math.round(parseFloat(value) * 10);
                this.adapter.log.debug(`Sende VPD-Hochgrenze an API: deviceId=${deviceId}, portId=${portId}, vpd=${value}, scaledValue=${highTriggerValue}`);
                settings[PORT_CONTROL_KEY.VPD_HIGH_TRIGGER] = highTriggerValue;
                break;
                
            case 'lowEnabled':
                this.adapter.log.debug(`Sende VPD-Tiefgrenze-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                settings[PORT_CONTROL_KEY.VPD_LOW_ENABLED] = value ? 1 : 0;
                break;
                
            case 'lowTrigger':
                const lowTriggerValue = Math.round(parseFloat(value) * 10);
                this.adapter.log.debug(`Sende VPD-Tiefgrenze an API: deviceId=${deviceId}, portId=${portId}, vpd=${value}, scaledValue=${lowTriggerValue}`);
                settings[PORT_CONTROL_KEY.VPD_LOW_TRIGGER] = lowTriggerValue;
                break;
                
            case 'targetEnabled':
                this.adapter.log.debug(`Sende Ziel-VPD-Aktivierung an API: deviceId=${deviceId}, portId=${portId}, enabled=${value}`);
                settings[PORT_CONTROL_KEY.VPD_TARGET_ENABLED] = value ? 1 : 0;
                break;
                
            case 'target':
                const targetValue = Math.round(parseFloat(value) * 10);
                this.adapter.log.debug(`Sende Ziel-VPD an API: deviceId=${deviceId}, portId=${portId}, vpd=${value}, scaledValue=${targetValue}`);
                settings[PORT_CONTROL_KEY.VPD_TARGET] = targetValue;
                break;
                
            default:
                this.adapter.log.warn(`Unbekannte VPD-Einstellung: ${setting}`);
        }
    }
}

module.exports = PortModeHandler;