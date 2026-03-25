---
title: Projekte-Verwaltungs-Dialog im AgentHeader
description: Neuer Dialog zum Verwalten aller Projekte (ein-/ausblenden, Papierkorb, wiederherstellen) über den AgentHeader Dropdown.
date: 2026-03-22
status: success
effort: M
files:
  - apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx
  - apps/ui/src/components/views/agent-view/components/agent-header.tsx
tags: [feature, ui]
---

## Was wurde gemacht

Ein neuer "Projekte verwalten"-Dialog wurde erstellt und in den AgentHeader integriert.

### Neue Datei: `manage-projects-dialog.tsx`

- Dialog mit 3 Tabs: **Alle**, **Versteckt**, **Papierkorb**
- Suchfeld zum schnellen Finden von Projekten
- Jedes Projekt zeigt Icon, Name und Pfad
- **Alle-Tab**: Projekte ein-/ausblenden + in Papierkorb verschieben
- **Versteckt-Tab**: Versteckte Projekte wieder sichtbar machen
- **Papierkorb-Tab**: Projekte wiederherstellen oder endgültig löschen + "Alle löschen"
- Hilfetexte für leere Zustände

### Änderungen an `agent-header.tsx`

- "Projekte verwalten"-Button im Dropdown-Footer (mit Zahnrad-Icon)
- Hinweis-Banner wenn Projekte versteckt sind: "3 Projekte ausgeblendet → Verwalten"
- Dropdown-Texte auf Deutsch umgestellt (navigieren, auswählen, schließen)

### TypeScript

- 0 Fehler, kompiliert sauber
