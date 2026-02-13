ULTRATHINK

# 🤖 Phase 6: AI Integration & Advanced Features

> **Master Plan**: [plan.md](./plan.md)
> **Status**: ⬜ OFFEN
> **CHAT**: CHAT 6 (~70.000 Tokens)
> **Voraussetzung**: Phase 1-5 abgeschlossen
> **Geschätzte Code-Zeilen**: ~1.500

---

## 🎯 Strategie & Ziele

### Was soll Phase 6 leisten?

Die Integration von AI-Funktionalität in den Docs Editor. Der User soll Textpassagen selektieren und KI-Befehle darauf anwenden können (umschreiben, zusammenfassen, erweitern, übersetzen). Zusätzlich soll die KI (Agent) die Dokumente programmatisch bearbeiten können.

### Verbindungen

- **Phase 1-4**: Editor-Instanz, Toolbar, Content-Management
- **Phase 5**: Theme beeinflusst AI-Highlight-Styles
- **Bestehend**: AgentService, WebSocket-Events, AI-Provider-System
- **Bestehend**: `use-docs.ts` → `updateDoc()` für programmatisches Speichern

### Abhängigkeiten

- Phase 1-5 müssen abgeschlossen sein
- Zugriff auf die Chat/Agent-Infrastruktur (WebSocket Events, Agent-Integration)
- Backend-API für AI-Text-Operationen (neue Route oder bestehende Agent-Infrastruktur nutzen)

---

## ❓ Proaktive F&A & Edge-Cases

### ✅ F1: Wie selektiert der User Text für KI-Befehle?

- User selektiert Text im Editor (normal)
- Ein Kontextmenü oder kleines Popup erscheint mit AI-Optionen
- Alternativ: Bubble-Menu (Phase 3) wird um AI-Buttons erweitert
- Zusätzlich: Slash-Commands (User tippt `/` und bekommt AI-Befehle vorgeschlagen)

### ✅ F2: Welche AI-Befehle soll es geben?

- **Rewrite**: Text umschreiben (gleiche Bedeutung, anderer Stil)
- **Summarize**: Text zusammenfassen
- **Expand**: Text ausführlicher machen
- **Fix Grammar**: Grammatik/Rechtschreibung korrigieren
- **Translate**: In andere Sprache übersetzen (Deutsch, Englisch, etc.)
- **Simplify**: Text vereinfachen
- **Make Professional**: Formellerer Ton
- **Custom Prompt**: Freies Textfeld für eigene Anweisungen

### ✅ F3: Wie wird das AI-Ergebnis angezeigt?

- **Inline-Preview**: Der selektierte Text wird durch das AI-Ergebnis ersetzt (mit "Accept" / "Reject" Buttons)
- **Diff-View**: Zeigt alten und neuen Text nebeneinander/untereinander
- **Undo**: Wenn der User akzeptiert und dann doch nicht will → Ctrl+Z
- Während der AI arbeitet: Loading-Indikator in der Selektion

### ✅ F4: Kann die KI (Agent) Dokumente programmatisch bearbeiten?

- Ja, der Agent kann über die bestehende `docs.update()` API Dokumente bearbeiten
- Neues Feature: "Apply to Document" Button in Agent-Chat-Antworten
- Wenn der Agent eine Markdown-Antwort gibt, kann der User diese in ein Dokument einfügen
- "Append to Doc" / "Replace Doc Content" / "Insert at Cursor" Optionen

### ✅ F5: Was passiert wenn die AI-Antwort sehr lang ist?

- Streaming: AI-Antwort wird gestreamt und inkrementell angezeigt
- Für Inline-Replace: Der Text wird Stück für Stück ersetzt (wie Cursor-typing-effect)
- Cancel-Button: User kann die Generierung abbrechen
- Token-Limit: Warnung wenn die Selektion sehr groß ist (z.B. > 5000 Zeichen)

### ✅ F6: Wie wird die AI-Request technisch ausgelöst?

