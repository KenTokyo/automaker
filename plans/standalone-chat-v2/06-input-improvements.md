# Phase 6: Eingabebereich Verbesserungen

ULTRATHINK

**Status**: ⬜ OFFEN
**Chat**: 2
**Geschätzte Tokens**: ~25.000

---

## Was ist das Problem?

Der aktuelle Eingabebereich ist einfach gehalten.
Für eine vollwertige Chat-Plattform brauchen wir:

- Auto-Resize der Eingabe
- Modell-Auswahl direkt im Eingabebereich
- Bild-Anhänge
- Modus-Schalter (Thinking, Orchestrator)
- Draft-Speicherung pro Session

## Was soll passieren?

Ein aufgewerteter Eingabebereich mit allen nötigen Steuerungen.
Kompakt wenn nicht in Nutzung, erweitert wenn aktiv.

## Wie der User die App danach erlebt

1. Eingabefeld passt sich automatisch an die Textlänge an
2. Unter dem Feld: Modell-Wahl, Thinking-Modus, Senden-Button
3. Bilder per Drag & Drop oder Klick anhängen
4. Strg+Enter zum Senden
5. Eingabe bleibt erhalten wenn man den Tab wechselt

---

## Betroffene Dateien

### Neue Dateien (apps/chat/src/)

| Datei                                   | Zweck                                   |
| --------------------------------------- | --------------------------------------- |
| `components/chat-input.tsx`             | Haupteingabe-Komponente                 |
| `components/chat-input-toolbar.tsx`     | Werkzeugleiste unter der Eingabe        |
| `components/model-selector-compact.tsx` | Kompakte Modell-Auswahl                 |
| `components/image-attachment.tsx`       | Bild-Anhang Vorschau/Verwaltung         |
| `components/mode-toggles.tsx`           | Modus-Schalter (Thinking, Orchestrator) |

---

## Aufgaben

### Aufgabe 6.1: Chat-Eingabe Komponente (`chat-input.tsx`)

Textarea-Verhalten:

- Auto-Resize: Wächst mit dem Text (min 1 Zeile, max 15 Zeilen)
- Danach: Scroll innerhalb der Textarea
- Placeholder: "Nachricht schreiben..." (oder projektspezifisch)
- Fokus: Automatisch nach Session-Wechsel oder neuem Chat

Tastenkürzel:

- `Enter` oder `Ctrl+Enter`: Senden (konfigurierbar)
- `Shift+Enter`: Neue Zeile
- `Escape`: Eingabe leeren (mit Bestätigung wenn Text vorhanden)
- `Ctrl+V`: Bild aus Zwischenablage einfügen
- `Pfeil hoch`: Letzte eigene Nachricht bearbeiten (optional)

Draft-Speicherung:

- Text wird pro Session im Store gespeichert (debounced, 500ms)
- Bei Session-Wechsel: Alten Draft wiederherstellen
- Bei App-Neustart: Draft aus Store laden

### Aufgabe 6.2: Werkzeugleiste (`chat-input-toolbar.tsx`)

Layout (eine Zeile unter der Eingabe):

```
[Modell ▾] [Thinking ◉] [Orchestrator ◉] [Bilder 📎]  ──────  [Stop ⬛] [Senden ➤]
```

Elemente:

- **Modell-Auswahl**: Dropdown mit verfügbaren Modellen
- **Thinking Toggle**: An/Aus + Intensität (low/medium/high)
- **Orchestrator Toggle**: An/Aus
- **Bild-Anhang**: Klick zum Datei-Wählen oder Drag&Drop
- **Stop-Button**: Nur sichtbar wenn Agent läuft
- **Senden-Button**: Aktiv wenn Text vorhanden, disabled wenn Agent läuft

### Aufgabe 6.3: Kompakte Modell-Auswahl (`model-selector-compact.tsx`)

- Kleiner Button mit aktuellem Modell-Namen (abgekürzt)
- Klick → Dropdown mit allen verfügbaren Modellen
- Gruppiert nach Provider (Claude, Gemini, etc.)
- Aktuelles Modell markiert
- Modell-Wechsel wird pro Session gespeichert
- Schnellzugriff: Häufig genutzte Modelle oben

### Aufgabe 6.4: Bild-Anhänge (`image-attachment.tsx`)

Anhängen via:

- Button-Klick → Datei-Dialog
- Drag & Drop auf die Eingabe
- Ctrl+V → Bild aus Zwischenablage

Vorschau:

- Kleine Thumbnails über der Eingabe
- "X" zum Entfernen
- Klick zum Vergrößern (optional)

Unterstützte Formate:

- PNG, JPG, GIF, WebP
- Max 10 Bilder pro Nachricht
- Max 20MB pro Bild

### Aufgabe 6.5: Modus-Schalter (`mode-toggles.tsx`)

**Thinking-Modus:**

- Toggle Button (Gehirn-Icon)
- Wenn aktiv: Dropdown für Intensität (Niedrig, Mittel, Hoch)
- Status wird pro Session gespeichert
- Visuelles Feedback (farbiger Rand wenn aktiv)

**Orchestrator-Modus:**

- Toggle Button (Zahnrad-Icon)
- Wenn aktiv: Zeigt Iterations-Zähler
- Generiert neue RunId beim Aktivieren
- Status wird pro Session gespeichert

### Aufgabe 6.6: Stop-Funktionalität

- Button erscheint wenn Agent läuft
- Klick → `POST /api/agent/stop` mit Session-ID
- Visuelles Feedback (Button wird disabled nach Klick)
- Timeout: Falls nach 5s kein Stop-Event → erneut versuchen
- Chat zeigt "[Gestoppt]" Markierung

### Aufgabe 6.7: Sende-Logik

Ablauf beim Senden:

1. Text + Bilder aus Input sammeln
2. Input leeren
3. User-Nachricht lokal anzeigen (sofort)
4. `POST /api/agent/send` aufrufen
5. Auf WebSocket-Events warten (stream, tool_use, complete)
6. Assistant-Nachricht live aufbauen
7. Bei Fehler: Fehlernachricht anzeigen, Input wiederherstellen

---

## Prüfpunkte

- [ ] Auto-Resize der Textarea funktioniert
- [ ] Enter/Ctrl+Enter zum Senden
- [ ] Modell-Auswahl per Dropdown
- [ ] Thinking-Modus Toggle + Intensität
- [ ] Orchestrator-Modus Toggle
- [ ] Bild-Anhänge per Drag&Drop und Zwischenablage
- [ ] Draft-Speicherung pro Session
- [ ] Stop-Button erscheint/funktioniert
- [ ] Senden deaktiviert während Agent läuft
- [ ] Tastenkürzel funktionieren

---

## Edge Cases

| Fall                                 | Lösung                              |
| ------------------------------------ | ----------------------------------- |
| Senden mit leerem Text aber Bild     | Erlaubt (Bild als einziger Inhalt)  |
| Senden ohne aktive Server-Verbindung | Fehlermeldung, Text bleibt erhalten |
| Sehr langer Text (10.000+ Zeichen)   | Wird gesendet, Textarea scrollt     |
| Modell wechseln während Agent läuft  | Gilt erst für nächste Nachricht     |
| Bild einfügen in Electron-Modus      | Dialog über IPC, Pfad-Validierung   |
