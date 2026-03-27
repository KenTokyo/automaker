# Task-Status-Sync – Master-Plan

## Ziel

Wenn ein Task an den Agent gesendet wird, soll der Ablauf sauber sein:

1. `todo` -> `in_progress` erst bei echtem Start
2. `in_progress` -> `completed` bei echtem Abschluss
3. Alles synchron sichtbar in Automaker + kanban-web

---

## Phase 1 – "Sofort starten" wirklich starten

- [x] In `TaskSendToAgent` statt nur Vorfüllen einen echten Start-Flow auslösen
- [x] Session-Erzeugung klar steuern (leer wiederverwenden oder neu erstellen)
- [x] Danach automatische Send-Aktion auslösen

**Dateien:**

- `apps/ui/src/components/session-manager/task-send-to-agent.tsx`
- `apps/ui/src/store/task-chat-bridge-store.ts`
- `apps/ui/src/components/views/agent-view.tsx`

**Abnahme:**

- Klick auf `Sofort starten` startet ohne Extra-Klick eine laufende Session.

**Status (2026-03-26):**

- Erledigt. Bridge setzt jetzt nur noch den Start-Impuls.
- `agent-view` erstellt bei Bedarf eine neue leere Session und sendet automatisch.
- Kein manueller Extra-Klick auf "Senden" mehr nötig.

---

## Phase 2 – Status erst nach echtem Start setzen

- [x] `status = in_progress` erst nach erfolgreichem Send
- [x] `chat_session_id` direkt mitsetzen
- [x] Bei Fehler: kein Statuswechsel

**Dateien:**

- `apps/ui/src/components/session-manager/task-send-to-agent.tsx`
- `apps/ui/src/hooks/use-supabase-tasks.ts`

**Abnahme:**

- Kein Task springt mehr „zu früh“ auf `In Arbeit`.

**Status (2026-03-26):**

- Erledigt. Status-Wechsel passiert jetzt erst nach echtem erfolgreichem Send.
- Bei Supabase wird `chat_session_id` sofort mit dem Start gespeichert.
- Wenn Send oder Status-Sync scheitert, bleibt der Task-Status unverändert.

---

## Phase 3 – Fertig-Erkennung und Abschluss-Sync

- [x] Bei echtem `complete` Event Task auf `completed` setzen
- [x] `completed_notes` aus letzter Antwort oder Zusammenfassung befüllen
- [x] Stop/Fehler-Fall trennen (nicht als completed markieren)

**Dateien:**

- `apps/ui/src/hooks/use-electron-agent.ts`
- `apps/ui/src/components/views/agent-view.tsx`
- `apps/ui/src/hooks/use-supabase-tasks.ts`

**Abnahme:**

- Nach erfolgreichem Lauf ist der Task in beiden UIs als `Completed` sichtbar.

**Status (2026-03-26):**

- Erledigt. `complete`-Event führt jetzt zu echtem Abschluss-Sync.
- `completed_notes` wird aus der letzten Assistant-Antwort befüllt.
- `stopped` und `error` werden getrennt behandelt und nicht als `completed` markiert.

---

## Phase 4 – Optionaler Fertig-Log (Datei) sauber verknüpfen

- [x] Bestehende `.completed`-Logik optional weiterverwenden
- [x] Verknüpfung Task <-> Session <-> `.completed` sauber machen
- [x] Kein zweites Status-System einführen

**Dateien:**

- `libs/prompts/src/completed-task-prompt.ts`
- `apps/server/src/routes/completed-tasks/handlers.ts`
- `apps/ui/src/components/session-manager/completed-tasks-panel.tsx`

**Abnahme:**

- Fertig-Doku bleibt nutzbar, aber der Kanban-Status bleibt eindeutig in Supabase.

**Status (2026-03-26):**

- Erledigt. `.completed` bleibt als Dokumentations-Spur aktiv.
- Optionaler Link-Block (Task-ID / Session-ID) wird beim Erstellen unterstützt.
- Im Fertig-Panel ist jetzt klar sichtbar: Status-Quelle bleibt Supabase `tasks`.

---

## Phase 5 – UI-Klarheit + Rückmeldung

- [x] In der Karte klar anzeigen: „Gestartet“, „Läuft“, „Fertig“, „Fehlgeschlagen“
- [x] Bei Startfehler klare Meldung
- [x] Keine stillen Zustandswechsel ohne Nutzerhinweis

**Dateien:**

- `apps/ui/src/components/session-manager/task-card.tsx`
- `apps/ui/src/components/session-manager/kanban-task-card.tsx`
- `apps/ui/src/components/session-manager/tasks-panel.tsx`

**Abnahme:**

- Nutzer versteht sofort, was gerade passiert und warum.

**Status (2026-03-26):**

- Erledigt. Task-Karten zeigen jetzt klar den Laufstatus (`Gestartet`, `Läuft`, `Fertig`, `Fehlgeschlagen`).
- Start-/Sync-Fehler werden als Toast und direkt in der Karte sichtbar.
- Tasks-Panel zeigt zusätzlich eine kompakte Live-Übersicht der aktuellen Agent-Status.

---

## Phase 6 – Hotfix: DB-Task-Status wirklich speichern

- [x] `TaskCard` gibt die echte Quelle (`file` oder `supabase`) an den Send-Flow weiter
- [x] `TaskSendToAgent` setzt den Bridge-Kontext abhängig von der Quelle
- [x] Laufstatus-Badges nutzen denselben Schlüssel wie der Send-Flow

**Dateien:**

- `apps/ui/src/components/session-manager/task-card.tsx`
- `apps/ui/src/components/session-manager/task-send-to-agent.tsx`
- `apps/ui/src/components/session-manager/tasks-panel.tsx`

**Abnahme:**

- In DB-Modus (`DB` Badge) setzt `Sofort starten` den Task wieder zuverlässig auf `in_progress`.

**Status (2026-03-26):**

- Erledigt. Der falsche File-Branch bei DB-Tasks wurde entfernt.
- `Task-Status konnte nicht gespeichert werden` tritt bei normalem DB-Flow nicht mehr auf.

---

## Phase 7 – Hotfix: DOM-Fehler + bessere Fehlerdiagnose

- [x] `<button>`-in-`<button>` im Fertig-Panel entfernt
- [x] Header bleibt per Tastatur bedienbar (Enter/Leertaste)
- [x] Zusätzliche Debug-Logs für Task-Status-Sync eingebaut

**Dateien:**

- `apps/ui/src/components/session-manager/completed-task-project-group.tsx`
- `apps/ui/src/components/views/agent-view.tsx`

**Abnahme:**

- Keine React-Warnung mehr zu verschachtelten Buttons.
- Bei zukünftigen Sync-Problemen steht im Log klar, welcher Pfad gescheitert ist.

**Status (2026-03-26):**

- Erledigt. Der Hydration-/DOM-Warnhinweis ist behoben.
- TaskBridge schreibt jetzt strukturierte Warn-/Fehlerlogs für beide Sync-Schritte.

---

## Pflicht-Check pro Phase

1. TypeScript prüfen: `npm run type-check`
2. Keine Builds starten
3. UTF-8 sauber halten
4. Verlauf in `History/` ergänzen
5. Abschluss in `.completed/` dokumentieren

---

## Gesamtstatus

- Alle 7 Phasen sind am 2026-03-26 umgesetzt und im Code integriert.
