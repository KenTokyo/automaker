# Phase 5: Chat-Nachrichtenbereich Überarbeitung

ULTRATHINK

**Status**: ⬜ OFFEN
**Chat**: 2
**Geschätzte Tokens**: ~40.000

---

## Was ist das Problem?

Der aktuelle Nachrichtenbereich nutzt den AgentView, der für das Kanban-Board gedacht ist.
Für einen reinen Chat brauchen wir:

- Bessere Nachrichtenanzeige (mit Zeitstempeln, Provider-Info)
- Tool-Call Gruppen (aufklappbar)
- Thinking-Blöcke (mit Timer)
- Kontext-Leiste (AI-Titel)
- Besseres Scroll-Verhalten

## Was soll passieren?

Ein eigener Chat-Nachrichtenbereich, der die besten Teile aus AgentView übernimmt
und die UI-Muster der UniAI Extension nachbaut.

## Wie der User die App danach erlebt

1. Nachrichten sehen professionell aus (wie eine moderne Chat-App)
2. Zeitstempel bei jeder Nachricht
3. Tool-Aufrufe sind aufklappbar (nicht im Weg)
4. Thinking-Phasen zeigen einen Timer
5. Am oberen Rand: AI-generierter Chat-Titel
6. Smooth Scrolling, "nach unten" Button

---

## Betroffene Dateien

### Neue Dateien (apps/chat/src/)

| Datei                                | Zweck                                  |
| ------------------------------------ | -------------------------------------- |
| `components/chat-messages.tsx`       | Nachrichten-Container mit Scroll-Logik |
| `components/message-bubble.tsx`      | Einzelne Nachricht (User/Assistant)    |
| `components/message-tool-use.tsx`    | Tool-Aufruf Anzeige (aufklappbar)      |
| `components/message-tool-result.tsx` | Tool-Ergebnis Anzeige                  |
| `components/message-thinking.tsx`    | Thinking-Block mit Timer               |
| `components/message-error.tsx`       | Fehlernachricht                        |
| `components/message-system.tsx`      | System-Nachricht                       |
| `components/chat-context-bar.tsx`    | AI-generierter Titel oben              |
| `components/scroll-to-bottom.tsx`    | "Nach unten" Button                    |

---

## Aufgaben

### Aufgabe 5.1: Nachrichten-Container (`chat-messages.tsx`)

Verantwortlichkeiten:

- Nachrichten aus aktiver Session anzeigen
- Auto-Scroll bei neuen Nachrichten (nur wenn User am Ende ist)
- "Scroll nach unten" Button wenn nicht am Ende
- Leerer Zustand: Willkommensnachricht oder Logo
- Ladezustand: Skeleton-Loader beim Laden alter Nachrichten

Scroll-Logik:

- `useRef` für Container-Element
- `IntersectionObserver` oder Scroll-Event für "am Ende" Erkennung
- Smooth-Scroll Animation für "nach unten" Button
- Position merken bei Session-Wechsel

### Aufgabe 5.2: Nachricht-Komponente (`message-bubble.tsx`)

**User-Nachricht:**

- Rechts oder links ausgerichtet (konfigurierbar, Standard: links mit Label)
- Hintergrund: Leicht abgesetzter Farbton
- Inhalt: Markdown-gerendert
- Zeitstempel: Dezent unter der Nachricht
- Bilder: Inline-Vorschau (falls angehängt)
- Kopier-Button: Erscheint bei Hover

**Assistant-Nachricht:**

- Links ausgerichtet
- Hintergrund: Anderer Farbton als User
- Inhalt: Markdown-gerendert (mit Syntax-Highlighting für Code)
- Zeitstempel: Dezent unter der Nachricht
- Provider + Modell Label (z.B. "Claude Sonnet 4.6")
- Kopier-Button bei Hover
- "Erneut senden" Button bei Hover (optional)

**Gemeinsam:**

- Markdown wird mit `react-markdown` gerendert
- Code-Blöcke mit Syntax-Highlighting und Kopier-Button
- Links als klickbare Links (extern öffnen)
- Bilder inline anzeigen
- Tabellen korrekt darstellen

