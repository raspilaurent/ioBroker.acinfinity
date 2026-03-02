# ioBroker.acinfinity

![Logo](admin/acinfinity.png)

[![NPM version](https://img.shields.io/npm/v/iobroker.acinfinity.svg)](https://www.npmjs.com/package/iobroker.acinfinity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ioBroker-Adapter zur Überwachung und Steuerung von **AC Infinity UIS WiFi-Controllern**.

---

## ⚠️ Wichtige Hinweise zur Nutzung

> **Nur getestet mit: Controller 69 Pro (CTR69P)**
>
> Alle anderen Modelle (69 WiFi, 69 Pro+, AI+, Outlet AI, Outlet AI+) sind im Code implementiert, konnten jedoch mangels Hardware **nicht getestet werden**. Die Funktion dieser Geräte ist nicht garantiert.
>
> **Nutzung auf eigene Gefahr.** Es wird keinerlei Gewähr für Funktionsfähigkeit, Richtigkeit oder Eignung für einen bestimmten Zweck übernommen. Jegliche Haftung für direkte oder indirekte Schäden ist ausdrücklich ausgeschlossen — einschließlich Geräteausfälle, Datenverluste oder Fehlfunktionen des Systems.

---

## Herkunft & Credits

Das **API-Reverse-Engineering** sowie das vollständige Verständnis der AC Infinity Cloud-Protokoll-Struktur stammen aus dem Home Assistant Adapter:

> **[dalinicus/homeassistant-acinfinity](https://github.com/dalinicus/homeassistant-acinfinity)**
>
> Alle Credits für die API-Analyse und das Protokoll-Verständnis gehen an dieses Projekt.

Der **gesamte ioBroker-Adapter-Code** wurde mit **[Claude Code](https://claude.ai/code)** (Anthropic AI) implementiert und auf Basis der oben genannten Home Assistant Integration für die ioBroker-Plattform umgeschrieben.

---

## Unterstützte Geräte

| Modell | Typ-ID | Teststatus |
|---|---|---|
| Controller 69 WiFi (CTR69W) | 1 | ⚠️ Nicht getestet |
| Controller 69 Pro (CTR69P) | 11 | ✅ Getestet |
| Controller 69 Pro+ (CTR69Q) | 18 | ⚠️ Nicht getestet |
| Controller AI+ (CTR89Q) | 20 | ⚠️ Nicht getestet |
| Controller Outlet AI (AC-ADA4) | 22 | ⚠️ Nicht getestet |
| Controller Outlet AI+ (AC-ADA8) | 24 | ⚠️ Nicht getestet |

> **Nicht unterstützt:** Nur-Bluetooth-Controller (z.B. Controller 67) — WiFi und Cloud-Sync erforderlich.

---

## Funktionen

### Sensoren (nur lesen)

| State | Beschreibung | Einheit |
|---|---|---|
| `sensors.temperature` | Lufttemperatur | °C |
| `sensors.humidity` | Relative Luftfeuchtigkeit | % |
| `sensors.vpd` | Sättigungsdefizit (VPD) | kPa |
| `sensors.co2` | CO₂-Konzentration (wenn Sensor angeschlossen) | ppm |
| `sensors.soilMoisture` | Bodenfeuchtigkeit (wenn Sensor angeschlossen) | % |
| `sensors.waterLevel` | Wasserstand (wenn Sensor angeschlossen) | % |
| `sensors.pluggedIn` | Controller Online-/Verbindungsstatus | boolean |

### Port-Steuerung (lesen/schreiben pro Port)

**Basis**

| State | Beschreibung | Werte |
|---|---|---|
| `ports.X.mode.active` | Aktiver Modus | Off / On / Auto / Timer to On / Timer to Off / Cycle / Schedule / VPD |
| `ports.X.mode.onSpeed` | Geschwindigkeit im aktiven Betrieb | 0–10 |
| `ports.X.mode.offSpeed` | Mindestgeschwindigkeit im inaktiven Betrieb | 0–10 |
| `ports.X.info.power` | Aktuelle Laufgeschwindigkeit | 0–10 |
| `ports.X.info.state` | Laststatus (Gerät läuft) | boolean |
| `ports.X.info.remainingTime` | Sekunden bis zur nächsten Statusänderung | s |
| `ports.X.info.nextStateChange` | Zeitstempel der nächsten Statusänderung | ISO-String |

**Timer-Modus** (`ports.X.mode.timer.*`)

| State | Beschreibung |
|---|---|
| `toOnMinutes` | Minuten bis das Gerät einschaltet |
| `toOffMinutes` | Minuten bis das Gerät ausschaltet |

**Zyklus-Modus** (`ports.X.mode.cycle.*`)

| State | Beschreibung |
|---|---|
| `onMinutes` | Dauer der EIN-Phase (Minuten) |
| `offMinutes` | Dauer der AUS-Phase (Minuten) |

**Zeitplan-Modus** (`ports.X.mode.schedule.*`)

| State | Beschreibung |
|---|---|
| `startEnabled` | Tägliche Startzeit aktivieren |
| `startTime` | Startzeit (HH:MM) |
| `endEnabled` | Tägliche Endzeit aktivieren |
| `endTime` | Endzeit (HH:MM) |

**Auto-Modus** (`ports.X.mode.auto.*`)

| State | Beschreibung |
|---|---|
| `settingsMode` | Auto / Target (Zielwert) |
| `tempHighEnabled` | Temperatur-Obergrenze aktivieren |
| `tempHighTrigger` | Temperatur-Obergrenze (°C) |
| `tempLowEnabled` | Temperatur-Untergrenze aktivieren |
| `tempLowTrigger` | Temperatur-Untergrenze (°C) |
| `humidityHighEnabled` | Feuchtigkeits-Obergrenze aktivieren |
| `humidityHighTrigger` | Feuchtigkeits-Obergrenze (%) |
| `humidityLowEnabled` | Feuchtigkeits-Untergrenze aktivieren |
| `humidityLowTrigger` | Feuchtigkeits-Untergrenze (%) |
| `targetTempEnabled` | Zieltemperatur-Modus aktivieren |
| `targetTemp` | Zieltemperatur (°C) |
| `targetHumidityEnabled` | Zielfeuchtigkeit-Modus aktivieren |
| `targetHumidity` | Zielfeuchtigkeit (%) |

**VPD-Modus** (`ports.X.mode.vpd.*`)

| State | Beschreibung |
|---|---|
| `settingsMode` | Auto / Target (Zielwert) |
| `highEnabled` | VPD-Obergrenze aktivieren |
| `highTrigger` | VPD-Obergrenze (kPa) |
| `lowEnabled` | VPD-Untergrenze aktivieren |
| `lowTrigger` | VPD-Untergrenze (kPa) |
| `targetEnabled` | Ziel-VPD-Modus aktivieren |
| `target` | Ziel-VPD (kPa) |

**Erweiterte Port-Einstellungen** (`ports.X.settings.*`)

| State | Beschreibung |
|---|---|
| `deviceType` | Angeschlossener Gerätetyp (Grow Light / Humidifier / Heater / AC / Fan) |
| `dynamicResponse` | Transition (Übergang) / Buffer (Puffer) |
| `dynamicTransitionTemp` | Übergangstemperatur-Schrittweite (°) |
| `dynamicTransitionHumidity` | Übergangsfeuchtigkeit-Schrittweite (%) |
| `dynamicTransitionVPD` | Übergangs-VPD-Schrittweite (kPa) |
| `dynamicBufferTemp` | Puffertemperatur (°) |
| `dynamicBufferHumidity` | Pufferfeuchtigkeit (%) |
| `dynamicBufferVPD` | Puffer-VPD (kPa) |
| `sunriseTimerEnabled` | Sonnenaufgang/Sonnenuntergang-Rampe aktiviert |
| `sunriseTimerMinutes` | Rampendauer (Minuten) |

### Controller-Einstellungen (lesen/schreiben pro Controller)

| State | Beschreibung |
|---|---|
| `settings.temperatureUnit` | C / F (nur lesen, Änderung in der AC Infinity App) |
| `settings.temperatureCalibration` | Temperatur-Kalibrierungsoffset (°) |
| `settings.humidityCalibration` | Feuchtigkeits-Kalibrierungsoffset (%) |
| `settings.vpdLeafTemperatureOffset` | Blatttemperatur-Offset für VPD-Berechnung (°) |
| `settings.outsideTemperature` | Außentemperatur-Referenz: Neutral / Lower / Higher |
| `settings.outsideHumidity` | Außenfeuchtigkeit-Referenz: Neutral / Lower / Higher |

---

## Einrichtung

1. Adapter in ioBroker installieren
2. **E-Mail-Adresse und Passwort** des AC Infinity-Kontos eingeben
3. **Abfrageintervall** festlegen (Minimum 10 Sekunden, Standard 30 Sekunden)
4. **Speichern & Schließen** klicken

Der Adapter erkennt automatisch alle verbundenen Controller und legt den State-Baum unter `acinfinity.0.devices.<deviceId>` an.

---

## Wie die Port-Modi funktionieren

| Modus | Verhalten |
|---|---|
| **Off** | Gerät läuft dauerhaft mit `offSpeed` |
| **On** | Gerät läuft dauerhaft mit `onSpeed` |
| **Auto** | Gerät schaltet basierend auf Temperatur- und/oder Feuchtigkeitsschwellwerten |
| **Timer to On** | Gerät schaltet nach `toOnMinutes` Minuten ein |
| **Timer to Off** | Gerät schaltet nach `toOffMinutes` Minuten aus |
| **Cycle** | Gerät wechselt zwischen EIN (`onMinutes`) und AUS (`offMinutes`) |
| **Schedule** | Gerät läuft täglich zwischen `startTime` und `endTime` |
| **VPD** | Gerät schaltet basierend auf VPD-Schwellwerten (Sättigungsdefizit) |

### Dynamische Reaktion: Transition vs. Buffer

- **Transition (Übergang):** Das Gerät erhöht die Geschwindigkeit schrittweise, je weiter die Messwerte vom Ziel abweichen. Jede Schrittweite ändert die Lüftergeschwindigkeit um eine Stufe.
- **Buffer (Puffer):** Erzeugt eine Hysteresezone um den Auslösepunkt, um schnelles Ein-/Ausschalten zu vermeiden.

---

## Fehlerbehebung

**Adapter verbindet nicht**
- E-Mail und Passwort in den Adapter-Einstellungen prüfen
- Sicherstellen, dass der Controller in der AC Infinity App online ist
- ioBroker-Log auf spezifische Fehlermeldungen prüfen

**Statusänderungen haben keine Wirkung**
- Log auf API-Fehlerantworten prüfen
- Adapter-Instanz neu speichern, um einen erneuten Login zu erzwingen
- Erreichbarkeit des Controllers prüfen (State `info.connection`)

**Sensorwerte fehlen**
- CO₂-, Boden- und Wasserstand-States erhalten nur Daten, wenn die entsprechenden UIS-Sensoren physisch angeschlossen und mit der Cloud synchronisiert sind

---

## Changelog

### 0.9.0 (2026-03-02)
- Sicherheit: Auth-Token wird nicht mehr in Logs geschrieben
- Stabilität: Race Condition bei parallelen Re-Login-Versuchen behoben
- Robustheit: Null-Prüfung für Sensorwerte (verhindert NaN bei nicht angeschlossenen Sensoren)
- Dokumentation: HTTP-Nutzung der AC Infinity API im Code kommentiert
- Hinweis: AC Infinity API unterstützt kein HTTPS (serverseitige Einschränkung)

### 0.8.5 (2026-03-01)
- Admin-UI: Hinweistext jetzt rot und fett dargestellt
- Admin-UI: Minimales Abfrageintervall von 5 auf 10 Sekunden erhöht

### 0.8.1 (2026-03-01)
- Fix: JSON-Syntaxfehler (überschüssiges Komma) in io-package.json behoben

### 0.8.0 (2026-03-01)
- Sicherheit: axios und form-data aktualisiert zur Behebung kritischer Sicherheitslücken (GHSA-4hjh-wcwx-xvwj, GHSA-43fc-jf86-j433, GHSA-fjxv-7rqg-78g4)

### 0.7.4 (2026-03-01)
- Admin-UI: Hinweistext zur eingeschränkten Gerätekompatibilität und Haftungsausschluss hinzugefügt

### 0.7.3 (2026-03-01)
- Admin-UI: Warnhinweis-Box entfernt, Einstellungslayout überarbeitet, Hilfe-Link korrigiert

### 0.7.2 (2026-03-01)
- Code: Migration auf ESLint 9 mit @iobroker/eslint-config

### 0.7.1 (2026-03-01)
- Wertebereiche zu Datenpunkt-Namen hinzugefügt für bessere Lesbarkeit

### 0.7.0 (2026-03-01)
- Adapter-Code vollständig mit Claude Code (Anthropic AI) auf Basis von homeassistant-acinfinity neu implementiert
- Alle 8 Port-Modi vollständig schreibbar aus ioBroker (Off / On / Auto / Timer to On / Timer to Off / Cycle / Schedule / VPD)
- curl durch axios ersetzt — keine Shell-Aufrufe mehr
- Neue Sensoren: CO₂, Bodenfeuchtigkeit, Wasserstand, pluggedIn
- Erweiterte Controller-Typen: CTR69W, CTR69P, CTR69Q, CTR89Q, AC-ADA4, AC-ADA8
- deviceType-Bug behoben im Port-Einstellungs-Handler
- Hardcodierten Referenz-Payload entfernt
- Abhängigkeiten aktualisiert: js-controller ≥6.0.11, admin ≥7.6.20, Node.js ≥20

### 0.5.6 (2025-04-27)
- Fehlerbehebungen und Verbesserungen

### 0.5.5 (2025-04-12)
- Weitere Fehler und Warnungen behoben

### 0.5.2 (2025-04-08)
- Weitere Fehlerbehebungen und Verbesserungen

### 0.4.3 (2025-03-28)
- Fehlerbehebungen und Verbesserungen

### 0.3.1 (2025-03-27)
- Erstveröffentlichung

---

## Haftungsausschluss

Die Nutzung dieser Software erfolgt ausdrücklich auf eigene Gefahr. Es wird keinerlei Garantie für die Funktionsfähigkeit, Fehlerfreiheit oder Eignung für einen bestimmten Zweck übernommen. Jegliche Haftung für direkte oder indirekte Schäden — einschließlich, aber nicht beschränkt auf Geräteausfälle, Datenverluste oder Fehlverhalten des Systems — wird ausdrücklich ausgeschlossen.

The use of this software is entirely at your own risk. No guarantees are made regarding functionality, reliability, or suitability for any particular purpose. Any liability for direct or indirect damages is expressly disclaimed.

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
