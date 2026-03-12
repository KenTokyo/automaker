# 🎨 Chat Display Settings - Schrift, Deckkraft & Style-Vorlagen

> Erstellt: 2026-03-12

## 🎯 Ziel

Der Chat bekommt ein richtiges Einstellungs-Panel für die Textdarstellung. Statt dem einfachen Zahlenfeld im Header gibt es ein schickes Popover mit Schnell-Vorlagen und feinen Reglern. Der User kann so die Lesbarkeit genau an seinen Geschmack anpassen.

**Was bedeutet das konkret für den User?**
Man klickt auf ein kleines Icon im Header und bekommt sofort vorgefertigte Styles ("Standard", "Gedämpft", "Kräftig" usw.) zum Anklicken. Wer es genauer will, kann Schriftgröße, Textstärke und Deckkraft einzeln einstellen. Code-Blöcke passen sich automatisch mit an.

---

## ❓ Typische Szenarien & Edge Cases

✅ **User wählt "Gedämpft"** → Text wird leicht transparent und wirkt ruhiger, gut für lange Sessions
✅ **User stellt Schriftgröße auf 16px** → Code-Blöcke wachsen proportional mit
✅ **User wechselt das Theme** → Settings bleiben erhalten, weil sie in localStorage gespeichert sind
✅ **User öffnet auf kleinem Bildschirm** → Popover passt sich an, scrollbar falls nötig
✅ **User will zurück zu Standard** → Ein Klick auf "Standard" setzt alles zurück

---

## 🔄 Bestehende Architektur (Ist-Zustand)

- `chatFontSize` ist lokaler State in `agent-view.tsx` (Zeile 65-81)
- Gespeichert in localStorage unter `automaker:chatFontSize`
- Weitergereicht: AgentView → AgentHeader (UI) + ChatArea → MessageList → MessageBubble
- Angewendet: `style={{ fontSize: \`${chatFontSize}px\` }}`in`message-bubble.tsx:105`
- UI: Einfaches `<Input type="number">` im AgentHeader (Zeile 499-516)

---

## 📋 Phasen-Übersicht

### Phase 1: Types & Storage (~150 Zeilen) ✅ DONE

**Was passiert?** Wir definieren die neuen Einstellungs-Typen und die Vorlagen.

#### 1.1 ChatDisplaySettings Type erweitern (`apps/ui/src/store/types/ui-types.ts`) **~40 Zeilen**

- `ChatDisplaySettings` Interface: fontSize, fontWeight, fontOpacity, codeBlockRelativeSize, lineHeight
- `ChatDisplayPreset` Type für die Vorlagen-Namen
- `CHAT_DISPLAY_PRESETS` Objekt mit 5 vorgefertigten Styles
- Standard-Werte als Konstanten

**Vorlagen:**
| Name | Größe | Stärke | Deckkraft | Zeilenhöhe |
|------|-------|--------|-----------|------------|
| Standard | 14px | 400 | 1.0 | 1.6 |
| Gedämpft | 13px | 400 | 0.8 | 1.6 |
| Kräftig | 14px | 500 | 1.0 | 1.5 |
| Kompakt | 12px | 400 | 0.9 | 1.4 |
| Groß & Lesbar | 16px | 400 | 1.0 | 1.8 |

#### 1.2 State-Management in AgentView anpassen (`agent-view.tsx`) **~30 Zeilen**

- `chatFontSize` State → `chatDisplaySettings` State (Objekt)
- localStorage-Key: `automaker:chatDisplaySettings` (JSON)
- Migration: alten `automaker:chatFontSize` Wert übernehmen falls vorhanden
- `handleChatDisplaySettingsChange` Callback

---

### Phase 2: Chat Settings Popover erstellen (~250 Zeilen) ✅ DONE

**Was passiert?** Die neue UI-Komponente mit Vorlagen-Buttons und Schiebereglern.

#### 2.1 `ChatSettingsPopover` Komponente (`apps/ui/src/components/views/agent-view/components/chat-settings-popover.tsx`) **~250 Zeilen**

