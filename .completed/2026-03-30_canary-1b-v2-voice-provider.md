---
title: Canary 1B v2 Voice Provider
description: Canary 1B v2 als auswählbaren Voice-Provider im Input-Selector ergänzt
date: 2026-03-30
status: success
effort: M
provider: codex
files:
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/components/views/agent-view/input-area/voice-input-selector.tsx
  - apps/ui/src/hooks/use-canary-speech-recognition.ts
  - apps/ui/src/hooks/use-whisper-speech-recognition.ts
  - apps/ui/src/hooks/use-voxtral-speech-recognition.ts
tags: [feature, ui, cleanup]
---

## Zusammenfassung

Die Voice-Eingabe unterstützt jetzt zusätzlich `Canary 1B v2` als auswählbaren Provider im Split-Selector.

### Was wurde gemacht

- Neuer Hook `use-canary-speech-recognition.ts` erstellt, mit identischem Hook-Interface wie die bestehenden Voice-Hooks.
- `voice-input-selector.tsx` um die Option `Canary 1B v2` erweitert.
- `input-controls.tsx` um Canary-Provider-Logik ergänzt:
  - Umschalten zwischen WebSpeech, Whisper und Canary
  - Persistenz des Providers in `localStorage`
  - Kontextbezogene Hilfe-/Statusmeldungen für Canary
- UTF-8/Umlaut-Probleme in Voice-bezogenen Strings korrigiert.

### Wichtige Entscheidungen

- Canary wird aktuell als klar markierter Server/GPU-Provider geführt.
  : Grund: `nvidia/canary-1b-v2` ist im aktuellen Browser-Stack mit `@huggingface/transformers` nicht direkt ausführbar.
- Gleiche Hook-Rückgabeform wie bei Whisper/Voxtral.
  : So kann später ein echtes Canary-Backend angebunden werden, ohne den UI-Flow erneut umzubauen.
