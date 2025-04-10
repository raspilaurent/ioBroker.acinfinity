# ioBroker.acinfinity

![Logo](admin/acinfinity.png)

[![NPM version](https://img.shields.io/npm/v/iobroker.acinfinity.svg)](https://www.npmjs.com/package/iobroker.acinfinity)
[![Downloads](https://img.shields.io/npm/dm/iobroker.acinfinity.svg)](https://www.npmjs.com/package/iobroker.acinfinity)
![Number of Installations](https://iobroker.live/badges/acinfinity-installed.svg)
![Test and Release](https://github.com/DEIN_USERNAME/ioBroker.acinfinity/workflows/Test%20and%20Release/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## AC Infinity Adapter for ioBroker

This adapter allows you to control your AC Infinity devices via ioBroker.

## ALL CREDITS TO: https://github.com/dalinicus/homeassistant-acinfinity

## Features

* Control AC Infinity fans, timers, and other connected devices
* Monitor temperature, humidity, and VPD (Vapor Pressure Deficit) values
* Configure automatic mode settings based on environmental conditions
* Full support for all controller functions including scheduling and cyclical operations

## Haftungsausschluss

Die Nutzung dieser Software erfolgt ausdrücklich auf eigene Gefahr. Es wird keinerlei Garantie für die Funktionsfähigkeit, Fehlerfreiheit oder Eignung für einen bestimmten Zweck übernommen.
Jegliche Haftung für direkte oder indirekte Schäden, einschließlich, aber nicht beschränkt auf Geräteausfälle, Datenverluste oder Fehlverhalten des Systems, wird ausdrücklich ausgeschlossen.
Der Entwickler übernimmt keine Verantwortung für etwaige Schäden, die durch die Verwendung dieser Software entstehen. Die Nutzung erfolgt in vollem Umfang auf eigenes Risiko.

## Disclaimer

The use of this software is entirely at your own risk. No guarantees are made regarding functionality, reliability, or suitability for any particular purpose.
Any liability for direct or indirect damages – including but not limited to hardware failures, data loss, or system malfunctions – is expressly disclaimed.
The developer accepts no responsibility for any harm or issues arising from the use of this software. You use it entirely at your own risk.


## Setup

1. Enter your AC Infinity email and password
2. Set the polling interval (minimum 10 seconds)
3. Click Save & Close

## Usage

After installation, the adapter will create device objects for each of your AC Infinity devices. You can control:

* Basic on/off functionality
* Fan speed settings
* Timer, cycle, and schedule modes
* Temperature and humidity thresholds
* VPD settings
* Advanced configuration options

## Troubleshooting

* If connection issues occur, check your AC Infinity credentials
* For debugging, you can enable verbose logging in the instance settings

## Changelog

### 0.5.2 (2025-04-08)
* more and more bug fixes and improvements

### 0.5.1 (2025-04-08)
* more bug fixes and improvements

### 0.4.3 (2025-03-28)
* Bug fixes and improvements

### 0.3.1 (2025-03-27)
* Initial release

## License

MIT License

Copyright (c) 2025 raspilaurent

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