- Popover (via Radix/Shadcn) getriggert durch ein Icon-Button
- **Oberer Bereich:** 5 Preset-Buttons als Chips/Pills, der aktive ist hervorgehoben
- **Unterer Bereich:** Individuelle Regler:
  - Schriftgröße: Slider 10-20px mit Zahlenwert
  - Schriftstärke: Slider 300-600 mit Labels (Leicht/Normal/Mittel/Kräftig)
  - Text-Deckkraft: Slider 0.5-1.0 mit Prozentanzeige
  - Zeilenhöhe: Slider 1.2-2.0
- **Live-Vorschau:** Kleiner Beispieltext der sich sofort ändert
- Wenn User individuelle Werte einstellt, wird kein Preset als aktiv markiert ("Eigene" erscheint)
- Nutzt bestehende Shadcn-Komponenten: Popover, Slider, Button

---

### Phase 3: Integration & Styling (~100 Zeilen Änderungen) ✅ DONE

**Was passiert?** Alles wird zusammengebaut - Header bekommt neues UI, Messages bekommen neue Styles.

#### 3.1 AgentHeader anpassen (`agent-header.tsx`) **~20 Zeilen Änderung**

- Altes `<Input type="number">` Block entfernen (Zeile 499-516)
- Neues `<ChatSettingsPopover>` einsetzen
- Props: `chatDisplaySettings` + `onChatDisplaySettingsChange`

#### 3.2 AgentView Props-Pipeline anpassen (`agent-view.tsx`) **~15 Zeilen Änderung**

- `chatFontSize` Prop → `chatDisplaySettings` Prop überall durchreichen
- AgentHeader, ChatArea, MessageList, MessageBubble

#### 3.3 MessageBubble Styling erweitern (`message-bubble.tsx`) **~10 Zeilen Änderung**

- `style={{ fontSize }}` erweitern um fontWeight, opacity, lineHeight
- Code-Block-Größe: `codeBlockRelativeSize` (Offset in px relativ zur Hauptgröße)

#### 3.4 Props-Interface Updates **~30 Zeilen Änderung**

- `AgentHeaderProps`: chatFontSize → chatDisplaySettings
- `ChatAreaProps`: chatFontSize → chatDisplaySettings
- `MessageListProps`: chatFontSize → chatDisplaySettings
- `MessageBubbleProps`: chatFontSize → chatDisplaySettings

---

## ⚡ Performance

- Alle Slider-Änderungen werden sofort angezeigt (kein Debounce nötig, da nur CSS-Änderungen)
- localStorage-Writes sind billig
- Kein Backend involviert
- Presets sind statische Objekte (kein Re-Render-Problem)

---

## 📁 Betroffene Dateien

| Datei                                                                          | Aktion                     |
| ------------------------------------------------------------------------------ | -------------------------- |
| `apps/ui/src/store/types/ui-types.ts`                                          | Types + Presets hinzufügen |
| `apps/ui/src/components/views/agent-view/components/chat-settings-popover.tsx` | **NEU**                    |
| `apps/ui/src/components/views/agent-view/components/index.ts`                  | Export hinzufügen          |
| `apps/ui/src/components/views/agent-view/components/agent-header.tsx`          | Input → Popover tauschen   |
| `apps/ui/src/components/views/agent-view.tsx`                                  | State-Management anpassen  |
| `apps/ui/src/components/views/agent-view/components/chat-area.tsx`             | Prop-Type ändern           |
| `apps/ui/src/components/views/agent-view/components/message-list.tsx`          | Prop-Type ändern           |
| `apps/ui/src/components/views/agent-view/components/message-bubble.tsx`        | Styling erweitern          |

---

## 🧩 Abhängigkeiten

- Shadcn Popover → bereits vorhanden
- Shadcn Slider → prüfen ob vorhanden, sonst `npx shadcn@latest add slider`
- Keine neuen npm-Packages nötig
