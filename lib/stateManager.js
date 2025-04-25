/**
 * StateManager für AC Infinity Adapter
 * Zentrale Klasse zum Verwalten von Zuständen für AC Infinity-Geräte
 */

"use strict";

// Importiere Handler-Module
const DeviceSettingsHandler = require("./handlers/deviceSettingsHandler");
const PortSettingsHandler = require("./handlers/portSettingsHandler");
const PortModeHandler = require("./handlers/portModeHandler");

// Importiere Creator-Module
const StateCreator = require("./creators/stateCreator");
const DeviceCreator = require("./creators/deviceCreator");
const PortCreator = require("./creators/portCreator");

// Importiere Updater-Module
const DeviceUpdater = require("./updaters/deviceUpdater");
const PortUpdater = require("./updaters/portUpdater");

class StateManager {
    /**
     * Erstellt einen neuen StateManager
     * @param {object} adapter - ioBroker-Adapter-Instanz
     */
    constructor(adapter) {
        this.adapter = adapter;
        this.deviceStates = new Map(); // Verfolgt erstellte Gerätezustände
        this._refreshPending = false;
        this._refreshTimer = null;
        this.client = null; // API-Client-Referenz

        // Initialisiere Handler
        this.deviceSettingsHandler = new DeviceSettingsHandler(this);
        this.portSettingsHandler = new PortSettingsHandler(this);
        this.portModeHandler = new PortModeHandler(this);

        // Initialisiere Creator
        this.stateCreator = new StateCreator(this);
        this.deviceCreator = new DeviceCreator(this);
        this.portCreator = new PortCreator(this);

        // Initialisiere Updater
        this.deviceUpdater = new DeviceUpdater(this);
        this.portUpdater = new PortUpdater(this);
    }

    /**
     * Setzt den API-Client und gibt ihn an die Handler weiter
     * @param {object} client - AC Infinity API-Client
     */
    setClient(client) {
        this.client = client;
        
        // Gib den Client an alle Handler weiter
        this.deviceSettingsHandler.setClient(client);
        this.portSettingsHandler.setClient(client);
        this.portModeHandler.setClient(client);

        this.adapter.log.debug("API client successfully passed to StateManager and handlers");
    }

    /**
     * Initialisiert Zustände für alle Geräte
     * @param {Array} devices - Array mit Geräteobjekten
     */
    async initializeDevices(devices) {
        for (const device of devices) {
            const deviceId = device.devId;
            this.adapter.log.info(`Initializing device: ${device.devName} (ID: ${deviceId})`);
            
            // Erstelle Geräteobjekt
            await this.deviceCreator.createDeviceObject(deviceId, device.devName);
            
            // Erstelle Controller-Info-Kanal
            await this.deviceCreator.createInfoChannel(deviceId);
            
            // Erstelle Controller-Sensor-Zustände
            await this.deviceCreator.createSensorChannel(deviceId);
            
            // Erstelle Ports
            const ports = device.deviceInfo.ports;
            if (Array.isArray(ports)) {
                for (const port of ports) {
                    const portId = port.port;
                    await this.portCreator.createPortChannel(deviceId, portId, port.portName);
                }
            } else {
                this.adapter.log.warn(`No ports found for device ${deviceId}`);
            }
        }
    }

    /**
     * Aktualisiere Gerätedaten mit neuesten Werten
     * @param {object} device - Geräteobjekt
     */
    async updateDeviceData(device) {
        const deviceId = device.devId;
        this.adapter.log.debug(`Updating device data for ${deviceId}`);
        
        // Aktualisiere Gerätedaten über den DeviceUpdater
        await this.deviceUpdater.updateDeviceData(deviceId, device);
        
        // Aktualisiere Port-Zustände
        if (device.deviceInfo && Array.isArray(device.deviceInfo.ports)) {
            for (const port of device.deviceInfo.ports) {
                const portId = port.port;
                await this.portUpdater.updatePortData(deviceId, portId, port);
            }
        } else {
            this.adapter.log.warn(`No ports found in device data for ${deviceId}`);
        }
    }
    
    /**
     * Aktualisiere Port-Einstellungen
     * @param {string|number} deviceId - Geräte-ID
     * @param {number} portId - Port-ID
     * @param {object} settings - Einstellungsobjekt
     */
    async updatePortSettings(deviceId, portId, settings) {
        await this.portUpdater.updatePortSettings(deviceId, portId, settings);
    }

    /**
     * Aktualisiere erweiterte Einstellungen
     * @param {string|number} deviceId - Geräte-ID
     * @param {number} portId - Port-ID (0 für Controller-Einstellungen)
     * @param {object} settings - Einstellungsobjekt
     */
    async updateAdvancedSettings(deviceId, portId, settings) {
        if (portId === 0) {
            // Controller-Einstellungen
            await this.deviceUpdater.updateAdvancedSettings(deviceId, settings);
        } else {
            // Port-Einstellungen
            await this.portUpdater.updateAdvancedPortSettings(deviceId, portId, settings);
        }
    }

