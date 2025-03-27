/**
 * ioBroker AC Infinity Adapter
 * Adapter to control AC Infinity devices via ioBroker
 * 
 * Based on the Home Assistant integration by dalinicus
 * https://github.com/dalinicus/homeassistant-acinfinity
 */

"use strict";

const utils = require("@iobroker/adapter-core");
const ACInfinityClient = require("./lib/client");
const StateManager = require("./lib/stateManager");
const { DEFAULT_POLLING_INTERVAL, MINIMUM_POLLING_INTERVAL } = require("./lib/constants");

class ACInfinity extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: "acinfinity",
        });

        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));

        this.client = null;
        this.stateManager = null;
        this.pollingInterval = null;
        this.isConnected = false;
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize adapter
        this.log.info("Starting AC Infinity adapter");

        // Check if the warning has been acknowledged
        const warningState = await this.getStateAsync("info.warningAcknowledged");
        
        if (!warningState || warningState.val !== true) {
            this.log.warn("BETA VERSION: This adapter is in beta. Use at your own risk!");
            
            // Show warning message to user
            this.sendToAsync("system.adapter.admin.0", "popup", {
                title: {
                    en: "⚠️ WARNING: BETA VERSION ⚠️",
                    de: "⚠️ WARNUNG: BETA VERSION ⚠️"
                },
                text: {
                    en: "This adapter is in an early development stage. By continuing to use it, you acknowledge that you use this adapter at your own risk. The author assumes no liability for any damage.",
                    de: "Dieser Adapter befindet sich in einem frühen Entwicklungsstadium. Mit der weiteren Nutzung bestätigen Sie, dass Sie diesen Adapter auf eigene Gefahr verwenden. Der Autor übernimmt keine Haftung für eventuelle Schäden."
                },
                type: "warning",
                timeout: 30,
                modal: true,
                buttons: [
                    {
                        text: {
                            en: "I understand, continue",
                            de: "Ich verstehe, fortfahren"
                        },
                        id: "accept",
                        class: "primary",
                        results: ["accept"]
                    }
                ]
            }, result => {
                // Set the warning as acknowledged regardless of result
                this.setState("info.warningAcknowledged", { val: true, ack: true });
            });
        }

        // Get adapter configuration
        const email = this.config.email;
        const password = this.config.password;
        const pollingInterval = Math.max(
            this.config.pollingInterval || DEFAULT_POLLING_INTERVAL,
            MINIMUM_POLLING_INTERVAL
        );

        if (!email || !password) {
            this.log.error("Missing login credentials. Please configure in adapter settings.");
            return;
        }

        // Set up connection indicator state
        await this.setStateAsync("info.connection", { val: false, ack: true });

        try {
            // Initialize API client
            this.client = new ACInfinityClient(email, password, this.log);
            this.stateManager = new StateManager(this);
            
            // Wichtig: Den Client an den StateManager weitergeben
            this.stateManager.setClient(this.client);

            // Attempt to login
            this.log.info(`Logging in with email: ${email}`);
            await this.client.login();
            
            // If we got here, login was successful
            this.log.info("Login successful");
            this.isConnected = true;
            await this.setStateAsync("info.connection", { val: true, ack: true });

            // Store token information
            await this.setStateAsync("info.token", { val: this.client.token, ack: true });

            // Abonniere alle Zustände
            this.subscribeStates("*");
            this.log.debug("Abonniere alle Zustände mit subscribeStates('*')");

            // Initialize adapter by fetching devices and setting up states
            await this.initializeAdapter();

            // Set up polling for regular updates
            this.log.info(`Setting polling interval to ${pollingInterval} seconds`);
            this.pollingInterval = setInterval(async () => {
                try {
                    await this.updateDeviceData();
                } catch (error) {
                    this.log.error(`Error during polling update: ${error.message}`);
                    if (error.message.includes("unauthorized") || error.message.includes("auth")) {
                        this.log.info("Authentication error detected, attempting to re-login");
                        try {
                            await this.client.login();
                            this.log.info("Re-login successful");
                        } catch (loginError) {
                            this.log.error(`Failed to re-login: ${loginError.message}`);
                        }
                    }
                }
            }, pollingInterval * 1000);
        } catch (error) {
            this.log.error(`Initialization error: ${error.message}`);
            await this.setStateAsync("info.connection", { val: false, ack: true });
        }
    }

    /**
     * Initialize adapter by fetching devices and setting up states
     */
    async initializeAdapter() {
        this.log.info("Initializing adapter and fetching devices");
        
        try {
            // Fetch all devices
            const devices = await this.client.getDevicesList();
            
            // Debug log - check structure
            if (devices && devices.length > 0) {
                this.log.debug(`First device sample: ${JSON.stringify(devices[0]).substring(0, 1000)}...`);
            }
            
            this.log.info(`Found ${devices.length} devices`);

            // Create device information in state tree
            await this.stateManager.initializeDevices(devices);

            // Perform initial data update
            await this.updateDeviceData();
            
            this.log.info("Adapter initialization completed successfully");
        } catch (error) {
            this.log.error(`Failed to initialize adapter: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update all device data
     */
    async updateDeviceData() {
        if (!this.isConnected || !this.client) {
            this.log.debug("Not connected, skipping update");
            return;
        }

        this.log.debug("Updating device data");
        try {
            // Get latest device data
            const devices = await this.client.getDevicesList();
            
            this.log.debug(`Fetched ${devices.length} devices for update`);
            
            // Update states for all devices
            for (const device of devices) {
                this.log.debug(`Updating device ${device.devId} (${device.devName})`);
                
                // Debug logging for important values
                if (typeof device.temperature !== 'undefined') {
                    this.log.debug(`Device ${device.devId} temperature: ${device.temperature} (raw), ${device.temperature/100} (converted)`);
                }
                if (typeof device.humidity !== 'undefined') {
                    this.log.debug(`Device ${device.devId} humidity: ${device.humidity} (raw), ${device.humidity/100} (converted)`);
                }
                if (typeof device.vpdnums !== 'undefined') {
                    this.log.debug(`Device ${device.devId} vpd: ${device.vpdnums} (raw), ${device.vpdnums/100} (converted)`);
                }
                
                await this.stateManager.updateDeviceData(device);
                
                // Fetch and update port settings for each device
                if (device.deviceInfo && Array.isArray(device.deviceInfo.ports)) {
                    for (const port of device.deviceInfo.ports) {
                        const portId = port.port;
                        this.log.debug(`Fetching settings for device ${device.devId}, port ${portId}`);
                        
                        try {
                            const portSettings = await this.client.getDeviceModeSettings(device.devId, portId);
                            await this.stateManager.updatePortSettings(device.devId, portId, portSettings);
                        } catch (portError) {
                            this.log.warn(`Error fetching port mode settings for device ${device.devId}, port ${portId}: ${portError.message}`);
                        }
                        
                        try {
                            const advancedSettings = await this.client.getDeviceSettings(device.devId, portId);
                            await this.stateManager.updateAdvancedSettings(device.devId, portId, advancedSettings);
                        } catch (advError) {
                            this.log.warn(`Error fetching advanced settings for device ${device.devId}, port ${portId}: ${advError.message}`);
                        }
                    }
                } else {
                    this.log.warn(`No ports found for device ${device.devId}`);
                }
                
                // Fetch and update advanced settings for controller
                try {
                    const controllerSettings = await this.client.getDeviceSettings(device.devId, 0);
                    await this.stateManager.updateAdvancedSettings(device.devId, 0, controllerSettings);
                } catch (ctrlError) {
                    this.log.warn(`Error fetching controller settings for device ${device.devId}: ${ctrlError.message}`);
                }
            }
        } catch (error) {
            this.log.error(`Error updating device data: ${error.message}`);
            throw error;
        }
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Clear polling interval
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
            }
            
            this.log.info("AC Infinity adapter shutting down");
            this.isConnected = false;
            callback();
        } catch (error) {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    async onStateChange(id, state) {
        // Nur für Debug-Zwecke, kann später entfernt oder als debug-Level geloggt werden
        this.log.debug(`State change detected: ${id} = ${state ? state.val : 'null'}, ack = ${state ? state.ack : 'null'}`);

        // Standard-Verarbeitung
        if (!state) {
            this.log.debug(`Ignoring non-existent state: ${id}`);
            return;
        }

        if (state.ack) {
            this.log.debug(`Ignoring confirmed state change (from adapter itself): ${id} = ${state.val}`);
            return;
        }

        this.log.debug(`User-initiated state change: ${id} = ${state.val}`);

        try {
            // Überprüfen, ob der Client und StateManager initialisiert wurden
            if (!this.client || !this.stateManager) {
                this.log.error(`Adapter not fully initialized. Client: ${!!this.client}, StateManager: ${!!this.stateManager}`);
                throw new Error("Adapter is not fully initialized");
            }

            // Überprüfen, ob wir angemeldet sind
            if (!this.isConnected || !this.client.isLoggedIn()) {
                this.log.info(`Not logged in, trying to log in again. isConnected: ${this.isConnected}, isLoggedIn: ${this.client ? this.client.isLoggedIn() : 'client is null'}`);
                try {
                    await this.client.login();
                    this.log.info(`Re-login successful. Token: ${this.client.token}`);
                    this.isConnected = true;
                    await this.setStateAsync("info.connection", { val: true, ack: true });
                } catch (loginError) {
                    this.log.error(`Error during re-login: ${loginError.message}`);
                    this.isConnected = false;
                    await this.setStateAsync("info.connection", { val: false, ack: true });
                    throw new Error("Login failed, state change cannot be processed");
                }
            }

            // Parse ID, um zu prüfen, um welche Art von State es sich handelt
            const idParts = id.split('.');
            this.log.debug(`ID parts: ${JSON.stringify(idParts)}`);

            // Lasse den StateManager die Änderung verarbeiten
            this.log.debug(`Forwarding state change to StateManager: ${id} = ${state.val}`);
            await this.stateManager.handleStateChange(id, state);
            this.log.debug(`StateManager processed state change: ${id}`);
            
        } catch (error) {
            this.log.error(`Error processing state change: ${error.message}`);
            if (error.stack) {
                this.log.debug(`Stack trace: ${error.stack}`);
            }
            
            // Bei Kommunikationsfehlern Verbindungsstatus aktualisieren
            if (error.message.includes("network") || error.message.includes("timeout") || 
                error.message.includes("connection") || error.message.includes("connect")) {
                this.isConnected = false;
                await this.setStateAsync("info.connection", { val: false, ack: true });
            }
        }
    }
}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new ACInfinity(options);
} else {
    // otherwise start the instance directly
    new ACInfinity();
}