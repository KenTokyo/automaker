---
title: CompletedTaskCard - Dateiliste, Copy-Button, Task-Pfad
description: Erweiterte CompletedTaskCard um ausklappbare Dateiliste, Copy-Button mit vollem Kontext und sichtbaren .completed/ Dateipfad
date: 2026-03-18
status: success
effort: M
files:
  - apps/ui/src/components/session-manager/completed-task-card.tsx
tags: [ui, feature]
---

## Was wurde gemacht

Die CompletedTaskCard-Komponente wurde um drei Features erweitert:

### 1. Ausklappbare Dateiliste

- Badge mit Datei-Icon und Anzahl in der Badge-Zeile
- Klick auf Badge klappt die Dateiliste auf/zu (ChevronRight rotiert)
- Jede Datei wird mit Mono-Font und vollem Pfad angezeigt
- Jede Datei hat einen eigenen Copy-Button (hover-only) zum Pfad kopieren

### 2. Copy-Button (Task + Dateien)

- Copy-Icon erscheint on-hover neben dem Delete-Button
- Kopiert den kompletten Task als Markdown (Titel, Status, Effort, Tags, Task-Datei, Dateien, Zusammenfassung)
- Check-Icon Feedback fuer 2 Sekunden nach Kopieren

### 3. Completed-Task Dateipfad

- Zeigt `.completed/filename.md` unterhalb der Beschreibung
- Klickbar zum Kopieren des vollen Pfads
- Hover-Effekt signalisiert Interaktivitaet

### Backend

Das Backend hatte bereits volle Unterstuetzung fuer `files[]` im CompletedTask Interface, im YAML-Parser und in der API. Es war nur die Frontend-Darstellung, die fehlte.