    /**
     * Verarbeitet eine vom Benutzer initiierte Zustandsänderung
     * @param {string} id - Zustands-ID
     * @param {object} state - Zustandsobjekt
     */
    async handleStateChange(id, state) {
        if (!state || state.ack) {
            // Ignoriere bestätigte Zustandsänderungen oder Zustände, die nicht existieren
            return;
        }

        this.adapter.log.debug(`Processing user state change: ${id} = ${state.val}`);

        try {
            // Überprüfen, ob der Client gesetzt ist
            if (!this.client) {
                throw new Error("API client not set. Cannot process state change.");
            }

            // Parse ID, um Geräte-, Port- und Parameterinformationen zu erhalten
            const idParts = id.split(".");
            
            // Entferne Adaptername und Instanz vom Pfad
            let path;
            if (idParts[0] === this.adapter.name && idParts[1].match(/^\d+$/)) {
                // ID ist vollständig (z.B. "acinfinity.0.devices.1234")
                path = idParts.slice(2);
            } else {
                // ID ist bereits ohne Präfix (z.B. "devices.1234")
                path = idParts;
            }
            
            this.adapter.log.debug(`Processing path parts: ${JSON.stringify(path)}`);

            if (path[0] !== "devices" || path.length < 4) {
                this.adapter.log.warn(`Received state change with invalid path: ${id}`);
                return;
            }
            
            const deviceId = path[1];
            
            // Verarbeite Geräteebenen-Einstellungen
            if (path[2] === "settings") {
                await this.deviceSettingsHandler.handleDeviceSettingsChange(deviceId, path.slice(3), state.val);
                return;
            }
            
            // Verarbeite Port-Ebenen-Einstellungen
            if (path[2] === "ports" && path.length >= 5) {
                const portId = parseInt(path[3]);
                const subPath = path.slice(4);
                
                // Leite die Änderung an den richtigen Handler weiter
                if (subPath[0] === "mode") {
                    this.adapter.log.info(`Processing mode change: Device ${deviceId}, Port ${portId}, Path ${subPath.join(".")}, Value ${state.val}`);
                    await this.portModeHandler.handlePortModeChange(deviceId, portId, subPath.slice(1), state.val);
                } else if (subPath[0] === "settings") {
                    this.adapter.log.info(`Processing settings change: Device ${deviceId}, Port ${portId}, Path ${subPath.join(".")}, Value ${state.val}`);
                    await this.portSettingsHandler.handlePortAdvancedSettingsChange(deviceId, portId, subPath.slice(1), state.val);
                } else {
                    this.adapter.log.warn(`Unknown port settings category: ${subPath[0]}`);
                }
                return;
            }
            
            this.adapter.log.warn(`Unprocessed state change: ${id}`);
        } catch (error) {
            this.adapter.log.error(`Error processing state change: ${error.message}`);
            if (error.stack) {
                this.adapter.log.debug(`Stack trace: ${error.stack}`);
            }
        }
    }

    /**
     * Helfermethode zum Erstellen eines Zustands
     * Wird vom StateCreator verwendet
     * @param {string} id - Zustands-ID
     * @param {string} name - Zustandsname
     * @param {string} type - Zustandstyp
     * @param {string} role - Zustandsrolle
     * @param {string|null} unit - Zustandseinheit
     * @param {boolean} write - Zustand beschreibbar
     * @param {Array|null} states - Zustandswerte (für Dropdown)
     * @param {object|null} common - Zusätzliche Common-Eigenschaften
     */
    async createState(id, name, type, role, unit = null, write = false, states = null, common = null) {
        return this.stateCreator.createState(id, name, type, role, unit, write, states, common);
    }

    /**
     * Aktualisiere einen Zustandswert
     * @param {string} id - Zustands-ID
     * @param {any} value - Zustandswert
     */
    async updateState(id, value) {
        try {
            // Prüfe, ob Wert null oder undefined ist, in diesem Fall nicht aktualisieren
            if (value === null || value === undefined) {
                return;
            }
            
            // Für Debug-Zwecke
            this.adapter.log.debug(`Updating state ${id} with value ${value}`);
            
            await this.adapter.setStateAsync(id, { val: value, ack: true });
        } catch (error) {
            this.adapter.log.error(`Error updating state ${id}: ${error.message}`);
        }
    }

    /**
     * Hilfsmethode, um Änderungen im UI temporär zu aktualisieren, bevor die tatsächliche Aktualisierung stattfindet
     * Dies verhindert, dass das UI zurückspringt, solange die API-Anfrage bearbeitet wird
     * @param {string} id - Zustands-ID
     * @param {any} value - Zustandswert
     */
    async updateUIState(id, value) {
        try {
            // Mit false ack markieren, aber in der UI anzeigen
            await this.adapter.setStateAsync(id, { val: value, ack: false });
        } catch (error) {
            this.adapter.log.warn(`Error temporarily updating UI state ${id}: ${error.message}`);
        }
    }

    /**
     * Verzögert die Ausführung einer Funktion
     * @param {number} ms - Verzögerung in Millisekunden
     * @returns {Promise} - Promise, das nach der Verzögerung aufgelöst wird
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Aktualisiert alle Daten mit Ratenbegrenzung
     * Um Überflutung der API zu vermeiden
     */
    async refreshWithThrottle() {
        if (this._refreshPending) {
            this.adapter.log.debug("Update already in progress, skipping");
            return;
        }
        
        // Falls noch ein ausstehender Timer existiert, diesen löschen
        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
            this._refreshTimer = null;
        }
        
        this._refreshPending = true;
        try {
            // Warte einen Moment, um die API nicht zu überlasten
            await this.delay(2000);
            await this.adapter.updateDeviceData();
        } catch (error) {
            this.adapter.log.error(`Error during delayed data update: ${error.message}`);
        } finally {
            // Wichtig: Flag nach Abschluss zurücksetzen, auch bei Fehlern
            // Verwende einen Timer um sicherzustellen, dass genug Zeit zwischen Updates ist
            this._refreshTimer = setTimeout(() => {
                this._refreshPending = false;
                this._refreshTimer = null;
                this.adapter.log.debug("Update lock released");
            }, 3000); // Wartezeit, um übermäßige Aufrufe zu verhindern
        }
    }
}

module.exports = StateManager;