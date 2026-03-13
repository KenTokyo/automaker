# 📦 Phase 1: Datenmodell & Typen für erledigte Aufgaben

ULTRATHINK

**Status:** ✅ Erledigt
**Master-Plan:** [MASTER-ORCHESTRATOR.md](../MASTER-ORCHESTRATOR.md)

---

## 🎯 Was soll diese Phase leisten?

Wir definieren die TypeScript-Typen, die beschreiben, wie eine "erledigte Aufgabe" aussieht. Das ist die Grundlage für alles Weitere – ohne diese Typen können weder der Server noch die Oberfläche wissen, welche Daten sie verarbeiten.

**Was bedeutet das für den User?** Noch nichts Sichtbares – aber ohne diesen Schritt würden alle folgenden Phasen auf wackeligem Boden stehen.

---

## 🚀 Strategie

Die Typen kommen in das bestehende Paket `@automaker/types` (Ordner `libs/types/src/`), weil alle anderen Pakete davon abhängen. So kann sowohl der Server als auch das Frontend dieselben Typen nutzen.

### Abhängigkeiten

- Keine externen Abhängigkeiten
- Kein bestehendes Feature wird verändert
- Reine Typ-Definitionen, kein Laufzeit-Code

---

## ❓ Wichtige Fragen & Antworten

**Was ist eine "erledigte Aufgabe"?**
✅ Ein Eintrag, der beschreibt, was fertig gemacht wurde. Kann ein neues Feature sein, ein Bug-Fix, eine Verbesserung oder eine Konfigurationsänderung.

**Wie unterscheidet sich das von einem Feature?**
✅ Features leben im Kanban-Board und haben einen Lebenszyklus (pending → running → completed). Eine "erledigte Aufgabe" ist ein leichtgewichtiger Eintrag, der nur die abgeschlossene Arbeit dokumentiert – unabhängig davon, ob es im Board war.

**Was passiert, wenn der User denselben Task doppelt speichert?**
✅ Jeder Eintrag hat eine eindeutige ID. Doppelte Einträge werden über die ID erkannt und können zusammengeführt oder ignoriert werden.

**Wie fein oder grob sollen die Einträge sein?**
✅ Pro abgeschlossenem "Chat" oder "Arbeitspaket" ein Eintrag. Also nicht jede einzelne Dateiänderung, sondern "Feature X implementiert" oder "Bug Y in Datei Z behoben".

---

## 📱 Beispiel: So sieht eine erledigte Aufgabe aus

```
🖥️ Im Fertig-Tab:
┌─────────────────────────────────────────┐
│ ✅ Dark Mode für Dashboard              │
│ 🏷️ Feature  📅 13. März 2026, 14:30   │
│ Dunkles Design für das Übersichts-Panel │
│ 📄 History/dark-mode-verlauf.md         │
└─────────────────────────────────────────┘
```

---

## 🧩 Komponenten & Dateien

### 1.1 Neue Typ-Datei: `libs/types/src/completed-task.ts` **~120 Zeilen**

Enthält:

- `CompletedTaskCategory` – Art der Aufgabe (z.B. 'feature', 'bugfix', 'improvement', 'config', 'refactor', 'docs')
- `CompletedTaskBadge` – Zusätzliche Markierungen/Tags für Filter (z.B. 'frontend', 'backend', 'urgent', 'breaking-change')
- `CompletedTask` – Haupt-Interface mit:
  - `id` (string) – Eindeutige ID (UUID)
  - `title` (string) – Kurzer, aussagekräftiger Titel (wie ein Git-Commit)
  - `description` (string) – Ausführlichere Beschreibung, was gemacht wurde
  - `category` (CompletedTaskCategory) – Art der Arbeit
  - `badges` (CompletedTaskBadge[]) – Filter-Tags
  - `completedAt` (string) – ISO-Zeitstempel, wann fertig
  - `projectPath` (string) – Zu welchem Projekt gehört die Aufgabe
  - `historyFile` (string, optional) – Relativer Pfad zur History-Datei
  - `relatedFiles` (string[], optional) – Betroffene Dateien
  - `chatSessionId` (string, optional) – Zugehörige Chat-Sitzung
  - `featureId` (string, optional) – Falls aus dem Kanban-Board
  - `summary` (string, optional) – KI-generierte Zusammenfassung
  - `commitHash` (string, optional) – Zugehöriger Git-Commit
