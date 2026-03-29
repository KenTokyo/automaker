---
title: Terminal Eingabe und Layout Persistenz stabilisiert
description: Paste und Shift+Enter im Terminal repariert, Layout pro Projekt lokal gespeichert
date: 2026-03-28
status: success
effort: M
files:
  - apps/ui/src/components/views/terminal-view/terminal-panel.tsx
  - apps/ui/src/store/app-store.ts
  - History/terminal-input-paste-persistenz-verlauf.md
tags: [bugfix, ui]
---

## Zusammenfassung

Das Terminal-Verhalten wurde an zwei Stellen stabilisiert: Eingabe (Paste/Zeilenumbruch) und Sichtbarkeit nach erneutem Öffnen (Layout-Speicherung).

### Was wurde gemacht

- Paste läuft jetzt über den nativen xterm-Eingabepfad statt über einen direkten WebSocket-Bypass.
- `Shift+Enter` wurde als gezielter Zeilenumbruch eingebaut.
- Terminal-Layouts werden pro Projekt in LocalStorage gespeichert und beim Start wieder geladen.
- Der zuletzt aktive Projektpfad wird ebenfalls gespeichert, damit die Wiederherstellung konsistent bleibt.

### Wichtige Entscheidungen

- Für Paste wurde bewusst `terminal.paste(...)` genutzt, weil dieser Weg das Terminal-Verhalten bei Mehrzeilen-Eingaben sauberer abbildet.
- Für Persistenz wurde eine defensive Normalisierung beim Laden eingebaut, damit alte/kaputte Einträge die UI nicht brechen.

### Verifikation

- TypeScript-Check erfolgreich: `npm run typecheck`.
