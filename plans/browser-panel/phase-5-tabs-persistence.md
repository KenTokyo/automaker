# Phase 5: Tab-Management & Persistenz

ULTRATHINK

## Status: ✅ Abgeschlossen

## Ziel

Multi-Tab-Support im Browser-Panel: Jedes Projekt kann mehrere Browser-Tabs haben, mit persistiertem Port/URL. Tab-Leiste oben im BrowserPanel.

---

## Aktueller Stand

- Phase 1 definiert `BrowserTab` Type + `browserTabsByProject` im Store
- Phase 3 erstellt die BrowserPanel-Grundkomponente
- Noch kein Tab-UI vorhanden

---

## Benötigte Komponenten

### 1. `BrowserTabBar` (Sub-Komponente)

**Wo**: Innerhalb von `browser-panel.tsx` oder eigene Datei

**Layout**:

```
┌───────────┬───────────┬───────┬─────┐
│ Tab 1  ✕  │ Tab 2  ✕  │ + New │     │
└───────────┴───────────┴───────┴─────┘
```

**Elemente pro Tab**:

- Favicon/Icon (Globe icon als Fallback)
- Titel (URL-Host oder benutzerdefiniert, z.B. "localhost:3000")
- Close-Button (✕)
- Aktiver Tab: Hervorgehoben (bg-background, border-bottom)
- Inaktiver Tab: Dezent (bg-muted/50)

**"+ New" Button**:

- Erstellt einen neuen Tab
- Öffnet mit leerer URL oder Port-Eingabe-Dialog
- Quick: Erstellt Tab mit `http://localhost:` + nächstem freien Port

### 2. Port-Konfiguration pro Tab

**Was tun**: Jeder Tab speichert seinen `port` Wert.

**Workflow**:

1. User erstellt neuen Tab
2. Eingabe: Port-Nummer (z.B. `3000`)
3. Tab speichert: `{ port: 3000, url: "http://localhost:3000" }`
4. Port bleibt gespeichert, auch wenn URL sich ändert (Navigation)
5. "Reset to port" Option: Setzt URL zurück auf `http://localhost:{port}`

### 3. Persistenz-Mechanismus

**Was tun**: Sicherstellen, dass Tabs beim Projektwechsel und App-Neustart erhalten bleiben.

**Zustand Persist**:

- `browserTabsByProject` wird durch Zustand persist automatisch gespeichert
- `activeBrowserTabByProject` ebenfalls
- Beim Projektwechsel: Die Tabs des neuen Projekts laden

**Projekt-Lifecycle**:

- Projekt geöffnet → Tabs aus Store laden → letzten aktiven Tab anzeigen
- Projekt gewechselt → Alte Tabs bleiben gespeichert, neue Tabs laden
- App geschlossen → Alles persistiert
- App geöffnet → Letztes Projekt + dessen Tabs wieder da

### 4. Default-Tab pro Projekt

**Was tun**: Wenn ein Projekt noch keine Tabs hat, einen Default-Tab erstellen.

**Logik**:

```
Wenn browserTabsByProject[projectPath] leer/undefined:
  - Einen Default-Tab mit leerer URL erstellen
  - Oder: Kein Tab → "Start Preview" Ansicht zeigen
```

**Empfehlung**: Kein automatischer Tab. Stattdessen den "Empty State" zeigen mit Quick-Port-Buttons.

---

## Implementierungs-Schritte

### Schritt 1: BrowserTabBar Komponente bauen

- Tab-Liste rendern
- Aktiven Tab hervorheben
- Click → Tab wechseln
- Close → Tab entfernen

### Schritt 2: Tab-Erstellung

- "+" Button Handler
- Port-Eingabe (Inline oder Dialog)
- Tab mit generierter ID + URL erstellen

### Schritt 3: Tab-Leiste in BrowserPanel integrieren

- Zwischen Toolbar und iframe einbauen
- Oder: Als Teil der Toolbar (Chrome-like)

### Schritt 4: Persistenz testen

- Tab erstellen → Projekt wechseln → zurück → Tab noch da
- App neu laden → Tabs noch da
- Tab schließen → Sofort aus Store entfernt

### Schritt 5: Tab-Limits

- Maximum: 5-8 Tabs pro Projekt
- Bei Limit: Toast-Meldung "Maximum tabs reached"

---

## Abhängigkeiten

- Phase 1 (Store): `BrowserTab[]` + Actions
- Phase 3 (BrowserPanel): Komponente existiert

---

## Risiken / Edge Cases

- Zu viele Tabs: Performance (jeder Tab = eigenes iframe)
  - Lösung: Nur aktiven Tab rendern, Rest entladen
- Tab-Reihenfolge: Drag & Drop zum Umordnen (nice-to-have, nicht in v1)
- Doppelte Ports: User kann 2 Tabs mit gleichem Port haben → erlauben, kein Problem
- Projekt löschen: Tabs bleiben im Store als verwaiste Daten
  - Lösung: Cleanup beim Projekt-Löschen (oder ignorieren, kleiner Footprint)
