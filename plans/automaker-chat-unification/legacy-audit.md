# Legacy-Audit: Standalone-Chat Altlasten

> Erstellt in Phase 5 der Chat-Zusammenführung.
> Zweck: Klare Übersicht, was aus `apps/chat` bereits portiert wurde, was übergangsweise bleibt und was später entfernt werden kann.

## 1. Bereits portierte Bausteine (apps/chat → apps/ui)

Diese Bausteine wurden in Phasen 1-4 sauber in den Automaker-Chat überführt und leben jetzt in `apps/ui`:

### Typen (libs/types)

| Quelle (apps/chat)                 | Ziel (libs/types)                            | Status             |
| ---------------------------------- | -------------------------------------------- | ------------------ |
| `stores/dashboard-types.ts`        | `libs/types/src/dashboard.ts`                | ✅ Portiert        |
| (inline in explorer-store)         | `libs/types/src/explorer.ts`                 | ✅ Portiert        |
| `services/overview-api.ts` (Typen) | `apps/server/src/services/overview-types.ts` | ✅ Bereits zentral |

### Stores

| Quelle (apps/chat)          | Ziel (apps/ui)             | Status      |
| --------------------------- | -------------------------- | ----------- |
| `stores/dashboard-store.ts` | `store/dashboard-store.ts` | ✅ Portiert |
| `stores/explorer-store.ts`  | `store/explorer-store.ts`  | ✅ Portiert |

### API-Helfer

| Quelle (apps/chat)         | Ziel (apps/ui)        | Status      |
| -------------------------- | --------------------- | ----------- |
| `services/overview-api.ts` | `lib/overview-api.ts` | ✅ Portiert |
| (inline in explorer-store) | `lib/explorer-api.ts` | ✅ Portiert |

### Hooks

| Quelle (apps/chat)       | Ziel (apps/ui)           | Status      |
| ------------------------ | ------------------------ | ----------- |
| `hooks/use-dashboard.ts` | `hooks/use-dashboard.ts` | ✅ Portiert |

### Komponenten

| Quelle (apps/chat)                          | Ziel (apps/ui)                 | Status        |
| ------------------------------------------- | ------------------------------ | ------------- |
| `dashboard-panel.tsx` + Unter-Komponenten   | `dashboard-panel/` (5 Dateien) | ✅ Portiert   |
| `markdown-explorer.tsx` + Unter-Komponenten | `files-panel/` (7 Dateien)     | ✅ Portiert   |
| (neu)                                       | `right-panel-shell.tsx`        | ✅ Neu gebaut |
| (neu)                                       | `left-overview-panel.tsx`      | ✅ Neu gebaut |

### State-Erweiterungen in app-store.ts

| Feature                                    | Status         |
| ------------------------------------------ | -------------- |
| `rightPanelMode` (browser/files/dashboard) | ✅ Hinzugefügt |
| `leftPanelTab` (sessions/docs/overview)    | ✅ Hinzugefügt |
| `setRightPanelMode`, `setLeftPanelTab`     | ✅ Hinzugefügt |

---

## 2. Noch NICHT portierte Bausteine

Diese Teile aus `apps/chat` wurden bewusst noch nicht übernommen, weil sie entweder nicht gebraucht werden oder erst später sinnvoll sind:

### Chat-Kern (nicht portiert, nicht nötig)

Der Automaker-Chat hat bereits einen eigenen Chat-Kern. Diese Dateien aus `apps/chat` werden NICHT gebraucht:

- `chat-center.tsx`, `chat-header.tsx`, `chat-input.tsx`, `chat-messages.tsx`
- `chat-sidebar-left.tsx`, `chat-sidebar-right.tsx`
- `chat-view.tsx`, `chat-view-layout.tsx`, `chat-layout-v2.tsx`
- `message-bubble.tsx`, `message-error.tsx`, `message-system.tsx`, `message-thinking.tsx`
- `tool-call-group.tsx`, `tool-call-item.tsx`, `tool-call-result.tsx`, `tool-call-summary.tsx`
- `session-store.ts`, `session-store-helpers.ts`
- Alle Hooks: `use-active-session.ts`, `use-chat-session-shortcuts.ts`, `use-chat-stream-sync.ts`, etc.

### Übersicht-Details (optional für später)

- `dashboard-improvements.tsx` — Verbesserungsvorschläge-Anzeige
- `dashboard-metadata.tsx` — Technische Metadaten
- `dashboard-model-selector.tsx` — Modell-Auswahl für Generierung
- `dashboard-stats-bar.tsx` — Statistik-Leiste
- `dashboard-summary-card.tsx` — Zusammenfassungs-Karte
- `dashboard-section-card.tsx` — Bereichs-Karte

Diese könnten bei Bedarf nachträglich portiert werden. Aktuell hat der Automaker-Chat eine kompaktere Darstellung.

### Sound-System (nicht portiert)

- `sound-store.ts`, `sound-service.ts`, `use-sound-events.ts`, `sound-settings-panel.tsx`
- Nicht nötig im Automaker-Chat — dort gibt es andere Benachrichtigungen.

### History-Panel (nicht portiert)

