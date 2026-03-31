---
title: Voice Input Whisper Split Selector
description: Umschaltbare Voice-Eingabe mit WebSpeech sowie Whisper Small/Base und Split-Button implementiert
date: 2026-03-30
status: success
effort: M
provider: codex
files:
  - apps/ui/src/components/views/agent-view/input-area/input-controls.tsx
  - apps/ui/src/components/views/agent-view/input-area/voice-input-selector.tsx
  - apps/ui/src/hooks/use-whisper-speech-recognition.ts
  - apps/ui/src/hooks/use-voxtral-speech-recognition.ts
tags: [feature, ui, performance]
---

## Zusammenfassung

Die Voice-Eingabe im Agent-Input wurde so erweitert, dass zwischen drei Quellen gewählt werden kann:

- WebSpeech API
- Whisper Small
- Whisper Base

Zusätzlich wurde ein Split-Button ergänzt, damit Start/Stop und Auswahl getrennt sind:

- Linker Button startet oder stoppt die Aufnahme.
- Rechter Chevron öffnet die Auswahl für das Voice-Modell.

### Was wurde gemacht

- Neuer Hook `use-whisper-speech-recognition.ts` erstellt.
  : Unterstützt `small` und `base`, lädt Modelle erst beim ersten Start, prüft WebGPU/Mikrofon und liefert Status/Fehler an die UI.
- Neue Komponente `voice-input-selector.tsx` erstellt.
  : Bietet den Split-Button inklusive Dropdown-Auswahl und klaren Statusfarben.
- `input-controls.tsx` umgebaut.
  : Voxtral-spezifische UI entfernt, neuen Selector integriert, Provider-Wechsel sauber abgefangen und lokale Persistenz des gewählten Providers ergänzt.
- Voxtral-Hook als deprecated markiert.

### Wichtige Entscheidungen

- Lazy-Loading für Whisper statt Vorab-Laden.
  : Spart Ressourcen und reduziert Freeze-Risiko beim Öffnen der Eingabe.
- Ein Hook für beide Whisper-Varianten statt zwei separaten Hooks.
  : Gleiche Logik, weniger doppelter Code, einfacher wartbar.
- Split-Button statt großem Settings-only-Flow.
  : Schnell testbar direkt im Eingabebereich, ohne Umweg über Einstellungen.
