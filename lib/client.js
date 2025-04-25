/**
 * AC Infinity API Client new
 * Handles all API communication with AC Infinity servers
 */

"use strict";

const axios = require("axios");
const { exec } = require('child_process');
const { API_BASE_URL, API_ENDPOINTS } = require("./constants");

class ACInfinityClient {
    /**
     * Creates a new AC Infinity API client
     * @param {string} email - AC Infinity account email
     * @param {string} password - AC Infinity account password
     * @param {object} log - Logger object
     */
    constructor(email, password, log) {
        this.email = email;
        this.password = password;
        this.log = log;
        this.token = null;
        this.hashedPassword = null;
        this.axiosInstance = axios.create({
            timeout: 30000, // Längeres Timeout für stabilere Verbindungen
            validateStatus: status => status >= 200 && status < 300
        });
    }

    /**
     * Creates headers for API requests
     * @param {boolean} useAuthToken - Whether to include authentication token
     * @returns {object} - Headers object
     */
    createHeaders(useAuthToken = false) {
        const headers = {
            "User-Agent": "ACController/1.8.5 (com.acinfinity.humiture; build:500; iOS 17.0.1) Alamofire/5.7.1",
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
        };

        if (useAuthToken && this.token) {
            headers.token = this.token;
        }

        return headers;
    }

