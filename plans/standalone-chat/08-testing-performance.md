# Phase 8: Testing & Performance

ULTRATHINK

**Status:** FERTIG
**Chat:** CHAT 4
**Geschätzte Tokens:** ~30.000
**Abhängigkeiten:** Phase 1-7
**Referenz:** [Globale Tasklist](./00-global-tasklist.md)

---

## Ziel

Sicherstellen, dass die Chat-App korrekt funktioniert, performant ist, und multiple Instanzen gleichzeitig betrieben werden können.

---

## Tasks

### Task 8.1: TypeScript-Fehler beheben

- `npm run typecheck --workspace=apps/chat`
- Alle Import-Pfade verifizieren
- Type-Kompatibilität zwischen `@ui/` Imports und Chat-App prüfen
- **KEIN npm run build oder npm run dev** - nur TypeScript-Checks

### Task 8.2: Smoke-Test Checkliste

Manueller Test-Flow:

1. ☐ Chat-App startet (Port 3009)
2. ☐ Login-Screen erscheint
3. ☐ Login mit API-Key funktioniert
4. ☐ Kein-Projekt-Zustand wird angezeigt (falls keine Projekte)
5. ☐ Projekt erstellen funktioniert
6. ☐ Auto-Open bei Neustart funktioniert
7. ☐ Projekt wechseln im Header funktioniert
8. ☐ Session erstellen funktioniert
9. ☐ Chat-Nachricht senden + Antwort empfangen
10. ☐ File-Attachment (Bild) funktioniert
11. ☐ Session wechseln funktioniert
12. ☐ Settings-Panel öffnet/schließt
13. ☐ Theme wechseln funktioniert
14. ☐ Model-Default ändern funktioniert
15. ☐ API-Key in Settings ändern funktioniert
16. ☐ BrowserPanel Toggle funktioniert
17. ☐ SessionManager Toggle funktioniert
18. ☐ Copy Chat funktioniert
19. ☐ Orchestrator-Modus funktioniert
20. ☐ Time-Limiter funktioniert

### Task 8.3: Bundle-Size Vergleich

- Automaker UI Build-Size messen (nur als Referenz, KEIN Build ausführen)
- Chat-App Build-Size messen nach `npm run build:chat`
- Erwartete Reduktion:
  - Kein TanStack Router (-~50KB)
  - Kein xterm.js (-~200KB)
  - Kein Tiptap (-~300KB)
  - Kein CodeMirror (-~400KB)
  - Kein dnd-kit (-~30KB)
  - Kein Board/Terminal/Spec Views
  - **Geschätzte Gesamt-Reduktion: ~50-60% kleiner**

### Task 8.4: Multi-Instanz-Test

- Szenario: Mehrere Browser-Tabs mit verschiedenen Projekten
  1. Tab 1: Projekt A Chat-Session
  2. Tab 2: Projekt B Chat-Session
  3. Tab 3: Automaker (Port 3007) mit Projekt C
- Prüfpunkte:
  - ☐ Sessions sind tab-spezifisch (kein Cross-Talk)
  - ☐ Settings-Änderungen propagieren zwischen Tabs
  - ☐ Server-Load bei 3+ gleichzeitigen Agents OK
  - ☐ WebSocket-Connections stabil

### Task 8.5: Memory-Profiling (Optional)

- Chrome DevTools Memory Snapshot:
  - Automaker UI: Baseline messen
  - Chat-App: Vergleich messen
- Erwartung: Chat-App nutzt weniger Memory (weniger DOM-Nodes, weniger Stores aktiv)

### Task 8.6: Startup-Performance

- Time to Interactive (TTI) messen:
  - Automaker UI: Baseline
  - Chat-App: Vergleich
- Erwartung: Chat-App deutlich schneller (weniger Routes, weniger Components)

---

## Verifikation

- [ ] Keine TypeScript-Fehler
- [ ] Alle Smoke-Test Punkte bestanden
- [ ] Bundle-Size mindestens 40% kleiner als Automaker UI
- [ ] Multi-Instanz funktioniert stabil
- [ ] Kein Regression in Automaker UI (bestehende Tests laufen durch)

---

## Known Limitations (v1)

1. **Kein Electron:** Chat-App ist nur Web-basiert (kein Desktop-App)
2. **Kein Terminal:** Terminal-Zugriff nur über Automaker
3. **Kein Kanban-Board:** Feature-Management nur über Automaker
4. **Kein Spec-Editor:** App-Spezifikation nur über Automaker
5. **Kein GitHub-Integration:** Issues/PRs nur über Automaker
6. **Kein Offline-Mode:** Braucht laufenden Server
