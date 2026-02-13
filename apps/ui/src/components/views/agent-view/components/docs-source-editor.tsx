import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

interface DocsSourceEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Markdown syntax highlighting using CSS variables
const syntaxColors = HighlightStyle.define([
  // Headings
  { tag: t.heading1, color: 'var(--foreground)', fontWeight: '700', fontSize: '1.5em' },
  { tag: t.heading2, color: 'var(--foreground)', fontWeight: '600', fontSize: '1.3em' },
  { tag: t.heading3, color: 'var(--foreground)', fontWeight: '600', fontSize: '1.15em' },
  { tag: t.heading4, color: 'var(--foreground)', fontWeight: '600' },
  { tag: t.heading5, color: 'var(--foreground)', fontWeight: '600' },
  { tag: t.heading6, color: 'var(--foreground)', fontWeight: '600' },

  // Emphasis
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: '700', color: 'var(--foreground)' },
  { tag: t.strikethrough, textDecoration: 'line-through' },

  // Code
  {
    tag: t.monospace,
    color: 'var(--chart-2, oklch(0.6 0.118 184.704))',
    fontFamily: 'var(--font-mono)',
  },

  // Links
  { tag: t.link, color: 'var(--brand-500)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--brand-400)' },

  // Lists
  { tag: t.list, color: 'var(--chart-4, oklch(0.7 0.15 280))' },

  // Quotes
  { tag: t.quote, color: 'var(--muted-foreground)', fontStyle: 'italic' },

  // Meta (front matter, etc.)
  { tag: t.meta, color: 'var(--muted-foreground)' },
  { tag: t.processingInstruction, color: 'var(--muted-foreground)' },

  // Content
  { tag: t.content, color: 'var(--foreground-secondary)' },
]);

// Editor theme using CSS variables (matches json-syntax-editor pattern)
const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'transparent',
    color: 'var(--foreground-secondary)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-content': {
    padding: '0.75rem',
    minHeight: '100%',
    caretColor: 'var(--primary)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--primary)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'oklch(0.55 0.25 265 / 0.3)',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--accent)',
    opacity: '0.3',
  },
  '.cm-line': {
    padding: '0 0.25rem',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--muted-foreground)',
    border: 'none',
    paddingRight: '0.5rem',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    minWidth: '2.5rem',
    textAlign: 'right',
    paddingRight: '0.5rem',
  },
  '.cm-placeholder': {
    color: 'var(--muted-foreground)',
    fontStyle: 'italic',
  },
});

const markdownLanguage = markdown();

export function DocsSourceEditor({ value, onChange }: DocsSourceEditorProps) {
  const extensions = useMemo<Extension[]>(
    () => [markdownLanguage, syntaxHighlighting(syntaxColors), editorTheme],
    []
  );

  return (
    <div className="flex-1 overflow-hidden">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme="none"
        placeholder="Write markdown here..."
        height="100%"
        className="h-full [&_.cm-editor]:h-full [&_.cm-editor]:min-h-full"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          autocompletion: false,
          bracketMatching: true,
          indentOnInput: true,
        }}
      />
    </div>
  );
}