    /**
     * Performs API login and obtains authentication token
     * @returns {Promise<void>}
     */
    async login() {
        try {
            // AC Infinity API truncates passwords to 25 characters
            const normalizedPassword = this.password.substring(0, 25);

            // Formular-Daten direkt erstellen
            const formData = `appEmail=${encodeURIComponent(this.email)}&appPasswordl=${encodeURIComponent(normalizedPassword)}`;
            this.log.debug(`Login attempt with: ${this.email}, password length: ${normalizedPassword.length}`);

            const response = await this.axiosInstance.post(
                `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`,
                formData,
                {
                    headers: this.createHeaders(false)
                }
            );

            if (response.data && response.data.code === 200) {
                this.token = response.data.data.appId;
                this.hashedPassword = response.data.data.appPasswordl;
                this.log.debug(`Login successful, token: ${this.token}`);
                return;
            } else {
                this.log.error(`Login failed with response: ${JSON.stringify(response.data)}`);
                throw new Error(`Login failed: ${response.data ? response.data.msg : 'Unknown error'}`);
            }
        } catch (error) {
            if (error.response) {
                this.log.error(`Login error response: ${JSON.stringify(error.response.data || {})}`);
                throw new Error(`Login failed with status ${error.response.status}: ${error.response.data ? error.response.data.msg : 'Unknown error'}`);
            }
            this.log.error(`Login error: ${error.message}`);
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    /**
     * Checks if client is logged in
     * @returns {boolean} - True if logged in, false otherwise
     */
    isLoggedIn() {
        return !!this.token;
    }

    /**
     * Allgemeine Methode für API-Aufrufe mit automatischer Wiederanmeldung
     * @param {string} endpoint - API-Endpunkt
     * @param {object} data - Zu sendende Daten
     * @param {boolean} needsAuth - Ob Auth-Token benötigt wird
     * @returns {Promise<any>} - API-Antwort
     */
    async apiCall(endpoint, data, needsAuth = true) {
        // Sicherstellen, dass wir angemeldet sind, wenn Auth benötigt wird
        if (needsAuth && !this.isLoggedIn()) {
            await this.login();
        }
        
        try {
            // Formular-Daten erstellen
            const formData = Object.entries(data)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
                
            this.log.debug(`API call to ${endpoint} with data: ${formData}`);
            
            const response = await this.axiosInstance.post(
                `${API_BASE_URL}${endpoint}`,
                formData,
                {
                    headers: this.createHeaders(needsAuth)
                }
            );
            
            if (response.data && response.data.code === 200) {
                return response.data.data || {};
            } else {
                this.log.error(`API error from ${endpoint}: ${response.data ? response.data.msg : 'Unknown error'}`);
                throw new Error(`API call to ${endpoint} failed: ${response.data ? response.data.msg : 'Unknown error'}`);
            }
        } catch (error) {
            if (error.response && error.response.status === 401 && needsAuth) {
                this.log.info("Token expired, attempting to re-login");
                await this.login();
                // Rekursiver Aufruf nach erneuter Anmeldung
                return this.apiCall(endpoint, data, needsAuth);
            }
            
            if (error.response) {
                this.log.error(`API error response from ${endpoint}: ${JSON.stringify(error.response.data || {})}`);
                throw new Error(`API call to ${endpoint} failed with status ${error.response.status}: ${error.response.data ? error.response.data.msg : 'Unknown error'}`);
            }
            this.log.error(`API call error to ${endpoint}: ${error.message}`);
            throw new Error(`API call to ${endpoint} failed: ${error.message}`);
        }
    }

    /**
     * Gets list of all AC Infinity devices
     * @returns {Promise<Array>} - List of devices
     */
    async getDevicesList() {
        return this.apiCall(API_ENDPOINTS.DEVICE_LIST, { userId: this.token }, true);
    }

    /**
     * Gets settings for a specific device port
     * @param {string|number} deviceId - Device ID
     * @param {number} portId - Port ID
     * @returns {Promise<object>} - Device mode settings
     */
    async getDeviceModeSettings(deviceId, portId) {
        this.log.debug(`Getting device mode settings for deviceId=${deviceId}, portId=${portId}`);
        return this.apiCall(API_ENDPOINTS.DEVICE_MODE_SETTINGS, {
            devId: deviceId,
            port: portId
        }, true);
    }

    /**
     * Gets advanced settings for a device or port
     * @param {string|number} deviceId - Device ID
     * @param {number} portId - Port ID (0 for controller settings)
     * @returns {Promise<object>} - Device settings
     */
    async getDeviceSettings(deviceId, portId) {
        this.log.debug(`Getting device settings for deviceId=${deviceId}, portId=${portId}`);
        return this.apiCall(API_ENDPOINTS.DEVICE_SETTINGS, {
            devId: deviceId,
            port: portId
        }, true);
    }

    /**
     * Ein/Aus-Schaltung mit direktem curl-Befehl (genau wie im Terminal)
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {boolean} turnOn - true für Ein, false für Aus
     * @returns {Promise<boolean>} - True bei Erfolg
     */
    async controlDeviceWithCurl(deviceId, portId, turnOn) {
        if (!this.isLoggedIn()) {
            await this.login();
        }

        // Settings holen für die modeSetid
        const settings = await this.getDeviceModeSettings(deviceId, portId);
        const modeSetid = settings.modeSetid;
        const vpdnums = settings.vpdnums || 107;
        
        // Parameter festlegen
        const mode = turnOn ? 2 : 1;      // 1=Aus, 2=Ein
        const speed = turnOn ? 3 : 0;     // Geschwindigkeit 0 für Aus, 3 für Ein
        
        // Genau den Befehl bauen, der im Terminal funktioniert
        const cmd = `curl -X POST "http://www.acinfinityserver.com/api/dev/addDevMode" \\
          -H "User-Agent: ACController/1.8.5 (com.acinfinity.humiture; build:500; iOS 17.0.1) Alamofire/5.7.1" \\
          -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \\
          -H "token: ${this.token}" \\
          -d "modeSetid=${modeSetid}&devId=${deviceId}&externalPort=${portId}&offSpead=0&onSpead=${speed}&atType=${mode}&speak=${speed}&curMode=${mode}&vpdstatus=0&vpdnums=${vpdnums}"`;
        
        this.log.info(`Executing curl command: ${cmd}`);
        
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout) => {
                if (error) {
                    this.log.error(`Curl command execution error: ${error.message}`);
                    reject(error);
                    return;
                }
                
                this.log.debug(`Curl command output: ${stdout}`);
                
                try {
                    const response = JSON.parse(stdout);
                    if (response && response.code === 200) {
                        this.log.info('Curl command successful');
                        resolve(true);
                    } else {
                        this.log.error(`Curl command API error: ${JSON.stringify(response)}`);
                        reject(new Error(`API error: ${response.msg || 'Unknown error'}`));
                    }
                } catch (parseError) {
                    this.log.error(`Error parsing curl response: ${parseError.message}`);
                    reject(parseError);
                }
            });
        });
    }

    /**
     * Lüftergeschwindigkeit ändern mit direktem curl-Befehl
     * @param {string} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {number} speed - Geschwindigkeit (0-10)
     * @returns {Promise<boolean>} - True bei Erfolg
     */
    async setFanSpeedWithCurl(deviceId, portId, speed) {
        if (!this.isLoggedIn()) {
            await this.login();
        }

        // Settings holen für die modeSetid
        const settings = await this.getDeviceModeSettings(deviceId, portId);
        const modeSetid = settings.modeSetid;
        const vpdnums = settings.vpdnums || 107;
        
        // Immer im Ein-Modus für Geschwindigkeitsänderung
        const mode = 2;  // 2=Ein
        
        // Genau den Befehl bauen, der im Terminal funktioniert
        const cmd = `curl -X POST "http://www.acinfinityserver.com/api/dev/addDevMode" \\
          -H "User-Agent: ACController/1.8.5 (com.acinfinity.humiture; build:500; iOS 17.0.1) Alamofire/5.7.1" \\
          -H "Content-Type: application/x-www-form-urlencoded; charset=utf-8" \\
          -H "token: ${this.token}" \\
          -d "modeSetid=${modeSetid}&devId=${deviceId}&externalPort=${portId}&offSpead=0&onSpead=${speed}&atType=${mode}&speak=${speed}&curMode=${mode}&vpdstatus=0&vpdnums=${vpdnums}"`;
        
        this.log.info(`Executing curl command for fan speed: ${cmd}`);
        
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout) => {
                if (error) {
                    this.log.error(`Curl command execution error: ${error.message}`);
                    reject(error);
                    return;
                }
                
                this.log.debug(`Curl command output: ${stdout}`);
                
                try {
                    const response = JSON.parse(stdout);
                    if (response && response.code === 200) {
                        this.log.info('Curl command successful');
                        resolve(true);
                    } else {
                        this.log.error(`Curl command API error: ${JSON.stringify(response)}`);
                        reject(new Error(`API error: ${response.msg || 'Unknown error'}`));
                    }
                } catch (parseError) {
                    this.log.error(`Error parsing curl response: ${parseError.message}`);
                    reject(parseError);
                }
            });
        });
    }

    /**
 * Sendet ein direktes Update ohne jegliche Verarbeitung
 * @param {string} formData - Vorbereitete Form-Daten als String
 * @returns {Promise<boolean>} - True bei Erfolg
 */
