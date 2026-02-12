# 📋 Planung 2: Session-Projekt-Zuordnung & Anzeige

> **ULTRATHINK** - Detaillierte Planung für Session-Projekt-Zuordnung und visuelle Darstellung

**Status:** 🟡 Geplant
**Referenz:** `docs/project-switcher/MASTER-ORCHESTRATOR.md`
**Implementierung:** CHAT 3

---

## 🎯 Ziel & Strategie

Der User sieht aktuell in der Session-Liste (Chat-Historie) **nicht**, zu welchem Projekt ein Chat gehört. Das soll sich ändern:

1. **Visuell:** Neben dem Datum in jeder Session-Card soll der **Projektname** angezeigt werden
2. **Daten:** Das Backend liefert bereits `projectPath` mit jedem Session-Item - muss nur im Frontend genutzt werden
3. **Mapping:** `projectPath` → `projectName` über den Zustand Store (`projects[]` Array)

**Kernproblem:** Die Session-API liefert `projectPath`, aber das Frontend zeigt es nicht an. Es gibt keine visuelle Zuordnung zwischen Session und Projekt.

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ Was passiert, wenn ein Session-`projectPath` keinem bekannten Projekt zugeordnet werden kann?

→ Fallback: Letzter Ordnername aus dem Pfad extrahieren (`D:\Projects\myapp` → `myapp`). Zusätzlich Badge "Unbekanntes Projekt" in grauer Farbe.

### ✅ Was passiert, wenn mehrere Projekte denselben Namen haben?

→ Der Pfad wird als Tooltip bei Hover angezeigt. Der Projektname im Badge reicht für die meisten Fälle.

### ✅ Was passiert bei Sessions die vor der Projekt-Zuordnung erstellt wurden?

→ Sessions ohne `projectPath` bekommen kein Projekt-Badge. Sie werden unter "Ohne Projekt" gruppiert, falls gefiltert wird.

### ✅ Werden gelöschte/trashed Projekte noch angezeigt?

→ Ja, Sessions behalten ihren `projectPath`. Wenn das Projekt im Trash ist, wird der Name trotzdem angezeigt (ggf. mit dezenter Markierung).

### ✅ Was passiert bei sehr langen Projektnamen?

→ Truncation mit `...` nach 15 Zeichen. Voller Name im Tooltip.

### ✅ Performance: 100+ Sessions mit Projekt-Lookup?

→ Einmal ein Map `projectPath → projectName` aus dem Store erzeugen (`useMemo`). Lookup ist O(1).

---

## ⚡ Performance-Optimierung

- **Projekt-Lookup-Map:** `useMemo(() => new Map(projects.map(p => [p.path, p.name])))` - einmalig berechnet
- **Kein zusätzlicher API-Call:** `projectPath` wird bereits von der Session-API geliefert
- **Memoization:** Session-Cards werden mit `React.memo` gewrapped (falls nicht schon), da nur Datum/Projekt-Badge sich ändern

---

## 🔄 Code-Wiederverwendung

### Bestehende Komponenten:

- `apps/ui/src/components/session-manager.tsx` → Session-Liste, Card-Rendering (wird angepasst)
- `apps/ui/src/store/app-store.ts` → `projects[]` Array für Name-Lookup
- `apps/ui/src/components/ui/card.tsx` → Card-Primitives (CardContent, etc.)

### Bestehende API:

- `GET /api/sessions` → liefert bereits `projectPath` pro Session
- `SessionListItem` Type hat bereits `projectPath` (implizit über `AgentSession`)

---

## 🧩 Komponenten & Implementierung

### Phase 2.1: Session-Card Projekt-Badge

#### 2.1.1 `ProjectBadge` (`apps/ui/src/components/session-manager/project-badge.tsx`) **~60-80 Zeilen**

- **Zweck:** Kleines Badge/Tag das den Projektnamen neben dem Datum anzeigt
- **Props:** `projectPath: string | undefined`, `projects: ProjectRef[]`
- **Anzeige:**
  - Projektname (aus Lookup Map)
  - Projekt-Icon (klein, 14px)
  - Hintergrundfarbe basierend auf Projekt-Theme (optional, dezent)
  - Tooltip mit vollem Pfad bei Hover
- **Fallback:** Wenn `projectPath` nicht in `projects[]` → letzter Ordnername aus Pfad
- **Wenn kein `projectPath`:** Kein Badge anzeigen

#### 2.1.2 Anpassung `SessionManager` (`apps/ui/src/components/session-manager.tsx`) **~30-50 Zeilen Änderung**

- **Zweck:** ProjectBadge in jede Session-Card einbauen
- **Änderungen:**
  - Import ProjectBadge
  - `projects` aus app-store beziehen
  - Projekt-Lookup-Map mit `useMemo` erstellen
  - In der Session-Card neben dem Datum das `ProjectBadge` rendern
  - Position: Rechts neben dem Datum oder darunter als kleines Tag

