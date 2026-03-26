---
title: Sidebar aufgeräumt und Legacy-Views ausgeblendet
description: Board, Graph und Spec aus der Navigation entfernt, durch leichte Hinweis-Routen ersetzt und Hidden-Übersicht mit Auge-Icon ergänzt
date: 2026-03-26
status: success
effort: M
files:
  - apps/ui/src/components/layout/sidebar/constants.ts
  - apps/ui/src/components/layout/sidebar/hooks/use-navigation.ts
  - apps/ui/src/components/layout/sidebar/sidebar.tsx
  - apps/ui/src/components/layout/sidebar/components/sidebar-navigation.tsx
  - apps/ui/src/routes/board.tsx
  - apps/ui/src/routes/graph.tsx
  - apps/ui/src/routes/spec.tsx
  - apps/ui/src/vite-env.d.ts
  - History/deprecated-oder-unbenutzt-markieren-und-laufleistung-verbess.md
tags: [cleanup, ui, performance, refactor]
---

## Zusammenfassung

Die linke Sidebar wurde bewusst entschlackt. Bereiche, die aktuell nicht genutzt werden, sind raus aus der Standard-Navigation.
Zusätzlich gibt es jetzt eine klare Stelle, wo man die ausgeblendeten Punkte sehen kann.

### Was wurde gemacht

- `Kanban Board`, `Graph View` und `Spec Editor` werden standardmäßig ausgeblendet.
- Sidebar zeigt jetzt einen kompakten Bereich `Ausgeblendete Bereiche` mit Auge-Icon und Hover-Liste.
- Route `/board` zeigt klar: altes Board ist veraltet und verweist auf `https://automaker-kanban.vercel.app/`.
- Routen `/graph` und `/spec` zeigen leichte Hinweis-Seiten statt die alten schweren Views zu laden.

### Wichtige Entscheidungen

- Kein hartes Löschen der Alt-Views: Alte URLs funktionieren weiterhin, aber mit klarer Nachricht.
- Default-Ausblendung über Flags mit `!== 'false'`, damit neue Starts sofort schlanker sind.
- Tools wie `Context` und `Memory` bleiben bewusst sichtbar.

### Validierung

- `npm run typecheck` erfolgreich.
- UTF-8-Check auf geänderten Dateien erfolgreich (keine kaputten Zeichenfolgen).