- `history-panel.tsx`, `history-list.tsx`, `history-item.tsx`, etc.
- Nicht nötig — der Automaker-Chat hat `session-manager.tsx` mit eigener Session-Verwaltung.

---

## 3. Skripte und Startwege

### Root package.json Skripte

| Skript                     | Typ                        | Empfehlung                  |
| -------------------------- | -------------------------- | --------------------------- |
| `dev:chat`                 | Standalone Chat Dev-Server | Übergang — später entfernen |
| `_dev:chat`                | Internes Chat Dev-Skript   | Übergang — später entfernen |
| `_dev:server:chat`         | Server im Chat-Modus       | Übergang — später entfernen |
| `build:chat`               | Chat Production Build      | Übergang — später entfernen |
| `start:chat`               | Chat Production Start      | Übergang — später entfernen |
| `typecheck:chat`           | Chat TypeScript-Prüfung    | Übergang — später entfernen |
| `_dev:electron:chat`       | Electron Chat intern       | Übergang — später entfernen |
| `_dev:electron:chat:debug` | Electron Chat Debug        | Übergang — später entfernen |
| `dev:electron:chat`        | Electron Chat Start        | Übergang — später entfernen |
| `dev:electron:chat:debug`  | Electron Chat Debug        | Übergang — später entfernen |
| `build:electron:chat`      | Electron Chat Build        | Übergang — später entfernen |
| `build:electron:chat:dir`  | Electron Chat Dir Build    | Übergang — später entfernen |

**Gesamt: 12 Chat-spezifische Skripte im Root**

### Launcher (start-automaker.sh)

| Menüpunkt          | Empfehlung            |
| ------------------ | --------------------- |
| `[5] Chat Web`     | Als Übergang markiert |
| `[6] Chat Desktop` | Als Übergang markiert |

### Hilfs-Skripte

| Datei                              | Zweck                 | Empfehlung |
| ---------------------------------- | --------------------- | ---------- |
| `scripts/check-port-available.mjs` | Port-Prüfung für Chat | Übergang   |
| `scripts/dev-chat.mjs`             | Chat Dev-Starter      | Übergang   |

---

## 4. Dokumentation

| Datei                                    | Status                         | Empfehlung                    |
| ---------------------------------------- | ------------------------------ | ----------------------------- |
| `apps/chat/HOW-TO-RUN.md`                | Verweist auf Chat als Hauptweg | Übergangs-Hinweis hinzugefügt |
| `plans/standalone-chat/` (10 Dateien)    | Alte Pläne v1                  | Archiv — nicht weiter pflegen |
| `plans/standalone-chat-v2/` (24 Dateien) | Alte Pläne v2                  | Archiv — nicht weiter pflegen |

---

## 5. Electron-Infrastruktur in apps/chat

| Bereich      | Dateien   | Empfehlung                                 |
| ------------ | --------- | ------------------------------------------ |
| Main Process | 4 Dateien | Übergang — eigener Electron-Einstieg       |
| IPC Handler  | 7 Dateien | Übergang — teilweise identisch mit apps/ui |
| Windows      | 2 Dateien | Übergang                                   |
| Server       | 2 Dateien | Übergang — eigener Backend-Start           |
| Security     | 1 Datei   | Übergang                                   |
| Utils        | 2 Dateien | Übergang                                   |

**Gesamt: 18 Electron-Dateien in apps/chat**

---

## 6. Rückbau-Risiken

### Niedrig (sicher entfernbar nach Abschluss)

- Chat-spezifische Root-Skripte (12 Stück)
- `apps/chat/HOW-TO-RUN.md`
- Launcher-Menüpunkte [5] und [6]
- `scripts/check-port-available.mjs`, `scripts/dev-chat.mjs`
- Alte Plan-Dateien (34 Dateien in standalone-chat und standalone-chat-v2)

### Mittel (vorher prüfen)

- `apps/chat/src/electron/` — Falls Electron-Logik dort Besonderheiten hat, die in `apps/ui` fehlen
- `AUTOMAKER_MODE=chat` Server-Modus — Prüfen ob andere Stellen davon abhängen
- `apps/chat/vite.config.ts` — Enthält möglicherweise spezielle Konfiguration

### Hoch (vorsichtig)

- `apps/chat` als Workspace-Eintrag in Root `package.json` — Entfernen beeinflusst `npm install`
- Server-Routen die nur im Chat-Modus aktiv sind — Falls es solche gibt

---

## 7. Zusammenfassung

| Kategorie                    | Anzahl                           | Status                  |
| ---------------------------- | -------------------------------- | ----------------------- |
| Portierte Bausteine          | 22 Dateien neu in apps/ui + libs | ✅ Fertig               |
| Nicht portiert (nicht nötig) | ~60 Chat-Kern-Dateien            | Können ignoriert werden |
| Nicht portiert (optional)    | ~10 Detail-Komponenten           | Bei Bedarf später       |
| Skripte zum Entfernen        | 12 Root + 2 Scripts              | Übergang markiert       |
| Plan-Dateien zum Archivieren | 34 Dateien                       | Archiv markiert         |
| Electron-Dateien             | 18 Dateien                       | Übergang                |

**Nächster Schritt:** Phase 6 nutzt diese Liste für die Abschluss-Checkliste und Übergabe.
