# Phase 1: Auto-Login (API-Key Pflicht entfernen)

ULTRATHINK

**Status**: ⬜ OFFEN
**Chat**: 1
**Geschätzte Tokens**: ~15.000

---

## Was ist das Problem?

Aktuell zeigt die Chat-App beim Start einen Login-Dialog (siehe Screenshot).
Der Nutzer muss einen API-Key eingeben, der im Server-Terminal angezeigt wird.
Das nervt und ist für eine Standalone-Chat-App unnötig.

## Was soll passieren?

Der Login-Dialog soll komplett verschwinden.
Die App soll direkt zum Chat durchstarten - ohne Key-Eingabe.

## Wie der User die App danach erlebt

1. App starten
2. Direkt im Chat landen (kein Zwischenschritt)
3. Falls kein Anthropic API Key gesetzt → Einstellungen öffnen sich automatisch

---

## Betroffene Dateien

### Frontend (apps/chat/)

| Datei                           | Was ändern                                         |
| ------------------------------- | -------------------------------------------------- |
| `src/app.tsx`                   | Auth-Flow vereinfachen: Login-Schritt überspringen |
| `src/components/login-form.tsx` | Kann entfernt oder als Fallback behalten werden    |

### Server (apps/server/)

| Datei             | Was ändern                                      |
| ----------------- | ----------------------------------------------- |
| `src/index.ts`    | Auto-Login Env-Variable prüfen                  |
| `src/lib/auth.ts` | `AUTOMAKER_AUTO_LOGIN` für Chat-Modus erzwingen |

### Electron (apps/chat/src/electron/)

| Datei                         | Was ändern                                                             |
| ----------------------------- | ---------------------------------------------------------------------- |
| `main-entry.ts`               | `AUTOMAKER_AUTO_LOGIN=true` als Env setzen                             |
| `security/api-key-manager.ts` | Weiterhin Key generieren (für Server-Auth), aber nicht dem User zeigen |

---

## Aufgaben

### Aufgabe 1.1: Server Auto-Login im Chat-Modus

- Wenn `AUTOMAKER_MODE=chat`, dann automatisch `AUTOMAKER_AUTO_LOGIN=true` setzen
- Der Server überspringt dann die Auth-Prüfung
- Alternativ: Session-Cookie automatisch setzen beim ersten Request

### Aufgabe 1.2: Frontend Auth-Flow vereinfachen

In `app.tsx`:

- `verifySession()` soll im Chat-Modus automatisch eine Session erstellen
- Falls der Server Auto-Login aktiv hat: Login-Schritt überspringen
- Direkt zu "Settings laden" → "Projekt öffnen" → "Chat" springen

### Aufgabe 1.3: Electron Auto-Login

- `main-entry.ts`: Env `AUTOMAKER_AUTO_LOGIN=true` beim Server-Start setzen
- Der generierte API-Key wird weiterhin im Hintergrund für die Server-Kommunikation genutzt
- Aber der User sieht keinen Login-Dialog mehr

### Aufgabe 1.4: Web-Modus Auto-Login

- Für `npm run dev:chat`: Env `AUTOMAKER_AUTO_LOGIN=true` in `.env.chat` setzen
- Server erkennt Chat-Modus und überspringt Auth
- Fallback: Falls Server nicht im Auto-Login → Login-Form zeigen (für Sicherheit)

### Aufgabe 1.5: API-Key Einstellung behalten

- Der Anthropic API Key (für Claude) wird weiterhin in den Einstellungen konfiguriert
- Falls kein Anthropic Key → Einstellungen-Panel öffnet sich automatisch
- Das ist NICHT der Server-Auth-Key (die sind getrennt)

---

## Prüfpunkte

- [ ] `npm run dev:chat` → Kein Login-Dialog, direkt im Chat
- [ ] `npm run dev:electron:chat` → Kein Login-Dialog
- [ ] Kein Anthropic Key → Einstellungen öffnen sich automatisch
- [ ] Server-Auth funktioniert weiterhin im Hintergrund
- [ ] Mehrere Browser-Tabs gleichzeitig funktionieren

---

## Risiken

| Risiko                   | Lösung                                           |
| ------------------------ | ------------------------------------------------ |
| Sicherheit bei Web-Modus | Auto-Login nur für localhost, nicht für Netzwerk |
| Mehrere Instanzen        | Jede Instanz bekommt eigene Session              |