- Option A: Über bestehende Agent/Chat-Infrastruktur (WebSocket)
- Option B: Neuer REST-Endpoint `/api/docs/ai-transform` (einfacher, kein Chat nötig)
- Empfehlung: Option B für schnelle Text-Transformationen, Option A für komplexe Aufgaben
- Request enthält: `selectedText`, `command`, `customPrompt?`, `context?` (umgebender Text)

---

## 📱 Konkrete Beispiele

```
🖥️ User selektiert einen Absatz im Editor
🤖 AI-Menü erscheint: [Rewrite] [Summarize] [Expand] [Fix] [Translate] [Custom...]
✏️ User klickt "Rewrite" → Loading-Spinner auf dem selektierten Text
✨ AI-Ergebnis erscheint inline: "Accept" / "Reject" / "Try Again"
✅ User klickt "Accept" → Text wird ersetzt
↩️ Falls nötig: Ctrl+Z um rückgängig zu machen

---

💬 Im Agent-Chat: Agent gibt eine Markdown-Antwort
📝 User sieht "Insert into Docs" Button → Wählt Ziel-Dokument
📋 Content wird eingefügt (append/replace/at cursor)
```

---

## ⚡ Performance-Optimierung

- **AI-Requests** werden mit AbortController gestartet (für Cancel)
- **Streaming** der AI-Antwort für bessere UX
- **Debouncing**: Kein doppelter Request bei schnellem Doppelklick
- **Context-Window**: Nur relevanten Kontext senden (selektierter Text + umgebende Absätze)

---

## 🔄 Code-Wiederverwendung

| Bestehend                         | Wiederverwendung                  |
| --------------------------------- | --------------------------------- |
| Agent WebSocket Events            | ✅ Für AI-Streaming               |
| `getHttpApiClient()`              | ✅ Für REST-Endpoint              |
| `BubbleMenu` (Phase 3)            | ✅ Erweiterung um AI-Buttons      |
| `DocsEditorToolbar` (Phase 3)     | ✅ AI-Buttons hinzufügen          |
| `updateDoc()` (use-docs.ts)       | ✅ Für programmatisches Speichern |
| `toast` (sonner)                  | ✅ Für Feedback                   |
| `AlertDialog` (shadcn/ui)         | ✅ Für Bestätigungs-Dialoge       |
| `Popover` / `Command` (shadcn/ui) | ✅ Für Slash-Commands             |

---

## 🧩 Komponenten & Tasks

### Task 6.1: AI-Transform Backend-Endpoint

**Neue Datei**: `apps/server/src/routes/docs/routes/ai-transform.ts`
**Zweck**: REST-Endpoint für schnelle AI-Text-Transformationen
**Was die Route tun soll**:

- Endpoint: `POST /api/docs/ai-transform`
- Request Body: `{ text: string, command: string, customPrompt?: string, context?: string }`
- Commands: `rewrite`, `summarize`, `expand`, `fix-grammar`, `translate`, `simplify`, `professional`, `custom`
- Nutzt den Claude AI Provider (bereits in `providers/`)
- Streaming-Response (SSE) für inkrementelle Antwort
- Authentifizierung via bestehende Auth-Middleware
- Rate-Limiting (optional, Vorbereitung)
- Error-Handling: Fehlende API-Key Warnung, Token-Limit-Warnung

**Geschätzte Zeilen**: ~200-250

---

### Task 6.2: AI-Text-Transform UI-Komponente

**Neue Datei**: `apps/ui/src/components/views/agent-view/components/docs-ai-menu.tsx`
**Zweck**: UI für AI-Befehle auf selektierten Text
**Was die Komponente tun soll**:

- Erscheint als erweitertes Kontextmenü / Popover bei Textselektion
- Buttons für alle AI-Commands (Icons + Labels)
- "Custom Prompt" → Kleines Textfeld für eigene Anweisungen
- "Translate to..." → Untermenü mit Sprachoptionen
- Loading-State: Spinner + "Cancel" Button
- Ergebnis-Preview:
  - Inline-Diff: Alter Text durchgestrichen, neuer Text hervorgehoben
  - Oder: Side-by-Side (für längere Texte)
  - "Accept", "Reject", "Try Again" Buttons
