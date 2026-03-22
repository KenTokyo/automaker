---
title: 'React no-useEffect Skill und Prompt angelegt'
description: 'Neuen Skill zum Vermeiden unnötiger useEffect-Nutzung erstellt und eine Prompt-Vorlage zum Finden und Beheben im Projekt ergänzt.'
date: '2026-03-18'
status: 'completed'
effort: 'medium'
---

## Was wurde gemacht?

- Skill-Ordner `shared-docs/skills/react-no-use-effect` erstellt.
- `SKILL.md` mit klarer Regel und 5 Ersatzmustern ausgefüllt.
- `references/no-use-effect-fix-prompt.md` als direkte Arbeitsvorlage ergänzt.
- Zusätzliche schnelle Prompt-Datei in `shared-docs/react-useEffect/no-use-effect-fix-prompt.md` erstellt.
- UTF-8-Fehler in `agents/openai.yaml` behoben.

## Ergebnis

Wir haben jetzt einen wiederverwendbaren Skill und eine klare Prompt-Vorlage, um `useEffect`-Stellen im Projekt systematisch zu finden und sicher umzubauen.

## Betroffene Dateien

- `shared-docs/skills/react-no-use-effect/SKILL.md`
- `shared-docs/skills/react-no-use-effect/agents/openai.yaml`
- `shared-docs/skills/react-no-use-effect/references/no-use-effect-fix-prompt.md`
- `shared-docs/react-useEffect/no-use-effect-fix-prompt.md`
- `History/react-no-use-effect-skill-verlauf.md`
