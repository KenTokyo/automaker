# Phase 1: Sortierung nach "zuletzt bearbeitet"

ULTRATHINK

## Status: ✅ Abgeschlossen

## Ziel

Die Docs-Liste soll standardmäßig nach "zuletzt bearbeitet" sortiert werden (neueste oben), sowohl für Dateien als auch für Ordner. Der Benutzer soll die Sortierung umschalten können.

---

## Aktueller Stand

### Frontend (`docs-list.tsx`)

- Sortierung ist aktuell: **Ordner zuerst, dann alphabetisch** (`a.name.localeCompare(b.name)`)
- Zeile 117-120

### Server (`list.ts`)

- Server sortiert bereits: **Ordner zuerst, dann nach `modifiedAt` absteigend**
- Zeile 83-87
- Problem: Der Client überschreibt diese Sortierung sofort mit alphabetischer Sortierung

---

## Benötigte Komponenten / Änderungen

### 1. `docs-list.tsx` - Sortierlogik anpassen

**Was tun**: Die Frontend-Sortierung soll konfigurierbar sein (nicht fest alphabetisch).

- Standard-Sortierung: `modifiedAt` absteigend (neueste zuerst)
- Ordner immer oben (bleibt)
- Ordner untereinander ebenfalls nach `modifiedAt` sortieren
- Neue Prop `sortBy` akzeptieren: `'modified' | 'name'`

### 2. `docs-panel.tsx` - Sortier-Toggle einbauen

**Was tun**: Einen Toggle-Button oder Dropdown in der Toolbar hinzufügen.

- Position: Neben den "New Doc" / "New Folder" Buttons
- Optionen: "Zuletzt bearbeitet" (Standard) | "Name A-Z"
- State in `docs-panel.tsx` verwalten (oder im app-store persistieren)
- Icon-basiert (z.B. ArrowUpDown oder Clock icon)

### 3. `DocsListProps` erweitern

**Was tun**: Neue Prop `sortBy` zum Interface hinzufügen.

---

## Abhängigkeiten

- Phase 2 (Ordner-Zeitanzeige) liefert erst den korrekten `modifiedAt`-Wert für Ordner, der für eine sinnvolle Sortierung benötigt wird
- Diese Phase kann trotzdem zuerst implementiert werden - Ordner haben bereits einen `modifiedAt` Wert vom Server (allerdings nur den eigenen Ordner-Timestamp, nicht den der Kinder)

---

## Risiken / Edge Cases

- Ordner `modifiedAt` ist aktuell nur der Ordner-Timestamp selbst, nicht der jüngste Inhalt → wird in Phase 2 behoben
- Sortierung muss auch beim Hinzufügen neuer Docs (optimistisch) korrekt bleiben
