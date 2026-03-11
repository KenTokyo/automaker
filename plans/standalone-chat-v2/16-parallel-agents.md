# Phase 16: Parallele Agenten (Multi-Session)

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 7
**Geschätzte Tokens**: ~30.000

---

## Was ist das Problem?

Ein großer Vorteil der App soll paralleles Arbeiten sein.
Dafür müssen mehrere laufende Sessions stabil gleichzeitig funktionieren.

## Was soll passieren?

Mehrere Agenten dürfen parallel laufen, ohne dass Events durcheinandergehen.
Jede Session bleibt sauber getrennt.

## Wie der User die App danach erlebt

1. Zwei oder mehr Chats können gleichzeitig laufen.
2. Jeder Tab zeigt seinen eigenen Fortschritt.
3. Stoppen oder Senden wirkt nur im gewählten Tab.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei | Zweck |
|---|---|
| `hooks/use-parallel-session-routing.ts` | Event-Zuordnung je Session |
| `components/running-session-indicator.tsx` | Übersicht laufender Sessions |

### Geänderte Dateien

| Datei | Was ändern |
|---|---|
| `stores/session-store.ts` | Parallele Statusführung robust machen |
| `components/session-tab.tsx` | Laufstatus pro Tab klar zeigen |
| `components/chat-header.tsx` | Gesamtanzahl laufender Agenten zeigen |

---

## Aufgaben

### Aufgabe 16.1: Event-Routing pro Session

- Alle WebSocket-Events strikt nach Session-ID verteilen
- Keine Überschneidung zwischen Tabs
- Fehlende Session-ID abfangen und melden

### Aufgabe 16.2: Paralleler Laufstatus

- Jede Session kennt `running/idle/error/stopped`
- Globale Kennzahl „X Agenten aktiv“ im Header
- Laufende Tabs visuell hervorheben

### Aufgabe 16.3: Bedienregeln

- `Stop` wirkt nur auf aktive Session
- Senden in einem Tab blockiert nicht andere Tabs
- Warnung beim Schließen einer laufenden Session

### Aufgabe 16.4: Ressourcen-Regeln

- Maximale Zahl paralleler Läufe definieren (z.B. 3)
- Bei Limit: klare Meldung statt stiller Fehler
- Warteschlange optional für weitere Starts

### Aufgabe 16.5: Stabilität

- Wiederverbinden nach Verbindungsabbruch
- Laufstatus nach Reconnect neu synchronisieren
- Keine doppelten Nachrichten bei Wiederanbindung

---

## Prüfpunkte

- [ ] Zwei parallele Chats laufen ohne Datenmix
- [ ] Tab-Status passt zu echten Laufzuständen
- [ ] Stop wirkt nur im richtigen Tab
- [ ] Reconnect stellt Zustände sauber wieder her
- [ ] Limit für parallele Läufe greift verständlich

---

## Edge Cases

| Fall | Lösung |
|---|---|
| Session wird während Lauf gelöscht | Vorher Stop + sichere Bereinigung |
| Netzwerk kurz weg | Reconnect und Zustand neu laden |
| Zwei schnelle Stop-Klicks | Idempotente Stop-Logik |
| Parallel laufende Fehler | Fehler je Session getrennt anzeigen |
