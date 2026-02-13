/**
 * DocsSlashCommands - Slash command menu for the TipTap editor.
 *
 * Triggers when user types `/` at the start of a line.
 * Shows a filterable command palette for inserting block types and AI commands.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ListChecks,
  Code2,
  Quote,
  Table2,
  Minus,
  Image,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** Slash command item definition */
export interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  action: (editor: Editor) => void;
}

/** Build the default slash command items */
function getSlashCommandItems(onAI?: () => void): SlashCommandItem[] {
  return [
    {
      id: 'heading1',
      label: 'Heading 1',
      description: 'Large section heading',
      icon: Heading1,
      keywords: ['h1', 'heading', 'title'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'heading2',
      label: 'Heading 2',
      description: 'Medium section heading',
      icon: Heading2,
      keywords: ['h2', 'heading', 'subtitle'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'heading3',
      label: 'Heading 3',
      description: 'Small section heading',
      icon: Heading3,
      keywords: ['h3', 'heading'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'heading4',
      label: 'Heading 4',
      description: 'Smallest heading',
      icon: Heading4,
      keywords: ['h4', 'heading'],
      action: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    },
    {
      id: 'bullet',
      label: 'Bullet List',
      description: 'Unordered list',
      icon: List,
      keywords: ['ul', 'bullet', 'list', 'unordered'],
      action: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'numbered',
      label: 'Numbered List',
      description: 'Ordered list',
      icon: ListOrdered,
      keywords: ['ol', 'numbered', 'list', 'ordered'],
      action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'task',
      label: 'Task List',
      description: 'Checklist with checkboxes',
      icon: ListChecks,
      keywords: ['task', 'todo', 'checkbox', 'checklist'],
      action: (editor) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      id: 'code',
      label: 'Code Block',
      description: 'Syntax highlighted code',
      icon: Code2,
      keywords: ['code', 'codeblock', 'pre'],
      action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'quote',
      label: 'Blockquote',
      description: 'Quote or callout',
      icon: Quote,
      keywords: ['quote', 'blockquote', 'callout'],
      action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'table',
      label: 'Table',
      description: 'Insert a 3x3 table',
      icon: Table2,
      keywords: ['table', 'grid'],
      action: (editor) =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: 'divider',
      label: 'Divider',
      description: 'Horizontal rule',
      icon: Minus,
      keywords: ['hr', 'divider', 'horizontal', 'rule', 'separator'],
      action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    ...(onAI
      ? [
          {
            id: 'ai',
            label: 'AI Assist',
            description: 'AI text commands',
            icon: Sparkles,
            keywords: ['ai', 'transform', 'rewrite', 'summarize'],
            action: () => onAI(),
          },
        ]
      : []),
  ];
}

// --- Slash Command Plugin Key ---
const slashCommandPluginKey = new PluginKey('slashCommand');

interface SlashCommandState {
  active: boolean;
  query: string;
  from: number; // position of the `/`
}

/**
 * Create a TipTap extension for slash commands.
 * Uses a ProseMirror plugin to detect `/` at line start and emit state.
 */
export function createSlashCommandExtension(
  onStateChange: (state: SlashCommandState | null) => void
) {
  return Extension.create({
    name: 'slashCommand',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: slashCommandPluginKey,
          state: {
            init(): SlashCommandState | null {
              return null;
            },
            apply(tr, prev): SlashCommandState | null {
              // If we're not actively composing, check for slash
              const { selection } = tr;
              if (!selection.empty) {
                if (prev) onStateChange(null);
                return null;
              }

              const pos = selection.$from;
              const textBefore = pos.parent.textBetween(0, pos.parentOffset, undefined, '\ufffc');

              // Check if text starts with `/` followed by optional query
              const match = textBefore.match(/^\/(\S*)$/);
              if (match) {
                // Position of the `/` in the document
                const from = pos.pos - textBefore.length;
                const state: SlashCommandState = {
                  active: true,
                  query: match[1],
                  from,
                };
                onStateChange(state);
                return state;
              }

              if (prev) onStateChange(null);
              return null;
            },
          },
        }),
      ];
    },
  });
}

// --- Slash Command Popup Component ---

interface SlashCommandPopupProps {
  editor: Editor;
  query: string;
  from: number;
  onClose: () => void;
  onAI?: () => void;
}

export function SlashCommandPopup({ editor, query, from, onClose, onAI }: SlashCommandPopupProps) {
  const items = useMemo(() => getSlashCommandItems(onAI), [onAI]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Filter items by query
  const filteredItems = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q))
    );
  }, [items, query]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  // Calculate popup position based on cursor
  useEffect(() => {
    const view = editor.view;
    const coords = view.coordsAtPos(from);
    const editorRect = view.dom.closest('.docs-editor')?.getBoundingClientRect();
    if (editorRect) {
      setPosition({
        top: coords.bottom - editorRect.top + 4,
        left: coords.left - editorRect.left,
      });
    }
  }, [editor, from]);

  // Execute command
  const executeItem = useCallback(
    (item: SlashCommandItem) => {
      // Delete the slash and query text
      const to = editor.state.selection.from;
      editor.chain().focus().deleteRange({ from, to }).run();
      // Execute the command
      item.action(editor);
      onClose();
    },
    [editor, from, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(filteredItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          executeItem(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filteredItems, selectedIndex, executeItem, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const el = menuRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!position || filteredItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 max-h-64 overflow-y-auto rounded-lg border bg-popover/95 backdrop-blur-sm shadow-lg py-1"
      style={{ top: position.top, left: position.left }}
    >
      {filteredItems.map((item, index) => (
        <button
          key={item.id}
          type="button"
          data-index={index}
          onClick={() => executeItem(item)}
          onMouseEnter={() => setSelectedIndex(index)}
          className={cn(
            'flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left transition-colors',
            index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
          )}
        >
          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
            <item.icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{item.label}</div>
            <div className="text-[10px] text-muted-foreground">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
