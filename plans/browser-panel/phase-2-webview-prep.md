# Phase 2: Electron webview Vorbereitung (Optional)

ULTRATHINK

## Status: ⬜ Offen

## Ziel

Den Electron Main-Prozess so vorbereiten, dass `<webview>` Tags in der Renderer-Seite genutzt werden können. Dies ist OPTIONAL und kann übersprungen werden, wenn iframe ausreicht.

**Entscheidung**: Wir starten mit iframe. Webview wird nur aktiviert, wenn iframe-Limitierungen auftreten (z.B. X-Frame-Options bei externen Sites).

---

## Aktueller Stand

### Electron Main Process (`apps/ui/src/main.ts`)

```
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
}
```

- `webviewTag` ist NICHT gesetzt → Default: false
- Kein CSP konfiguriert → iframes funktionieren für localhost

---

## Benötigte Änderungen (NUR wenn webview gewünscht)

### 1. `main.ts` - webviewTag aktivieren

**Was tun**: In der BrowserWindow-Konfiguration `webviewTag: true` hinzufügen.

```
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  webviewTag: true,          // NEU
}
```

### 2. Webview-Partitionen einrichten (Isolation)

**Was tun**: Jedes Projekt bekommt eine eigene Session-Partition, damit Cookies/Storage isoliert sind.

- Partition-Schema: `persist:browser-{projectId}`
- Ermöglicht isolierte Auth-Sessions pro Projekt

### 3. Webview Security Event Handler

**Was tun**: Im Main-Prozess Events registrieren, die die Webview-Nutzung absichern.

- `will-attach-webview`: Prüfen dass nur erlaubte URLs geladen werden
- Nur localhost/127.0.0.1 URLs erlauben (keine externen Sites)
- Node Integration in Webview DEAKTIVIEREN

### 4. Preload-API erweitern (optional)

**Was tun**: Eine API hinzufügen, damit der Renderer den Main-Prozess fragen kann, ob webview unterstützt wird.

```
isWebviewAvailable(): boolean
  - Gibt true zurück wenn webviewTag aktiv ist
  - Wird vom BrowserPanel genutzt um zwischen iframe/webview zu wählen
```

---

## Warum iframe zuerst?

| Aspekt                          | iframe | webview              |
| ------------------------------- | ------ | -------------------- |
| Web-Mode Kompatibilität         | ✅     | ❌ (nur Electron)    |
| Kein Electron-Konfig nötig      | ✅     | ❌                   |
| Localhost-Previews              | ✅     | ✅                   |
| Externe Sites (X-Frame-Options) | ❌     | ✅                   |
| DevTools                        | ❌     | ✅ (eigene DevTools) |
| Separate Session/Cookies        | ❌     | ✅ (Partitions)      |

Für den primären Use Case (localhost dev server preview) reicht iframe vollkommen.

---

## Implementierungs-Schritte

### Schritt 1: Skip oder Implement entscheiden

- Wenn nur localhost-Previews geplant: SKIP
- Wenn externe Sites nötig: Implement

### Schritt 2 (falls Implement):

- `main.ts` webviewTag aktivieren
- Security Handler registrieren
- Preload-API erweitern

---

## Abhängigkeiten

- Phase 1 (Store Types) sollte zuerst sein
- Phase 3 (BrowserPanel) nutzt die Entscheidung iframe/webview

---

## Risiken / Edge Cases

- webviewTag Sicherheitsrisiken: Muss korrekt abgesichert werden
- Electron-Version: webview-API kann sich zwischen Versionen ändern
- Web-Mode Fallback: Wenn Electron nicht verfügbar, muss iframe genutzt werden
