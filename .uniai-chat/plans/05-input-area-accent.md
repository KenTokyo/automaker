# Feature 5: Input-Area Projekt-Akzentfarbe

**ULTRATHINK**

> Zugehörig zu: [00-master-plan.md](./00-master-plan.md)
> Chat: CHAT 3
> Status: OFFEN

---

## Ziel

Die Eingabefläche unten im Agent-View soll **dezent die Projekt-Akzentfarbe** widerspiegeln. Wenn ein Projekt z.B. Orange als Badge-Color hat, soll der Fokus-Ring des Input-Felds und/oder die Border dezent in Orange erscheinen.

---

## Ist-Zustand

### AgentInputArea (`apps/ui/src/components/views/agent-view/input-area/`)

- Eigenständiges Modul mit mehreren Unter-Komponenten
- Nutzt standard Tailwind-Styling für Border und Fokus
- Keine projektspezifischen Farben

### Datenfluss

- `AgentView` → `AgentInputArea` (Props: input, model, etc.)
- `currentProject` ist in `AgentView` verfügbar via `useAppStore`

---

## Phasen

### Phase 11: Input-Area Prop für Akzentfarbe

**Datei:** `apps/ui/src/components/views/agent-view/input-area/` (Haupt-Komponente)

**Tasks:**

- [ ] Neues optionales Prop `accentColor?: string` zum InputArea-Props Interface
- [ ] Wenn `accentColor` gesetzt:
  - Border des Textarea/Input bekommt dezenten Akzent: `borderColor: accentColor + '40'` (mit Transparenz)
  - Fokus-Ring bekommt Akzentfarbe: `boxShadow: 0 0 0 2px ${accentColor}30`
- [ ] Wenn NICHT gesetzt: Standard-Styling beibehalten (kein visueller Unterschied)

---

### Phase 12: AgentView durchreichen

**Datei:** `apps/ui/src/components/views/agent-view.tsx`

**Tasks:**

- [ ] `currentProject.badgeColor` (oder eine dedizierte Akzentfarbe) an `AgentInputArea` als `accentColor` weitergeben
- [ ] Logik: `accentColor={currentProject?.badgeColor || currentProject?.backgroundColor}`
- [ ] Der Akzent soll subtil sein - nicht störend beim Tippen

---

## Visuelles Konzept

```
Ohne Akzent:                    Mit Akzent (z.B. Blau):
┌──────────────────────┐       ┌──────────────────────┐
│ Describe what you...  │       │ Describe what you...  │  ← Blaue Border
│                       │       │                       │
│                  Send │       │                  Send │
└──────────────────────┘       └──────────────────────┘
  Standard border                 border: #3b82f640
```

---

## Betroffene Dateien

1. `apps/ui/src/components/views/agent-view/input-area/` (Index oder Haupt-Komponente)
2. `apps/ui/src/components/views/agent-view.tsx`

## Abhängigkeiten

- Keine direkten Abhängigkeiten
- Nutzt bestehende Projekt-Farben aus dem Store

## Geschätzter Aufwand

~10.000 Tokens

---

**NEXT_PHASE_READY**
