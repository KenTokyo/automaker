---
title: Session-Liste Parent-only Paginierung + Kaskaden-Loeschung
description: Paginierung zaehlt nur Parent-Sessions, Kaskaden-Loeschung im Backend
date: 2026-03-29
status: success
effort: M
files:
  - apps/ui/src/components/session-manager/project-group-section.tsx
  - apps/ui/src/hooks/use-project-grouping.ts
  - apps/server/src/services/agent-service.ts
tags: [feature, refactor]
---

## Aenderungen

### 1. LOAD_MORE_COUNT: 10 -> 5

- Button zeigt jetzt "+5 weitere anzeigen" statt "+10"

### 2. Parent-only Paginierung

- `parentCount` als neues Feld in `ProjectGroup` Interface
- `visibleCount` zaehlt nur Parent-Sessions (Sessions ohne `parentSessionId`)
- Children werden automatisch mit ihrem Parent angezeigt, zaehlen aber nicht zum Limit
- "Verbleibend"-Zaehler basiert auf `parentCount`, nicht `totalCount`

### 3. Kaskaden-Loeschung (Backend)

- `deleteSession()` in `agent-service.ts` loescht jetzt rekursiv alle Children
- Child loeschen laesst Parent unberuehrt (war schon so, jetzt explizit sichergestellt)
- Grandchildren werden ebenfalls kaskadiert entfernt
