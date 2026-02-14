# Phase 2: Ordner-Zeitanzeige (jüngstes Kind-Element)

ULTRATHINK

## Status: ✅ Abgeschlossen

## Ziel

Ordner sollen eine "zuletzt bearbeitet"-Angabe anzeigen (z.B. "10m ago"), basierend auf dem jüngsten `modifiedAt`-Wert ihrer direkten und verschachtelten Kind-Elemente. Aktuell zeigen Ordner nur "Folder" als Info-Text.

---

## Aktueller Stand

### Frontend (`docs-list.tsx`)

- Ordner zeigen: `'Folder'` (Zeile 175-176)
- Dateien zeigen: `formatRelativeTime(doc.modifiedAt)` + Größe
- Ordner haben zwar `modifiedAt`, aber das ist nur der Ordner-eigene Timestamp (wann der Ordner selbst geändert wurde), nicht das jüngste Kind

### Server (`list.ts`)

- Ordner bekommen `modifiedAt` von `stats.mtime` → Nur der eigene Ordner-Timestamp
- Zeile 56-66
- Es wird NICHT rekursiv in den Ordner geschaut

---

## Benötigte Komponenten / Änderungen

### 1. `list.ts` (Server) - Rekursive modifiedAt-Berechnung für Ordner

**Was tun**: Für jeden Ordner rekursiv das jüngste `modifiedAt` aller enthaltenen Dateien ermitteln.

- Neue Hilfsfunktion: `getNewestModifiedAt(dirPath: string): Promise<string>`
  - Liest rekursiv alle Dateien im Verzeichnis
  - Findet den neuesten `mtime`-Wert
  - Falls leer: Fallback auf den Ordner-eigenen Timestamp
- Den berechneten Wert als `modifiedAt` des Ordners setzen
- **Performance-Überlegung**: Rekursion sollte begrenzt sein (z.B. max 3 Ebenen tief oder max 1000 Dateien), um bei sehr großen Ordnern keine Timeouts zu verursachen

### 2. `docs-list.tsx` (Frontend) - Ordner-Zeitanzeige

**Was tun**: Den Ordner-Anzeigetext erweitern.

- Statt nur `'Folder'` anzeigen: `'Folder · 10m ago'`
- Format: `Folder · {formatRelativeTime(doc.modifiedAt)}`
- Optional auch Größe/Anzahl der Elemente (z.B. "Folder · 3 items · 10m ago")

### 3. `DocFile` Type ggf. erweitern (optional)

**Was tun**: Prüfen ob ein neues Feld `childCount` sinnvoll wäre.

- Aktuell: `DocFile.size` ist bei Ordnern `0`
- Könnte genutzt werden, um die Anzahl der Kind-Elemente zu speichern
- Nicht zwingend nötig, aber nice-to-have

---

## Algorithmus: `getNewestModifiedAt`

```
Funktion getNewestModifiedAt(dirPath):
  newestTime = 0
  entries = readdir(dirPath)

  für jedes entry in entries:
    wenn entry ist Datei:
      stats = stat(entry)
      wenn stats.mtime > newestTime:
        newestTime = stats.mtime
    wenn entry ist Ordner:
      rekursivTime = getNewestModifiedAt(entry.path)
      wenn rekursivTime > newestTime:
        newestTime = rekursivTime

  wenn newestTime == 0:
    return Ordner-eigene mtime
  return newestTime
```

---

## Abhängigkeiten

- Keine harten Abhängigkeiten
- Phase 1 (Sortierung) profitiert von diesem korrekten `modifiedAt`

---

## Risiken / Edge Cases

- Leere Ordner: Fallback auf Ordner-eigene mtime
- Sehr tiefe/große Ordnerstrukturen: Performance-Limit einbauen
- Symlinks: Nicht folgen, um Endlosschleifen zu vermeiden
- Berechtigungsfehler bei einzelnen Dateien: Überspringen, nicht abbrechen
