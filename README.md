# ioBroker.acinfinity

![Logo](admin/acinfinity.png)

[![NPM version](https://img.shields.io/npm/v/iobroker.acinfinity.svg)](https://www.npmjs.com/package/iobroker.acinfinity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ioBroker adapter for monitoring and controlling **AC Infinity UIS WiFi controllers**.

AC Infinity manufactures smart climate control devices for grow tents and greenhouses — fans, temperature/humidity sensors, smart outlets and more.
For device information see the [AC Infinity website](https://acinfinity.com) and the [Controller 69 Pro product page](https://acinfinity.com/climate-controllers/).

> Deutsche Dokumentation: [docs/de/README.md](docs/de/README.md)

---

## ⚠️ Important Notices

> **Only tested with: Controller 69 Pro (CTR69P)**
>
> All other models (69 WiFi, 69 Pro+, AI+, Outlet AI, Outlet AI+) are implemented in the code but could **not be tested** due to lack of hardware. Correct operation of these devices is not guaranteed.
>
> **Use at your own risk.** No warranty is provided for functionality, accuracy, or fitness for any particular purpose. Any liability for direct or indirect damages is expressly disclaimed — including device failures, data loss, or system malfunctions.

---

## Origin & Credits

The **API reverse engineering** and full understanding of the AC Infinity cloud protocol structure originate from the Home Assistant integration:

> **[dalinicus/homeassistant-acinfinity](https://github.com/dalinicus/homeassistant-acinfinity)**
>
> All credits for the API analysis and protocol understanding go to this project.

The **entire ioBroker adapter code** was implemented using **[Claude Code](https://claude.ai/code)** (Anthropic AI) and rewritten for the ioBroker platform based on the Home Assistant integration above.

---

## Supported Devices

| Model | Type ID | Test Status |
|---|---|---|
| Controller 69 WiFi (CTR69W) | 1 | ⚠️ Not tested |
| Controller 69 Pro (CTR69P) | 11 | ✅ Tested |
| Controller 69 Pro+ (CTR69Q) | 18 | ⚠️ Not tested |
| Controller AI+ (CTR89Q) | 20 | ⚠️ Not tested |
| Controller Outlet AI (AC-ADA4) | 22 | ⚠️ Not tested |
| Controller Outlet AI+ (AC-ADA8) | 24 | ⚠️ Not tested |

> **Not supported:** Bluetooth-only controllers (e.g. Controller 67) — WiFi and cloud sync are required.

---

## Features

### Sensors (read-only)

| State | Description | Unit |
|---|---|---|
| `sensors.temperature` | Air temperature | °C |
| `sensors.humidity` | Relative humidity | % |
| `sensors.vpd` | Vapour pressure deficit (VPD) | kPa |
| `sensors.co2` | CO₂ concentration (if sensor connected) | ppm |
| `sensors.soilMoisture` | Soil moisture (if sensor connected) | % |
| `sensors.waterLevel` | Water level (if sensor connected) | % |
| `sensors.pluggedIn` | Controller online/connection status | boolean |

### Port Control (read/write per port)

**Basic**

| State | Description | Values |
|---|---|---|
| `ports.X.mode.active` | Active operating mode | Off / On / Auto / Timer to On / Timer to Off / Cycle / Schedule / VPD |
| `ports.X.mode.onSpeed` | Speed during active operation | 0–10 |
| `ports.X.mode.offSpeed` | Minimum speed during inactive operation | 0–10 |
| `ports.X.info.power` | Current running speed | 0–10 |
| `ports.X.info.state` | Load status (device running) | boolean |
| `ports.X.info.remainingTime` | Seconds until next state change | s |
| `ports.X.info.nextStateChange` | Timestamp of next state change | ISO string |

**Timer Mode** (`ports.X.mode.timer.*`)

| State | Description |
|---|---|
| `toOnMinutes` | Minutes until device turns on |
| `toOffMinutes` | Minutes until device turns off |

**Cycle Mode** (`ports.X.mode.cycle.*`)

| State | Description |
|---|---|
| `onMinutes` | Duration of ON phase (minutes) |
| `offMinutes` | Duration of OFF phase (minutes) |

**Schedule Mode** (`ports.X.mode.schedule.*`)

| State | Description |
|---|---|
| `startEnabled` | Enable daily start time |
| `startTime` | Start time (HH:MM) |
| `endEnabled` | Enable daily end time |
| `endTime` | End time (HH:MM) |

**Auto Mode** (`ports.X.mode.auto.*`)

| State | Description |
|---|---|
| `settingsMode` | Auto / Target |
| `tempHighEnabled` | Enable temperature upper limit |
| `tempHighTrigger` | Temperature upper limit (°C) |
| `tempLowEnabled` | Enable temperature lower limit |
| `tempLowTrigger` | Temperature lower limit (°C) |
| `humidityHighEnabled` | Enable humidity upper limit |
| `humidityHighTrigger` | Humidity upper limit (%) |
| `humidityLowEnabled` | Enable humidity lower limit |
| `humidityLowTrigger` | Humidity lower limit (%) |
| `targetTempEnabled` | Enable target temperature mode |
| `targetTemp` | Target temperature (°C) |
| `targetHumidityEnabled` | Enable target humidity mode |
| `targetHumidity` | Target humidity (%) |

**VPD Mode** (`ports.X.mode.vpd.*`)

| State | Description |
|---|---|
| `settingsMode` | Auto / Target |
| `highEnabled` | Enable VPD upper limit |
| `highTrigger` | VPD upper limit (kPa) |
| `lowEnabled` | Enable VPD lower limit |
| `lowTrigger` | VPD lower limit (kPa) |
| `targetEnabled` | Enable target VPD mode |
| `target` | Target VPD (kPa) |

**Advanced Port Settings** (`ports.X.settings.*`)

| State | Description |
|---|---|
| `deviceType` | Connected device type (Grow Light / Humidifier / Heater / AC / Fan) |
| `dynamicResponse` | Transition / Buffer |
| `dynamicTransitionTemp` | Transition temperature step size (°) |
| `dynamicTransitionHumidity` | Transition humidity step size (%) |
| `dynamicTransitionVPD` | Transition VPD step size (kPa) |
| `dynamicBufferTemp` | Buffer temperature (°) |
| `dynamicBufferHumidity` | Buffer humidity (%) |
| `dynamicBufferVPD` | Buffer VPD (kPa) |
| `sunriseTimerEnabled` | Sunrise/sunset ramp enabled |
| `sunriseTimerMinutes` | Ramp duration (minutes) |

### Controller Settings (read/write per controller)

| State | Description |
|---|---|
| `settings.temperatureUnit` | C / F (read-only; change in AC Infinity app) |
| `settings.temperatureCalibration` | Temperature calibration offset (°) |
| `settings.humidityCalibration` | Humidity calibration offset (%) |
| `settings.vpdLeafTemperatureOffset` | Leaf temperature offset for VPD calculation (°) |
| `settings.outsideTemperature` | Outside temperature reference: Neutral / Lower / Higher |
| `settings.outsideHumidity` | Outside humidity reference: Neutral / Lower / Higher |

---

## Setup

1. Install the adapter in ioBroker
2. Enter the **email address and password** of your AC Infinity account
3. Set the **polling interval** (minimum 10 seconds, default 30 seconds)
4. Click **Save & Close**

The adapter automatically detects all connected controllers and creates the state tree under `acinfinity.0.devices.<deviceId>`.

---

## How Port Modes Work

| Mode | Behaviour |
|---|---|
| **Off** | Device runs continuously at `offSpeed` |
| **On** | Device runs continuously at `onSpeed` |
| **Auto** | Device switches based on temperature and/or humidity thresholds |
| **Timer to On** | Device turns on after `toOnMinutes` minutes |
| **Timer to Off** | Device turns off after `toOffMinutes` minutes |
| **Cycle** | Device alternates between ON (`onMinutes`) and OFF (`offMinutes`) |
| **Schedule** | Device runs daily between `startTime` and `endTime` |
| **VPD** | Device switches based on VPD thresholds (vapour pressure deficit) |

### Dynamic Response: Transition vs. Buffer

- **Transition:** The device gradually increases speed the further measurements deviate from the target. Each step changes fan speed by one level.
- **Buffer:** Creates a hysteresis zone around the trigger point to avoid rapid switching.

---

## Troubleshooting

**Adapter does not connect**
- Check email and password in adapter settings
- Make sure the controller is online in the AC Infinity app
- Check the ioBroker log for specific error messages

**State changes have no effect**
- Check the log for API error responses
- Re-save the adapter instance to force a new login
- Check controller reachability (`info.connection` state)

**Sensor values missing**
- CO₂, soil moisture and water level states only receive data when the corresponding UIS sensors are physically connected and synced with the cloud

---

## Changelog

### 0.9.7 (2026-03-02)
- Fix: remove deprecated `common.title` field from io-package.json (W184)
- Docs: add manufacturer link to README (required for repository submission)

### 0.9.6 (2026-03-02)
- Docs: README.md translated to English (required for ioBroker community)
- Docs: German README moved to docs/de/README.md
- CI: Node.js 24.x added to test matrix

### 0.9.5 (2026-03-02)
- Fix: LICENSE copyright format corrected (ioBroker checker E7001)
- CI: Node.js 18.x removed from test matrix (adapter requires Node ≥ 20)

### 0.9.0 (2026-03-02)
- Security: auth token no longer written to logs
- Stability: race condition in parallel re-login attempts fixed
- Robustness: null checks for sensor values (prevents NaN for unconnected sensors)
- Docs: HTTP usage of AC Infinity API documented in code
- Note: AC Infinity API does not support HTTPS (server-side limitation)

### 0.8.5 (2026-03-01)
- Admin UI: disclaimer text now displayed in red and bold
- Admin UI: minimum polling interval increased from 5 to 10 seconds

### 0.8.1 (2026-03-01)
- Fix: JSON syntax error (trailing comma) in io-package.json

### 0.8.0 (2026-03-01)
- Security: updated axios and form-data to fix critical vulnerabilities (GHSA-4hjh-wcwx-xvwj, GHSA-43fc-jf86-j433, GHSA-fjxv-7rqg-78g4)

### 0.7.4 (2026-03-01)
- Admin UI: added disclaimer note about limited device compatibility

### 0.7.3 (2026-03-01)
- Admin UI: removed warning box, improved settings layout, fixed help link

### 0.7.2 (2026-03-01)
- Code: migrated to ESLint 9 with @iobroker/eslint-config

### 0.7.1 (2026-03-01)
- Added value ranges to state names for better readability

### 0.7.0 (2026-03-01)
- Adapter code fully reimplemented with Claude Code (Anthropic AI) based on homeassistant-acinfinity
- All 8 port modes fully writable from ioBroker (Off / On / Auto / Timer to On / Timer to Off / Cycle / Schedule / VPD)
- Replaced curl with axios — no more shell calls
- New sensors: CO₂, soil moisture, water level, pluggedIn
- Extended controller types: CTR69W, CTR69P, CTR69Q, CTR89Q, AC-ADA4, AC-ADA8
- Fixed deviceType bug in port settings handler
- Removed hardcoded reference payload
- Updated dependencies: js-controller ≥6.0.11, admin ≥7.6.20, Node.js ≥20

### 0.5.6 (2025-04-27)
- Bug fixes and improvements

### 0.5.5 (2025-04-12)
- Further bug fixes and warnings resolved

### 0.5.2 (2025-04-08)
- Further bug fixes and improvements

### 0.4.3 (2025-03-28)
- Bug fixes and improvements

### 0.3.1 (2025-03-27)
- Initial release

---

## Disclaimer

The use of this software is entirely at your own risk. No guarantees are made regarding functionality, reliability, or suitability for any particular purpose. Any liability for direct or indirect damages is expressly disclaimed — including, but not limited to, device failures, data loss, or system malfunctions.

---

## License

MIT License

Copyright (c) 2026 raspilaurent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
