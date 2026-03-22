---
title: Tasks-Panel Integration in SessionManager
description: Integration des TasksPanel als neuen Tab in der session-manager.tsx Komponente
date: 2026-03-18
status: done
effort: small
---

# Tasks-Panel Integration in SessionManager

## Zusammenfassung

Der TasksPanel wurde als neuer Tab in die session-manager.tsx integriert. Der Tab erscheint zwischen "Uebersicht" und "Fertig" in der Tab-Leiste.

## Durchgefuehrte Aenderungen

### Datei: `apps/ui/src/components/session-manager.tsx`

1. **Icon Import hinzugefuegt**
   - `ListTodo` wurde zum bestehenden lucide-react Import hinzugefuegt

2. **TasksPanel Import hinzugefuegt**
   - `import { TasksPanel } from '@/components/session-manager/tasks-panel';`

3. **Neuer TabsTrigger hinzugefuegt**
   - Position: Nach "Uebersicht" und vor "Fertig"
   - Styling: Identisch zu den anderen Tabs (`h-6 flex-1 gap-1 px-2 text-xs font-semibold`)

4. **Panel-Rendering hinzugefuegt**
   - Bedingtes Rendering fuer `leftPanelTab === 'tasks'`
   - TasksPanel erhaelt `projectPath` als Prop

## Tab-Reihenfolge

Die finale Tab-Reihenfolge ist:

1. Sessions
2. Docs
3. Uebersicht
4. Tasks (NEU)
5. Fertig

## Voraussetzungen

Der `LeftPanelTab` Type in `apps/ui/src/store/types/ui-types.ts` enthielt bereits `'tasks'` als gueltigen Wert, sodass keine Type-Aenderungen notwendig waren.

## TypeScript-Status

Die Aenderungen in session-manager.tsx verursachen keine neuen TypeScript-Fehler. Existierende Fehler in den Task-Komponenten (task-card.tsx, tasks-panel.tsx, etc.) stammen aus frueheren Phasen, wo Task-Typen noch in @automaker/types exportiert werden muessen.

## Betroffene Dateien

- `apps/ui/src/components/session-manager.tsx` - Modifiziert
