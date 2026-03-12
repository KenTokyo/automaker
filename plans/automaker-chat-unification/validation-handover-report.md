# Abschluss und Übergabe — Chat-Zusammenführung

> Erstellt in Phase 6 der Chat-Zusammenführung.
> Datum: 2026-03-11

---

## 1. Abschluss-Checkliste

### TypeScript-Prüfung

| Paket         | Befehl                                          | Ergebnis   |
| ------------- | ----------------------------------------------- | ---------- |
| `apps/ui`     | `npx tsc --noEmit -p apps/ui/tsconfig.json`     | Fehlerfrei |
| `apps/server` | `npx tsc --noEmit -p apps/server/tsconfig.json` | Fehlerfrei |
| `apps/chat`   | `npx tsc --noEmit -p apps/chat/tsconfig.json`   | Fehlerfrei |
| `libs/types`  | `npx tsc --noEmit -p libs/types/tsconfig.json`  | Fehlerfrei |

### Portierte Dateien — Vollständigkeit

| Baustein            | Dateien in apps/ui             | Vorhanden |
| ------------------- | ------------------------------ | --------- |
| Dashboard-Typen     | `libs/types/src/dashboard.ts`  | Ja        |
| Explorer-Typen      | `libs/types/src/explorer.ts`   | Ja        |
| Dashboard-Store     | `store/dashboard-store.ts`     | Ja        |
| Explorer-Store      | `store/explorer-store.ts`      | Ja        |
| Overview-API        | `lib/overview-api.ts`          | Ja        |
| Explorer-API        | `lib/explorer-api.ts`          | Ja        |
| use-dashboard Hook  | `hooks/use-dashboard.ts`       | Ja        |
| Dashboard-Panel     | `dashboard-panel/` (5 Dateien) | Ja        |
| Files-Panel         | `files-panel/` (7 Dateien)     | Ja        |
| Right-Panel-Shell   | `right-panel-shell.tsx`        | Ja        |
| Left-Overview-Panel | `left-overview-panel.tsx`      | Ja        |

**Gesamt: 22 Dateien — alle vorhanden und typisiert.**

### State-Integration in app-store.ts

| Feature             | Typ                                   | Standardwert | Vorhanden |
| ------------------- | ------------------------------------- | ------------ | --------- |
| `rightPanelMode`    | `'browser' \| 'files' \| 'dashboard'` | `'browser'`  | Ja        |
| `leftPanelTab`      | `'sessions' \| 'docs' \| 'overview'`  | `'sessions'` | Ja        |
| `setRightPanelMode` | Action                                | —            | Ja        |
| `setLeftPanelTab`   | Action                                | —            | Ja        |

### UTF-8- und Text-Prüfung

| Prüfpunkt                                     | Ergebnis         |
| --------------------------------------------- | ---------------- |
| Kaputte UTF-8-Sequenzen in portierten Dateien | Keine gefunden   |
| Kaputte UTF-8-Sequenzen in Plan-Dateien       | Keine gefunden   |
| Kaputte UTF-8-Sequenzen in Root-Docs          | Keine gefunden   |
| Echte Umlaute in UI-Texten (ü, ä, ö, ß)       | Korrekt erhalten |

### Altlasten-Markierungen (Phase 5)

| Massnahme                                       | Status   |
| ----------------------------------------------- | -------- |
| Launcher zeigt Chat als "Legacy"                | Erledigt |
| `apps/chat/HOW-TO-RUN.md` hat Übergangs-Hinweis | Erledigt |
| `CLAUDE.md` hat Chat-Zusammenführungs-Regel     | Erledigt |
| Alte Pläne als Archiv markiert                  | Erledigt |
| `legacy-audit.md` mit vollständiger Inventur    | Erledigt |

---

## 2. Nutzer-Prüfszenarien

Diese Szenarien sollten bei der nächsten manuellen Prüfung durchgegangen werden:

### Rechte Seite

