/**
 * AC Infinity API Client
 * Handles all API communication with AC Infinity servers
 */

"use strict";

const axios = require("axios");
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
        this.axiosInstance = axios.create({
            timeout: 30000,
            validateStatus: status => status >= 200 && status < 300
        });
    }

    /**
     * Creates headers for API requests
     * @param {boolean} useAuthToken - Whether to include authentication token
     * @returns {object}
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
            const normalizedPassword = this.password.substring(0, 25);
            const formData = `appEmail=${encodeURIComponent(this.email)}&appPasswordl=${encodeURIComponent(normalizedPassword)}`;
            this.log.debug(`Login attempt with: ${this.email}`);

            const response = await this.axiosInstance.post(
                `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`,
                formData,
                { headers: this.createHeaders(false) }
            );

            if (response.data && response.data.code === 200) {
                this.token = response.data.data.appId;
                this.log.debug("Login successful");
                return;
            }
            throw new Error(`Login failed: ${response.data ? response.data.msg : "Unknown error"}`);
        } catch (error) {
            if (error.response) {
                throw new Error(`Login failed with status ${error.response.status}: ${error.response.data ? error.response.data.msg : "Unknown error"}`);
            }
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    /**
     * Checks if client is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.token;
    }

    /**
     * General API call with automatic re-login on 401
     * @param {string} endpoint
     * @param {object} data
     * @param {boolean} needsAuth
     * @returns {Promise<any>}
     */
    async apiCall(endpoint, data, needsAuth = true) {
        if (needsAuth && !this.isLoggedIn()) {
            await this.login();
        }

        try {
            const formData = Object.entries(data)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join("&");

            const response = await this.axiosInstance.post(
                `${API_BASE_URL}${endpoint}`,
                formData,
                { headers: this.createHeaders(needsAuth) }
            );

            if (response.data && response.data.code === 200) {
                return response.data.data || {};
            }
            throw new Error(`API call to ${endpoint} failed: ${response.data ? response.data.msg : "Unknown error"}`);
        } catch (error) {
            if (error.response && error.response.status === 401 && needsAuth) {
                this.log.info("Token expired, attempting to re-login");
                await this.login();
                return this.apiCall(endpoint, data, needsAuth);
            }
            if (error.response) {
                throw new Error(`API call to ${endpoint} failed with status ${error.response.status}`);
            }
            throw new Error(`API call to ${endpoint} failed: ${error.message}`);
        }
    }

    /**
     * Gets list of all AC Infinity devices
     * @returns {Promise<Array>}
     */
    async getDevicesList() {
        return this.apiCall(API_ENDPOINTS.DEVICE_LIST, { userId: this.token }, true);
    }

    /**
     * Gets mode settings for a specific device port
     * @param {string|number} deviceId
     * @param {number} portId
     * @returns {Promise<object>}
     */
    async getDeviceModeSettings(deviceId, portId) {
        this.log.debug(`Getting mode settings for deviceId=${deviceId}, portId=${portId}`);
        return this.apiCall(API_ENDPOINTS.DEVICE_MODE_SETTINGS, {
            devId: deviceId,
            port: portId
        }, true);
    }

    /**
     * Gets advanced settings for a device or port
     * @param {string|number} deviceId
     * @param {number} portId - 0 for controller-level settings
     * @returns {Promise<object>}
     */
    async getDeviceSettings(deviceId, portId) {
        this.log.debug(`Getting device settings for deviceId=${deviceId}, portId=${portId}`);
        return this.apiCall(API_ENDPOINTS.DEVICE_SETTINGS, {
            devId: deviceId,
            port: portId
        }, true);
    }

    /**
     * Sends a raw URL-encoded form payload to the addDevMode endpoint.
     * This is the single write path for all mode and speed changes.
     * @param {string} formData - URL-encoded form data string
     * @returns {Promise<boolean>}
     */
    async sendRawModeUpdate(formData) {
        if (!this.isLoggedIn()) {
            await this.login();
        }

        try {
            this.log.debug(`Sending mode update payload`);

            const response = await this.axiosInstance.post(
                `${API_BASE_URL}${API_ENDPOINTS.UPDATE_DEVICE_MODE}`,
                formData,
                { headers: this.createHeaders(true) }
            );

            if (response.data && response.data.code === 200) {
                this.log.debug("Mode update successful");
                return true;
            }
            throw new Error(`Mode update failed: ${response.data ? response.data.msg : "Unknown error"}`);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                this.log.info("Token expired, re-logging in");
                await this.login();
                return this.sendRawModeUpdate(formData);
            }
            this.log.error(`Mode update error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Sets the device mode and speeds for a port.
     * Uses a minimal payload that mirrors the working app requests.
     *
     * atType values:
     *   1=Off, 2=On, 3=Auto, 4=Timer to On, 5=Timer to Off, 6=Cycle, 7=Schedule, 8=VPD
     *
     * @param {string|number} deviceId
     * @param {number} portId
     * @param {number} atType - Mode type (1-8)
     * @param {number} onSpeed - On speed (0-10)
     * @param {number} offSpeed - Off speed (0-10)
     * @returns {Promise<boolean>}
     */
    async setDeviceMode(deviceId, portId, atType, onSpeed, offSpeed) {
        if (!this.isLoggedIn()) {
            await this.login();
        }

        const settings = await this.getDeviceModeSettings(deviceId, portId);
        const modeSetid = settings.modeSetid;
        const vpdnums = (settings.vpdnums !== undefined && settings.vpdnums !== null) ? settings.vpdnums : 0;

        // speak = active speed; 0 when mode is Off (atType=1)
        const speak = (atType === 2) ? onSpeed : 0;

        const formData = [
            `modeSetid=${encodeURIComponent(modeSetid)}`,
            `devId=${encodeURIComponent(deviceId)}`,
            `externalPort=${encodeURIComponent(portId)}`,
            `offSpead=${encodeURIComponent(offSpeed)}`,
            `onSpead=${encodeURIComponent(onSpeed)}`,
            `atType=${encodeURIComponent(atType)}`,
            `speak=${encodeURIComponent(speak)}`,
            `curMode=${encodeURIComponent(atType)}`,
            `vpdstatus=0`,
            `vpdnums=${encodeURIComponent(vpdnums)}`
        ].join("&");

        this.log.info(`setDeviceMode: deviceId=${deviceId}, portId=${portId}, atType=${atType}, onSpeed=${onSpeed}, offSpeed=${offSpeed}`);
        return this.sendRawModeUpdate(formData);
    }

    /**
     * Updates specific mode settings parameters (timer/cycle/auto/vpd/schedule values).
     * Fetches current settings, applies overrides, and sends the full payload.
     * @param {string|number} deviceId
     * @param {number} portId
     * @param {Array<Array<string|number>>} keyValues - Array of [key, value] pairs to override
     * @returns {Promise<boolean>}
     */
    async updateDeviceModeSettings(deviceId, portId, keyValues) {
        if (!this.isLoggedIn()) {
            await this.login();
        }

        const deviceIdStr = String(deviceId);
        const portIdNum = Number(portId);

        const settings = await this.getDeviceModeSettings(deviceIdStr, portIdNum);
        this.log.debug(`Current mode settings fetched for update`);

        // Remove fields that the API rejects in write calls
        const fieldsToRemove = ["devMacAddr", "ipcSetting", "devSetting"];
        for (const field of fieldsToRemove) {
            delete settings[field];
        }

        // Ensure required fields exist
        if (!("vpdstatus" in settings)) settings.vpdstatus = 0;
        if (!("vpdnums" in settings)) settings.vpdnums = 0;

        settings.devId = parseInt(deviceIdStr);
        if ("modeSetid" in settings) {
            settings.modeSetid = String(settings.modeSetid);
        }

        // Apply the requested overrides
        for (const [key, value] of keyValues) {
            settings[key] = (typeof value === "number") ? value : parseInt(String(value));
        }

        // Replace any remaining null/undefined with 0
        for (const key in settings) {
            if (settings[key] === null || settings[key] === undefined) {
                settings[key] = 0;
            }
        }

        const formData = Object.entries(settings)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join("&");

        return this.sendRawModeUpdate(formData);
    }

    /**
     * Updates advanced (device/port-level) settings
     * @param {string|number} deviceId
     * @param {number} portId - 0 for controller-level settings
     * @param {string} deviceName - Device name (prevents API from resetting it to "None")
     * @param {Array<Array<string|number>>} keyValues - Array of [key, value] pairs
     * @returns {Promise<void>}
     */
    async updateAdvancedSettings(deviceId, portId, deviceName, keyValues) {
        if (!this.isLoggedIn()) {
            await this.login();
        }

        const deviceIdStr = String(deviceId);
        const portIdNum = Number(portId);

        const settings = await this.getDeviceSettings(deviceIdStr, portIdNum);

        settings.devName = deviceName;

        const fieldsToRemove = [
            "setId", "devMacAddr", "portResistance", "devTimeZone",
            "sensorSetting", "sensorTransBuff", "subDeviceVersion",
            "secFucReportTime", "updateAllPort", "calibrationTime"
        ];
        for (const field of fieldsToRemove) {
            delete settings[field];
        }

        const stringFields = ["sensorTransBuffStr", "sensorSettingStr", "portParamData", "paramSensors"];
        for (const field of stringFields) {
            if (!(field in settings) || settings[field] === null) {
                settings[field] = "";
            }
        }

        const defaultFields = ["sensorOneType", "isShare", "targetVpdSwitch", "sensorTwoType", "zoneSensorType"];
        for (const field of defaultFields) {
            if (!(field in settings)) {
                settings[field] = 0;
            }
        }

        settings.devId = parseInt(deviceIdStr);

        for (const key in settings) {
            if (settings[key] === null || settings[key] === undefined) {
                settings[key] = 0;
            }
        }

        for (const [key, value] of keyValues) {
            settings[key] = parseInt(String(value));
        }

        const formData = Object.entries(settings)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join("&");

        const response = await this.axiosInstance.post(
            `${API_BASE_URL}${API_ENDPOINTS.UPDATE_ADVANCED_SETTINGS}`,
            formData,
            { headers: this.createHeaders(true) }
        );

        if (response.data && response.data.code === 200) {
            this.log.info(`Advanced settings updated for device ${deviceIdStr}, port ${portIdNum}`);
            return;
        }

        throw new Error(`Failed to update advanced settings: ${response.data ? response.data.msg : "Unknown error"}`);
    }
}

module.exports = ACInfinityClient;
