---
title: 'Terminal: 4 optische Verbesserungen eingebaut'
description: 'Font-Smoothing CSS, rescaleOverlappingGlyphs, JetBrains Mono als Standard-Font, Ligaturen-Addon installiert'
date: 2026-03-28
status: success
effort: M
files:
  - apps/ui/src/styles/global.css
  - apps/ui/src/components/views/terminal-view/terminal-panel.tsx
  - apps/ui/src/components/ui/xterm-log-viewer.tsx
  - apps/ui/src/config/terminal-themes.ts
  - apps/ui/package.json
tags: [ui, feature, performance]
---

## Was wurde gemacht?

4 optische Verbesserungen am Terminal eingebaut, damit es professioneller aussieht:

1. **CSS Font-Smoothing** - antialiased + optimizeLegibility auf .xterm CSS-Klasse
2. **rescaleOverlappingGlyphs** - aktiviert in terminal-panel.tsx und xterm-log-viewer.tsx
3. **JetBrains Mono** als Standard-Schrift (mit Fallback auf Menlo/Monaco)
4. **@xterm/addon-ligatures@0.9.0** installiert und eingebaut (nur in Electron aktiv, im Browser sicher uebersprungen)

TypeScript-Check: 0 Fehler.