| Nr  | Szenario                | Erwartung                                        |
| --- | ----------------------- | ------------------------------------------------ |
| R1  | Browser-Tab öffnen      | Iframe zeigt localhost-Vorschau                  |
| R2  | Zu "Dateien" wechseln   | Dateibaum lädt, Suche und Vorschau funktionieren |
| R3  | Zu "Übersicht" wechseln | Dashboard lädt oder zeigt "Noch keine Übersicht" |
| R4  | Übersicht generieren    | Ladebalken, dann Karten-Anzeige                  |
| R5  | Zwischen Tabs wechseln  | Kein Zustandsverlust, kein Flackern              |

### Linke Seite

| Nr  | Szenario                | Erwartung                       |
| --- | ----------------------- | ------------------------------- |
| L1  | Sessions-Tab öffnen     | Session-Liste sichtbar          |
| L2  | Zu "Docs" wechseln      | Docs-Panel zeigt Inhalte        |
| L3  | Zu "Übersicht" wechseln | Kompakte Dashboard-Ansicht lädt |
| L4  | Zwischen Tabs wechseln  | Kein Zustandsverlust            |

### Projektwechsel

| Nr  | Szenario                                                  | Erwartung                                   |
| --- | --------------------------------------------------------- | ------------------------------------------- |
| P1  | Projekt A: rechts Übersicht öffnen, zu Projekt B wechseln | Projekt B zeigt eigenen rechten Stand       |
| P2  | Zurück zu Projekt A                                       | Projekt A zeigt wieder seinen eigenen Stand |
| P3  | Links Docs in Projekt A, Sessions in Projekt B            | Kein Mischen der Zustände                   |

### Schmale Breite

| Nr  | Szenario                            | Erwartung                          |
| --- | ----------------------------------- | ---------------------------------- |
| S1  | Fenster schmal machen               | Linkes Overlay bleibt antippbar    |
| S2  | Rechter Bereich bei schmaler Breite | Kein Überlauf, Tabs bleiben lesbar |

---

## 3. Offene Restliste — Bewusste Spätarbeit

Diese Punkte bleiben bewusst offen und sollten in einem späteren Chat oder Sprint erledigt werden:

### Niedrige Priorität

| Nr  | Punkt                                                                   | Grund                               |
| --- | ----------------------------------------------------------------------- | ----------------------------------- |
| N1  | 12 Chat-spezifische Root-Skripte entfernen                              | Kein Druck — als "Legacy" markiert  |
| N2  | `scripts/check-port-available.mjs` und `scripts/dev-chat.mjs` entfernen | Nur für Standalone-Chat gebraucht   |
| N3  | Launcher-Menüpunkte [5] und [6] komplett entfernen                      | Erst nach finaler Abnahme           |
| N4  | 34 alte Plan-Dateien (standalone-chat, standalone-chat-v2) löschen      | Archiv — kein Schaden               |
| N5  | `apps/chat/HOW-TO-RUN.md` löschen                                       | Hat Übergangs-Hinweis, kann bleiben |

### Mittlere Priorität

| Nr  | Punkt                                                         | Grund                                                             |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| M1  | `apps/chat/src/electron/` prüfen auf Besonderheiten           | Möglicherweise Electron-Logik die in `apps/ui` fehlt              |
| M2  | `AUTOMAKER_MODE=chat` Server-Modus prüfen                     | Klären ob andere Stellen davon abhängen                           |
| M3  | `apps/chat/vite.config.ts` auf spezielle Konfiguration prüfen | Bevor Chat-Workspace entfernt wird                                |
| M4  | Optionale Detail-Komponenten nachportieren                    | `dashboard-improvements`, `dashboard-metadata`, etc. — bei Bedarf |

### Hohe Priorität (vor Entfernung von apps/chat)

| Nr  | Punkt                                                           | Grund                               |
| --- | --------------------------------------------------------------- | ----------------------------------- |
| H1  | `apps/chat` als Workspace-Eintrag in Root `package.json` prüfen | Entfernen beeinflusst `npm install` |
| H2  | Server-Routen prüfen die nur im Chat-Modus aktiv sind           | Falls es solche gibt                |

