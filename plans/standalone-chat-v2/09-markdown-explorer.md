# Phase 9: Markdown Explorer (rechte Sidebar)

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 4
**Geschätzte Tokens**: ~45.000

---

## Was ist das Problem?

Rechts ist Platz für Dateien, aber es fehlt ein echter Explorer.
Der User soll Dateien im Projekt schnell sehen, durchsuchen und öffnen können.

## Was soll passieren?

Ein Markdown Explorer wie in der Extension:
Dateibaum, Suche, Favoriten, Vorschau und schnelle Aktionen.

## Wie der User die App danach erlebt

1. Rechts sieht man die Projektdateien als Baum.
2. Markdown-Dateien lassen sich schnell öffnen.
3. Favoriten bleiben gespeichert.
4. Suche findet Dateien und Inhalte.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei | Zweck |
|---|---|
| `components/markdown-explorer.tsx` | Hauptcontainer der rechten Sidebar |
| `components/markdown-tree.tsx` | Dateibaum mit Ordnern |
| `components/markdown-tree-item.tsx` | Ein Knoten im Baum |
| `components/markdown-search.tsx` | Suche für Dateinamen/Inhalte |
| `components/markdown-favorites.tsx` | Favoriten-Liste |
| `components/markdown-preview.tsx` | Vorschau der ausgewählten Datei |

---

## Aufgaben

### Aufgabe 9.1: Explorer-Grundlayout

- Kopfbereich mit Titel „Dateien“
- Tabs: `Baum`, `Favoriten`, `Suche`
- Hauptbereich mit Baum oder Trefferliste
- Fußbereich mit kleinem Status (z.B. „134 Dateien geladen“)

### Aufgabe 9.2: Dateibaum

- Ordner auf- und zuklappen
- Dateien anklicken zum Öffnen
- Symbole für Ordner und Markdown-Dateien
- Sortierung: Ordner zuerst, dann Dateien

### Aufgabe 9.3: Datei-Vorschau

- Klick auf Datei zeigt Inhalt als Markdown
- Codeblöcke gut lesbar darstellen
- Große Dateien mit Ladeanzeige
- Bei Fehlern einfacher Hinweistext

### Aufgabe 9.4: Favoriten

- Stern-Button pro Datei
- Favoriten separat anzeigen
- Reihenfolge merken
- Favoriten pro Projekt speichern

### Aufgabe 9.5: Suche

- Suche nach Dateiname
- Optionale Inhaltssuche (Text in Markdown)
- Treffer mit Pfad und kurzer Vorschauzeile
- Klick auf Treffer öffnet Datei und markiert Fundstelle

### Aufgabe 9.6: Schnellaktionen

- Datei in Zwischenablage kopieren
- Dateipfad kopieren
- „Im Explorer öffnen“ (Ordner anzeigen)

---

## Prüfpunkte

- [ ] Dateibaum lädt stabil
- [ ] Auf-/Zuklappen funktioniert
- [ ] Vorschau zeigt Markdown korrekt
- [ ] Favoriten bleiben erhalten
- [ ] Suche liefert passende Treffer
- [ ] Schnellaktionen sind nutzbar

---

## Edge Cases

| Fall | Lösung |
|---|---|
| Sehr tiefe Ordnerstruktur | Lazy-Loading und virtuelle Liste |
| Datei wurde extern gelöscht | Eintrag beim nächsten Reload entfernen |
| Riesige Markdown-Datei | Teilweises Laden mit Hinweis |
| Keine Markdown-Dateien | Freundlicher Leerer-Zustand |
