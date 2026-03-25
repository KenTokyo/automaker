---
title: 'Phase 7: Storage, Bildanhaenge, Vorschau'
description: 'Supabase Storage Upload-Hook, STRG+V Paste, Bild-Vorschau mit Lightbox, Attachment-Count in Kanban-Karten'
date: 2026-03-25
status: success
effort: medium
---

## Zusammenfassung

Phase 7 des Supabase-Masterplans implementiert die vollstaendige Attachment-Infrastruktur fuer Tasks:

- **Upload-Hook** (`use-task-attachments.ts`): CRUD fuer Attachments ueber Supabase Storage + DB-Metadaten
- **Pending-Attachments**: Dateien koennen vor Task-Erstellung eingefuegt werden (STRG+V oder Datei-Dialog)
- **Vorschau-Komponenten**: Thumbnails mit Signed URLs, Lightbox-Grossansicht, Datei-Icons fuer Nicht-Bilder
- **Kanban-Integration**: AttachmentCountBadge + expandierte Vorschau in der Task-Karte
- **Design**: Dunkles Design (bg-zinc-950), Cyan fuer Upload-Aktionen, Rose fuer Loeschen

## Neue Dateien

- `apps/ui/src/hooks/use-task-attachments.ts` -- Upload-Hook mit `useTaskAttachments` und `usePendingAttachments`
- `apps/ui/src/components/session-manager/task-attachment-preview.tsx` -- Vorschau-Komponenten (Thumbnails, Lightbox, Badge)

## Geaenderte Dateien

- `apps/ui/src/components/session-manager/task-create-dialog.tsx` -- STRG+V Handler, Datei-Anhang-Button, PendingAttachmentPreview
- `apps/ui/src/components/session-manager/kanban-task-card.tsx` -- AttachmentCountBadge, TaskAttachmentPreview
- `apps/ui/src/components/session-manager/tasks-panel.tsx` -- Upload pending attachments nach Task-Erstellung
- `apps/ui/src/hooks/use-tasks-source.ts` -- handleCreate gibt jetzt Task-ID zurueck
- `docs/tasks-online/.../phase-07-storage-attachments-MASTER-PLAN.md` -- Phase als erledigt markiert
- `docs/tasks-online/.../agentic-supabase-MASTER-PLAN.md` -- Phase 7 Checkbox gesetzt
