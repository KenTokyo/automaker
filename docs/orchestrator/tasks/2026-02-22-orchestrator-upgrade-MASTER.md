# ORCHESTRATOR UPGRADE - MASTER PLAN

ULTRATHINK

> Status: COMPLETED
> Erstellt: 2026-02-22
> Letztes Update: 2026-02-22 (Iteration 4/100)
> Referenz: UniAI Chat VS Code Extension (`D:\CODING\React Projects\uniai-chat\uniai-chat-vscode-extension`)

---

## Zielbild

Der Orchestrator-Modus soll ohne manuelle Eingriffe durchlaufen.

1. Auto-Send muss nach `NEXT_PHASE_READY` stabil und autonom triggern.
2. Run-ID muss serverseitig persistiert werden.
3. History muss Orchestrator-Runs als Collapsible Groups darstellen.

Was bedeutet das konkret fuer den User?

- Vorher: Neue Session wird erstellt, aber User muss oft manuell Enter druecken.
- Nachher: Der Ablauf laeuft bis `ALL_PHASES_COMPLETE` autonom durch und die History bleibt uebersichtlich gruppiert.

---

## Planungen (Feature-Dateien)

| #   | Planung                             | Datei                                    | Planungsstatus | Implementierungsstatus | CHAT            |
| --- | ----------------------------------- | ---------------------------------------- | -------------- | ---------------------- | --------------- |
| 1   | Auto-Send Fix & robuster Flow       | `01-orchestrator-auto-send.md`           | Abgeschlossen  | Implementiert          | CHAT 1 (~20k)   |
| 2   | Run ID Persistenz (Server-Metadata) | `02-orchestrator-run-id-persistence.md`  | Abgeschlossen  | Implementiert          | CHAT 2 (~25k)   |
| 3   | History Panel: Collapsible Runs     | `03-orchestrator-history-collapsible.md` | Abgeschlossen  | Implementiert          | CHAT 3+4 (~55k) |

Hinweis zur Chat-Regel:

- In diesem Chat wurden keine neuen Plan-Dateien erzeugt, sondern die vorhandenen Planungen konsolidiert.
- Damit bleiben wir unter der Grenze von maximal 4 Planungen pro Chat.

---

## Abhaengigkeiten

```text
Plan 1 (Auto-Send Fix) ----.
                            +--> Plan 3 (History Collapsible)
Plan 2 (Run ID Persistenz) -'
```

- Plan 1 und Plan 2 sind unabhaengig und koennen parallel umgesetzt werden.
- Plan 3 braucht Plan 2 als Grundlage (persistierte Run ID in Session-Metadaten).

---

## Fortschritt

- [x] Analyse abgeschlossen
- [x] Plan 1 erstellt
- [x] Plan 2 erstellt
- [x] Plan 3 erstellt
- [x] Plan 1 implementiert (CHAT 1)
- [x] CHAT-2-Planungspaket konsolidiert (Iteration 1/100)
- [x] Plan 2 implementiert (CHAT 2)
- [x] Plan 3.1 implementiert (CHAT 3)
- [x] Plan 3.2 + 3.3 implementiert (CHAT 4)

---

## CHAT-Uebersicht (Implementierung)

| CHAT   | Plan   | Phasen                              | Geschaetzte Tokens | Status |
| ------ | ------ | ----------------------------------- | ------------------ | ------ |
| CHAT 1 | Plan 1 | 1.1 Auto-Send Fix                   | ~20.000            | Fertig |
| CHAT 2 | Plan 2 | 2.1 + 2.2 Run ID Server + Frontend  | ~25.000            | Fertig |
| CHAT 3 | Plan 3 | 3.1 Datenmodell + Gruppierungslogik | ~20.000            | Fertig |
| CHAT 4 | Plan 3 | 3.2 + 3.3 UI Rendering + Styling    | ~35.000            | Fertig |

---

## Kontextpaket fuer den naechsten Chat

Pflichtdateien fuer die Uebergabe:

- `docs/orchestrator/tasks/2026-02-22-orchestrator-upgrade-MASTER.md`
- `docs/orchestrator/tasks/02-orchestrator-run-id-persistence.md`
- `docs/orchestrator/tasks/03-orchestrator-history-collapsible.md`
- `orchestrator-run-id-persistenz---server-frontend-history.md`

Technische Dateien fuer CHAT 2:

- `apps/server/src/services/agent-service.ts`
- `apps/server/src/routes/sessions/routes/create.ts`
- `apps/server/src/routes/sessions/routes/index.ts`
- `apps/ui/src/types/electron.d.ts`
- `apps/ui/src/lib/http-api-client.ts`
- `apps/ui/src/store/orchestrator-store.ts`
- `apps/ui/src/components/session-manager.tsx`

Temp-Datei:

- Keine `temp.md` im Projekt-Root vorhanden.

---

## Naechste Phase

Alle geplanten Umsetzungsphasen sind abgeschlossen.