### Aufgabe 5.3: Tool-Aufruf Anzeige (`message-tool-use.tsx`)

Layout:

- Kompakter Block zwischen Nachrichten
- Aufklappbar (Standard: eingeklappt)
- Zeigt: Tool-Name + kurze Beschreibung
- Icon je nach Tool-Typ (Datei, Terminal, Suche, etc.)

Aufgeklappt:

- Input-Parameter des Tools (JSON formatiert oder lesbar)
- Dauer des Aufrufs

Gruppierung:

- Mehrere Tool-Aufrufe hintereinander → als Gruppe anzeigen
- "3 Tool-Aufrufe" → Klick → Alle anzeigen

### Aufgabe 5.4: Tool-Ergebnis (`message-tool-result.tsx`)

- Direkt unter dem Tool-Aufruf
- Zeigt Ergebnis (Text, Dateiinhalt, etc.)
- Bei langen Ergebnissen: Abschneiden mit "Mehr anzeigen"
- Erfolgs-/Fehler-Indikator (grün/rot)

### Aufgabe 5.5: Thinking-Block (`message-thinking.tsx`)

- Aufklappbarer Block
- Header: "Denkt nach... (12s)" mit laufendem Timer
- Inhalt (aufgeklappt): Thinking-Text
- Standard: Eingeklappt (nur Timer sichtbar)
- Animation: Dezenter Puls während des Denkens
- Wenn fertig: Timer stoppt, zeigt Gesamtdauer

### Aufgabe 5.6: Kontext-Leiste (`chat-context-bar.tsx`)

- Schmale Leiste oberhalb der Nachrichten
- Zeigt AI-generierten Chat-Titel
- Shimmer-Animation während der Generierung
- Dezenter Hintergrund
- Kann ausgeblendet werden

### Aufgabe 5.7: Scroll-nach-unten Button (`scroll-to-bottom.tsx`)

- Schwebt unten rechts über den Nachrichten
- Zeigt Pfeil nach unten
- Optional: Anzahl neuer Nachrichten als Badge
- Verschwindet wenn am Ende
- Smooth-Scroll Animation beim Klick

### Aufgabe 5.8: Leerer Zustand

Wenn keine Nachrichten:

- Zentriertes Logo
- "Wie kann ich dir helfen?" Text
- Optional: Schnellstart-Vorschläge (z.B. "Erkläre dieses Projekt", "Finde einen Bug")

---

## Prüfpunkte

- [ ] Nachrichten werden korrekt angezeigt (User + Assistant)
- [ ] Markdown-Rendering funktioniert (Code, Tabellen, Links, Bilder)
- [ ] Tool-Aufrufe sind aufklappbar
- [ ] Thinking-Blöcke zeigen Timer
- [ ] Auto-Scroll bei neuen Nachrichten
- [ ] "Nach unten" Button erscheint/verschwindet korrekt
- [ ] Kontext-Leiste zeigt AI-Titel
- [ ] Leerer Zustand sieht gut aus
- [ ] Kopier-Buttons funktionieren
- [ ] Zeitstempel bei jeder Nachricht

---

## Edge Cases

| Fall                                   | Lösung                                                 |
| -------------------------------------- | ------------------------------------------------------ |
| Sehr lange Nachricht (10.000+ Zeichen) | Virtualisierung oder Abschneiden mit "Mehr anzeigen"   |
| 500+ Nachrichten in einer Session      | Virtualisierte Liste (nur sichtbare rendern)           |
| Nachricht während Scroll               | Auto-Scroll nur wenn am Ende, sonst "nach unten" Badge |
| Code-Block mit 1000+ Zeilen            | Maximalhöhe mit Scroll, "Code kopieren" Button         |
| Bilder in Nachrichten                  | Lazy Loading, Thumbnail-Vorschau                       |
| Streaming (teilweise Nachricht)        | Nachricht wächst live mit, Cursor-Animation            |
