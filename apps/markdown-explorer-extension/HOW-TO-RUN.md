# UniAI Chat - Startanleitung

> **Hinweis: Legacy-Übergang**
>
> Diese App (`apps/chat`) ist nicht mehr der Hauptweg.
> Der Automaker-Chat (`apps/ui`) ist jetzt die zentrale Oberfläche.
> Diese App bleibt vorerst als Übergangs-Quelle erhalten, wird aber nicht mehr aktiv weiterentwickelt.
> Neue Features sollen in `apps/ui` gebaut werden.
>
> Siehe: `plans/automaker-chat-unification/legacy-audit.md`

## Voraussetzung

Immer zuerst in den Projekt-Root wechseln:

```bash
cd "d:\CODING\React Projects\uniai-chat\automaker"
```

Alle Befehle werden von HIER aus ausgefuehrt. Nicht in apps/chat/ wechseln!

---

## Entwicklung (taeglicher Workflow)

### Browser mit Live Reload (EMPFOHLEN)

```bash
npm run dev:chat
```

- Startet Server + Chat-Frontend gleichzeitig
- Browser oeffnen: http://localhost:3009
- Jede Code-Aenderung wird sofort sichtbar (HMR)
- Beenden: Ctrl+C

### Desktop-Fenster (Electron)

```bash
npm run dev:electron:chat
```

- Startet Electron-Fenster + eigenen Backend-Server
- Alles in einem Befehl
- Beenden: Fenster schliessen oder Ctrl+C

### Desktop mit DevTools offen

```bash
npm run dev:electron:chat:debug
```

---

## Wie funktioniert Live Reload?

### Browser-Modus (npm run dev:chat)

- Volle HMR (Hot Module Replacement)
- Jede Aenderung an React-Komponenten wird sofort sichtbar
- Kein Neuladen noetig

### Electron-Modus (npm run dev:electron:chat)

Electron hat zwei Prozesse mit unterschiedlichem Verhalten:

1. **React UI (Renderer)** - Hat HMR! Aenderungen an React-Komponenten
   werden sofort im Electron-Fenster sichtbar, genau wie im Browser.

2. **Electron Main Process** (src/electron/) - Kein HMR, aber
   vite-plugin-electron ueberwacht die Dateien und startet Electron
   automatisch neu wenn sich etwas aendert.

Du musst also NICHTS manuell neu starten. Einmal ausfuehren und laufen lassen.

---

## Interaktiver Launcher (Alternative)

```bash
./start-automaker.sh
```

Zeigt ein Menu mit allen Optionen:

- [5] Chat Web (= npm run dev:chat)
- [6] Chat Desktop (= npm run dev:electron:chat)

---

## Production

```bash
npm run start:chat              # Web: Build + Server + Preview
npm run build:electron:chat     # Desktop: Installer bauen
```

---

## TypeScript pruefen (ohne Build)

```bash
npm run typecheck:chat
```

---

## Erstmalig / Nach neuen Dependencies

Wenn du den Fehler "Cannot find module dist-electron/main.js" siehst:

```bash
npm install
```

Danach nochmal den gewuenschten dev-Befehl starten.

## Probleme?

Falls nach npm install oder Package-Aenderungen etwas nicht funktioniert:

```bash
npm run build:packages
```

Die dev-Befehle machen das automatisch, aber manchmal hilft es manuell.
