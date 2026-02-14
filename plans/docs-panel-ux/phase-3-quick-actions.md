# Phase 3: Quick-Action Buttons (Copy Path, Insert into Chat)

ULTRATHINK

## Status: ✅ Abgeschlossen

## Ziel

Neben dem bestehenden Drei-Punkte-Menü (⋮) sollen direkt sichtbare Buttons für die häufigsten Aktionen angezeigt werden:

1. **Copy Relative Path** Button
2. **Copy Absolute Path** Button
3. **Insert into Chat** Button

Diese Buttons sollen rechts neben dem Dateinamen erscheinen, direkt sichtbar (nicht nur on hover hinter dem Drei-Punkte-Menü versteckt). Das Drei-Punkte-Menü bleibt weiterhin bestehen für weniger häufige Aktionen (Rename, Delete).

---

## Aktueller Stand

### Frontend (`docs-list.tsx`)

- Aktuell: Nur ein `MoreVertical` (⋮) Button, der on hover erscheint (`opacity-0 group-hover:opacity-100`)
- Inside: Copy Path Sub-Menü (Absolute, Relative, Filename), Insert into Chat, Rename, Delete
- Zeile 190-246

### DocsViewer (`docs-viewer.tsx`)

- Hat bereits eigenständige Buttons: Insert into Chat (Zeile 561-569) + Copy Path (Zeile 572-580)
- Diese Pattern können als Referenz dienen

---

## Benötigte Komponenten / Änderungen

### 1. `docs-list.tsx` - Quick-Action Buttons hinzufügen

**Was tun**: Rechts neben dem Dateinamen (vor dem ⋮-Menü) direkte Icon-Buttons anzeigen.

**Button-Layout pro Zeile (von links nach rechts)**:

```
[Icon] Filename         [CopyRel] [CopyAbs] [InsertChat] [⋮]
       10m ago · 21 B
```

**Buttons**:

1. **Copy Relative Path**
   - Icon: `ClipboardCopy` oder `Copy` (kleiner)
   - Tooltip: "Copy relative path"
   - Aktion: `navigator.clipboard.writeText('.automaker/docs/' + doc.path)`
   - Toast: "Relative path copied"

2. **Copy Absolute Path**
   - Icon: `Copy` mit einem kleinen Badge oder `FolderOpen`
   - Tooltip: "Copy absolute path"
   - Aktion: `navigator.clipboard.writeText(doc.absolutePath)`
   - Toast: "Absolute path copied"

3. **Insert into Chat**
   - Icon: `MessageSquarePlus`
   - Tooltip: "Insert into chat"
   - Aktion: `window.dispatchEvent(new CustomEvent('docs:insert-path', { detail: doc.absolutePath }))`
   - Toast: "Path inserted into chat"
   - Nur für Dateien, nicht für Ordner

**Visibility**:

- Buttons erscheinen on hover (`group-hover:opacity-100`)
- Aber kompakter als das aktuelle ⋮-Menü
- Alternative: Immer sichtbar, aber mit subtiler Darstellung (ghost variant, kleine Icons)

### 2. `docs-list.tsx` - ⋮-Menü bereinigen

**Was tun**: Aktionen, die jetzt als direkte Buttons existieren, können aus dem ⋮-Menü entfernt werden.

- "Copy Path" Sub-Menü: Kann entfernt werden (oder nur "Filename Only" behalten)
- "Insert into Chat": Kann entfernt werden
- Verbleiben im ⋮-Menü: Rename, Delete

### 3. Ordner: Auch Copy Path ermöglichen

**Was tun**: Ordner sollen auch Copy Relative/Absolute Path haben (aber kein "Insert into Chat").

- Ordner-Pfad: `.automaker/docs/{folderPath}/`

---

## UI-Details

### Button-Größe

- Konsistent mit bestehendem ⋮-Button: `h-7 w-7 p-0`
- Icons: `w-3.5 h-3.5`
- Variant: `ghost`
- Tooltips für Klarheit

### Hover-Verhalten

- Buttons: `opacity-0 group-hover:opacity-100 transition-opacity`
- Alle Buttons + ⋮ Menü in einer Flex-Row rechts

### Responsive

- Bei sehr schmalen Panels könnten Buttons abgeschnitten werden
- Lösung: `shrink-0` auf dem Buttons-Container, `min-w-0` auf dem Dateinamen-Container

---

## Abhängigkeiten

- Keine harten Abhängigkeiten
- Kann unabhängig von Phase 1 und 2 implementiert werden

---

## Risiken / Edge Cases

- Zu viele Buttons könnten die Zeile überladen → kompakte Icons verwenden
- Click-Handler müssen `e.stopPropagation()` aufrufen, da die gesamte Zeile clickbar ist
- Clipboard API erfordert HTTPS oder localhost (in Electron kein Problem)
