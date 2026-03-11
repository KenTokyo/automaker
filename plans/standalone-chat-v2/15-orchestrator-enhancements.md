# Phase 15: Orchestrator-Modus Verbesserungen

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 7
**Geschätzte Tokens**: ~30.000

---

## Was ist das Problem?

Der Orchestrator ist da, aber für den User oft schwer nachzuvollziehen.
Es fehlt eine klare Sicht auf Run-ID, Iteration und Phasenfortschritt.

## Was soll passieren?

Besseres Orchestrator-Erlebnis mit klarer Anzeige und Verlauf.
Orchestrator = unser Ablauf-Steuerer für mehrere KI-Schritte hintereinander.

## Wie der User die App danach erlebt

1. Oben sieht man den aktuellen Run und die Iteration.
2. Abgeschlossene Phasen werden sauber gruppiert.
3. Nächste Schritte sind sofort erkennbar.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei                                    | Zweck                          |
| ---------------------------------------- | ------------------------------ |
| `components/orchestrator-status-bar.tsx` | Run-ID, Iteration, Fortschritt |
| `components/orchestrator-phase-list.tsx` | Liste der Phasen im Run        |
| `components/orchestrator-phase-item.tsx` | Einzelne Phase mit Status      |

### Geänderte Dateien

| Datei                          | Was ändern                          |
| ------------------------------ | ----------------------------------- |
| `components/chat-header.tsx`   | Orchestrator-Status sichtbar machen |
| `stores/session-store.ts`      | Run-Metadaten erweitern             |
| `components/chat-messages.tsx` | Phasenereignisse gruppieren         |

---

## Aufgaben

### Aufgabe 15.1: Run-Metadaten

- Run-ID je Session speichern
- Iteration aktuell/gesamt speichern
- Aktive Phase und Fortschritt halten

### Aufgabe 15.2: Sichtbare Statusleiste

- Zeigt `Run-ID`, `Iteration`, `Aktive Phase`
- Kleine Fortschrittsleiste
- Klick öffnet Detailansicht

### Aufgabe 15.3: Phasenliste

- Jede Phase als Eintrag mit Zustand
- Zustände: `offen`, `läuft`, `fertig`, `fehler`
- Start-/Endzeit je Phase anzeigen

### Aufgabe 15.4: Chat-Gruppierung

- Nachrichten nach Phase gruppieren
- Klarer Trenner zwischen Phasen
- Bei Abschluss kurze Zusammenfassung je Phase

### Aufgabe 15.5: Fortsetzung nach Unterbrechung

- Bei Reload letzte bekannte Iteration wieder zeigen
- Bei fehlenden Daten sauberer Fallback („Status wird geladen…“)

---

## Prüfpunkte

- [ ] Run-ID und Iteration sind klar sichtbar
- [ ] Phasenfortschritt stimmt mit Events überein
- [ ] Gruppen im Chat sind logisch
- [ ] Reload zerstört den Lauf nicht
- [ ] Fehlerphasen werden klar markiert

---

## Edge Cases

| Fall                           | Lösung                                     |
| ------------------------------ | ------------------------------------------ |
| Iteration springt unerwartet   | Validierung gegen letzte bekannte Nummer   |
| Run endet ohne Abschluss-Event | Nach Timeout als „unvollständig“ markieren |
| Mehrere Runs in einer Session  | Nur aktiven Run prominent zeigen           |
| Fehlende Run-ID im Event       | Fallback auf Session-ID + Zeitstempel      |
