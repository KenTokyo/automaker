---
title: Kontext-Condense mit echter Token-Messung
description: Die Kontextanzeige nutzt jetzt echte Provider-Usage statt nur Textlängen-Schätzung
date: 2026-03-25
status: success
effort: XL
files:
  - libs/types/src/provider.ts
  - libs/types/src/index.ts
  - libs/types/dist/provider.d.ts
  - libs/types/dist/index.d.ts
  - apps/server/src/providers/types.ts
  - apps/server/src/providers/gemini-provider.ts
  - apps/server/src/providers/opencode-provider.ts
  - apps/server/src/providers/codex-provider.ts
  - apps/server/src/providers/codex-sdk-client.ts
  - apps/server/src/services/agent-service.ts
  - apps/ui/src/types/electron.d.ts
  - apps/ui/src/hooks/use-electron-agent.ts
  - apps/ui/src/components/views/agent-view.tsx
  - apps/ui/src/components/views/agent-view/input-area/agent-input-area.tsx
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/components/views/agent-view/input-area/time-limiter-settings.tsx
tags: [bugfix, ui, refactor]
---

## Zusammenfassung

Die Prozentanzeige für Auto-Context-Condense war zu niedrig, weil sie stark auf Schätzung
(`Textlänge / 4`) basierte. In dieser Aufgabe wurde eine echte Usage-Kette eingebaut:
vom Provider, durch den Server, bis in die UI.

### Was wurde gemacht

- Neues gemeinsames Token-Usage-Typmodell eingeführt (`ProviderTokenUsage`).
- Provider erweitert, damit echte Usage aus Ergebnissen gelesen wird:
  - Gemini
  - OpenCode
  - Codex CLI
  - Codex SDK
- Agent-Service erweitert:
  - Usage wird während Stream-Verarbeitung mitgeführt
  - Usage wird am Assistant-Message-Objekt gespeichert
  - Usage wird im `complete`-Event an die UI gesendet
- UI erweitert:
  - `tokenUsage` in Message-/Event-Typen
  - `use-electron-agent` schreibt Usage ins Chat-Array
  - Kontextanzeige nutzt zuerst gemessene Werte, dann Fallback-Schätzung
  - Kennzeichnung `(gemessen)` vs `(geschätzt)` ergänzt
- Codex-spezifische Usage-Felder ergänzt:
  - `reasoning_output_tokens` wird als Reasoning-Usage erkannt
  - `totalTokens` wird im UI für den Kontextstand bevorzugt
- Prozentberechnung auf effektives Kontextfenster umgestellt
  (Baseline-Abzug wie beim Codex-Ansatz), damit die Anzeige realistischer ist.

### Wichtige Entscheidungen

- Fallback bleibt aktiv: Wenn ein Provider keine Usage liefert, bricht nichts.
- `dist`-Typdateien in `libs/types` wurden mitgezogen, damit der Server-Typecheck die neuen Felder kennt.
- Keine Änderung an der Auto-Condense-Trigger-Idee selbst, nur an der Datenqualität der Anzeige.

### Validierung

- `npm run typecheck` erfolgreich.
- `npx tsc --noEmit -p apps/server/tsconfig.json` erfolgreich.
- UTF-8-Schnellcheck auf geänderten Phase-2-Dateien ohne Treffer.