async sendRawModeUpdate(formData) {
    if (!this.isLoggedIn()) {
        await this.login();
    }

    try {
        // Ausführliches Logging des Form-Daten
        this.log.info(`Sende folgende Rohdaten an API: ${formData}`);
        
        // Zusätzliches Logging der Header
        const headers = this.createHeaders(true);
        this.log.debug(`Mit folgenden Headern: ${JSON.stringify(headers)}`);
        
        const response = await this.axiosInstance.post(
            `${API_BASE_URL}${API_ENDPOINTS.UPDATE_DEVICE_MODE}`,
            formData,
            {
                headers: headers
            }
        );
        
        this.log.info(`API-Antwort erhalten: ${JSON.stringify(response.data)}`);
        
        if (response.data && response.data.code === 200) {
            this.log.info(`Aktualisierung der Gerätemodus-Einstellungen erfolgreich`);
            return true;
        }
        
        this.log.error(`Fehler bei der Aktualisierung der Gerätemodus-Einstellungen: ${response.data ? response.data.msg : 'Unbekannter Fehler'}`);
        throw new Error(`Fehler bei der Aktualisierung der Gerätemodus-Einstellungen: ${response.data ? response.data.msg : 'Unbekannter Fehler'}`);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            this.log.info("Token abgelaufen, versuche erneut anzumelden");
            await this.login();
            return this.sendRawModeUpdate(formData); // Nach Login erneut versuchen
        }
        
        this.log.error(`Fehler bei Rohdaten-Update: ${error.message}`);
        if (error.response) {
            this.log.error(`API-Antwort: Status ${error.response.status}`);
            this.log.error(`API-Antwort Daten: ${JSON.stringify(error.response.data || {})}`);
        }
        throw error;
    }
}

/**
 * Updates device mode settings for a port
 * @param {string|number} deviceId - Device ID
 * @param {number} portId - Port ID
 * @param {Array<Array<string|number>>|object} keyValues - Array of key-value pairs or complete settings object to update
 * @returns {Promise<boolean>} - True if successful
 */
