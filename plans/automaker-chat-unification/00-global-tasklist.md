ULTRATHINK

# Automaker Chat Zusammenführung - Globale Taskliste

## Status

- Status dieser Planung: 🟢 Vollständig geplant
- Erstellt am: 2026-03-11
- Aktueller Fokus: Alle sechs Plan-Phasen sind angelegt, jetzt kann die spätere Umsetzung darauf aufbauen

## Kurz gesagt

Wir haben heute zwei ähnliche Chat-Welten:

1. den Automaker-Chat in `apps/ui`
2. den Standalone-Chat in `apps/chat`

Das ist auf Dauer keine saubere Richtung.
Neue Funktionen würden sonst doppelt gebaut oder laufen auseinander.

## Klare Architektur-Entscheidung

Wir bauen **nicht** weiter auf dem Standalone-Chat als Produktfläche auf.

Stattdessen gilt ab jetzt:

1. `apps/ui` ist der echte Haupt-Chat für Nutzer.
2. `apps/chat` ist nur noch eine Übergangs-Quelle zum Herauslösen von schon gebauter Logik.
3. Server-Routen und Server-Services bleiben die zentrale Datenquelle.
4. Doppelte Typen, doppelte Stores und doppelte API-Helfer sollen Schritt für Schritt zusammengeführt werden.

## Warum das wichtig ist

Wenn wir jetzt einfach noch mehr direkt in beide Chats bauen, entstehen diese Probleme:

1. gleiche Funktion an zwei Stellen
2. Fehlerbehebungen nur in einem Bereich
3. mehr Aufwand bei jeder kleinen Änderung
4. unklare Zuständigkeit im Projekt

Kurz gesagt:
Wir müssen hier bewusst umbauen.
Die jetzige Doppel-Struktur ist langfristig fehlerhaft und sollte sauber zusammengeführt werden.

## Wiederverwendung vor Neubau

Diese Dinge sollen weiterverwendet werden:

### Backend bleibt zentrale Quelle

- `apps/server/src/routes/overview/index.ts`
- `apps/server/src/routes/markdown-explorer/index.ts`
- `apps/server/src/services/overview-service.ts`
- `apps/server/src/services/markdown-explorer-service.ts`
- `apps/server/src/services/overview-types.ts`

### Bereits gebaute UI aus `apps/chat`

- Dashboard-Bausteine wie Ladezustand, Zeit-Tabs, Aktionsleiste, Karten und Sicherheits-Hinweise
- Datei-Bausteine wie Suche, Vorschau, Baum-Eintrag und Favoriten-Logik
- linke Tab-Idee für schnellen Wechsel zwischen Verlauf und Übersicht

### Bereits vorhandene Automaker-Stellen

- `apps/ui/src/components/views/agent-view.tsx`
- `apps/ui/src/components/views/agent-view/components/agent-header.tsx`
- `apps/ui/src/components/views/agent-view/components/browser-panel.tsx`
- `apps/ui/src/components/session-manager.tsx`
- `apps/ui/src/components/views/agent-view/components/docs-panel.tsx`
- `apps/ui/src/store/app-store.ts`

## Referenzdateien für jeden Folge-Chat

- `plans/automaker-chat-unification/00-global-tasklist.md`
- `plans/automaker-chat-unification/temp.md`
- die jeweils betroffenen Phasen-Dateien
- `CLAUDE.md`
- `AGENTS.md`
- `History/automaker-chat-unification-verlauf.md`

## Phasenübersicht

| Phase | Datei | Titel | Ziel | Status |
| --- | --- | --- | --- | --- |
| 1 | `01-shared-foundation.md` | Gemeinsame Basis und Wiederverwendung | doppelte Typen, API-Helfer und Zustände sauber zusammenziehen | ✅ Datei erstellt |
| 2 | `02-right-panel-files.md` | Rechte Seite: Browser und Dateien | rechter Bereich bekommt einen sauberen Umschalter und den Datei-Bereich | ✅ Datei erstellt |
| 3 | `03-right-panel-dashboard.md` | Rechte Seite: Übersicht | Dashboard im Automaker-Chat rechts nutzbar machen | ✅ Datei erstellt |
| 4 | `04-left-panel-overview-docs.md` | Linke Seite: Sessions, Docs, Übersicht | linke Seitenleiste klar erweitern, ohne neue Doppel-Logik | ✅ Fertig |
| 5 | `05-legacy-cleanup.md` | Altlasten abbauen | Standalone-spezifische Doppelungen stoppen und Übergänge dokumentieren | ✅ Fertig |
| 6 | `06-validation-handover.md` | Abschluss und Übergabe | Prüfung, Rest-Risiken, Übergabe und klare Abschluss-Checkliste | ✅ Fertig |

