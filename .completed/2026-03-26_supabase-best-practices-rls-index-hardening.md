---
title: Supabase Best-Practice Härtung für RLS und FK-Indexe
description: Kritische Supabase-Advisor-Hinweise zu RLS-Performance und fehlenden FK-Indexen wurden per Migration behoben
date: 2026-03-26
status: success
effort: M
files:
  - supabase/migrations/006_rls_performance_and_fk_indexes.sql
  - History/supabase-mit-mcp-team-page-zu-project-configs-erzngzen-fehle.md
tags: [supabase, postgres, rls, performance, migration]
---

## Zusammenfassung

Nach Anwendung des Skills `supabase-postgres-best-practices` wurde die
Supabase-Datenbank gezielt gehärtet.

## Umgesetzt

- Migration `006_rls_performance_and_fk_indexes` erstellt und live angewendet.
- RLS-Policies auf `(select auth.uid())` umgestellt, damit `auth.uid()` nicht
  pro Zeile neu ausgewertet wird.
- Zwei Trigger-Funktionen mit festem `search_path` abgesichert.
- Fehlende Indexe auf FK-Spalten ergänzt:
  - `task_attachments(created_by)`
  - `task_notifications(task_id)`
  - `task_project_members(user_id)`
  - `tasks(updated_by)`
- Doppelte SELECT-Policy auf `task_projects` zu einer Policy zusammengeführt.

## Ergebnis

- Performance-Advisor-Warnungen zu:
  - `auth_rls_initplan`
  - `unindexed_foreign_keys`
    sind behoben.
- Security-Advisor zeigt noch:
  - `auth_leaked_password_protection` (muss im Supabase Auth Dashboard aktiviert werden).
