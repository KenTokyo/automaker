# Chat aktiv: Randfarbe-Verlauf

## Was gemacht wurde

- Im aktiven Chat gibt es jetzt eine klare Farbmarkierung am Rand:
  - Orange, wenn der Chat gerade läuft.
  - Rot, wenn der Chat gestoppt wurde.
- Die Markierung sitzt an zwei gut sichtbaren Stellen:
  - an den Trennlinien (Resize-Handles) rund um den Chat-Bereich,
  - an der oberen Linie vom Eingabebereich.
- Es wird nur der aktuell geöffnete Chat markiert.

## Betroffene Dateien

- `apps/ui/src/components/views/agent-view.tsx`
- `apps/ui/src/components/views/agent-view/input-area/agent-input-area.tsx`

## Ergebnis

- Laufende Chats sind sofort sichtbar (orange).
- Abgebrochene Chats sind sofort sichtbar (rot).
- Bei normalen Zuständen bleibt alles wie bisher.

## Hinweis

- TypeScript-Check (`npm run typecheck`) läuft sauber.
