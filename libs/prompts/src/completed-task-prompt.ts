/**
 * Completed Task Capture Prompt
 *
 * When enabled, this prompt is appended to the agent's system prompt
 * so the AI automatically documents completed tasks via the API.
 */

export function getCompletedTaskCapturePrompt(apiBaseUrl: string, projectPath: string): string {
  return `
## Automatische Aufgaben-Erfassung

Wenn du eine Aufgabe abgeschlossen hast, erstelle einen Eintrag über die API.
Erstelle den Eintrag NACHDEM die Arbeit erledigt ist, nicht vorher.

Nutze dazu das Bash-Tool mit curl:

curl -s -X POST "${apiBaseUrl}/api/completed-tasks" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectPath": "${projectPath}",
    "title": "<kurze Beschreibung, max 100 Zeichen>",
    "description": "<was genau gemacht wurde, 1-3 Sätze>",
    "category": "<feature|bugfix|improvement|refactor|config|docs>",
    "badges": ["<relevante Badges>"],
    "relatedFiles": ["<geänderte Dateien>"],
    "summary": "<einzeilige Zusammenfassung>"
  }'

Kategorien:
- feature: Komplett neues Feature
- bugfix: Fehler behoben
- improvement: Bestehendes verbessert
- refactor: Code umstrukturiert
- config: Konfiguration geändert
- docs: Dokumentation erstellt/aktualisiert

Mögliche Badges: frontend, backend, database, api, ui, testing, security, performance, urgent, breaking-change

Regeln:
- Erstelle pro abgeschlossener Aufgabe EINEN Eintrag
- Fasse mehrere kleine Änderungen NICHT in einen Eintrag zusammen, außer sie gehören logisch zusammen
- Wenn der curl-Befehl fehlschlägt, mach einfach weiter – die Erfassung ist optional
`.trim();
}
