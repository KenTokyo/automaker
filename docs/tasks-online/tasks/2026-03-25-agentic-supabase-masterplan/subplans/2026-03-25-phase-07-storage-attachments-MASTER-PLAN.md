# Phase 7 -- Storage, Bildanhaenge, Vorschau

## Referenz

- Masterplan: ../2026-03-25-agentic-supabase-MASTER-PLAN.md

## Verantwortlicher Sub-Agent

- Primaer: programmierer
- Unterstuetzend: explorer (Dateien/Blast-Radius), planer (Feinschnitt)

## Ziel dieser Phase

- [x] STRG+V Bildupload nach Supabase Storage
- [x] Vorschau in Task-Karten + Grossansicht
- [x] Optionales Markup/Annotation als Erweiterung vorbereiten (Infrastruktur steht, Annotation nicht implementiert)

## Betroffene Komponenten

- apps/ui/src/hooks/use-task-attachments.ts (NEU)
- apps/ui/src/components/session-manager/task-attachment-preview.tsx (NEU)
- apps/ui/src/components/session-manager/task-create-dialog.tsx (MODIFIZIERT)
- apps/ui/src/components/session-manager/kanban-task-card.tsx (MODIFIZIERT)
- apps/ui/src/components/session-manager/tasks-panel.tsx (MODIFIZIERT)
- apps/ui/src/hooks/use-tasks-source.ts (MODIFIZIERT - handleCreate gibt jetzt Task-ID zurueck)
- Supabase Storage Bucket `task-attachments` + Policies (bereits in Migration 004)

## Akzeptanzkriterien

- [x] Zielumfang dieser Phase ist umgesetzt
- [x] Keine Regression in direkt betroffenen Komponenten (TypeScript fehlerfrei)
- [x] Uebergabe-Notiz fuer naechste Phase erstellt

## Was wurde implementiert

### 1. use-task-attachments.ts Hook

- `useTaskAttachments(taskId)` -- Vollstaendiger CRUD-Hook fuer Attachments
  - `uploadAttachment(taskId, file)` -- Upload nach Storage + Metadaten in DB
  - `getAttachments(taskId)` -- Attachments laden
  - `deleteAttachment(id, storagePath)` -- Storage + DB loeschen
  - `getSignedUrl(storagePath)` -- Signed URL fuer private Bilder
  - `uploadPendingAttachments(taskId, pending[])` -- Batch-Upload nach Task-Erstellung
- `usePendingAttachments()` -- Verwaltet Dateien die vor Task-Erstellung eingefuegt werden
  - `addFiles(files[])` -- Dateien zur Queue hinzufuegen
  - `removeFile(id)` -- Einzelne Datei entfernen
  - `clear()` -- Queue leeren
  - Automatische Object-URL Verwaltung (erstellt/revoked)
- Storage-Pfad: `{userId}/{taskId}/{uniqueFileName}`

### 2. task-attachment-preview.tsx Komponenten

- `TaskAttachmentPreview` -- Zeigt Bild-Thumbnails mit Signed URLs, Lightbox, Loeschen
- `PendingAttachmentPreview` -- Zeigt Vorschau fuer noch nicht hochgeladene Dateien
- `AttachmentCountBadge` -- Kompaktes Badge mit Paperclip-Icon + Zahl
- `Lightbox` -- Fullscreen schwarzer Overlay mit zentriertem Bild (Escape zum Schliessen)
- Design: bg-zinc-900/80, border-white/5, Cyan fuer Upload, Rose fuer Loeschen

### 3. task-create-dialog.tsx Integration

- STRG+V onPaste Handler auf dem Form -- faengt Bilder aus der Zwischenablage
- Datei-Anhang-Button mit file input (multiple, accept filter)
- PendingAttachmentPreview zeigt angefuegte Dateien vor dem Erstellen
- CreateTaskData hat jetzt `pendingAttachments?: PendingAttachment[]`
- Pending attachments werden nach Task-Erstellung hochgeladen (tasks-panel)

### 4. kanban-task-card.tsx Integration

- AttachmentCountBadge neben dem Datum (nur wenn > 0)
- TaskAttachmentPreview in der expandierten Ansicht mit Loeschen-Option

### 5. use-tasks-source.ts Aenderung

- `handleCreate` gibt jetzt `Promise<string | null>` zurueck (Task-ID)
- Ermoeglicht Upload von pending attachments nach Task-Erstellung

## Abschluss-Block

- Datum: 2026-03-25
- Geliefert: Upload-Hook, Vorschau-Komponenten, STRG+V Paste, Lightbox, Kanban-Integration
- Offene Risiken: Annotation/Markup ist nur vorbereitet (Hook-Infrastruktur), nicht als UI implementiert. Storage-Policies setzen voraus dass die Migration 004 ausgefuehrt wurde.

## Uebergabe an Phase 8

Die Attachment-Infrastruktur ist vollstaendig. Phase 8 (Notifications + Realtime) kann unabhaengig weiterarbeiten. Falls Realtime-Updates auch fuer Attachments gewuenscht sind, koennte ein Supabase Channel auf `task_attachments` ergaenzt werden.