## Aufteilung nach Chats

### Chat 1

| Phase | Datei | Schwerpunkt | Status |
| --- | --- | --- | --- |
| 1 | `01-shared-foundation.md` | gemeinsame Grundlage | ✅ Datei erstellt |
| 2 | `02-right-panel-files.md` | rechter Bereich mit Dateien | ✅ Datei erstellt |
| 3 | `03-right-panel-dashboard.md` | rechter Bereich mit Übersicht | ✅ Datei erstellt |

### Chat 2

| Phase | Datei | Schwerpunkt | Status |
| --- | --- | --- | --- |
| 4 | `04-left-panel-overview-docs.md` | linke Seitenleiste ordnen | ✅ Fertig |
| 5 | `05-legacy-cleanup.md` | doppelte Wege abbauen | ✅ Fertig |

### Chat 3

| Phase | Datei | Schwerpunkt | Status |
| --- | --- | --- | --- |
| 6 | `06-validation-handover.md` | Abschluss und Übergabe | ✅ Fertig |

## Reihenfolge und Abhängigkeiten

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6
```

Warum diese Reihenfolge sinnvoll ist:

1. Erst die gemeinsame Basis klären.
2. Dann den rechten Bereich technisch sauber erweitern.
3. Danach die Übersicht dort einhängen.
4. Erst dann die linke Seitenleiste umbauen.
5. Danach Altlasten und Übergangs-Wege ordnen.
6. Zum Schluss Prüfung, Restliste und Übergabe sauber festhalten.

## Was das konkret für den Nutzer bedeutet

Am Ende soll der Nutzer nicht mehr überlegen müssen:

- Welcher Chat ist der richtige?
- Wo finde ich Dateien?
- Wo finde ich die letzte Projekt-Übersicht?

Stattdessen gibt es einen klaren Automaker-Chat mit:

1. rechter Seite für `Browser`, `Dateien` und `Übersicht`
2. linker Seite für `Sessions`, `Docs` und `Übersicht`
3. wiederverwendeter Logik statt doppelter Baustellen

## Wichtige Regeln für alle Phasen

1. Kein neuer Produktausbau nur in `apps/chat`.
2. Kein unnötiger Neubau, wenn etwas aus `apps/chat` sauber herauslösbar ist.
3. Keine Unit-Tests planen.
4. Komponenten-Texte in einfacher Sprache halten.
5. Jede Phase muss sagen, was sie für den Nutzer verbessert.
6. TypeScript-Prüfung bleibt am Ende der späteren Umsetzung Pflicht, aber diese Dateien sind nur Planung.
7. Umlaute bleiben echte Umlaute und werden nicht ersetzt.

## Aktueller Stand nach diesem Chat

- Alle 6 Phasen sind vollständig umgesetzt und als "Fertig" markiert.
- 22 neue Dateien in `apps/ui` portiert, TypeScript fehlerfrei.
- UTF-8-Prüfung bestanden, keine kaputten Zeichen.
- Abschluss-Dokument erstellt: `validation-handover-report.md`
- `apps/chat` ist als Legacy/Übergang markiert, wird nicht weiter ausgebaut.
- Offene Restliste mit 11 Punkten für spätere Arbeit dokumentiert.

## Nächster sinnvoller Schritt

Alle Phasen sind abgeschlossen.
Der nächste Schritt ist die manuelle Prüfung der Nutzer-Szenarien (siehe `validation-handover-report.md`) und danach der schrittweise Rückbau der Altlasten gemäss der offenen Restliste.
