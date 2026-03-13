# 🌐 Phase 2: Server-Routen & Speicherung

ULTRATHINK

**Status:** ✅ Erledigt
**Master-Plan:** [MASTER-ORCHESTRATOR.md](../MASTER-ORCHESTRATOR.md)
**Voraussetzung:** Phase 1 (Typen) muss abgeschlossen sein

---

## 🎯 Was soll diese Phase leisten?

Der Server bekommt neue Endpunkte (API-Schnittstellen), über die erledigte Aufgaben gespeichert, geladen, gefiltert und gelöscht werden können. Die Daten landen als JSON-Datei im `.automaker/`-Ordner des jeweiligen Projekts.

**Was bedeutet das für den User?** Der User sieht noch nichts Neues, aber ab jetzt können Aufgaben gespeichert und abgerufen werden – die technische Basis für den Fertig-Tab.

---

## 🚀 Strategie

Wir folgen dem bestehenden Routen-Muster des Servers. Neue Route-Dateien kommen in einen eigenen Ordner `apps/server/src/routes/completed-tasks/`. Die Daten werden per `fs`-Operationen direkt in die JSON-Datei im Projekt geschrieben.

### Abhängigkeiten

- Phase 1 (Typen aus `@automaker/types`)
- `@automaker/platform` für Pfad-Management (`getAutomakerDir`)
- Bestehende Express-Router-Patterns
- Event-System für Echtzeit-Updates via WebSocket

---

## ❓ Wichtige Fragen & Antworten

**Warum keine Datenbank?**
✅ Automaker speichert alles dateibasiert (JSON-Dateien). Das ist konsistent mit dem Rest (Features, Settings, Sessions). Eine Datenbank wäre hier Overkill.

**Was passiert bei gleichzeitigem Schreiben?**
✅ Da der Server single-threaded ist (Node.js) und Schreibvorgänge sequentiell ablaufen, gibt es kein echtes Concurrency-Problem. Wir lesen → ändern → schreiben die JSON-Datei atomar.

**Was wenn die Datei kaputt geht?**
✅ Beim Lesen: Fehlerhafte JSON → leere Datei mit Default-Werten zurückgeben + Warnung loggen. Die alte Datei wird als `.bak` gesichert.

**Was wenn der Projekt-Pfad ungültig ist?**
✅ Der `validatePathParams`-Middleware prüft den Pfad. Bei ungültigem Pfad kommt ein 400-Fehler.

---

## 📱 Beispiel: So werden die Endpunkte genutzt

```
🖥️ Frontend ruft auf:

GET    /api/completed-tasks?projectPath=/mein/projekt
       → Gibt alle erledigten Aufgaben zurück (mit Filtern)

POST   /api/completed-tasks
       Body: { projectPath: "...", title: "Dark Mode", category: "feature", ... }
       → Speichert eine neue erledigte Aufgabe

DELETE /api/completed-tasks/:taskId?projectPath=/mein/projekt
       → Löscht eine einzelne Aufgabe

GET    /api/completed-tasks/stats?projectPath=/mein/projekt
       → Gibt Statistiken zurück (Anzahl pro Kategorie, Badges, usw.)
```

---

## 🧩 Komponenten & Dateien

### 2.1 Neuer Routen-Ordner: `apps/server/src/routes/completed-tasks/` **Neuer Ordner**

#### 2.1.1 `index.ts` – Router-Setup **~40 Zeilen**

- Express-Router erstellen
- Alle Routen registrieren
- Export als `completedTasksRouter`

#### 2.1.2 `handlers.ts` – Request-Handler **~250 Zeilen**

- `listCompletedTasks` – GET-Handler: Datei lesen, filtern, sortieren, zurückgeben
  - Query-Parameter: `projectPath`, `search`, `categories`, `badges`, `since`, `until`, `limit`, `offset`, `sortBy`, `sortOrder`
  - Freitext-Suche durchsucht `title`, `description` und `summary`
  - Sortierung nach `completedAt` (Standard), `title` oder `category`
- `createCompletedTask` – POST-Handler: Neue Aufgabe erstellen
  - Body validieren (Titel Pflicht, Kategorie muss gültig sein)
  - UUID generieren
  - `completedAt` auf aktuelle Zeit setzen
  - JSON-Datei lesen → Aufgabe anhängen → Datei schreiben
  - WebSocket-Event senden für Echtzeit-Update