async updateDeviceModeSettings(deviceId, portId, keyValues) {
    if (!this.isLoggedIn()) {
        await this.login();
    }

    try {
        // Normalisierte Werte
        const deviceIdStr = String(deviceId);
        const portIdNum = Number(portId);
        
        // Hole die aktuellen Einstellungen
        this.log.debug(`Hole aktuelle Einstellungen für Gerät ${deviceIdStr}, Port ${portIdNum}`);
        const settings = await this.getDeviceModeSettings(deviceIdStr, portIdNum);
        
        this.log.debug(`Vorherige Einstellungen: ${JSON.stringify(settings)}`);
        
        // Entferne Felder, die nicht im Update-Payload sein sollten
        const fieldsToRemove = [
            'devMacAddr',
            'ipcSetting',
            'devSetting'
        ];
        
        for (const field of fieldsToRemove) {
            if (field in settings) {
                delete settings[field];
            }
        }
        
        // Füge Standardfelder hinzu, die die API erwartet
        if (!('vpdstatus' in settings)) settings.vpdstatus = 0;
        if (!('vpdnums' in settings)) settings.vpdnums = 0;
        
        // Stelle sicher, dass IDs Ganzzahlen sind
        settings.devId = parseInt(deviceIdStr);
        if ('modeSetid' in settings) {
            settings.modeSetid = String(settings.modeSetid);
        }
        
        // Bei Array von Schlüssel-Wert-Paaren
        if (Array.isArray(keyValues) && keyValues.length > 0 && Array.isArray(keyValues[0])) {
            // Wende die Benutzeränderungen an
            this.log.debug(`Wende Benutzeränderungen als Key-Value-Paare an: ${JSON.stringify(keyValues)}`);
            for (const [key, value] of keyValues) {
                settings[key] = typeof value === 'number' ? value : parseInt(String(value));
            }
        }
        // Bei direktem Objekt
        else if (keyValues && typeof keyValues === 'object' && !Array.isArray(keyValues)) {
            // Kopiere alle Eigenschaften
            this.log.debug(`Wende Benutzeränderungen als Objekt an: ${JSON.stringify(keyValues)}`);
            for (const key in keyValues) {
                settings[key] = keyValues[key];
            }
        }
        
        // Stelle sicher, dass keine Werte null sind
        for (const key in settings) {
            if (settings[key] === null || settings[key] === undefined) {
                settings[key] = 0;
            }
        }
        
        // Vergleiche mit bekanntem funktionierenden curl-Befehl
        this.log.info(`Zu sendende Einstellungen: ${JSON.stringify(settings)}`);
        
        // Erfolgreicher curl-Befehl zum Vergleich (als Referenz)
        const curlReference = "modeSetid=1767995383970676737&devId=1424979258063390001&externalPort=1&offSpead=0&onSpead=0&onSelfSpead=0&activeHt=0&devHt=90&devHtf=194&devLtf=32&activeLt=0&devLt=0&activeHh=0&devHh=100&activeLh=0&devLh=0&acitveTimerOn=0&acitveTimerOff=0&activeCycleOn=1800&activeCycleOff=1800&schedStartTime=65535&schedEndtTime=65535&surplus=0&modeType=0&activeHtVpd=0&activeLtVpd=0&activeHtVpdNums=99&activeLtVpdNums=1&targetTSwitch=0&targetHumiSwitch=0&settingMode=0&vpdSettingMode=0&targetVpdSwitch=0&targetVpd=0&targetTemp=0&targetTempF=32&targetHumi=0&atType=1&speak=0&curMode=1&vpdstatus=0&vpdnums=107";
        
        // Überprüfe, ob alle wichtigen Parameter aus dem curl-Referenzbefehl vorhanden sind
        const curlParams = new URLSearchParams(curlReference);
        const missingParams = [];
        
        curlParams.forEach((value, key) => {
            if (!(key in settings)) {
                missingParams.push(key);
            }
        });
        
        if (missingParams.length > 0) {
            this.log.warn(`Fehlende Parameter im Vergleich zum erfolgreichen curl-Befehl: ${missingParams.join(', ')}`);
            
            // Füge fehlende Parameter hinzu
            for (const param of missingParams) {
                settings[param] = curlParams.get(param);
                this.log.debug(`Parameter ${param} mit Wert ${curlParams.get(param)} hinzugefügt`);
            }
        }
        
        // Formdata erstellen
        const formData = Object.entries(settings)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        
        this.log.info(`Sende Form-Daten: ${formData}`);
        
        // Verwende sendRawModeUpdate für konsistentere Ergebnisse
        return this.sendRawModeUpdate(formData);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            this.log.info("Token abgelaufen, versuche erneut anzumelden");
            await this.login();
            return this.updateDeviceModeSettings(deviceId, portId, keyValues); // Nach Login erneut versuchen
        }
        
        if (error.response) {
            this.log.error(`API-Fehler: ${JSON.stringify(error.response.data || {})}`);
            this.log.error(`API-Fehler Status: ${error.response.status}`);
        } else {
            this.log.error(`Fehler beim Aktualisieren der Gerätemodus-Einstellungen: ${error.message}`);
        }
        
        throw error;
    }
}

    /**
     * Methode für das Aktualisieren der Lüftergeschwindigkeit
     * @param {string|number} deviceId - Device ID
     * @param {number} portId - Port ID
     * @param {number} speedValue - Neue Geschwindigkeit (0-10)
     * @returns {Promise<boolean>} - True bei Erfolg
     */
    async updateFanSpeed(deviceId, portId, speedValue) {
        // Normalisiere die Parameter
        const normalizedDeviceId = String(deviceId);
        const normalizedPortId = Number(portId);
        const normalizedSpeedValue = Number(speedValue);
        
        this.log.info(`Setting fan speed: deviceId=${normalizedDeviceId}, portId=${normalizedPortId}, speed=${normalizedSpeedValue}`);
        
        // Verwende den direkten curl-Befehl für bessere Zuverlässigkeit
        return this.setFanSpeedWithCurl(normalizedDeviceId, normalizedPortId, normalizedSpeedValue);
    }

    /**
     * Updates advanced settings for a device
     * @param {string|number} deviceId - Device ID 
     * @param {number} portId - Port ID (0 for controller settings)
     * @param {string} deviceName - Device name
     * @param {Array<Array<string|number>>} keyValues - Array of key-value pairs to update
     * @returns {Promise<void>}
     */
    async updateAdvancedSettings(deviceId, portId, deviceName, keyValues) {
        if (!this.isLoggedIn()) {
            await this.login();
        }

        try {
            // Normalisiere die Parameter
            const deviceIdStr = String(deviceId);
            const portIdNum = Number(portId);
            
            this.log.debug(`Updating advanced settings for device ${deviceIdStr}, port ${portIdNum}`);
            
            // Hole die bestehenden Einstellungen
            const settings = await this.getDeviceSettings(deviceIdStr, portIdNum);
            
            this.log.debug(`Previous advanced settings: ${JSON.stringify(settings)}`);
            
            // Setze den Gerätenamen (um zu verhindern, dass er zu "None" geändert wird)
            settings.devName = deviceName;
            
            // Entferne Felder, die nicht im Update-Payload erwartet werden
            const fieldsToRemove = [
                'setId',
                'devMacAddr',
                'portResistance',
                'devTimeZone',
                'sensorSetting',
                'sensorTransBuff',
                'subDeviceVersion',
                'secFucReportTime',
                'updateAllPort',
                'calibrationTime'
            ];
            
            for (const field of fieldsToRemove) {
                if (field in settings) {
                    delete settings[field];
                }
            }
            
            // Setze String-Felder, die null sein könnten, auf leere Strings
            const stringFields = [
                'sensorTransBuffStr',
                'sensorSettingStr',
                'portParamData',
                'paramSensors'
            ];
            
            for (const field of stringFields) {
                if (!(field in settings) || settings[field] === null) {
                    settings[field] = '';
                }
            }
            
            // Füge Standardfelder hinzu, die evtl. nicht existieren
            const defaultFields = [
                'sensorOneType',
                'isShare',
                'targetVpdSwitch',
                'sensorTwoType',
                'zoneSensorType'
            ];
            
            for (const field of defaultFields) {
                if (!(field in settings)) {
                    settings[field] = 0;
                }
            }
            
            // Stelle sicher, dass IDs Ganzzahlen sind
            settings.devId = parseInt(deviceIdStr);
            
            // Setze alle null-Werte auf 0
            for (const key in settings) {
                if (settings[key] === null || settings[key] === undefined) {
                    settings[key] = 0;
                }
            }
            
            // Wende die Benutzeränderungen an
            for (const [key, value] of keyValues) {
                settings[key] = parseInt(String(value));
            }
            
            // Formdata erstellen
            const formData = Object.entries(settings)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
                
            this.log.debug(`Sending advanced settings form data: ${formData}`);

            // API-Aufruf durchführen
            const response = await this.axiosInstance.post(
                `${API_BASE_URL}${API_ENDPOINTS.UPDATE_ADVANCED_SETTINGS}`,
                formData,
                {
                    headers: this.createHeaders(true)
                }
            );
            
            if (response.data && response.data.code === 200) {
                this.log.info(`Successfully updated advanced settings for device ${deviceIdStr}, port ${portIdNum}`);
                return;
            } else {
                this.log.error(`Failed to update advanced settings: ${response.data ? response.data.msg : 'Unknown error'}`);
                throw new Error(`Failed to update advanced settings: ${response.data ? response.data.msg : 'Unknown error'}`);
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                this.log.info("Token expired, attempting to re-login");
                await this.login();
                return this.updateAdvancedSettings(deviceId, portId, deviceName, keyValues); // Retry after login
            }
            
            if (error.response) {
                this.log.error(`API error during advanced settings update: ${JSON.stringify(error.response.data || {})}`);
                this.log.error(`API error status: ${error.response.status}`);
            } else {
                this.log.error(`Error updating advanced settings: ${error.message}`);
            }
            
            throw new Error(`Failed to update advanced settings: ${error.message}`);
        }
    }
}

module.exports = ACInfinityClient;