- Keyboard Shortcuts:
  - `Ctrl+Shift+A` → AI-Menü öffnen (bei Selektion)
  - Enter → Accept
  - Escape → Reject

**Geschätzte Zeilen**: ~400-500

---

### Task 6.3: Slash-Commands im Editor

**Bestehende Datei**: `docs-editor.tsx`
**Zweck**: `/`-getriggerte Command-Palette im Editor
**Was implementiert werden soll**:

- TipTap `Suggestion` Plugin (oder Custom Extension)
- Trigger: User tippt `/` am Zeilenanfang
- Popup-Liste (ähnlich wie Notion Slash-Commands):
  - **/heading1** - **/heading4**: Block-Typ Wechsel
  - **/bullet**: Bullet-List
  - **/numbered**: Ordered-List
  - **/task**: Task-List
  - **/code**: Code-Block
  - **/quote**: Blockquote
  - **/table**: Tabelle einfügen
  - **/divider**: Horizontal Rule
  - **/ai**: AI-Befehle (Untermenü)
- Filterbarer Typ-Ahead (User tippt `/he` → zeigt nur Heading-Optionen)
- Navigation: Pfeiltasten + Enter zum Auswählen
- Escape zum Schließen
- Nutzt shadcn/ui `Command` Component für die Filterbare Liste

**Geschätzte Zeilen**: ~400-500

---

### Task 6.4: "Insert into Docs" aus Chat-Antworten

**Bestehende Datei**: UI-Komponente für Chat-Messages (in Agent-View)
**Zweck**: Button in Agent-Chat-Antworten zum Einfügen in Docs
**Was implementiert werden soll**:

- Neuer Button "Insert into Docs" bei Markdown-Antworten im Chat
- Dropdown mit Optionen:
  - "New Document" → Erstellt neues Dokument mit dem Content
  - "Append to Current" → Hängt an aktuell geöffnetes Dokument an (wenn eines offen)
  - "Replace Current" → Ersetzt Inhalt des aktuellen Dokuments (mit Bestätigung)
  - "Insert at Cursor" → Fügt an Cursor-Position im Editor ein (wenn Editor-Modus aktiv)
- Nutzt `createDoc()` oder `updateDoc()` aus `use-docs.ts`
- Toast-Feedback bei Erfolg/Fehler

**Geschätzte Zeilen**: ~200-250

---

## 📊 Zusammenfassung Phase 6

| Task       | Komponente            | Typ                   | ~Zeilen    |
| ---------- | --------------------- | --------------------- | ---------- |
| 6.1        | AI-Transform Endpoint | Neuer Server-Endpoint | ~225       |
| 6.2        | `DocsAIMenu`          | Neue Komponente       | ~450       |
| 6.3        | Slash-Commands        | Extension + UI        | ~450       |
| 6.4        | "Insert into Docs"    | Modifikation          | ~225       |
| **Gesamt** |                       |                       | **~1.350** |

---

## ✅ Abnahmekriterien

1. [ ] User kann Text selektieren und AI-Befehle darauf anwenden
2. [ ] AI-Ergebnis wird inline als Preview angezeigt (Accept/Reject)
3. [ ] Rewrite, Summarize, Expand, Fix Grammar, Translate funktionieren
4. [ ] Custom Prompt erlaubt freie Anweisungen
5. [ ] Streaming-Response zeigt inkrementelle Ergebnisse
6. [ ] Cancel-Button bricht die Generierung ab
7. [ ] Slash-Commands funktionieren mit `/` am Zeilenanfang
8. [ ] "Insert into Docs" Button erscheint bei Agent-Chat-Antworten
9. [ ] Undo (Ctrl+Z) macht AI-Änderungen rückgängig
10. [ ] `npm run build` läuft erfolgreich durch

---

## 🔗 Abhängigkeiten für nächste Phase

Phase 7 benötigt:

- Funktionierende AI-Integration
- Alle Editor-Features aus Phase 1-6
- Stabilität und Performance-Baseline zum Optimieren