**Phase 2.1 Gesamt: ~90-130 Zeilen | 1 neue Datei + 1 geänderte Datei**

---

### Phase 2.2: Session-Card Layout-Anpassung

#### 2.2.1 Anpassung Session-Card Layout **~20-40 Zeilen Änderung**

- **Datei:** `apps/ui/src/components/session-manager.tsx`
- **Zweck:** Platz schaffen für das Projekt-Badge
- **Aktuelles Layout:** `[Name] [Preview] [Datum] [Actions]`
- **Neues Layout:** `[Name] [Preview] [Projekt-Badge | Datum] [Actions]`
- **Details:**
  - Projekt-Badge und Datum in einer Zeile, mit `flex` und `gap-2`
  - Badge links, Datum rechts (oder umgekehrt - je nach Platz)
  - Auf schmalen Screens: Badge unter dem Datum
- **Responsive:** Bei < 300px Breite wird Badge ausgeblendet

#### 2.2.2 `useProjectLookup` Hook (`apps/ui/src/hooks/use-project-lookup.ts`) **~30-40 Zeilen**

- **Zweck:** Wiederverwendbarer Hook für Projekt-Name-Lookup
- **Returns:** `getProjectName(projectPath: string): string`
- **Logik:**
  - Holt `projects` aus app-store
  - Erstellt Lookup-Map mit `useMemo`
  - Fallback: Letzter Ordnername aus Pfad
- **Wiederverwendbarkeit:** Wird auch in Planung 3 (Filter) und Planung 4 (Integration) genutzt

**Phase 2.2 Gesamt: ~50-80 Zeilen | 1 neue Datei + 1 geänderte Datei**

---

### Phase 2.3: Types Erweitern (falls nötig)

#### 2.3.1 Prüfung `SessionListItem` Type **~5-10 Zeilen Änderung (falls nötig)**

- **Datei:** `libs/types/src/session.ts`
- **Prüfung:** Hat `SessionListItem` bereits `projectPath`?
  - **Wenn ja:** ✅ Keine Änderung nötig
  - **Wenn nein:** `projectPath?: string` hinzufügen
- **Backend-Prüfung:** Die Session-API Route (`routes/sessions/routes/index.ts`) liefert bereits `projectPath` → ✅ Daten sind vorhanden

#### 2.3.2 Prüfung Server-Response **~0-10 Zeilen Änderung**

- **Datei:** `apps/server/src/routes/sessions/routes/index.ts`
- **Prüfung:** Wird `projectPath` in der Session-Liste zurückgegeben?
  - Aus der Codebase-Analyse: `projectPath: s.projectPath || s.workingDirectory` → ✅ Ja
- **Falls nicht vorhanden:** Hinzufügen in der Response-Map

**Phase 2.3 Gesamt: ~5-20 Zeilen | 0-2 Dateien**

---

## 📊 Zusammenfassung

| Phase      | Beschreibung                   | Neue Dateien | Geänderte Dateien | Zeilen (ca.) |
| ---------- | ------------------------------ | ------------ | ----------------- | ------------ |
| 2.1        | Session-Card Projekt-Badge     | 1            | 1                 | ~90-130      |
| 2.2        | Layout-Anpassung + Lookup Hook | 1            | 1                 | ~50-80       |
| 2.3        | Types erweitern (Prüfung)      | 0            | 0-2               | ~5-20        |
| **Gesamt** |                                | **2**        | **2-4**           | **~145-230** |

---

## 🗓️ Chat-Zuordnung

### CHAT 3: Implementierung Planung 2

**Phasen in diesem Chat:**

- Phase 2.1: Session-Card Projekt-Badge (~90-130 Zeilen)
- Phase 2.2: Layout-Anpassung + Lookup Hook (~50-80 Zeilen)
- Phase 2.3: Types erweitern (~5-20 Zeilen)

**Geschätzte Tokens:** ~70.000-90.000

- Codebase-Lesen & Kontext: ~25.000
- Implementierung (3 Phasen): ~30.000-40.000
- Validierung & Fixes: ~15.000-25.000

**Mitzugeben:**

- `docs/project-switcher/MASTER-ORCHESTRATOR.md`
- `docs/project-switcher/tasks/02-session-project-association.md` (diese Datei)

---

## ✅ Abnahme-Kriterien

- [ ] Jede Session-Card zeigt den Projektnamen als Badge an
- [ ] Badge zeigt Projekt-Icon (klein) + Name
- [ ] Tooltip bei Hover zeigt den vollen Pfad
- [ ] Fallback für unbekannte Projekte (Ordnername aus Pfad)
- [ ] Sessions ohne Projekt zeigen kein Badge
- [ ] Performance: Kein Flackern bei 100+ Sessions
- [ ] Responsive: Badge passt sich an schmale Screens an
- [ ] `useProjectLookup` Hook ist wiederverwendbar
- [ ] TypeScript: `npx tsc --noEmit` → 0 Fehler