---

## 4. Übergabe-Text

### Was fertig ist

Die Chat-Zusammenführung Phasen 1-6 sind vollständig abgeschlossen:

1. **Phase 1 — Gemeinsame Basis**: Typen (`dashboard.ts`, `explorer.ts`) in `libs/types`, Stores (`dashboard-store`, `explorer-store`), API-Helfer (`overview-api`, `explorer-api`) und Hook (`use-dashboard`) portiert
2. **Phase 2 — Rechte Seite: Dateien**: Files-Panel mit 7 Komponenten (Baum, Suche, Vorschau, Favoriten), Right-Panel-Shell mit Umschalter Browser/Dateien/Übersicht
3. **Phase 3 — Rechte Seite: Übersicht**: Dashboard-Panel mit 5 Komponenten (Steuerung, Karten, Details), eingehängt in Right-Panel-Shell
4. **Phase 4 — Linke Seite**: Left-Overview-Panel, `leftPanelTab`-State, Session-Manager erweitert um 3-Tab-Umschalter
5. **Phase 5 — Altlasten abbauen**: Legacy-Audit (124 Chat-Dateien inventarisiert), Launcher als "Legacy" markiert, CLAUDE.md-Regel, alte Pläne archiviert
6. **Phase 6 — Abschluss**: TypeScript fehlerfrei, UTF-8 sauber, Abschluss-Checkliste und Übergabe erstellt

### Was bewusst offen bleibt

- `apps/chat` wird noch NICHT gelöscht — bleibt als Referenz-Quelle
- 12 Root-Skripte mit "chat" im Namen bleiben als Übergang
- Optionale Detail-Komponenten (Statistik-Leiste, Metadaten, Modell-Auswahl) können bei Bedarf nachportiert werden
- Endgültige Entfernung von `apps/chat` als Workspace erst nach manueller Prüfung aller Abhängigkeiten

### Wichtige Dateien für den nächsten Chat

| Datei                                                            | Zweck                                         |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `plans/automaker-chat-unification/00-global-tasklist.md`         | Gesamtübersicht aller 6 Phasen                |
| `plans/automaker-chat-unification/legacy-audit.md`               | Vollständige Inventur der Altlasten           |
| `plans/automaker-chat-unification/validation-handover-report.md` | Dieses Dokument                               |
| `CLAUDE.md` (Abschnitt "Chat-Zusammenführung")                   | Regel gegen neue Features in apps/chat        |
| `apps/ui/src/store/types/ui-types.ts`                            | `RightPanelMode`, `LeftPanelTab` Typen        |
| `apps/ui/src/store/app-store.ts`                                 | Zentraler Store mit allen neuen State-Feldern |

### TypeScript-Pflichtbefehl

Vor jeder Übergabe oder Merge muss dieser Befehl fehlerfrei durchlaufen:

```bash
npx tsc --noEmit -p apps/ui/tsconfig.json
npx tsc --noEmit -p apps/server/tsconfig.json
npx tsc --noEmit -p libs/types/tsconfig.json
```

Kein `npm run build` und kein `npm run dev` nötig — nur TypeScript-Prüfung.

---

## 5. Zusammenfassung

| Metrik                       | Wert |
| ---------------------------- | ---- |
| Phasen abgeschlossen         | 6/6  |
| Neue Dateien in apps/ui      | 22   |
| TypeScript-Fehler            | 0    |
| UTF-8-Probleme               | 0    |
| Offene Rest-Punkte (niedrig) | 5    |
| Offene Rest-Punkte (mittel)  | 4    |
| Offene Rest-Punkte (hoch)    | 2    |

Die Chat-Zusammenführung ist planerisch und technisch abgeschlossen. Der Automaker-Chat in `apps/ui` ist der Hauptweg. `apps/chat` ist als Übergangs-Quelle markiert und wird nicht weiter ausgebaut.
