# Phase 4: Session Tab-Leiste

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 2
**Geschätzte Tokens**: ~25.000

---

## Was ist das Problem?

Der User konnte bisher nur einen Chat gleichzeitig nutzen.
Für parallele Arbeit brauchte es eine klare Tab-Leiste.

## Ergebnis

1. Oben im Chat gibt es jetzt eine echte Session-Tab-Leiste.
2. Neue Tabs können direkt erstellt werden.
3. Tabs können gewechselt, umbenannt und geschlossen werden.
4. Laufende Tabs zeigen einen klaren Status.
5. Bei vielen Tabs bleibt alles per Scroll und Pfeilen bedienbar.

---

## Betroffene Dateien

### Neue Dateien (apps/chat/src/)

| Datei                            | Zweck                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `components/session-tab.tsx`     | Einzelner Session-Tab mit Status, Kosten, Modell, Umbenennen und Kontextmenü |
| `components/session-tab-bar.tsx` | Tab-Leiste mit horizontalem Scroll, Pfeiltasten und „Neuer Chat“-Button      |

### Geänderte Dateien

| Datei                            | Was wurde ergänzt                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `components/chat-header.tsx`     | Tab-Leiste in den Header eingebaut                                                               |
| `components/chat-view.tsx`       | Session-Aktionen für Erstellen/Wechseln/Schließen/Umbenennen inkl. Scroll- und Draft-Speicherung |
| `hooks/use-session-actions.ts`   | `renameSession()` für Server-Update ergänzt                                                      |
| `components/session-tab-bar.tsx` | Typ-Export für `SessionTabItem` ergänzt                                                          |

---

## Konkret umgesetzt

### Aufgabe 4.1: Tab-Leiste

- Horizontale Leiste mit mehreren Tabs umgesetzt.
- „Neuer Chat“-Button am Ende ergänzt.
- Overflow gelöst: horizontales Scrollen plus Links-/Rechts-Pfeile.
- Aktiver Tab wird automatisch sichtbar gehalten.

### Aufgabe 4.2: Einzelner Tab

- Tab zeigt Name, Statuspunkt, Modell-Kürzel, Kosten und Nachrichtenzahl.
- Laufender Tab zeigt Spinner.
- Doppelklick startet Umbenennen inline.
- Rechtsklick öffnet Kontextmenü mit „Umbenennen“, „Andere schließen“, „Schließen“.

### Aufgabe 4.3: Tab-Aktionen

- Neuer Tab: erstellt Session und wechselt direkt dahin.
- Tab-Wechsel: Draft und Scroll der alten Session werden gesichert, neue Session wird geladen.
- Tab schließen: bei laufendem Chat kommt eine Bestätigung, dann wird sauber archiviert.
- Letzten Tab schließen: es wird automatisch wieder ein neuer Chat erstellt.
- Umbenennen: wird auf dem Server gespeichert (`sessions.update`) und im Store aktualisiert.

### Aufgabe 4.4: Overflow Handling

- Bei vielen Tabs bleibt die Leiste horizontal scrollbar.
- Pfeiltasten scrollen in festen Schritten.
- Aktiver Tab wird beim Wechsel automatisch ins Sichtfeld gebracht.

### Aufgabe 4.5: Tastenkürzel

- `Ctrl/Cmd + T`: neuer Tab
- `Ctrl/Cmd + W`: aktiven Tab schließen
- `Ctrl/Cmd + Tab`: nächster Tab
- `Ctrl/Cmd + Shift + Tab`: vorheriger Tab
- `Ctrl/Cmd + 1-9`: Tab direkt wählen

---

## Prüfpunkte

- [x] Tab-Leiste wird angezeigt
- [x] Neuer Tab erstellen funktioniert
- [x] Tab-Wechsel funktioniert ohne Datenverlust
- [x] Laufende Sessions zeigen Lade-Animation
- [x] Tab schließen mit Bestätigung bei laufender Session
- [x] Tab umbenennen per Doppelklick
- [x] Keyboard-Shortcuts funktionieren
- [x] Tab-Overflow mit Scroll
- [x] Aktiver Tab visuell hervorgehoben

## TypeScript-Check

- `npm run typecheck:chat` ✅

## Definition von fertig

1. Multi-Session mit Tabs läuft stabil im Chat. ✅
2. Wechseln, Schließen und Umbenennen sind vollständig nutzbar. ✅
3. Grundlage für Phase 5 ist bereit. ✅
