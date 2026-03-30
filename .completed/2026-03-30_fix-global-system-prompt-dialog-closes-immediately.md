---
title: Fix Global System Prompt Dialog schließt sofort
description: Dialog wurde innerhalb des DropdownMenuContent gerendert und beim Schließen des Dropdowns unmounted - aufgeteilt in Inline + Dialog
date: 2026-03-30
status: success
effort: S
files:
  - apps/ui/src/components/views/agent-view/input-area/global-system-prompt-editor.tsx
  - apps/ui/src/components/views/agent-view/input-area/agent-prompts-selector.tsx
tags: [bugfix, ui]
---

## Problem

Der Global System Prompt Dialog öffnete sich kurz und schloss sich sofort wieder.

## Ursache

Klassischer Radix UI Dropdown+Dialog Konflikt: Der Dialog lebte INNERHALB des DropdownMenuContent. Beim Klick auf "Edit" wurde erst das Dropdown geschlossen (`setIsOpen(false)`), was den gesamten DropdownMenuContent unmountete - inklusive des Dialog-States (`isEditorOpen`). Der setTimeout feuerte zwar noch, aber die Komponente war schon zerstört.

## Lösung

Komponente in zwei Teile aufgeteilt:

1. **GlobalSystemPromptInline** - lebt INNERHALB des Dropdowns (nur Preview + Edit-Button)
2. **GlobalSystemPromptDialog** - lebt AUSSERHALB des Dropdowns (überlebt den Unmount)

Der Dialog-State (`isGlobalPromptDialogOpen`) wird jetzt im Parent (`AgentPromptsSelector`) gehalten und der Dialog neben dem DropdownMenu gerendert, nicht darin.

## Learning

Bei Radix UI: Dialoge NIEMALS innerhalb eines DropdownMenuContent rendern, da dieser beim Schließen des Dropdowns komplett unmounted wird.
