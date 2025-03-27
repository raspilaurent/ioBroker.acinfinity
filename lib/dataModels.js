/**
 * Data models for AC Infinity adapter
 * Provides helper classes to work with AC Infinity data structures
 */

"use strict";

const { DEVICE_LOAD_TYPE_OPTIONS } = require('./constants');

/**
 * Represents an AC Infinity controller device
 */
class ACInfinityController {
    /**
     * Create a new ACInfinityController
     * @param {object} data - Raw device data from API
     */
    constructor(data) {
        this.deviceId = data.devId;
        this.deviceName = data.devName || `Device ${this.deviceId}`;
        this.macAddress = data.devMacAddr;
        this.online = data.online === 1;
        this.hardwareVersion = data.deviceInfo.hardwareVersion;
        this.firmwareVersion = data.deviceInfo.firmwareVersion;
        this.deviceType = data.deviceType;
        
        // Sensor values (stored as integers representing floating point with 2 decimal places)
        this.temperature = data.temperature / 100;
        this.humidity = data.humidity / 100;
        this.vpd = data.vpdnums / 100;
        
        // Process ports
        this.ports = [];
        if (data.deviceInfo && Array.isArray(data.deviceInfo.ports)) {
            this.ports = data.deviceInfo.ports.map(port => new ACInfinityPort(this, port));
        }
    }
}

/**
 * Represents a port on an AC Infinity controller
 */
class ACInfinityPort {
    /**
     * Create a new ACInfinityPort
     * @param {ACInfinityController} controller - Parent controller
     * @param {object} data - Raw port data from API
     */
    constructor(controller, data) {
        this.controller = controller;
        this.portId = data.port;
        this.portName = data.portName || `Port ${this.portId}`;
        this.online = data.online === 1;
        this.power = data.speak;
        this.state = data.loadState === 1;
        this.remainingTime = data.remainTime;
        
        // Determine next state change time
        this.nextStateChange = null;
        if (this.remainingTime > 0) {
            const now = new Date();
            this.nextStateChange = new Date(now.getTime() + this.remainingTime * 1000);
        }
        
        // Device type
        this.deviceType = null;
        if (data.loadType in DEVICE_LOAD_TYPE_OPTIONS) {
            this.deviceType = DEVICE_LOAD_TYPE_OPTIONS[data.loadType];
        }
    }
}

/**
 * Helper functions for data transformations
 */
const DataHelper = {
    /**
     * Convert minutes from midnight to a time string
     * @param {number} minutes - Minutes from midnight
     * @returns {string|null} - Time in HH:MM format or null if invalid
     */
    minutesToTimeString(minutes) {
        if (minutes === undefined || minutes === null || minutes > 1439) {
            return null;
        }
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    },
    
    /**
     * Convert a time string to minutes from midnight
     * @param {string} timeString - Time in HH:MM format
     * @returns {number|null} - Minutes from midnight or null if invalid
     */
    timeStringToMinutes(timeString) {
        if (!timeString || typeof timeString !== 'string') {
            return null;
        }
        
        const parts = timeString.split(':');
        if (parts.length !== 2) {
            return null;
        }
        
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            return null;
        }
        
        return hours * 60 + minutes;
    },
    
    /**
     * Clean value for display
     * @param {any} value - Value to clean
     * @returns {any} - Cleaned value
     */
    cleanValue(value) {
        if (typeof value === 'number') {
            // Round to 2 decimal places
            return Math.round(value * 100) / 100;
        }
        return value;
    }
};

module.exports = {
    ACInfinityController,
    ACInfinityPort,
    DataHelper
};