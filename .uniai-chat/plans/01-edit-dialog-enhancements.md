# Feature 1: Edit-Dialog Erweiterungen

**ULTRATHINK**

> Zugehörig zu: [00-master-plan.md](./00-master-plan.md)
> Chat: CHAT 1
> Status: ERLEDIGT

---

## Ziel

Den bestehenden `EditProjectDialog` um ein neues Feld **"Chat Background Color"** erweitern. Dieses Feld steuert die Hintergrundfarbe des Chat-/Message-Bereichs, separat von der bereits vorhandenen "Background Color" (die für Sidebar-Items verwendet wird).

---

## Ist-Zustand

Der `EditProjectDialog` (`apps/ui/src/components/layout/project-switcher/components/edit-project-dialog.tsx`) hat:

- **Tab "General"**: Projektname, Icon-Picker, Custom-Icon-Upload
- **Tab "Appearance"**: Live-Preview, Background Color, Border Color, Icon Color, Text Color, Reset-Button
- Verwendet `ColorPicker`-Komponente mit vordefiniertem Farbset
- Speichert via `useAppStore` Store-Aktionen + `syncSettingsToServer()`

---

## Phasen

### Phase 1: Project Interface erweitern

**Datei:** `apps/ui/src/lib/electron.ts`

**Tasks:**

- [ ] `chatBackgroundColor?: string` zum `Project` Interface hinzufügen
- [ ] Kommentar: "Background color for the chat/message area (hex color, e.g., '#ff000020')"
- [ ] Neben den bestehenden Feldern `backgroundColor`, `textColor`, etc. platzieren

---

### Phase 2: Store-Aktion hinzufügen

**Datei:** `apps/ui/src/store/app-store.ts`

**Tasks:**

- [ ] Neue Store-Aktion `setProjectChatBackgroundColor: (projectId: string, color: string | null) => void`
- [ ] Implementierung analog zu `setProjectBackgroundColor` (Map über projects, update currentProject)
- [ ] Im Interface `AppState` deklarieren
- [ ] In der Store-Implementierung umsetzen

---

### Phase 3: EditProjectDialog erweitern

**Datei:** `apps/ui/src/components/layout/project-switcher/components/edit-project-dialog.tsx`

**Tasks:**

- [ ] `setProjectChatBackgroundColor` aus Store destrukturieren
- [ ] Neuen State `chatBackgroundColor` mit `useState` anlegen (initialisiert aus `project.chatBackgroundColor`)
- [ ] Im "Appearance" Tab einen neuen Abschnitt **"Chat Background"** hinzufügen
  - Label: "Chat Background Color"
  - Beschreibung: "Background tint for the message area when this project is active"
  - `ColorPicker` mit `BACKGROUND_COLORS` (subtile Farben bevorzugt)
- [ ] In `handleSave` das neue Feld mitpersistieren
- [ ] In `handleResetColors` das neue Feld ebenfalls zurücksetzen
- [ ] Live-Preview erweitern: Kleinen Chat-Bereich-Preview zeigen

---

### Phase 4: Farbpalette für Chat-Hintergrund

**Kein neues File nötig** - Wiederverwendung der `BACKGROUND_COLORS` Konstante

**Tasks:**

- [ ] Prüfen ob die bestehenden `BACKGROUND_COLORS` (subtile Varianten mit Alpha `20`) geeignet sind
- [ ] Optional: Dunklere Varianten hinzufügen (z.B. `#ef444410` für noch subtilere Tönung)
- [ ] Die Farben sollten den Text im Chat-Bereich nicht unleserlich machen

---

## Betroffene Dateien

1. `apps/ui/src/lib/electron.ts` - Project Interface
2. `apps/ui/src/store/app-store.ts` - Store-Aktion
3. `apps/ui/src/components/layout/project-switcher/components/edit-project-dialog.tsx` - Dialog UI

## Abhängigkeiten

- Keine externen Abhängigkeiten
- Wird von Feature 2 (Message-List BG) benötigt

## Geschätzter Aufwand

~15.000 Tokens

---

**NEXT_PHASE_READY**
