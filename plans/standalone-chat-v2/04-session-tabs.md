# Phase 4: Session Tab-Leiste

ULTRATHINK

**Status**: ⬜ OFFEN
**Chat**: 2
**Geschätzte Tokens**: ~25.000

---

## Was ist das Problem?

Der User kann aktuell nur einen Chat gleichzeitig führen.
Für parallele Arbeit (z.B. ein Chat für Code, einer für Recherche) braucht es Tabs.

## Was soll passieren?

Eine Tab-Leiste oben im Chat, ähnlich wie Browser-Tabs.
Jeder Tab = ein eigener Chat-Thread mit eigenem Verlauf und Status.

## Wie der User die App danach erlebt

1. Ein Tab ist standardmäßig offen ("Chat 1")
2. "+" Button → neuer Tab wird erstellt
3. Klick auf Tab → Wechsel zum anderen Chat
4. "X" auf Tab → Tab schließen (Chat wird archiviert)
5. Laufende Tabs zeigen einen Lade-Indikator
6. Tab zeigt: Name + Status-Symbol + Modell + Kosten

---

## Betroffene Dateien

### Neue Dateien (apps/chat/src/)

| Datei                            | Zweck                     |
| -------------------------------- | ------------------------- |
| `components/session-tab-bar.tsx` | Die Tab-Leiste Komponente |
| `components/session-tab.tsx`     | Ein einzelner Tab         |

### Geänderte Dateien

| Datei                        | Was ändern          |
| ---------------------------- | ------------------- |
| `components/chat-header.tsx` | Tab-Leiste einbauen |

---

## Aufgaben

### Aufgabe 4.1: Tab-Leiste Komponente (`session-tab-bar.tsx`)

Layout:

- Horizontale Leiste, links angeordnet
- Tabs werden nebeneinander angezeigt
- "+" Button am Ende für neuen Chat
- Falls zu viele Tabs: Horizontaler Scroll mit Pfeilen
- Tab-Leiste wird nur angezeigt wenn > 1 Session aktiv (oder immer, konfigurierbar)

Verhalten:

- Drag & Drop zum Umordnen (optional, kann später kommen)
- Doppelklick auf Tab → Umbenennen
- Rechtsklick → Kontextmenü (Umbenennen, Schließen, Alle anderen schließen)

### Aufgabe 4.2: Einzelner Tab (`session-tab.tsx`)

Inhalt eines Tabs:

- Session-Name (z.B. "Alpha" oder AI-generierter Titel)
- Status-Icon:
  - Grüner Punkt = idle
  - Blauer Puls = läuft
  - Roter Punkt = Fehler
  - Gelber Punkt = gestoppt
- Modell-Label (z.B. "S4.6" für Sonnet 4.6, abgekürzt)
- Kosten-Anzeige (z.B. "$0.12")
- Nachrichten-Zähler (z.B. "5 Nachr.")
- Schließen-Button (X)

Styling:

- Aktiver Tab: hervorgehoben (heller Hintergrund, Unterstrich)
- Inaktiver Tab: dezent (dunkler)
- Laufender Tab: Subtile Puls-Animation am Rand
- Hover: Leichte Hervorhebung

### Aufgabe 4.3: Tab-Aktionen

**Neuen Tab erstellen:**

1. Session-Store: `createSession()` aufrufen
2. Automatisch zum neuen Tab wechseln
3. Eingabefeld fokussieren

**Tab wechseln:**

1. Draft der aktuellen Session speichern
2. `switchSession()` im Store
3. Nachrichten laden
4. Draft wiederherstellen
5. Scroll-Position wiederherstellen

**Tab schließen:**

1. Falls Session läuft → Bestätigung fragen ("Chat läuft noch, wirklich schließen?")
2. Session stoppen falls nötig
3. Session archivieren (nicht löschen)
4. Tab entfernen
5. Zum nächsten Tab wechseln

**Tab umbenennen:**

1. Doppelklick → Inline-Eingabefeld
2. Enter → Speichern
3. Escape → Abbrechen
4. Server-Update: `PUT /api/sessions/{id}`

### Aufgabe 4.4: Tab-Overflow Handling

Wenn mehr Tabs als Platz:

- Horizontaler Scroll mit Scrollbar (dezent)
- Aktiver Tab immer sichtbar (auto-scroll)
- Optional: Dropdown-Button "Alle Tabs" für schnellen Zugriff

### Aufgabe 4.5: Keyboard-Navigation

- `Ctrl+T`: Neuer Tab
- `Ctrl+W`: Tab schließen
- `Ctrl+Tab`: Nächster Tab
- `Ctrl+Shift+Tab`: Vorheriger Tab
- `Ctrl+1-9`: Tab 1-9 direkt

---

## Prüfpunkte

- [ ] Tab-Leiste wird angezeigt
- [ ] Neuer Tab erstellen funktioniert
- [ ] Tab-Wechsel funktioniert ohne Datenverlust
- [ ] Laufende Sessions zeigen Lade-Animation
- [ ] Tab schließen mit Bestätigung bei laufender Session
- [ ] Tab umbenennen per Doppelklick
- [ ] Keyboard-Shortcuts funktionieren
- [ ] Tab-Overflow mit Scroll
- [ ] Aktiver Tab visuell hervorgehoben

---

## Edge Cases

| Fall                             | Lösung                                      |
| -------------------------------- | ------------------------------------------- |
| Letzten Tab schließen            | Automatisch neuen leeren Tab erstellen      |
| 20+ Tabs offen                   | Horizontaler Scroll, Dropdown für Übersicht |
| Tab umbenennen mit leerem Namen  | Alten Namen behalten                        |
| Mehrere Tabs laufen gleichzeitig | Alle Status-Updates korrekt per WebSocket   |
| Browser-Tab Refresh              | Tabs aus Store wiederherstellen (persist)   |