- `deleteCompletedTask` – DELETE-Handler: Aufgabe entfernen
  - Über `taskId` identifizieren
  - JSON-Datei lesen → Aufgabe rausfiltern → Datei schreiben
  - WebSocket-Event senden
- `getCompletedTaskStats` – GET-Handler: Statistiken berechnen
  - Anzahl pro Kategorie
  - Anzahl pro Badge
  - Gesamt-Anzahl
  - Zeitraum (älteste und neueste Aufgabe)

#### 2.1.3 `storage.ts` – Datei-Operationen **~150 Zeilen**

- `getCompletedTasksFilePath(projectPath)` – Pfad zur JSON-Datei ermitteln
  - Nutzt `getAutomakerDir()` aus `@automaker/platform`
  - Pfad: `{projectPath}/.automaker/completed-tasks.json`
- `readCompletedTasks(projectPath)` – JSON-Datei lesen
  - Datei existiert nicht → Default-Werte zurückgeben
  - JSON ungültig → Backup erstellen, Default-Werte zurückgeben, Warnung loggen
- `writeCompletedTasks(projectPath, data)` – JSON-Datei schreiben
  - `lastUpdated` automatisch setzen
  - Verzeichnis erstellen falls nötig (`mkdir -p`)
  - Atomares Schreiben (erst in temp-Datei, dann umbenennen)
- `createBackup(filePath)` – Kaputte Datei als `.bak` sichern

### 2.2 Server-Registrierung: `apps/server/src/server.ts` **~5 Zeilen Änderung**

- `completedTasksRouter` importieren und unter `/api/completed-tasks` registrieren

### 2.3 Event-Typ erweitern: `libs/types/src/event.ts` **~5 Zeilen Änderung**

- Neue Event-Typen hinzufügen:
  - `'completed-task:created'` – Neue Aufgabe gespeichert
  - `'completed-task:deleted'` – Aufgabe gelöscht

---

## ⚡ Edge Cases

| Was könnte passieren?                                   | Lösung                                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Projekt hat noch keinen `.automaker/` Ordner            | `readCompletedTasks` erstellt den Ordner automatisch                                          |
| JSON-Datei ist leer (0 Bytes)                           | Wird als "keine Aufgaben" interpretiert                                                       |
| Titel mit Sonderzeichen (Emojis, Umlaute)               | UTF-8 Standard, JSON unterstützt das                                                          |
| Sehr langer Titel (>500 Zeichen)                        | Server kürzt auf max 200 Zeichen                                                              |
| 1000+ Einträge, Suche wird langsam                      | `limit` + `offset` für Paginierung, Suche ist in-memory aber bei <5000 Einträgen kein Problem |
| Mehrere Tabs offen, einer speichert                     | Event-System informiert alle Clients sofort                                                   |
| `projectPath` zeigt auf nicht-existierendes Verzeichnis | `validatePathParams` Middleware blockt das                                                    |

---

## 🔄 Wiederverwendung

- **Router-Pattern:** Genau wie `apps/server/src/routes/overview/` aufgebaut
- **Storage-Pattern:** Ähnlich wie Feature-Loader (`services/feature-loader.ts`) – JSON lesen/schreiben
- **Validierung:** Nutzt bestehende `validatePathParams` Middleware aus `routes/common.ts`
- **Events:** Nutzt bestehendes `createEventEmitter()` aus `lib/events.ts`

---

## 📋 Chat-Aufteilung für Implementierung

### CHAT 4 – Phase 2 implementieren (~45.000 Tokens)

**Schritt 1:** `apps/server/src/routes/completed-tasks/storage.ts` erstellen

- Lese/Schreib-Funktionen für die JSON-Datei
- Backup-Logik bei defekter Datei

**Schritt 2:** `apps/server/src/routes/completed-tasks/handlers.ts` erstellen

- Alle 4 Handler implementieren
- Filter- und Sortier-Logik

**Schritt 3:** `apps/server/src/routes/completed-tasks/index.ts` erstellen

- Router zusammenbauen

**Schritt 4:** `apps/server/src/server.ts` anpassen

- Router registrieren

**Schritt 5:** Event-Typen erweitern

- `libs/types/src/event.ts` um neue Event-Typen ergänzen

**Schritt 6:** TypeScript-Check

- `npx tsc --noEmit` im Server-Paket

---

**Vorherige Phase:** [Phase 1 – Datenmodell & Typen](./2026-03-13-phase-1-datenmodell-typen.md)
**Nächste Phase:** [Phase 3 – UI Store & Sidebar-Tab](./2026-03-13-phase-3-ui-store-tab.md)
