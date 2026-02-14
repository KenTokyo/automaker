# Docs Panel UX Verbesserungen - Globale Planung

ULTRATHINK

## Überblick

Verbesserungen am Docs Panel, um Sortierung, Ordner-Zeitanzeige und direkte Quick-Action Buttons zu implementieren.

## Status-Legende

- ⬜ Offen
- 🔄 In Arbeit
- ✅ Abgeschlossen

---

## Phasen-Übersicht

| #   | Phase                                              | Datei                                                  | Status | Chat   |
| --- | -------------------------------------------------- | ------------------------------------------------------ | ------ | ------ |
| 1   | Sortierung nach "zuletzt bearbeitet"               | [phase-1-sorting.md](./phase-1-sorting.md)             | ✅     | CHAT 1 |
| 2   | Ordner-Zeitanzeige (jüngstes Kind-Element)         | [phase-2-folder-time.md](./phase-2-folder-time.md)     | ✅     | CHAT 1 |
| 3   | Quick-Action Buttons (Copy Path, Insert into Chat) | [phase-3-quick-actions.md](./phase-3-quick-actions.md) | ✅     | CHAT 1 |

---

## Chat-Aufteilung

### CHAT 1 (~40.000 Tokens geschätzt)

**Phasen**: 1, 2, 3

**Kontext benötigt**:

- Diese Datei (`plan.md`)
- `apps/ui/src/components/views/agent-view/components/docs-list.tsx`
- `apps/ui/src/components/views/agent-view/components/docs-panel.tsx`
- `apps/server/src/routes/docs/routes/list.ts`
- `libs/types/src/docs.ts`
- `apps/ui/src/hooks/use-docs.ts`

**Zusammenfassung**: Alle 3 Phasen sind kompakt genug für einen einzelnen Chat. Die Änderungen betreffen hauptsächlich `docs-list.tsx` (Frontend-Sortierung + UI), `list.ts` (Server-seitige Ordner-Zeitberechnung) und `docs-panel.tsx` (Sortier-Controls).

---

## temp.md Referenz

Keine temp.md vorhanden.

---

## Verlauf

| Datum      | Chat             | Aktion                                                             |
| ---------- | ---------------- | ------------------------------------------------------------------ |
| 2026-02-13 | CHAT 0 (Planung) | Globale Planung + Phasen-Dateien erstellt                          |
| 2026-02-13 | CHAT 1           | Phase 1, 2, 3 implementiert + TypeScript-Fehler geprüft (0 Fehler) |
