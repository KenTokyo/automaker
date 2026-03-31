# Automaker Kanban: Task-Import Format

Anleitung zum Erzeugen mehrerer Tasks aus einem Transkript/Text via ChatGPT (oder anderem LLM) und Import in das Automaker Kanban Board.

---

## Ziel

Du hast ein Meeting-Transkript, Voice-Memo oder Notizen mit mehreren Aufgaben. Ein LLM (ChatGPT, Claude, etc.) soll diese in ein strukturiertes Format umwandeln, das direkt in die Kanban-App importiert werden kann.

---

## Task-Datenmodell (Felder)

Jeder Task in der Automaker Kanban App hat folgende Felder:

| Feld          | Typ               | Pflicht | Beschreibung                              |
| ------------- | ----------------- | ------- | ----------------------------------------- |
| `title`       | String            | Ja      | Kurzer, aussagekraeftiger Titel           |
| `description` | String            | Nein    | Einzeiler / Kurzbeschreibung              |
| `summary`     | String (Markdown) | Nein    | Ausfuehrliche Beschreibung, Markdown      |
| `priority`    | Enum              | Nein    | `P1`, `P2`, `P3`, `P4` oder leer          |
| `status`      | Enum              | Nein    | `todo`, `in_progress`, `completed`        |
| `tags`        | String[]          | Nein    | Liste von Tags, z.B. `["backend", "bug"]` |

### Priority-Stufen

| Priority | Bedeutung         | Farbe  |
| -------- | ----------------- | ------ |
| `P1`     | Kritisch / Sofort | Rot    |
| `P2`     | Hoch / Wichtig    | Orange |
| `P3`     | Mittel / Normal   | Cyan   |
| `P4`     | Niedrig / Backlog | Grau   |
| (leer)   | Keine Prioritaet  | -      |

---

## Austausch-Format: JSON Array

Das Standard-Format fuer den Import ist ein **JSON-Array von Task-Objekten**:

```json
[
  {
    "title": "Login-Bug auf Mobile fixen",
    "description": "iOS Safari zeigt nach Login weisse Seite",
    "summary": "## Problem\nNach erfolgreichem Login auf iOS Safari (17.x) wird eine weisse Seite angezeigt.\n\n## Reproduktion\n1. Oeffne App auf iPhone\n2. Login mit Email/Password\n3. Weisse Seite statt Dashboard\n\n## Vermutung\nRedirect-URL Problem mit SPA-Routing.",
    "priority": "P1",
    "status": "todo",
    "tags": ["bug", "mobile", "auth"]
  },
  {
    "title": "Dark Mode Toggle implementieren",
    "description": "User soll zwischen Light/Dark Theme wechseln koennen",
    "priority": "P3",
    "status": "todo",
    "tags": ["feature", "ui"]
  },
  {
    "title": "API Rate Limiting einbauen",
    "description": "Max 100 Requests/Minute pro User",
    "summary": "Express Rate Limiter Middleware einrichten. Redis-backed fuer Production.",
    "priority": "P2",
    "status": "todo",
    "tags": ["backend", "security"]
  }
]
```

---

## Kompakt-Format: Plaintext (fuer schnelles Parsing)

Alternativ ein zeilenbasiertes Format, das leichter per Hand editierbar ist:

```
---
title: Login-Bug auf Mobile fixen
description: iOS Safari zeigt nach Login weisse Seite
priority: P1
tags: bug, mobile, auth
summary: |
  ## Problem
  Nach erfolgreichem Login auf iOS Safari wird eine weisse Seite angezeigt.
  ## Vermutung
  Redirect-URL Problem mit SPA-Routing.
---
title: Dark Mode Toggle implementieren
description: User soll zwischen Light/Dark Theme wechseln koennen
priority: P3
tags: feature, ui
---
title: API Rate Limiting einbauen
description: Max 100 Requests/Minute pro User
priority: P2
tags: backend, security
summary: |
  Express Rate Limiter Middleware einrichten. Redis-backed fuer Production.
---
```

**Regeln fuer Plaintext-Format:**

- Jeder Task wird durch `---` getrennt
- `title` ist Pflicht, alles andere optional
- `tags` komma-separiert
- `summary` mit `|` eingeleitet = mehrzeilig bis zum naechsten `---`
- `status` wird per Default auf `todo` gesetzt
- `priority` wenn nicht angegeben = leer (keine Prioritaet)

---

## ChatGPT System-Prompt (Copy & Paste)

Verwende diesen System-Prompt, um ein Transkript in Tasks umzuwandeln:

```
Du bist ein Task-Extraktor fuer das Automaker Kanban Board.

Deine Aufgabe: Analysiere den Text vom User und extrahiere ALLE enthaltenen Aufgaben/Tasks als strukturiertes JSON-Array.

Ausgabe-Format (JSON Array):
[
  {
    "title": "Kurzer Titel (max 80 Zeichen)",
    "description": "Einzeilige Beschreibung",
    "summary": "Ausfuehrliche Beschreibung in Markdown (optional)",
    "priority": "P1|P2|P3|P4",
    "status": "todo",
    "tags": ["tag1", "tag2"]
  }
]

Regeln:
- Jede identifizierbare Aufgabe wird ein eigener Task
- title: Praegnant, beginnt mit Verb (Implementiere, Fixe, Erstelle, Pruefe...)
- description: Ein Satz der den Kontext gibt
- summary: Nur wenn genuegend Detail vorhanden, in Markdown mit Ueberschriften
- priority: Schaetze basierend auf Dringlichkeit/Impact:
  P1 = Kritisch/Blocker, P2 = Hoch/Wichtig, P3 = Normal, P4 = Nice-to-have
- tags: Relevante Kategorien aus: feature, bug, refactor, docs, ui, backend, api,
  performance, security, test, config, cleanup, mobile, infrastructure, design
- status: Immer "todo" (ausser explizit anders genannt)
- Gib NUR das JSON-Array aus, keinen anderen Text
- Wenn der Text keine Aufgaben enthaelt, gib [] zurueck
```

