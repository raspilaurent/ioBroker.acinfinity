/**
 * Constants for AC Infinity adapter
 */

"use strict";

// API constants
const API_BASE_URL = "http://www.acinfinityserver.com";
const API_ENDPOINTS = {
    LOGIN: "/api/user/appUserLogin",
    DEVICE_LIST: "/api/user/devInfoListAll",
    DEVICE_MODE_SETTINGS: "/api/dev/getdevModeSettingList",
    UPDATE_DEVICE_MODE: "/api/dev/addDevMode",
    DEVICE_SETTINGS: "/api/dev/getDevSetting",
    UPDATE_ADVANCED_SETTINGS: "/api/dev/updateAdvSetting",
};

// Polling intervals
const DEFAULT_POLLING_INTERVAL = 30; // seconds
const MINIMUM_POLLING_INTERVAL = 10; // seconds

// Controller property keys
const CONTROLLER_PROPERTY_KEY = {
    DEVICE_ID: "devId",
    DEVICE_NAME: "devName",
    MAC_ADDR: "devMacAddr",
    DEVICE_INFO: "deviceInfo",
    PORTS: "ports",
    HW_VERSION: "hardwareVersion",
    SW_VERSION: "firmwareVersion",
    DEVICE_TYPE: "devType",
    TEMPERATURE: "temperature",
    HUMIDITY: "humidity",
    VPD: "vpdnums",
    ONLINE: "online",
    TIME_ZONE: "zoneId",
};

// Port property keys
const PORT_PROPERTY_KEY = {
    PORT: "port",
    NAME: "portName",
    SPEAK: "speak",
    ONLINE: "online",
    STATE: "loadState",
    REMAINING_TIME: "remainTime",
};

// Advanced settings keys
const ADVANCED_SETTINGS_KEY = {
    DEV_ID: "devId",
    DEV_NAME: "devName",
    
    // Controller advanced settings
    TEMP_UNIT: "devCompany",
    CALIBRATE_TEMP: "devCt",
    CALIBRATE_TEMP_F: "devCth",
    CALIBRATE_HUMIDITY: "devCh",
    VPD_LEAF_TEMP_OFFSET: "vpdCt",
    VPD_LEAF_TEMP_OFFSET_F: "vpdCth",
    OUTSIDE_TEMP_COMPARE: "tempCompare",
    OUTSIDE_HUMIDITY_COMPARE: "humiCompare",
    
    // Port advanced settings
    DEVICE_LOAD_TYPE: "loadType",
    DYNAMIC_RESPONSE_TYPE: "isFlag",
    DYNAMIC_TRANSITION_TEMP: "devTt",
    DYNAMIC_TRANSITION_TEMP_F: "devTth",
    DYNAMIC_TRANSITION_HUMIDITY: "devTh",
    DYNAMIC_TRANSITION_VPD: "vpdTransition",
    DYNAMIC_BUFFER_TEMP: "devBt",
    DYNAMIC_BUFFER_TEMP_F: "devBth",
    DYNAMIC_BUFFER_HUMIDITY: "devBh",
    DYNAMIC_BUFFER_VPD: "devBvpd",
    SUNRISE_TIMER_ENABLED: "onTimeSwitch",
    SUNRISE_TIMER_DURATION: "onTime",
};

// Port control keys
const PORT_CONTROL_KEY = {
    DEV_ID: "devId",
    MODE_SET_ID: "modeSetid",
    SURPLUS: "surplus",
    ON_SPEED: "onSpead",
    OFF_SPEED: "offSpead",
    AT_TYPE: "atType",
    SCHEDULED_START_TIME: "schedStartTime",
    SCHEDULED_END_TIME: "schedEndtTime",
    TIMER_DURATION_TO_ON: "acitveTimerOn",
    TIMER_DURATION_TO_OFF: "acitveTimerOff",
    CYCLE_DURATION_ON: "activeCycleOn",
    CYCLE_DURATION_OFF: "activeCycleOff",
    VPD_SETTINGS_MODE: "vpdSettingMode",
    VPD_HIGH_ENABLED: "activeHtVpd",
    VPD_HIGH_TRIGGER: "activeHtVpdNums",
    VPD_LOW_ENABLED: "activeLtVpd",
    VPD_LOW_TRIGGER: "activeLtVpdNums",
    VPD_TARGET_ENABLED: "targetVpdSwitch",
    VPD_TARGET: "targetVpd",
    AUTO_SETTINGS_MODE: "settingMode",
    AUTO_TEMP_HIGH_TRIGGER: "devHt",
    AUTO_TEMP_HIGH_TRIGGER_F: "devHtf",
    AUTO_TEMP_HIGH_ENABLED: "activeHt",
    AUTO_HUMIDITY_HIGH_TRIGGER: "devHh",
    AUTO_HUMIDITY_HIGH_ENABLED: "activeHh",
    AUTO_TEMP_LOW_TRIGGER: "devLt",
    AUTO_TEMP_LOW_TRIGGER_F: "devLtf",
    AUTO_TEMP_LOW_ENABLED: "activeLt",
    AUTO_HUMIDITY_LOW_TRIGGER: "devLh",
    AUTO_HUMIDITY_LOW_ENABLED: "activeLh",
    AUTO_TARGET_TEMP_ENABLED: "targetTSwitch",
    AUTO_TARGET_TEMP: "targetTemp",
    AUTO_TARGET_TEMP_F: "targetTempF",
    AUTO_TARGET_HUMIDITY_ENABLED: "targetHumiSwitch",
    AUTO_TARGET_HUMIDITY: "targetHumi",
};

// Schedule related constants
const SCHEDULE_DISABLED_VALUE = 65535; // Disabled
const SCHEDULE_MIDNIGHT_VALUE = 0; // 12:00am, default for start time
const SCHEDULE_EOD_VALUE = 1439; // 11:59pm, default for end time

// Mode options
const MODE_OPTIONS = [
    "Off",
    "On",
    "Auto",
    "Timer to On",
    "Timer to Off",
    "Cycle",
    "Schedule",
    "VPD",
];

// Dynamic response options
const DYNAMIC_RESPONSE_OPTIONS = ["Transition", "Buffer"];

// Outside climate options
const OUTSIDE_CLIMATE_OPTIONS = ["Neutral", "Lower", "Higher"];

// Device load type options
const DEVICE_LOAD_TYPE_OPTIONS = {
    1: "Grow Light",
    2: "Humidifier",
    4: "Heater",
    5: "AC",
    6: "Fan",
};

// Settings mode options
const SETTINGS_MODE_OPTIONS = [
    "Auto",
    "Target",
];

module.exports = {
    API_BASE_URL,
    API_ENDPOINTS,
    DEFAULT_POLLING_INTERVAL,
    MINIMUM_POLLING_INTERVAL,
    CONTROLLER_PROPERTY_KEY,
    PORT_PROPERTY_KEY,
    ADVANCED_SETTINGS_KEY,
    PORT_CONTROL_KEY,
    SCHEDULE_DISABLED_VALUE,
    SCHEDULE_MIDNIGHT_VALUE,
    SCHEDULE_EOD_VALUE,
    MODE_OPTIONS,
    DYNAMIC_RESPONSE_OPTIONS,
    OUTSIDE_CLIMATE_OPTIONS,
    DEVICE_LOAD_TYPE_OPTIONS,
    SETTINGS_MODE_OPTIONS,
};