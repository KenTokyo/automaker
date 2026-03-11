# Phase 17: Tastenkürzel und UX-Feinschliff

ULTRATHINK

**Status**: ✅ ERLEDIGT
**Chat**: 8
**Geschätzte Tokens**: ~25.000

---

## Was ist das Problem?

Die Grundfunktionen sind da, aber Alltagstempo fehlt.
Tastenkürzel, Hinweise und kleine Details machen den Unterschied.

## Was soll passieren?

Ein runder Feinschliff für schnelle Bedienung und klare Orientierung.

## Wie der User die App danach erlebt

1. Wichtige Aktionen gehen per Tastatur.
2. Hinweise helfen ohne zu nerven.
3. Die App fühlt sich flüssig und „fertig“ an.

---

## Betroffene Dateien

### Neue Dateien (`apps/chat/src/`)

| Datei | Zweck |
|---|---|
| `hooks/use-chat-shortcuts.ts` | Globale Tastenkürzel |
| `components/shortcut-help-dialog.tsx` | Hilfeübersicht für Kürzel |
| `components/ux-hints.tsx` | Kleine kontextbezogene Hilfen |

### Geänderte Dateien

| Datei | Was ändern |
|---|---|
| `components/chat-header.tsx` | Hilfezugang für Kürzel |
| `components/chat-input.tsx` | Kürzel korrekt behandeln |
| `components/session-tab-bar.tsx` | Tab-Kürzel integrieren |

---

## Aufgaben

### Aufgabe 17.1: Tastenkürzel definieren

- `Ctrl+T` neuer Chat
- `Ctrl+W` Chat schließen
- `Ctrl+Tab` nächster Chat
- `Ctrl+Shift+Tab` vorheriger Chat
- `Ctrl+K` Fokus auf Suche
- `Ctrl+Enter` senden

### Aufgabe 17.2: Hilfe-Dialog

- Dialog „Tastenkürzel“ mit klarer Liste
- Öffnen mit `?` oder Menüpunkt
- Kurze Erklärtexte statt Fachwörter

### Aufgabe 17.3: Mikro-UX

- Ladezustände überall einheitlich
- Leere Zustände mit klaren Start-Hinweisen
- Erfolgs- und Fehlerhinweise kurz und verständlich

### Aufgabe 17.4: Fokus und Accessibility

- Sichtbarer Fokusrahmen
- Reihenfolge per Tab-Taste sinnvoll
- ARIA-Beschriftungen bei wichtigen Schaltern

### Aufgabe 17.5: Mobile/kleine Fenster

- Seitenleisten auf kleineren Breiten als Overlay
- Buttons mit genug Abstand für Touch
- Wichtige Aktionen immer erreichbar

---

## Prüfpunkte

- [ ] Alle Kern-Kürzel funktionieren
- [ ] Hilfe-Dialog ist vollständig und leicht lesbar
- [ ] Fokusführung ist logisch
- [ ] Hinweise sind klar und kurz
- [ ] Kleine Fenster bleiben gut nutzbar

---

## Edge Cases

| Fall | Lösung |
|---|---|
| Browser-Kürzel überschneiden sich | Alternative Kürzel bereitstellen |
| Eingabefeld hat Fokus | Nur passende Kürzel abfangen |
| Nicht deutsches Tastaturlayout | Kürzel robust auf Key-Codes prüfen |
| Sehr kleines Fenster | Kompakte Header-Aktionen verwenden |