---

## Import in die Kanban App

### Option 1: Supabase API (direkt)

Tasks koennen direkt per Supabase-Client in die DB geschrieben werden.
Die App erkennt neue Tasks sofort via Realtime-Subscription.

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Einzelner Task
const { data, error } = await supabase
  .from('tasks')
  .insert({
    project_id: 'DEINE_PROJECT_UUID',
    title: 'Task Titel',
    description: 'Beschreibung',
    summary: 'Markdown Body',
    priority: 'P2',
    status: 'todo',
    tags: ['feature', 'ui'],
    created_by: 'DEINE_USER_UUID',
  })
  .select()
  .single();

// Bulk Insert (mehrere Tasks auf einmal)
const tasks = [
  { project_id: '...', title: 'Task 1', created_by: '...', status: 'todo', tags: ['feature'] },
  { project_id: '...', title: 'Task 2', created_by: '...', status: 'todo', tags: ['bug'] },
];

const { data, error } = await supabase.from('tasks').insert(tasks).select();
```

### Option 2: Manuell per App-UI

1. Oeffne [automaker-kanban.vercel.app](https://automaker-kanban.vercel.app)
2. Waehle dein Projekt
3. Klicke den "+" Button am Board
4. Copy-Paste Titel + Beschreibung pro Task

### Option 3: Claude Code / Automaker Agent

Gib Claude Code das JSON-Array und lass ihn die Tasks per Supabase MCP einfuegen:

```
Fuege folgende Tasks in mein Kanban-Projekt "Mein Projekt" ein:
[JSON Array hier einfuegen]
```

---

## Beispiel: Kompletter Workflow

### 1. Input (Meeting-Transkript)

> "Also wir muessen unbedingt den Login-Bug fixen, das ist kritisch.
> Ausserdem waere es cool wenn wir Dark Mode haetten. Und Peter hat gesagt
> wir brauchen Rate Limiting fuer die API, das ist auch wichtig.
> Ach ja, und die Tests fuer den Payment-Flow fehlen noch."

### 2. ChatGPT Output (mit System-Prompt)

```json
[
  {
    "title": "Fixe Login-Bug",
    "description": "Kritischer Login-Fehler muss behoben werden",
    "priority": "P1",
    "status": "todo",
    "tags": ["bug", "auth"]
  },
  {
    "title": "Implementiere Dark Mode",
    "description": "Theme-Toggle fuer Light/Dark Mode einbauen",
    "priority": "P4",
    "status": "todo",
    "tags": ["feature", "ui"]
  },
  {
    "title": "Implementiere API Rate Limiting",
    "description": "Request-Begrenzung pro User einrichten",
    "priority": "P2",
    "status": "todo",
    "tags": ["backend", "security", "api"]
  },
  {
    "title": "Erstelle Tests fuer Payment-Flow",
    "description": "Fehlende Test-Coverage fuer Payment-Logik ergaenzen",
    "priority": "P3",
    "status": "todo",
    "tags": ["test", "backend"]
  }
]
```

### 3. Import per Supabase MCP (Claude Code)

```sql
INSERT INTO public.tasks (project_id, title, description, priority, status, tags, created_by)
VALUES
  ('PROJECT_UUID', 'Fixe Login-Bug', 'Kritischer Login-Fehler muss behoben werden', 'P1', 'todo', '{"bug","auth"}', 'USER_UUID'),
  ('PROJECT_UUID', 'Implementiere Dark Mode', 'Theme-Toggle fuer Light/Dark Mode einbauen', 'P4', 'todo', '{"feature","ui"}', 'USER_UUID'),
  ('PROJECT_UUID', 'Implementiere API Rate Limiting', 'Request-Begrenzung pro User einrichten', 'P2', 'todo', '{"backend","security","api"}', 'USER_UUID'),
  ('PROJECT_UUID', 'Erstelle Tests fuer Payment-Flow', 'Fehlende Test-Coverage fuer Payment-Logik ergaenzen', 'P3', 'todo', '{"test","backend"}', 'USER_UUID');
```

---

## Supabase Tabellen-Referenz

### tasks

```sql
CREATE TABLE public.tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES task_projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  summary       TEXT NOT NULL DEFAULT '',
  status        task_status NOT NULL DEFAULT 'todo',
  priority      task_priority NOT NULL DEFAULT '',
  tags          TEXT[] NOT NULL DEFAULT '{}',
  created_by    UUID NOT NULL REFERENCES profiles(id),
  updated_by    UUID REFERENCES profiles(id),
  chat_session_id UUID,
  completed_notes TEXT,
  completed_files TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);
```

### Enums

```sql
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed');
CREATE TYPE task_priority AS ENUM ('P1', 'P2', 'P3', 'P4', '');
```

---

## Tipps

- **Tags konsistent halten**: Verwende immer Kleinbuchstaben, keine Sonderzeichen
- **Priority schaetzen lassen**: Das LLM kann aus Kontext (Woerter wie "kritisch", "waere cool", "wichtig") die Prioritaet ableiten
- **Summary fuer komplexe Tasks**: Nur wenn Details vorhanden sind, sonst leer lassen
- **Duplikate vermeiden**: Pruefe ob aehnliche Tasks bereits im Board existieren
- **Realtime**: Sobald Tasks in Supabase sind, erscheinen sie sofort im Board (kein Refresh noetig)
