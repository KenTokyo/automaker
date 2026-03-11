# Phase 14: Thinking-Blöcke

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 6
**Geschätzte Tokens**: ~35.000

---

## Was ist das Problem?

Längere Denkphasen wirken sonst wie „nichts passiert“.
Der User braucht klares Feedback über den aktuellen Stand.

## Was soll passieren?

Thinking-Blöcke mit Timer, Status und optionalen Details.
Standardmäßig kompakt, bei Bedarf aufklappbar.

## Wie der User die App danach erlebt

1. Während des Denkens sieht man einen laufenden Timer.
2. Die Antwort fühlt sich lebendig an statt „eingefroren“.
3. Nach Abschluss sieht man die Gesamtdauer.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei | Zweck |
|---|---|
| `components/thinking-block.tsx` | Visualisierung der Denkphase |
| `components/thinking-timer.tsx` | Laufender Zeitmesser |
| `hooks/use-thinking-state.ts` | Mapping von Streaming-Events |

### Geänderte Dateien

| Datei | Was ändern |
|---|---|
| `components/chat-messages.tsx` | Thinking-Blöcke in den Fluss setzen |
| `stores/session-store.ts` | Thinking-Status pro Session führen |

---

## Aufgaben

### Aufgabe 14.1: Thinking-Zustände

- Zustände `start`, `running`, `done`, `aborted`
- Pro Nachricht eindeutig zuordnen
- Dauer in Millisekunden speichern

### Aufgabe 14.2: Kompakter Block

- Kopfzeile mit Text wie „Denkt nach…“
- Laufender Timer rechts
- Statusfarbe je Zustand

### Aufgabe 14.3: Details aufklappen

- Optionaler Detailtext nur bei Klick
- Standard: eingeklappt für ruhiges Layout
- Merken, ob User zuletzt aufgeklappt hatte

### Aufgabe 14.4: Übergänge

- Sanftes Einblenden beim Start
- Ruhiger Abschlusszustand bei `done`
- Keine hektischen Animationen

### Aufgabe 14.5: Abbruch- und Fehlerfälle

- Bei Stop: „Denkphase gestoppt“ anzeigen
- Bei Fehler: klarer Hinweis mit kurzer Ursache

---

## Prüfpunkte

- [ ] Timer startet und stoppt korrekt
- [ ] Thinking-Block passt zur richtigen Nachricht
- [ ] Auf-/Zuklappen bleibt stabil
- [ ] Stop/Fehler sind klar sichtbar
- [ ] Mehrere parallele Thinking-Blöcke bleiben korrekt

---

## Edge Cases

| Fall | Lösung |
|---|---|
| Sehr lange Denkzeit | Timer im Minuten:Sekunden-Format |
| Sehr kurze Denkzeit | Mindestanzeige 1s für Klarheit |
| Event-Reihenfolge vertauscht | Robustes State-Mapping mit Fallback |
| Session-Wechsel während Thinking | Zustand pro Session getrennt halten |
