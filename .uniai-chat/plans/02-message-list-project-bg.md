# Feature 2: Message-List Projekt-Hintergrund

**ULTRATHINK**

> Zugehörig zu: [00-master-plan.md](./00-master-plan.md)
> Chat: CHAT 1
> Status: ERLEDIGT

---

## Ziel

Wenn ein Projekt eine `chatBackgroundColor` gesetzt hat, soll der Chat-/Message-Bereich (die `MessageList` bzw. der gesamte Chat-Container) diese Farbe als Hintergrund verwenden. So erkennt der User sofort visuell, in welchem Projekt er sich befindet.

---

## Ist-Zustand

### MessageList (`apps/ui/src/components/views/agent-view/components/message-list.tsx`)

- Einfacher `div` mit `className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth"`
- Keine dynamische Hintergrundfarbe
- Bekommt nur `messages`, `isProcessing`, `messagesContainerRef`, `onScroll` als Props

### ChatArea (`apps/ui/src/components/views/agent-view/components/chat-area.tsx`)

- Wrapper um `MessageList` + `NoSessionState`
- Keine Hintergrundfarbe

### AgentView (`apps/ui/src/components/views/agent-view.tsx`)

- Container: `className="flex-1 flex overflow-hidden bg-background"`
- Hat Zugriff auf `currentProject` via `useAppStore`
- Gibt `ChatArea` keine Projekt-Farben weiter

---

## Phasen

### Phase 4: ChatArea um Hintergrundfarbe erweitern

**Datei:** `apps/ui/src/components/views/agent-view/components/chat-area.tsx`

**Tasks:**

- [ ] Neues Prop `chatBackgroundColor?: string` zum `ChatAreaProps` Interface hinzufügen
- [ ] Das Prop an den Container-`div` der `MessageList` weiterreichen (oder direkt als style auf den ChatArea-Wrapper setzen)
- [ ] `MessageList` erhält ebenfalls ein optionales `chatBackgroundColor` Prop

---

### Phase 5: MessageList Hintergrundfarbe anwenden

**Datei:** `apps/ui/src/components/views/agent-view/components/message-list.tsx`

**Tasks:**

- [ ] Neues optionales Prop `chatBackgroundColor?: string` zum `MessageListProps` Interface
- [ ] Im äußeren `div` ein `style={{ backgroundColor: chatBackgroundColor || undefined }}` hinzufügen
- [ ] Fallback: Wenn keine Farbe gesetzt, wird der Standard-Hintergrund (`bg-background`) beibehalten
- [ ] Sicherstellen, dass die Farbe mit dem bestehenden `scroll-smooth` und `overflow-y-auto` kompatibel ist

---

### Phase 6: AgentView durchreichen

**Datei:** `apps/ui/src/components/views/agent-view.tsx`

**Tasks:**

- [ ] `currentProject.chatBackgroundColor` aus dem Store lesen
- [ ] Als Prop an `ChatArea` weiterleiten: `chatBackgroundColor={currentProject?.chatBackgroundColor}`
- [ ] Auch den übergeordneten Container-div in Betracht ziehen (der `flex-1 flex flex-col overflow-hidden h-full` div), falls der Hintergrund den gesamten Chat-Bereich abdecken soll

---

## Visuelles Konzept

```
┌──────────────────────────────────────┐
│ AgentHeader (hat bereits Projekt-BG) │
├──────────────────────────────────────┤
│                                      │
│  MessageList                         │
│  ┌────────────────────┐              │
│  │ chatBackgroundColor │  ← NEU     │
│  │ als subtile Tönung  │             │
│  │ z.B. #3b82f610      │             │
│  └────────────────────┘              │
│                                      │
├──────────────────────────────────────┤
│ InputArea                            │
└──────────────────────────────────────┘
```

Der Effekt soll subtil sein - eine leichte Tönung, die den gesamten Nachrichtenbereich einfärbt, ohne die Lesbarkeit der Nachrichten zu beeinträchtigen.

---

## Betroffene Dateien

1. `apps/ui/src/components/views/agent-view/components/chat-area.tsx`
2. `apps/ui/src/components/views/agent-view/components/message-list.tsx`
3. `apps/ui/src/components/views/agent-view.tsx`

## Abhängigkeiten

- Hängt ab von Feature 1 (Edit-Dialog), damit `chatBackgroundColor` im Project Interface existiert

## Geschätzter Aufwand

~15.000 Tokens

---

**NEXT_PHASE_READY**
