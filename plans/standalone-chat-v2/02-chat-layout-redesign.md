# Phase 2: Chat-Layout Neustruktur (3-Spalten-Layout)

ULTRATHINK

**Status**: ⬜ OFFEN
**Chat**: 1
**Geschätzte Tokens**: ~35.000

---

## Was ist das Problem?

Der aktuelle Chat nutzt einfach den `AgentView` aus der Haupt-UI.
Das ist funktional, aber:

- Keine Sidebar für Verlauf
- Kein Markdown Explorer
- Kein Platz für Session-Tabs
- Layout nicht optimiert für reinen Chat-Betrieb

## Was soll passieren?

Ein neues 3-Spalten-Layout wie in der UniAI Chat VS Code Extension:

```
┌──────────────────────────────────────────────────────────────┐
│ [Session Tabs]                                    [Aktionen] │
├────────────┬─────────────────────────────┬───────────────────┤
│            │                             │                   │
│  Verlauf   │    Chat-Nachrichten         │  Markdown         │
│  (History) │                             │  Explorer         │
│            │                             │                   │
│  - Suche   │  [Nachricht 1]              │  - Dateibaum      │
│  - Filter  │  [Nachricht 2]              │  - Suche          │
│  - Liste   │  [Tool-Use]                 │  - Favoriten      │
│            │  [Nachricht 3]              │                   │
│            │                             │                   │
│            ├─────────────────────────────┤                   │
│            │ [Eingabefeld]    [Senden]   │                   │
├────────────┴─────────────────────────────┴───────────────────┤
│ [Statusleiste]                                               │
└──────────────────────────────────────────────────────────────┘
```

## Wie der User die App danach erlebt

1. Links: Verlauf aller Chats (aufklappbar, ein-/ausblendbar)
2. Mitte: Der eigentliche Chat (Nachrichten + Eingabe)
3. Rechts: Markdown Explorer (aufklappbar, ein-/ausblendbar)
4. Oben: Session-Tabs für parallele Chats
5. Beides (links/rechts) kann mit einem Klick ein-/ausgeblendet werden

---

## Betroffene Dateien

### Neue Dateien (apps/chat/src/)

| Datei                               | Zweck                                             |
| ----------------------------------- | ------------------------------------------------- |
| `components/chat-view.tsx`          | Haupt-Chat-Komponente (ersetzt AgentView-Nutzung) |
| `components/chat-layout-v2.tsx`     | 3-Spalten-Layout Container                        |
| `components/chat-header.tsx`        | Kopfleiste mit Projekt, Aktionen, Session-Tabs    |
| `components/chat-sidebar-left.tsx`  | Container für History Panel                       |
| `components/chat-sidebar-right.tsx` | Container für Markdown Explorer                   |
| `components/chat-center.tsx`        | Nachrichten + Eingabe Bereich                     |
| `components/chat-status-bar.tsx`    | Statusleiste unten                                |

### Geänderte Dateien

| Datei                 | Was ändern                        |
| --------------------- | --------------------------------- |
| `src/chat-layout.tsx` | Neues Layout einbauen statt altem |
| `src/app.tsx`         | Neue Komponenten einbinden        |

---

## Aufgaben

### Aufgabe 2.1: Layout-Container erstellen (`chat-layout-v2.tsx`)

Hauptstruktur:

- Flex-Layout mit 3 Spalten
- Linke Sidebar: einblendbar (Standard: eingeklappt auf kleinen Bildschirmen)
- Rechte Sidebar: einblendbar (Standard: eingeklappt)
- Mittlerer Bereich: flexibel, füllt den Rest
- Responsive: Auf kleinen Bildschirmen nur Mitte sichtbar

Sidebar-Steuerung:

- Button zum Ein-/Ausblenden (Toggle)
- Breite per Drag veränderbar (Resize-Handle)
- Breite wird im LocalStorage gespeichert
- Minimum-Breite: 250px, Maximum: 500px

