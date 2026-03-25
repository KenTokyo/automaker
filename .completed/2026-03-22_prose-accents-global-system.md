---
title: Prose Accent Color System global implementiert
description: Wiederverwendbares .prose-accents CSS-System fuer farblich markierte Headings, Bold, Italic und Inline-Code in allen Markdown-Instanzen
date: 2026-03-22
status: success
effort: M
files:
  - apps/ui/src/styles/global.css
  - apps/ui/src/components/ui/markdown.tsx
  - apps/ui/src/components/views/agent-view/components/message-bubble.tsx
tags: [feature, ui]
---

## Was wurde gemacht

Ein globales Accent-Color-System wurde implementiert, das in ALLEN Markdown-Renderings der App automatisch greift:

### Neue CSS-Klasse `.prose-accents` in global.css

- **Headings (h1-h4)**: Warmes Korallrot `oklch(0.75 0.14 25)`
- **Bold (strong)**: Gold/Amber `oklch(0.82 0.12 85)`
- **Italic (em)**: Weiches Teal/Cyan `oklch(0.78 0.1 190)`
- **Inline Code**: Gedaempftes Lila `oklch(0.75 0.1 280)`

### Markdown-Komponente (markdown.tsx)

- `prose-accents` als Standard-Klasse hinzugefuegt
- Hardcoded `text-foreground` Klassen von h1-h4, strong, code entfernt (werden jetzt von .prose-accents gesteuert)

### Automatisch profitieren alle Stellen:

- Chat MessageBubble (Assistant-Nachrichten)
- CompletedTaskCard (Zusammenfassung)
- HistoryViewerPanel (History-Dateien)
- DocsViewer (Rendered Markdown)
- GitHub CommentItem (Issue-Kommentare)
- OrchestratorContentDropdown

### Chat-Color-Override (Schriftfarbe-Slider)

- `.chat-color-override` bleibt als Erweiterung fuer den Custom Font Color Slider
- Erzwingt `color: inherit !important` fuer Body-Text (p, li, td, th)
- Accent-Farben bleiben auch mit Custom Font Color erhalten (via !important)

## Architektur

```
.prose-accents (global, kein !important)
   └── Basis-Accent-Farben fuer alle Markdown

.chat-color-override (nur bei Custom Font Color)
   └── Body-Text: color: inherit !important
   └── Accents: color: oklch(...) !important (ueberschreibt Tailwind)
```
