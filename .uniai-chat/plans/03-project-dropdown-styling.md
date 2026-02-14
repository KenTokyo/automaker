# Feature 3: Project-Dropdown Styling

**ULTRATHINK**

> Zugehörig zu: [00-master-plan.md](./00-master-plan.md)
> Chat: CHAT 2
> Status: OFFEN

---

## Ziel

Das Projekt-Auswahl-Dropdown im `AgentHeader` (das aufklappt, wenn man auf den Projektnamen klickt) soll **pro Projekt-Item die individuellen Farben anzeigen**. Aktuell sind alle Items gleich gestaltet. Bei 20+ Projekten fehlt die visuelle Unterscheidbarkeit.

---

## Ist-Zustand

### AgentHeader Dropdown (`apps/ui/src/components/views/agent-view/components/agent-header.tsx`)

Das Dropdown rendert in einer `filteredProjects.map(...)` Schleife:

- Jedes Item ist ein `<button>` mit einheitlichem Styling
- Icons nutzen `ProjIcon` (Lucide oder Custom), aber nur aktives Projekt bekommt `text-brand-500`
- Keine Hintergrundfarbe pro Item
- Keine Border-Farbe pro Item
- Custom Icons werden korrekt geladen

### Relevanter Code-Bereich (Zeile ~272-313)

- `ProjIcon` Farbe: `isActive ? 'text-brand-500' : 'text-muted-foreground'`
- Kein `style` Attribut auf den Items
- Kein Zugriff auf `project.backgroundColor`, `project.iconColor`, etc.

---

## Phasen

### Phase 7: Dropdown-Items mit Projekt-Farben

**Datei:** `apps/ui/src/components/views/agent-view/components/agent-header.tsx`

**Tasks:**

- [ ] Im Dropdown-Item-Button: `project.iconColor` auf das Icon-Element anwenden (sowohl Lucide als auch Custom)
- [ ] `project.badgeColor` als subtile linke Border anwenden (z.B. `borderLeft: 3px solid ${project.badgeColor}`)
- [ ] `project.backgroundColor` als dezenten Hintergrund des Items nutzen (nur wenn gesetzt)
- [ ] Sicherstellen, dass Hover-States und Selected-States weiterhin gut sichtbar bleiben
- [ ] `project.textColor` optional auf den Projektnamen anwenden

### Visuelles Konzept für Dropdown-Items:

```
┌───────────────────────────────┐
│ 🔍 Search projects...         │
├───────────────────────────────┤
│ ▎🟡 uniai-chat               │  ← Gelbe Border links, gelbes Icon
│ ▎🔵 linearleads              │  ← Blaue Border links, blaues Icon
│ ▎🟢 automaker            ✓   │  ← Grüne Border links (aktiv)
│ ▎🟠 notedrill-web            │  ← Orange Border links
└───────────────────────────────┘
```

---

### Phase 8: Edit-Button pro Dropdown-Item (Optional)

**Datei:** `apps/ui/src/components/views/agent-view/components/agent-header.tsx`

**Tasks:**

- [ ] Prüfen, ob ein kleiner Edit/Settings-Button pro Item im Dropdown sinnvoll ist
- [ ] Wenn ja: Kleines Zahnrad-Icon rechts im Item, das `EditProjectDialog` für dieses spezifische Projekt öffnet
- [ ] Alternativ: Rechtsklick-Kontextmenü auf Dropdown-Items
- [ ] **Entscheidung**: Ein Edit-Button pro Item wäre sehr praktisch, aber könnte das Dropdown überladen. Empfehlung: Hover-only sichtbarer Edit-Button (wie bei Session-Items)

---

## Betroffene Dateien

1. `apps/ui/src/components/views/agent-view/components/agent-header.tsx`

## Abhängigkeiten

- Keine direkten Abhängigkeiten zu anderen Features
- Nutzt bestehende `Project` Interface Felder

## Geschätzter Aufwand

~15.000 Tokens

---

**NEXT_PHASE_READY**
