---
title: Supabase Deploy Black Screen Fix
description: React-Versionen vereinheitlicht und Team-DB-Toggle ohne Datenverlust abgesichert
date: 2026-03-25
status: success
effort: L
files:
  - apps/ui/package.json
  - apps/chat/package.json
  - package.json
  - package-lock.json
  - apps/ui/src/hooks/use-supabase-projects.ts
  - apps/ui/src/components/views/agent-view/components/manage-projects-dialog.tsx
  - History/supabase-deploy-black-screen-verlauf.md
tags: [bugfix, config, ui]
---

## Zusammenfassung

Beim Web-Deploy trat ein schwarzer Screen auf. Hauptursache war eine gemischte React-Runtime (`react` und `react-dom` mit unterschiedlichen Versionen).  
Parallel wurde ein kritisches Risiko im Team-DB-Schalter behoben, damit beim Deaktivieren keine Projektdaten geloescht werden.

### Was wurde gemacht

- React/React-DOM in den betroffenen Workspaces auf `19.2.4` vereinheitlicht.
- Root-`overrides` gesetzt, um gemischte Versionen im Monorepo zu verhindern.
- Lockfile aktualisiert.
- Team-DB-Umschaltung in der Projektverwaltung umgestellt:
  - kein Loeschen des Supabase-Projekts mehr beim Deaktivieren
  - stattdessen Toggle von `share_enabled`
- Typecheck und UI-Build (Web-Modus) erfolgreich ausgefuehrt.
- Review der Supabase-Phasen durchgefuehrt und offene Risiken dokumentiert.

### Wichtige Entscheidungen

- Version-Fix ueber `overrides`, damit auch indirekte Abhaengigkeiten konsistent bleiben.
- Team-DB als Schalter fuer Freigabe-Status statt als Schalter fuer harte Projekt-Loeschung.

### Offene Hinweise

- Attachment-Storage-Policies sollten auf Projektmitgliedschaft eingegrenzt werden.
- Auth-Listener sollte ein explizites Unsubscribe bekommen.
- Migrations-Deduplikation derzeit nur nach Titel.
- Attachment-Loeschpfad sollte Storage-Fehler strenger behandeln.
