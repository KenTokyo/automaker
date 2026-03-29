# 2026-03-28 Sub-Agent-History kompakter (PERFORMANCE-TESTPLAN)

## Ziel

Die kompaktere Darstellung darf die Session-Liste nicht langsamer machen.

## Checks

1. Öffnen einer Projektgruppe mit vielen Sessions.
2. Scrollen durch gemischte Parent/Child-Liste.
3. Laufende Sub-Agent-Updates (`subagent_progress`) bei geöffneter Liste.
4. Wechsel zwischen aktiver Session und Projektgruppen.

## Metriken (leichtgewichtig)

- Keine neuen flackernden Re-Renders in Session-Liste.
- Keine neue Query-Invalidation.
- Keine zusätzliche Dateiladung im Hintergrund.

## Technischer Fokus

- Reine Präsentationslogik in `session-list-item.tsx`.
- Keine Änderung an Server-List-Route.
- Kein zusätzlicher Hook-Loop.

## Akzeptanz

- UI bleibt flüssig bei laufenden Sub-Agenten.
- Keine sichtbare Verzögerung beim Öffnen/Schließen von Gruppen.
