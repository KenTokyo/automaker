# Feature 6: ProjectBadge vollständiges Styling

**ULTRATHINK**

> Zugehörig zu: [00-master-plan.md](./00-master-plan.md)
> Chat: CHAT 3
> Status: OFFEN

---

## Ziel

Die `ProjectBadge` Komponente (kleine Projekt-Kennzeichnung in Session-Items) soll **alle verfügbaren Styling-Felder** eines Projekts nutzen, nicht nur `badgeColor`. So wird jede Erwähnung eines Projektnamens konsistent visuell dargestellt.

---

## Ist-Zustand

### ProjectBadge (`apps/ui/src/components/project-badge.tsx`)

- Props: `projectName`, `projectPath`, `badgeColor`
- Zeigt: Folder-Icon + Projektname in einem kleinen Badge
- Nutzt `badgeColor` nur als Border-Farbe
- Ignoriert: `backgroundColor`, `textColor`, `iconColor`, `icon`, `customIconPath`

### Verwendungsstellen

1. `SessionManager` (Zeile ~747-753) - Badge unter jedem Session-Item
2. Potenziell weitere Stellen in der Zukunft

---

## Phasen

### Phase 13: ProjectBadge Props erweitern

**Datei:** `apps/ui/src/components/project-badge.tsx`

**Tasks:**

- [ ] Interface erweitern um:
  ```
  backgroundColor?: string
  textColor?: string
  iconColor?: string
  icon?: string        // Lucide Icon Name
  customIconPath?: string  // Custom Icon Pfad
  projectPath?: string // Für Tooltip + Custom Icon URL
  ```
- [ ] Folder-Icon ersetzen durch dynamisches Icon:
  - Wenn `customIconPath`: Kleines `<img>` (3x3 oder 4x4) mit dem Custom Icon
  - Wenn `icon`: Entsprechendes Lucide-Icon laden (wie in `getProjectIcon()`)
  - Sonst: Standard `Folder` Icon
- [ ] `iconColor` auf das Icon anwenden (nur wenn kein Custom Icon)
- [ ] `backgroundColor` als Badge-Hintergrund
- [ ] `textColor` auf den Projektnamen-Text
- [ ] Sicherstellen, dass alle neuen Props optional bleiben (rückwärtskompatibel)

---

### Phase 14: Aufrufer aktualisieren

**Datei:** `apps/ui/src/components/session-manager.tsx`

**Tasks:**

- [ ] `useProjectLookup` erweitern oder neue Getter nutzen (aus Feature 4, Phase 9)
- [ ] Beim `ProjectBadge` Aufruf die zusätzlichen Props durchreichen:
  ```
  <ProjectBadge
    projectName={getProjectName(session.projectPath)}
    projectPath={session.projectPath}
    badgeColor={getBadgeColor(session.projectPath)}
    backgroundColor={getProjectBgColor(session.projectPath)}
    textColor={getProjectTextColor(session.projectPath)}
    iconColor={getProjectIconColor(session.projectPath)}
    icon={getProjectIcon(session.projectPath)}
    customIconPath={getProjectCustomIconPath(session.projectPath)}
  />
  ```
- [ ] Performance beachten: Getter sollten stabile Referenzen zurückgeben (primitive Strings)

---

### Phase 15: Konsistenz-Check & Feinschliff

**Tasks:**

- [ ] Prüfen, dass alle Stellen wo Projekte visuell dargestellt werden, die Farben konsistent nutzen:
  - AgentHeader (Header-Bar) ✅ bereits implementiert
  - AgentHeader Dropdown-Items (Feature 3)
  - ProjectSwitcherItem (Sidebar-Icons) ✅ bereits implementiert
  - ProjectBadge (Session-Manager) ← dieses Feature
  - MessageList Hintergrund (Feature 2)
  - InputArea Akzent (Feature 5)
- [ ] TypeScript-Fehler prüfen (kein Build, nur `tsc --noEmit` oder IDE-Check)
- [ ] Sicherstellen, dass Projekte ohne Styling weiterhin normal aussehen (keine Regression)

---

## Betroffene Dateien

1. `apps/ui/src/components/project-badge.tsx`
2. `apps/ui/src/components/session-manager.tsx`
3. `apps/ui/src/hooks/use-project-lookup.ts` (falls dort die Getter leben)

## Abhängigkeiten

- Feature 4 (Phase 9) liefert die erweiterten Lookup-Funktionen
- Rückwärtskompatibel: Bestehende Aufrufe ohne neue Props funktionieren weiterhin

## Geschätzter Aufwand

~12.000 Tokens

---

**NEXT_PHASE_READY**
