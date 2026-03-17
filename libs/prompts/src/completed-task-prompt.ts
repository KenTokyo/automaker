/**
 * Completed Task Capture Prompt
 *
 * When enabled, this prompt is appended to the agent's system prompt
 * so the AI automatically documents completed tasks as `.completed/*.md` files.
 */

export function getCompletedTaskCapturePrompt(apiBaseUrl: string, projectPath: string): string {
  return `
## Automatische Aufgaben-Erfassung

[Completed-Task Regel aktiv] Nach Abschluss dieser Aufgabe erstelle eine .completed/<YYYY-MM-DD>_<slug>.md Datei im Projektverzeichnis (${projectPath}).

Dateiformat:
\`\`\`markdown
---
title: <Titel>
description: <Einzeiler>
date: <YYYY-MM-DD>
status: success|partial|failed
effort: S|M|L|XL
files:
  - <bearbeitete Datei 1>
  - <bearbeitete Datei 2>
tags: [feature, bugfix, refactor, docs, ui, performance, security, test, config, cleanup]
---
<Markdown: Was wurde gemacht, warum, und wichtige Hinweise>
Bei mehreren Versuchen: Dokumentiere Attempts mit Problem + Learning.
\`\`\`

Alternativ kannst du auch die API nutzen:

curl -s -X POST "${apiBaseUrl}/api/completed-tasks" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectPath": "${projectPath}",
    "title": "<kurze Beschreibung, max 100 Zeichen>",
    "description": "<was genau gemacht wurde, 1-3 Saetze>",
    "date": "<YYYY-MM-DD>",
    "status": "<success|partial|failed>",
    "effort": "<S|M|L|XL>",
    "files": ["<geaenderte Dateien>"],
    "tags": ["<relevante Tags>"],
    "summary": "<Markdown Body>"
  }'

Tags: feature, bugfix, refactor, docs, ui, performance, security, test, config, cleanup
Status: success (alles erledigt), partial (teilweise), failed (fehlgeschlagen)
Effort: S (< 30min), M (30min-2h), L (2-8h), XL (> 8h)

Regeln:
- Erstelle pro abgeschlossener Aufgabe EINEN Eintrag
- Fasse mehrere kleine Aenderungen NICHT in einen Eintrag zusammen, ausser sie gehoeren logisch zusammen
- Wenn der Befehl fehlschlaegt, mach einfach weiter - die Erfassung ist optional
`.trim();
}
