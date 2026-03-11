# Phase 12: Sound-Einstellungen im UI

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 5
**Geschätzte Tokens**: ~30.000

---

## Was ist das Problem?

Wenn Sounds kommen, braucht der User einfache Kontrolle.
Ohne Einstellungen wirkt es schnell störend.

## Was soll passieren?

Ein kleines, klares Einstellungsfeld für Sounds.
Mit Testknopf, Lautstärke und Ereignis-Auswahl.

## Wie der User die App danach erlebt

1. Sounds lassen sich in 5 Sekunden anpassen.
2. Ein Testton zeigt sofort, ob alles passt.
3. Bei Bedarf ist schnell alles stumm.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei                                 | Zweck                   |
| ------------------------------------- | ----------------------- |
| `components/sound-settings-panel.tsx` | UI für Sound-Steuerung  |
| `components/sound-toggle.tsx`         | Kleiner Schnellschalter |

### Geänderte Dateien

| Datei                           | Was ändern                     |
| ------------------------------- | ------------------------------ |
| `components/settings-panel.tsx` | Sound-Bereich ergänzen         |
| `stores/session-store.ts`       | Sound-Settings im Store führen |

---

## Aufgaben

### Aufgabe 12.1: Grundoptionen

- Master-Schalter `Sounds an/aus`
- Lautstärke-Regler 0–100
- Auswahl: `Alle`, `Nur Fehler`, `Nur Abschluss`, `Keine`

### Aufgabe 12.2: Ereignis-Feinsteuerung

- Einzelne Schalter für `Task fertig`, `Phase fertig`, `Fehler`
- Kleine Beschreibung direkt daneben
- Sinnvolle Standardwerte beim ersten Start

### Aufgabe 12.3: Testfunktion

- „Testton abspielen“ Button
- Test mit aktueller Lautstärke und aktuellem Profil
- Bei Fehler klarer Hinweistext

### Aufgabe 12.4: Speicherlogik

- Einstellungen lokal speichern
- Beim Start automatisch laden
- Bei Reset: auf sichere Standardwerte zurücksetzen

### Aufgabe 12.5: Schnelle Bedienung

- Kleiner Sound-Schalter im Chat-Header
- Tooltip mit aktuellem Status (z.B. „Nur Fehler-Sounds“)

---

## Prüfpunkte

- [x] Sound-Einstellungen sind leicht verständlich
- [x] Testton funktioniert zuverlässig
- [x] Einstellungen bleiben nach Neustart erhalten
- [x] Header-Schalter synchron mit Settings-Panel
- [x] Keine kaputten Zustände bei Wechsel zwischen Profilen

---

## Umsetzung (2026-03-10)

- Neues UI-Feld `SoundSettingsPanel` ergänzt: Master-Schalter, Lautstärke, Profil, Einzel-Events, Testton, Reset.
- Neuer Schnellschalter `SoundToggle` im Chat-Header ergänzt, inklusive Tooltip mit aktuellem Sound-Status.
- Einstellungen werden im `sound-store` lokal gespeichert und beim Neustart wieder geladen.
- Testton nutzt die aktuelle Lautstärke und das aktive Profil.
- Bei manueller Event-Feinsteuerung wird das Profil sauber auf eigene Auswahl umgestellt.

---

## Edge Cases

| Fall                               | Lösung                              |
| ---------------------------------- | ----------------------------------- |
| Lautstärke auf 0, aber Sounds „an“ | Klar als „praktisch stumm“ anzeigen |
| Defektes Audio-Gerät               | Hinweis ohne App-Fehler             |
| Sehr schneller Toggle-Wechsel      | Entprellen (Debounce) bei Speichern |
| Einstellungen aus alter Version    | Migration auf neue Defaults         |
