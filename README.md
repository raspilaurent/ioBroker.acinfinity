# ioBroker.acinfinity

![Logo](admin/acinfinity.png)

[![NPM version](https://img.shields.io/npm/v/iobroker.acinfinity.svg)](https://www.npmjs.com/package/iobroker.acinfinity)
[![Lizenz: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**BETA-VERSION — NUTZUNG AUF EIGENE GEFAHR**

ioBroker-Adapter zur Überwachung und Steuerung von **AC Infinity UIS WiFi-Controllern** (Controller 69 Pro, 69 Pro+, AI+, Outlet AI/AI+).

Alle Credits für das API-Reverse-Engineering gehen an **[dalinicus/homeassistant-acinfinity](https://github.com/dalinicus/homeassistant-acinfinity)**.

---

## Unterstützte Geräte

| Modell | Typ-ID | Hinweis |
|---|---|---|
| Controller 69 WiFi (CTR69W) | 1 | Basis WiFi-Modell |
| Controller 69 Pro (CTR69P) | 11 | |
| Controller 69 Pro+ (CTR69Q) | 18 | |
| Controller AI+ (CTR89Q) | 20 | 8-Port KI-Modell |
| Controller Outlet AI (AC-ADA4) | 22 | 4-Steckdosen KI-Modell |
| Controller Outlet AI+ (AC-ADA8) | 24 | 8-Steckdosen KI-Modell |

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

### 0.6.0-beta.1 (2026-03-01)
- **Alle 8 Port-Modi vollständig schreibbar** aus ioBroker (bisher funktionierten nur Ein/Aus)
- **curl durch axios ersetzt** — einheitliche HTTP-Kommunikation, keine Shell-Aufrufe mehr
- **Hardcodierten Referenz-Payload entfernt** aus `updateDeviceModeSettings`
- **deviceType-Bug behoben** im Port-Einstellungs-Handler (numerische ID wurde als String verglichen)
- **Neue Sensoren:** CO₂, Bodenfeuchtigkeit, Wasserstand, Verbindungsindikator
- **Erweiterte Controller-Typen:** AI+, Outlet AI, Outlet AI+, CTR69W
- Auto/VPD/Timer/Zyklus/Zeitplan-Parameter nutzen jetzt sauberen Einzelabruf → Änderung → Senden-Ablauf
- Code-Bereinigung und verbesserte Log-Ausgaben

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

## Lizenz

MIT-Lizenz — Copyright (c) 2025 raspilaurent

Hiermit wird unentgeltlich jeder Person, die eine Kopie der Software und der zugehörigen Dokumentationen (die „Software") erhält, die Erlaubnis erteilt, sie uneingeschränkt zu nutzen, inklusive und ohne Ausnahme mit dem Recht, sie zu verwenden, zu kopieren, zu verändern, zusammenzuführen, zu veröffentlichen, zu verbreiten, zu unterlizenzieren und/oder zu verkaufen, und Personen, denen diese Software überlassen wird, diese Rechte zu verschaffen, unter den folgenden Bedingungen:

Der obige Urheberrechtsvermerk und dieser Erlaubnisvermerk sind in allen Kopien oder Teilkopien der Software beizulegen.

DIE SOFTWARE WIRD OHNE JEDE AUSDRÜCKLICHE ODER IMPLIZIERTE GARANTIE BEREITGESTELLT, EINSCHLIEẞLICH DER GARANTIE ZUR BENUTZUNG FÜR DEN VORGESEHENEN ODER EINEM BESTIMMTEN ZWECK SOWIE JEGLICHER RECHTSVERLETZUNG, JEDOCH NICHT DARAUF BESCHRÄNKT. IN KEINEM FALL SIND DIE AUTOREN ODER COPYRIGHTINHABER FÜR JEGLICHEN SCHADEN ODER SONSTIGE ANSPRÜCHE HAFTBAR ZU MACHEN.
