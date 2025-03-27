/**
 * DeviceCreator für AC Infinity Adapter
 * Verantwortlich für das Erstellen von Gerätestrukturen in ioBroker
 */

"use strict";

const { OUTSIDE_CLIMATE_OPTIONS } = require('../constants');

class DeviceCreator {
    /**
     * Erstellt einen neuen DeviceCreator
     * @param {object} stateManager - Referenz zum StateManager
     */
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.adapter = stateManager.adapter;
        this.stateCreator = stateManager.stateCreator;
    }

    /**
     * Erstellt ein Geräteobjekt in ioBroker
     * @param {string} deviceId - Geräte-ID
     * @param {string} deviceName - Gerätename
     * @returns {Promise<void>}
     */
    async createDeviceObject(deviceId, deviceName) {
        await this.stateCreator.createDevice(`devices.${deviceId}`, deviceName, {
            id: deviceId
        });
    }

    /**
     * Erstellt Infokanal für ein Gerät
     * @param {string} deviceId - Geräte-ID
     * @returns {Promise<void>}
     */
    async createInfoChannel(deviceId) {
        // Erstelle Info-Kanal
        await this.stateCreator.createChannel(`devices.${deviceId}.info`, "Geräteinformationen");
        
        // Erstelle Info-States
        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.info.name`,
                name: "Name",
                type: "string",
                role: "text"
            },
            {
                id: `devices.${deviceId}.info.online`,
                name: "Online",
                type: "boolean",
                role: "indicator.connected"
            },
            {
                id: `devices.${deviceId}.info.mac`,
                name: "MAC-Adresse",
                type: "string",
                role: "text"
            },
            {
                id: `devices.${deviceId}.info.firmware`,
                name: "Firmware-Version",
                type: "string",
                role: "text"
            },
            {
                id: `devices.${deviceId}.info.hardware`,
                name: "Hardware-Version",
                type: "string",
                role: "text"
            },
            {
                id: `devices.${deviceId}.info.deviceType`,
                name: "Gerätetyp",
                type: "number",
                role: "value"
            }
        ]);
    }

    /**
     * Erstellt Sensorkanal für ein Gerät
     * @param {string} deviceId - Geräte-ID
     * @returns {Promise<void>}
     */
    async createSensorChannel(deviceId) {
        // Erstelle Sensors-Kanal
        await this.stateCreator.createChannel(`devices.${deviceId}.sensors`, "Sensoren");
        
        // Erstelle Sensor-States
        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.sensors.temperature`,
                name: "Temperatur",
                type: "number",
                role: "value.temperature",
                unit: "°C"
            },
            {
                id: `devices.${deviceId}.sensors.humidity`,
                name: "Luftfeuchtigkeit",
                type: "number",
                role: "value.humidity",
                unit: "%"
            },
            {
                id: `devices.${deviceId}.sensors.vpd`,
                name: "Sättigungsdefizit (VPD)",
                type: "number",
                role: "value",
                unit: "kPa"
            }
        ]);
        
        // Erstelle Einstellungen-Kanal
        await this.createSettingsChannel(deviceId);
    }
    
    /**
     * Erstellt Einstellungskanal für ein Gerät
     * @param {string} deviceId - Geräte-ID
     * @returns {Promise<void>}
     */
    async createSettingsChannel(deviceId) {
        // Erstelle Settings-Kanal
        await this.stateCreator.createChannel(`devices.${deviceId}.settings`, "Einstellungen");
        
        // Erstelle Einstellungs-States
        await this.stateCreator.createMultipleStates([
            {
                id: `devices.${deviceId}.settings.temperatureUnit`,
                name: "Temperatureinheit",
                type: "string",
                role: "text",
                write: false,
                states: ["C", "F"]
            },
            {
                id: `devices.${deviceId}.settings.temperatureCalibration`,
                name: "Temperaturkalibrierung",
                type: "number",
                role: "level",
                unit: "°",
                write: true
            },
            {
                id: `devices.${deviceId}.settings.humidityCalibration`,
                name: "Feuchtigkeitskalibrierung",
                type: "number",
                role: "level",
                unit: "%",
                write: true
            },
            {
                id: `devices.${deviceId}.settings.vpdLeafTemperatureOffset`,
                name: "VPD Blatttemperatur-Offset",
                type: "number",
                role: "level",
                unit: "°",
                write: true
            },
            {
                id: `devices.${deviceId}.settings.outsideTemperature`,
                name: "Außentemperatur",
                type: "string",
                role: "text",
                write: true,
                states: OUTSIDE_CLIMATE_OPTIONS
            },
            {
                id: `devices.${deviceId}.settings.outsideHumidity`,
                name: "Außenfeuchtigkeit",
                type: "string",
                role: "text",
                write: true,
                states: OUTSIDE_CLIMATE_OPTIONS
            }
        ]);
    }
    
    /**
     * Erstellt eine vollständige Gerätestruktur mit allen notwendigen Unterkanälen
     * @param {string} deviceId - Geräte-ID
     * @param {string} deviceName - Gerätename
     * @returns {Promise<void>}
     */
    async createCompleteDeviceStructure(deviceId, deviceName) {
        // Erstelle das Hauptgeräteobjekt
        await this.createDeviceObject(deviceId, deviceName);
        
        // Erstelle alle Unterkanäle
        await this.createInfoChannel(deviceId);
        await this.createSensorChannel(deviceId);
        
        // Erstelle Ports-Ordner
        await this.stateCreator.createFolder(`devices.${deviceId}.ports`, "Ports");
    }
}

module.exports = DeviceCreator;