- `CompletedTasksFile` – Wrapper für die JSON-Datei:
  - `version` (number) – Schema-Version (startet mit 1)
  - `tasks` (CompletedTask[]) – Alle Einträge
  - `lastUpdated` (string) – Letztes Update
- `CreateCompletedTaskInput` – Eingabe-Typ zum Erstellen (ohne id, completedAt)
- `CompletedTaskFilter` – Filter-Optionen:
  - `search` (string, optional) – Freitext-Suche
  - `categories` (CompletedTaskCategory[], optional) – Nach Kategorie filtern
  - `badges` (CompletedTaskBadge[], optional) – Nach Badge filtern
  - `since` (string, optional) – Nur Einträge nach diesem Datum
  - `until` (string, optional) – Nur Einträge vor diesem Datum
  - `limit` (number, optional) – Maximale Anzahl
- `CompletedTaskSortField` – Sortierfeld ('completedAt', 'title', 'category')
- `CompletedTaskSortOrder` – Sortierrichtung ('asc', 'desc')
- Konstanten:
  - `COMPLETED_TASKS_VERSION` = 1
  - `DEFAULT_COMPLETED_TASKS_FILE` – Leere Standard-Datei
  - `COMPLETED_TASK_CATEGORIES` – Label-Zuordnung für jede Kategorie (z.B. 'feature' → 'Neues Feature')
  - `COMPLETED_TASK_BADGE_OPTIONS` – Verfügbare Badge-Werte mit Labels

### 1.2 Export in `libs/types/src/index.ts` anpassen **~10 Zeilen**

- Neue Types und Konstanten aus `completed-task.ts` exportieren
- Einordnung nach den bestehenden Dashboard/Overview-Exports

---

## ⚡ Edge Cases

| Was könnte passieren?                    | Lösung                                            |
| ---------------------------------------- | ------------------------------------------------- |
| Titel ist leer                           | `title` als Pflichtfeld, Validierung im Server    |
| Kategorie ist unbekannt                  | TypeScript-Union-Typ begrenzt die Werte           |
| Sehr alte Einträge (Monate)              | Filter mit `since`/`until` ermöglicht Eingrenzung |
| JSON-Datei wird zu groß (>1000 Einträge) | Paginierung über `limit` + `offset` in Phase 2    |
| Mehrere Projekte mit gleicher Aufgabe    | `projectPath` unterscheidet die Zugehörigkeit     |

---

## 🔄 Wiederverwendung

- Ähnliches Muster wie `Notification` in `libs/types/src/notification.ts` (Version + Datei-Wrapper)
- Ähnliches Filter-Pattern wie `ActivityFeedOptions` in `libs/types/src/project-overview.ts`
- Badge-System angelehnt an `FeatureStatus`-Typen

---

## 📋 Chat-Aufteilung für Implementierung

### CHAT 3 – Phase 1 implementieren (~25.000 Tokens)

**Schritt 1:** `libs/types/src/completed-task.ts` erstellen

- Alle Typen und Interfaces definieren
- Konstanten für Kategorien und Badges
- Default-Werte

**Schritt 2:** `libs/types/src/index.ts` erweitern

- Neue Exports hinzufügen

**Schritt 3:** TypeScript-Check

- `npx tsc --noEmit` im Types-Paket ausführen
- Sicherstellen, dass keine Fehler entstehen

---

## 📁 Speicherformat im Projekt

Die Daten werden als JSON im Projektordner gespeichert:

```
.automaker/
└── completed-tasks.json    ← Eine einzige Datei pro Projekt
```

**Warum eine Datei statt vieler?**

- Einfacher zu lesen/schreiben
- Atomare Updates möglich
- Bei <1000 Einträgen kein Performance-Problem
- Falls es irgendwann zu viel wird: Archivierung als Erweiterung denkbar

---

**Nächste Phase:** [Phase 2 – Server-Routen & Speicherung](./2026-03-13-phase-2-server-routen.md)
