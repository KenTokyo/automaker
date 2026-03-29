# 2026-03-28 Sub-Agent-History kompakter + klare Klick-Logik (MASTER-PLAN)

## Problemkarte

- Problem: Sub-Agent-Einträge in der Session-Liste wirken wie normale Chats, sind oft aber leer (`0 messages`).
- Auswirkung für User: Klick führt häufig in eine leere Ansicht und fühlt sich kaputt an.
- Lösungsweg: Sub-Agent-Einträge kompakter darstellen und leere Sub-Agent-Einträge nicht als normalen Chat öffnen.

## Kontext

- Bereich: `apps/ui/src/components/session-manager/*`
- Relevante Datenquelle: `apps/server/src/services/agent-service.ts`
- Status heute: Child-Session wird angelegt, aber Sub-Agent-Output wird i.d.R. im Elternchat verarbeitet.

## Duplikat-Warnung

- Bereits umgesetzt/nahe dran:
- `.completed/2026-03-27_subagent-session-lag-hotfix.md`
- `History/subagent-parent-child-darstellung-verlauf.md`
- Ergebnis: Keine Neu-Erfindung. Wir machen nur UX-Feinschliff + klare Klick-Regel.

## Ziele

1. Sub-Agent-Items sichtbar, aber kompakter als normale Sessions.
2. Leere Sub-Agent-Items nicht in leeren Chat öffnen.
3. Für User klar sagen, wo das Ergebnis liegt (Elternchat).
4. Bestehende Parent-Child-Struktur und Performance nicht verschlechtern.

## Nicht-Ziele

- Kein Umbau der kompletten Server-Persistenz von Sub-Agent-Nachrichten.
- Keine Änderung am Orchestrator-Laufmodell.

## Arbeitsphasen

- P1 Planung + Kontext bündeln
- P2 Verhalten absichern (inkl. Doku-Check)
- P3 UI-Umsetzung
- P4 Prüfung + Doku-Abschluss

## Live-Status

- Aktueller Task: **Abgeschlossen**
- Fortschritt:
- P1: `erledigt`
- P2: `erledigt`
- P3: `erledigt`
- P4: `erledigt`

## P2 Doku-Check (Claude Code)

- Quelle: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Kernaussage: Subagents laufen in eigenem Kontextfenster und geben Ergebnisse an die Haupt-Session zurück.
- Kernaussage: Subagents arbeiten innerhalb einer einzelnen Session; separate Session-Koordination ist ein eigenes Konzept (Agent Teams).
- Ableitung für diese Aufgabe: Leere Sub-Agent-Child-Sessions dürfen in der UI nicht wie normale, inhaltlich befüllte Chats wirken.

## Übergabe-Kontext (für andere Agenten)

- Primäre UI-Datei: `apps/ui/src/components/session-manager/session-list-item.tsx`
- Parent/Child-Render: `apps/ui/src/components/session-manager.tsx`
- Sub-Agent-Events im Client: `apps/ui/src/hooks/use-electron-agent.ts`
- Sub-Agent-Session-Erstellung im Server: `apps/server/src/services/agent-service.ts`