### Aufgabe 2.2: Chat-Header erstellen (`chat-header.tsx`)

Elemente (von links nach rechts):

- Projekt-Icon + Name (Dropdown zum Wechseln)
- Session-Tabs (falls mehrere aktiv)
- Spacer
- Aktions-Buttons:
  - "Neuer Chat" (Plus-Icon)
  - "Verlauf" Toggle (Clock-Icon)
  - "Dateien" Toggle (FolderOpen-Icon)
  - "Alles kopieren" (Copy-Icon)
  - "Speichern" (Save-Icon)
  - "Einstellungen" (Gear-Icon)

### Aufgabe 2.3: Chat-Center Bereich (`chat-center.tsx`)

Aufbau:

- Nachrichten-Container (scrollbar, flex-grow)
- Kontext-Leiste (AI-generierter Titel, optional)
- Eingabe-Container (unten fixiert)
- Stop-Button (wenn Agent läuft)

Nachrichten-Container:

- Übernimmt die bestehende Nachrichtenanzeige aus AgentView
- Auto-Scroll nach unten bei neuen Nachrichten
- "Scroll nach unten" Button wenn nicht am Ende

### Aufgabe 2.4: Sidebar-Container erstellen

**Linke Sidebar** (`chat-sidebar-left.tsx`):

- Header: "Verlauf" + Schließen-Button
- Content: Wird später durch History Panel gefüllt (Phase 7)
- Platzhalter für jetzt

**Rechte Sidebar** (`chat-sidebar-right.tsx`):

- Header: "Dateien" + Schließen-Button
- Content: Wird später durch Markdown Explorer gefüllt (Phase 9)
- Platzhalter für jetzt

### Aufgabe 2.5: Statusleiste (`chat-status-bar.tsx`)

Zeigt:

- Aktuelles Modell (z.B. "Claude Sonnet 4.6")
- Token-Zähler (Input/Output)
- Kosten-Anzeige (optional)
- Verbindungsstatus (Online/Offline)
- Thinking-Modus Anzeige (wenn aktiv)

### Aufgabe 2.6: chat-layout.tsx umbauen

- Alten Code entfernen (AgentView direkt)
- Neues `ChatLayoutV2` einbauen
- Settings-Panel bleibt als Sheet-Overlay
- ChatNoProjectState bleibt als Willkommens-Bildschirm

### Aufgabe 2.7: Styling & Tailwind

- Alle Farben über CSS-Variablen (Theme-kompatibel)
- Ränder in muted Farben (wie AGENTS.md vorschreibt)
- Schatten dezent
- Übergänge animiert (slide-in für Sidebars)
- Dark/Light Mode kompatibel

---

## Prüfpunkte

- [ ] 3-Spalten-Layout wird korrekt dargestellt
- [ ] Sidebars lassen sich ein-/ausblenden
- [ ] Sidebar-Breite per Drag veränderbar
- [ ] Breiten-Einstellungen werden gespeichert
- [ ] Responsive: Auf schmalen Bildschirmen nur Chat sichtbar
- [ ] Header zeigt Projekt + Aktions-Buttons
- [ ] Statusleiste zeigt Modell + Token-Info
- [ ] Chat-Nachrichten scrollen korrekt
- [ ] Theme-Wechsel funktioniert

---

## Edge Cases

| Fall                                           | Lösung                                     |
| ---------------------------------------------- | ------------------------------------------ |
| Beide Sidebars offen, Fenster klein            | Chat-Bereich hat Mindestbreite 400px       |
| Sidebar-Breite gespeichert, Monitor gewechselt | Validierung: max 40% der Fensterbreite     |
| Theme-Wechsel während Chat                     | CSS-Variablen aktualisieren, kein Neuladen |
| Kein Projekt ausgewählt                        | Willkommens-Bildschirm statt 3-Spalten     |
