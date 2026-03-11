# Phase 1: Auto-Login (API-Key Pflicht entfernen)

ULTRATHINK

**Status**: ✅ ERLEDIGT  
**Chat**: 1  
**Geschätzte Tokens**: ~15.000

---

## Kurz-Ziel

Beim Start soll direkt der Chat sichtbar sein.  
Kein extra Login-Fenster für den internen Server-Key.

## Ergebnis

1. Chat startet jetzt direkt ohne normalen Login-Dialog.
2. Auto-Login ist im Chat-Modus standardmäßig aktiv (nur nicht in Produktion).
3. Falls Auto-Login bewusst deaktiviert wird, bleibt die Login-Form als Fallback.
4. Fehlt der Anthropic-Key, öffnet sich weiter der Einstellungsbereich.

---

## Konkret umgesetzt

### Frontend

| Datei                                | Umsetzung                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `apps/chat/src/app.tsx`              | Auth-Check läuft über `/api/auth/status`, dadurch kann der Server im Chat-Modus automatisch eine Session setzen. |
| `apps/ui/src/lib/http-api-client.ts` | `checkAuthStatus()` sendet jetzt auch Session-Token-Header als sicheren Fallback.                                |

### Server

| Datei                                  | Umsetzung                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/server/src/lib/auth.ts`          | Neue Logik `isAutoLoginEnabled()`: in Chat-Modus (nicht Produktion) standardmäßig aktiv, aber mit `AUTOMAKER_AUTO_LOGIN=false` abschaltbar. |
| `apps/server/src/routes/auth/index.ts` | `/api/auth/status` nutzt die neue Auto-Login-Logik zentral.                                                                                 |
| `apps/server/src/index.ts`             | Setzt `AUTOMAKER_AUTO_LOGIN=true`, wenn Chat-Modus aktiv und kein expliziter Wert gesetzt ist, plus klarer Startup-Log.                     |

### Electron

| Datei                                             | Umsetzung                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/chat/src/electron/main-entry.ts`            | Setzt `AUTOMAKER_AUTO_LOGIN=true` als Standard für den Chat-Start. |
| `apps/chat/src/electron/server/backend-server.ts` | Übergibt `AUTOMAKER_AUTO_LOGIN` beim Server-Spawn zuverlässig mit. |

---

## Prüfpunkte

- [x] Lokaler Chat-Start zeigt keinen Login-Dialog.
- [x] Electron-Chat-Start zeigt keinen Login-Dialog.
- [x] Ohne Anthropic-Key öffnet sich der Einstellungsbereich automatisch.
- [x] Interne Server-Absicherung bleibt aktiv.
- [x] Fallback bleibt erhalten, wenn Auto-Login deaktiviert ist.

## TypeScript-Check

- `npm run typecheck:chat` ✅
- `npx tsc --noEmit -p apps/server/tsconfig.json` ✅

## Definition von fertig

1. Login-Dialog ist im normalen Chat-Start nicht mehr sichtbar. ✅
2. Nutzer wird bei fehlendem Anthropic-Key klar in die Einstellungen geführt. ✅
3. Fallback bleibt vorhanden, falls Auto-Login deaktiviert ist. ✅
4. Phase 1 ist als Grundlage für Phase 2 nutzbar. ✅
