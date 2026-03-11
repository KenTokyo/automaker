# Phase 11: Sound- und Benachrichtigungssystem

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 5
**Geschätzte Tokens**: ~30.000

---

## Was ist das Problem?

Bei langen Aufgaben fehlt akustisches Feedback.
Der User merkt oft zu spät, dass ein Task oder eine Phase fertig ist.

## Was soll passieren?

Ein leichtes Sound-System mit klaren Ereignissen:
Start, Erfolg, Fehler, Orchestrator-Phasenwechsel.

## Wie der User die App danach erlebt

1. Bei Abschluss einer Antwort gibt es einen kurzen Ton.
2. Bei Fehlern klingt es anders.
3. Bei Orchestrator-Phasen gibt es eigene Signale.
4. In ruhigen Umgebungen kann alles stumm geschaltet werden.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei | Zweck |
|---|---|
| `services/sound-service.ts` | Zentrale Ton-Steuerung |
| `hooks/use-sound-events.ts` | Verknüpft Chat-Events mit Sounds |
| `assets/sounds/` | Kurze Tondateien für Ereignisse |

### Geänderte Dateien

| Datei | Was ändern |
|---|---|
| `components/chat-view.tsx` | Sound-Hook einbinden |
| `stores/session-store.ts` | Sound-relevante Statusänderungen markieren |

---

## Aufgaben

### Aufgabe 11.1: Sound-Service

- Laden und Abspielen vordefinierter Sounds
- Lautstärke global steuerbar
- Schutz gegen mehrfaches gleichzeitiges Abspielen

### Aufgabe 11.2: Event-Zuordnung

- `agent_complete` → Erfolgston
- `agent_error` → Fehlerton
- `phase_complete` → kurzer Phasen-Ton
- `task_complete` → dezenter Bestätigungston

### Aufgabe 11.3: Browser + Electron Verhalten

- Im Browser auf Autoplay-Regeln achten
- In Electron direkten Zugriff auf lokale Sounds sicherstellen
- Fallback ohne Fehler, falls Sound nicht verfügbar

### Aufgabe 11.4: Stummschaltung

- Globaler Mute-Schalter
- Optional „Nur Fehler-Sounds“ Modus
- Einstellung pro Nutzer speichern

### Aufgabe 11.5: Sound-Qualität

- Kurze, unaufdringliche Sounds
- Maximale Länge z.B. 400–900 ms
- Einheitliche Lautstärke normalisieren

---

## Prüfpunkte

- [x] Erfolgston bei vollständiger Antwort
- [x] Fehlerton bei Fehlern
- [x] Kein Ton bei aktivem Mute
- [x] Sounds laufen in Browser und Electron
- [x] Mehrere schnelle Events überlagern nicht chaotisch

---

## Umsetzung (2026-03-10)

- `sound-service.ts` nutzt die Web Audio API mit kurzen Synthese-Tönen (kein externes Sound-Asset nötig).
- `use-sound-events.ts` reagiert auf Chat-Statuswechsel und spielt Erfolgs- oder Fehlerton.
- `use-chat-sound-effects.ts` erkennt Orchestrator-Phasenwechsel (`NEXT_PHASE_READY`, `ALL_PHASES_COMPLETE`) und spielt einen Phasen-Ton.
- Cooldown pro Event-Typ verhindert Ton-Spam bei schnellen Eventfolgen.
- Die Logik läuft ohne Fehler, auch wenn Audio auf dem Gerät nicht verfügbar ist (stiller Fallback).

---

## Edge Cases

| Fall | Lösung |
|---|---|
| Audio-Ausgabe blockiert | Leiser visueller Hinweis als Ersatz |
| Sehr viele Events in kurzer Zeit | Cooldown pro Sound-Typ |
| Datei fehlt | Fallback-Sound oder stilles Ignorieren |
| Nutzer mit Headset-Wechsel | Bei Fehler automatisch neu initialisieren |
