# Phase 2: Chat-Layout Neustruktur (3-Spalten-Layout)

ULTRATHINK

**Status**: ✅ ERLEDIGT
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

## Ergebnis

1. Das neue 3-Spalten-Layout ist im Chat aktiv.
2. Oben gibt es jetzt eine klare Kopfzeile mit Projektwahl, Session-Tabs und Aktionen.
3. Links gibt es einen Verlauf mit Suche und schnellem „Neuer Chat“-Button.
4. Rechts gibt es einen klaren Datei-Bereich als Platzhalter für den Markdown Explorer.
5. Unten zeigt eine Statusleiste Modell, Token-Schätzung, Verbindung und Fehler.

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

- [x] 3-Spalten-Layout wird korrekt dargestellt
- [x] Sidebars lassen sich ein-/ausblenden
- [x] Sidebar-Breite per Drag veränderbar
- [x] Breiten-Einstellungen werden gespeichert
- [x] Responsive: Auf schmalen Bildschirmen nur Chat sichtbar
- [x] Header zeigt Projekt + Aktions-Buttons
- [x] Statusleiste zeigt Modell + Token-Info
- [x] Chat-Nachrichten scrollen korrekt
- [x] Theme-Wechsel funktioniert

---

## Edge Cases

| Fall                                           | Lösung                                     |
| ---------------------------------------------- | ------------------------------------------ |
| Beide Sidebars offen, Fenster klein            | Chat-Bereich hat Mindestbreite 400px       |
| Sidebar-Breite gespeichert, Monitor gewechselt | Validierung: max 40% der Fensterbreite     |
| Theme-Wechsel während Chat                     | CSS-Variablen aktualisieren, kein Neuladen |
| Kein Projekt ausgewählt                        | Willkommens-Bildschirm statt 3-Spalten     |

## Konkret umgesetzt

### Neue Dateien

- `apps/chat/src/components/chat-view.tsx`
- `apps/chat/src/components/chat-layout-v2.tsx`
- `apps/chat/src/components/chat-header.tsx`
- `apps/chat/src/components/chat-sidebar-left.tsx`
- `apps/chat/src/components/chat-sidebar-right.tsx`
- `apps/chat/src/components/chat-center.tsx`
- `apps/chat/src/components/chat-status-bar.tsx`

### Geänderte Datei

- `apps/chat/src/chat-layout.tsx` nutzt jetzt `ChatView` statt direktem Alt-Aufbau.

## TypeScript-Check

- `npm run typecheck:chat` ✅
