/**
 * StateCreator für AC Infinity Adapter
 * Verantwortlich für das Erstellen einzelner States in ioBroker
 */

"use strict";

class StateCreator {
    /**
     * Erstellt einen neuen StateCreator
     * @param {object} stateManager - Referenz zum StateManager
     */
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.adapter = stateManager.adapter;
    }

    /**
     * Erstellt einen einzelnen State
     * @param {string} id - Zustands-ID
     * @param {string} name - Zustandsname
     * @param {string} type - Zustandstyp
     * @param {string} role - Zustandsrolle
     * @param {string|null} unit - Zustandseinheit
     * @param {boolean} write - Zustand beschreibbar
     * @param {Array|null} states - Zustandswerte (für Dropdown)
     * @param {object|null} common - Zusätzliche Common-Eigenschaften
     * @returns {Promise<void>}
     */
    async createState(id, name, type, role, unit = null, write = false, states = null, common = null) {
        // Prüfe, ob State bereits in unserem Tracking existiert
        if (this.stateManager.deviceStates.has(id)) {
            return;
        }
        
        // Erstelle State-Objekt
        const obj = {
            type: "state",
            common: {
                name: name,
                type: type,
                role: role,
                read: true,
                write: write,
            },
            native: {},
        };
        
        // Füge optionale Eigenschaften hinzu
        if (unit !== null) {
            obj.common.unit = unit;
        }
        
        // Behandle States für Dropdown-Menüs
        if (states !== null) {
            if (Array.isArray(states)) {
                // Wandle Array in Objekt um (index: value)
                const statesObj = {};
                states.forEach((state, idx) => {
                    statesObj[idx] = state;
                });
                obj.common.states = statesObj;
            } else {
                // Bereits als Objekt formatiert
                obj.common.states = states;
            }
        }
        
        // Füge zusätzliche Common-Eigenschaften hinzu
        if (common !== null) {
            Object.assign(obj.common, common);
        }
        
        // Erstelle State in ioBroker
        try {
            await this.adapter.setObjectNotExistsAsync(id, obj);
            
            // Füge zum Tracking hinzu
            this.stateManager.deviceStates.set(id, true);
            
            // Debug-Logging
            this.adapter.log.debug(`State erstellt: ${id}`);
        } catch (error) {
            this.adapter.log.error(`Fehler beim Erstellen von State ${id}: ${error.message}`);
        }
    }
    
    /**
     * Erstellt mehrere States auf einmal
     * @param {Array<object>} stateDefinitions - Array mit State-Definitionen
     * @returns {Promise<void>}
     */
    async createMultipleStates(stateDefinitions) {
        for (const def of stateDefinitions) {
            await this.createState(
                def.id,
                def.name,
                def.type,
                def.role,
                def.unit || null,
                def.write || false,
                def.states || null,
                def.common || null
            );
        }
    }
    
    /**
     * Erstellt einen Kanal (Channel) in ioBroker
     * @param {string} id - Kanal-ID
     * @param {string} name - Kanalname
     * @param {object|null} native - Native-Eigenschaften
     * @returns {Promise<void>}
     */
    async createChannel(id, name, native = {}) {
        try {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: "channel",
                common: {
                    name: name,
                },
                native: native || {},
            });
            
            this.adapter.log.debug(`Kanal erstellt: ${id}`);
        } catch (error) {
            this.adapter.log.error(`Fehler beim Erstellen von Kanal ${id}: ${error.message}`);
        }
    }
    
    /**
     * Erstellt einen Ordner (Folder) in ioBroker
     * @param {string} id - Ordner-ID
     * @param {string} name - Ordnername
     * @returns {Promise<void>}
     */
    async createFolder(id, name) {
        try {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: "folder",
                common: {
                    name: name,
                },
                native: {},
            });
            
            this.adapter.log.debug(`Ordner erstellt: ${id}`);
        } catch (error) {
            this.adapter.log.error(`Fehler beim Erstellen von Ordner ${id}: ${error.message}`);
        }
    }
    
    /**
     * Erstellt ein Gerät (Device) in ioBroker
     * @param {string} id - Geräte-ID
     * @param {string} name - Gerätename
     * @param {object|null} native - Native-Eigenschaften
     * @returns {Promise<void>}
     */
    async createDevice(id, name, native = {}) {
        try {
            await this.adapter.setObjectNotExistsAsync(id, {
                type: "device",
                common: {
                    name: name,
                },
                native: native || {},
            });
            
            this.adapter.log.debug(`Gerät erstellt: ${id}`);
        } catch (error) {
            this.adapter.log.error(`Fehler beim Erstellen von Gerät ${id}: ${error.message}`);
        }
    }
}

module.exports = StateCreator;