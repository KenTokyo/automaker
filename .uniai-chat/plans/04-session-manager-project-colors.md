# Feature 4: Session-Manager Projekt-Farben

**ULTRATHINK**

> Zugehörig zu: [00-master-plan.md](./00-master-plan.md)
> Chat: CHAT 2
> Status: OFFEN

---

## Ziel

Im Session-Manager (linke Sidebar mit der Session-Liste) sollen die **ProjectBadge-Elemente und Session-Items** die Projekt-Farben widerspiegeln. Wenn ein User viele Sessions über verschiedene Projekte hat, soll die **visuelle Zuordnung** sofort erkennbar sein.

---

## Ist-Zustand

### SessionManager (`apps/ui/src/components/session-manager.tsx`)

- Nutzt `ProjectBadge` Komponente für jede Session (Zeile ~747-753)
- `getBadgeColor(session.projectPath)` liefert nur die `badgeColor` (Border-Farbe)
- Sessions-Items haben einheitliches Styling (nur aktive Session bekommt `bg-primary/10 border-primary`)
- Kein projektspezifischer Hintergrund oder Akzent

### ProjectBadge (`apps/ui/src/components/project-badge.tsx`)

- Bekommt: `projectName`, `projectPath`, `badgeColor`
- Zeigt nur Border in `badgeColor` an
- Nutzt NICHT: `backgroundColor`, `textColor`, `iconColor`

### useProjectLookup Hook

- Liefert `getProjectName(path)` und `getBadgeColor(path)`
- Müsste erweitert werden um weitere Felder zu liefern

---

## Phasen

### Phase 9: useProjectLookup erweitern

**Datei:** `apps/ui/src/hooks/use-project-lookup.ts` (oder wo der Hook definiert ist)

**Tasks:**

- [ ] Hook erweitern um: `getProjectBackgroundColor(path)`, `getProjectTextColor(path)`, `getProjectIconColor(path)`, `getProjectIcon(path)`, `getProjectCustomIconPath(path)`
- [ ] Alternativ: Eine einzelne Funktion `getProjectStyling(path)` die ein Objekt mit allen Styling-Feldern zurückgibt
- [ ] **Zustand-Regel beachten**: Keine neuen Objekte pro Render erstellen! Stattdessen einzelne primitive Getter verwenden oder `useMemo`/`useCallback` nutzen
- [ ] Fallback-Werte: `undefined` wenn kein Styling gesetzt

---

### Phase 10: Session-Items mit dezenter Projekt-Kennzeichnung

**Datei:** `apps/ui/src/components/session-manager.tsx`

**Tasks:**

- [ ] Für jedes Session-Item prüfen, ob das zugehörige Projekt eine `badgeColor` oder `backgroundColor` hat
- [ ] Wenn ja: Dezente linke Border am Session-Item in der Projekt-Farbe (`borderLeft: 3px solid ${badgeColor}`)
- [ ] Optional: Sehr subtiler Hintergrund-Tint auf dem Session-Item
- [ ] Die `ProjectBadge` im Session-Item erweitern (siehe Feature 6)
- [ ] Sicherstellen, dass die aktive Session weiterhin klar erkennbar bleibt (Priorität: Aktiv > Projekt-Farbe)

### Visuelles Konzept:

```
Agent Sessions
┌──────────────────────────────┐
│ ▎🟡 Tranquil Workshop 5     │  ← Gelbe linke Border (notedrill-web)
│ ▎   0 messages · notedrill   │
├──────────────────────────────┤
│ ▎🔵 Make user messages...    │  ← Blaue linke Border (automaker)
│ ▎   2 messages · automaker   │
├──────────────────────────────┤
│ ▎🔵 Fix Markdown newline..  │  ← Blaue linke Border (automaker)
│ ▎   2 messages · automaker   │
└──────────────────────────────┘
```

---

## Betroffene Dateien

1. `apps/ui/src/hooks/use-project-lookup.ts` (oder entsprechendes Modul)
2. `apps/ui/src/components/session-manager.tsx`
3. `apps/ui/src/components/project-badge.tsx` (Erweiterung - siehe Feature 6)

## Abhängigkeiten

- Nutzt bestehende `Project` Interface Felder
- Feature 6 (ProjectBadge Erweiterung) ergänzt dieses Feature

## Geschätzter Aufwand

~15.000 Tokens

---

**NEXT_PHASE_READY**
