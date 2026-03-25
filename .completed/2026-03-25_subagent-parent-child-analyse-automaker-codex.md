---
title: 'Sub-Agent Analyse: Automaker vs. Codex Parent-Child Threads'
description: 'Untersucht, wie Sub-Agents aktuell in Automaker sichtbar sind, welche Lücken es für Parent-Child-Historie gibt und welche Struktur aus Codex dafür übernommen werden kann.'
date: 2026-03-25
status: success
effort: M
---

## Was wurde gemacht?

- Pflicht-Recherche in Doku/History und Code durchgeführt.
- Automaker-Server- und UI-Pfade für Sub-Agent-Events geprüft.
- Codex-Referenzcode untersucht, wie Sub-Agent-Threads im Protokoll modelliert sind.
- Unterschiede dokumentiert und umsetzbare Architektur für Automaker abgeleitet.

## Ergebnis in einem Satz

Automaker hat bereits eine Live-Anzeige für aktive Sub-Agents im Chat, aber noch kein echtes Parent-Child-Threadmodell in der Session-Historie wie Codex.

## Detail-Erkenntnisse

- Vorhanden:
  - Stream-Events `subagent_started`, `subagent_progress`, `subagent_stopped`.
  - UI-Indikator in der Chat-Ansicht für aktive Sub-Agents.
- Fehlend:
  - Persistente Parent-Child-Verknüpfung in `SessionListItem`/Session-Metadaten.
  - Eigene Child-Session pro Sub-Agent.
  - Baumdarstellung in der Session-Liste.
  - Codex-Collab-Tool-Mapping (`spawn_agent`, `send_input`, `wait`, `close_agent`) in Automaker-Providerdaten.

## Duplikat-Hinweis

- Ähnliche Vorarbeiten gefunden in:
  - `History/parallele-agent-tasks-und-fehleranzeige-verlauf.md`
  - `History/orchestrator-elternelement-verlauf.md`
- Kein direkter Duplikat derselben Aufgabe, aber wichtige Grundlage für den Ausbau.
