# Browser Panel - Globale Planung (Master Plan)

ULTRATHINK

## Feature-Beschreibung

Ein integrierter Browser-Panel (Preview-Ansicht) in der Agent-View, der rechts neben dem Chat-Bereich erscheint. Jedes Projekt hat seinen eigenen Browser-Tab mit persistiertem Port/URL. Der Browser zeigt die lokale Entwicklungs-Vorschau (z.B. `localhost:3000`) und ist resizable.

## Layout-Vision

```
┌──────────┬─────────────────────────┬──────────────────────┐
│ Sessions │      Chat Area          │    Browser Panel     │
│ Sidebar  │  (Header + Messages     │  (URL Bar + iframe/  │
│          │   + Input Area)         │   webview Content)   │
│  15-40%  │       auto              │      20-50%          │
└──────────┴─────────────────────────┴──────────────────────┘
```

## Architektur-Entscheidung: iframe vs. webview

**Gewählt: iframe** (mit Option auf webview-Upgrade)

Begründung:

- `webviewTag` ist aktuell NICHT aktiviert in der Electron-Konfiguration
- iframe funktioniert sowohl in Web-Mode als auch Electron
- Für localhost-Previews (Vite/Next.js dev server) reicht ein iframe
- Kein CSP-Header blockiert iframes aktuell
- webview wäre nur nötig für externe Websites mit X-Frame-Options
- Späterer Upgrade auf webview möglich (Phase 2 bereitet das vor)

---

## Phasen-Übersicht

| #   | Phase                                    | Datei                                                                    | Status  | Chat   | ~Tokens |
| --- | ---------------------------------------- | ------------------------------------------------------------------------ | ------- | ------ | ------- |
| 1   | Store & TypeScript Types                 | [phase-1-store-types.md](./phase-1-store-types.md)                       | ✅      | CHAT 1 | ~20k    |
| 2   | Electron webview Vorbereitung (optional) | [phase-2-webview-prep.md](./phase-2-webview-prep.md)                     | ⏭️ SKIP | CHAT 1 | ~15k    |
| 3   | BrowserPanel Komponente                  | [phase-3-browser-panel.md](./phase-3-browser-panel.md)                   | ✅      | CHAT 2 | ~40k    |
| 4   | AgentView ResizablePanel Integration     | [phase-4-agent-view-integration.md](./phase-4-agent-view-integration.md) | ✅      | CHAT 2 | ~30k    |
| 5   | Tab-Management & Persistenz              | [phase-5-tabs-persistence.md](./phase-5-tabs-persistence.md)             | ✅      | CHAT 3 | ~35k    |
| 6   | Navigation, Refresh & DevTools           | [phase-6-navigation-devtools.md](./phase-6-navigation-devtools.md)       | ✅      | CHAT 3 | ~25k    |
| 7   | Header Toggle & Responsive Design        | [phase-7-header-responsive.md](./phase-7-header-responsive.md)           | ✅      | CHAT 4 | ~25k    |

---

## Chat-Aufteilung

### CHAT 1 (~35k Tokens)

- Phase 1: Store-Felder + Types hinzufügen
- Phase 2: Electron webview-Tag aktivieren (optional, Vorbereitung)

### CHAT 2 (~70k Tokens)

- Phase 3: BrowserPanel-Komponente bauen (URL-Bar, iframe, Loading/Error States)
- Phase 4: In AgentView als drittes ResizablePanel einbinden

### CHAT 3 (~60k Tokens)

- Phase 5: Multi-Tab-Support pro Projekt, Persistenz, Port-Eingabe
- Phase 6: Navigation-Buttons (Back/Forward/Refresh), DevTools-Öffnung

### CHAT 4 (~25k Tokens)

- Phase 7: Toggle-Button im AgentHeader, Mobile-Handling, Responsive

---

## Referenz-Dateien

| Datei                                                               | Zweck                                 |
| ------------------------------------------------------------------- | ------------------------------------- |
| `apps/ui/src/components/views/agent-view.tsx`                       | Hauptkomponente, ResizablePanelGroup  |
| `apps/ui/src/store/app-store.ts`                                    | Zustand Store, Per-Projekt-Persistenz |
| `apps/ui/src/components/session-manager.tsx`                        | Sidebar-Referenz für Tab-Pattern      |
| `apps/ui/src/components/views/agent-view/components/docs-panel.tsx` | Panel-Referenz                        |
| `apps/ui/src/components/ui/resizable.tsx`                           | ResizablePanel-Wrapper                |
| `apps/ui/src/main.ts`                                               | Electron BrowserWindow Config         |
| `apps/ui/src/preload.ts`                                            | Electron Preload APIs                 |

---

## Kontext für jeden Chat

Jeder Chat bekommt:

1. Diese `plan.md` als Einstiegspunkt
2. Die relevanten Phase-Dateien
3. Optional `temp.md` für Chat-übergreifenden Kontext

---

## Verlauf

| Datum      | Chat             | Aktion                                      |
| ---------- | ---------------- | ------------------------------------------- |
| 2026-02-14 | CHAT 0 (Planung) | Globale Planung + 7 Phasen-Dateien erstellt |
