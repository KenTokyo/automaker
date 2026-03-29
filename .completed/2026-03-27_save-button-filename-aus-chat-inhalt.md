---
title: 'Save-Button: Dateiname aus Chat-Inhalt generieren'
description: 'generateFileName() extrahiert jetzt die ersten 5 Woerter aus dem Chat-Text als Slug fuer den Dateinamen statt nur Datum+Uhrzeit.'
date: 2026-03-27
status: success
effort: S
files:
  - apps/ui/src/hooks/use-save-as-markdown.ts
tags: [feature, ui]
---

## Aenderung

Die `generateFileName()`-Funktion im `use-save-as-markdown` Hook wurde ueberarbeitet:

**Vorher:** `2026-03-27_143052_notiz.md` (nur Datum+Uhrzeit)

**Nachher:** `heute-habe-ich-einen-neuen-notiz.md` (erste 5 Woerter aus dem Text + `-notiz`)

### Logik

1. Sonderzeichen entfernen (nur Buchstaben, Zahlen, Umlaute behalten)
2. In Woerter splitten, lowercase
3. Erste 5 Woerter mit Bindestrichen verbinden
4. `-notiz.md` anhaengen
5. Fallback auf Datum+Uhrzeit wenn keine Woerter extrahierbar
