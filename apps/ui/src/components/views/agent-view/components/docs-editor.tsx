import {
  useEffect,
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { common, createLowlight } from 'lowlight';
import { markdownToHtml, htmlToMarkdown } from '@/lib/markdown-serializer';
import { cn } from '@/lib/utils';
import { DocsEditorToolbar } from './docs-editor-toolbar';
import { DocsTableMenu } from './docs-table-menu';
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DocsAIMenu } from './docs-ai-menu';
import { createSlashCommandExtension, SlashCommandPopup } from './docs-slash-commands';

const lowlight = createLowlight(common);

export interface DocsEditorHandle {
  getContent: () => string;
  getHTML: () => string;
}

interface DocsEditorProps {
  content: string;
  onDirtyChange: (isDirty: boolean) => void;
  isMarkdown: boolean;
  className?: string;
  onOpenLinkDialog?: () => void;
}

export const DocsEditor = forwardRef<DocsEditorHandle, DocsEditorProps>(function DocsEditor(
  { content, onDirtyChange, isMarkdown, className },
  ref
) {
  const initialContentRef = useRef(content);
  const [slashState, setSlashState] = useState<{ query: string; from: number } | null>(null);

  // Slash command extension (stable ref to avoid re-creating on every render)
  const slashExtension = useMemo(
    () =>
      isMarkdown
        ? createSlashCommandExtension((state) => {
            setSlashState(state ? { query: state.query, from: state.from } : null);
          })
        : null,
    [isMarkdown]
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: isMarkdown ? { levels: [1, 2, 3, 4, 5, 6] } : false,
        bold: isMarkdown ? {} : false,
        italic: isMarkdown ? {} : false,
        strike: isMarkdown ? {} : false,
        code: isMarkdown ? {} : false,
        codeBlock: false,
        blockquote: isMarkdown ? {} : false,
        bulletList: isMarkdown ? {} : false,
        orderedList: isMarkdown ? {} : false,
        horizontalRule: isMarkdown ? {} : false,
        // Disable built-in Link & Underline from StarterKit v3 - we configure them separately below
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder: isMarkdown ? 'Start writing your document...' : 'Start typing...',
      }),
      ...(isMarkdown
        ? [
            Underline,
            Link.configure({
              openOnClick: false,
              autolink: true,
              HTMLAttributes: {
                class: 'text-brand-500 underline cursor-pointer',
              },
            }),
            Image.configure({
              inline: false,
              allowBase64: true,
            }),
            Typography,
            TaskList,
            TaskItem.configure({
              nested: true,
            }),
            CodeBlockLowlight.configure({
              lowlight,
              defaultLanguage: 'plaintext',
              HTMLAttributes: {
                class: 'code-block-lowlight',
              },
            }),
            Table.configure({
              resizable: true,
              HTMLAttributes: {
                class: 'editor-table',
              },
            }),
            TableRow,
            TableCell,
            TableHeader,
          ]
        : []),
      ...(slashExtension ? [slashExtension] : []),
    ],
    [isMarkdown, slashExtension]
  );

  const initialHtml = useMemo(() => {
    if (isMarkdown) {
      return markdownToHtml(content);
    }
    return textToHtml(content);
  }, [content, isMarkdown]);

  const editor = useEditor({
    extensions,
    content: initialHtml,
    editorProps: {
      attributes: {
        class: cn('outline-none min-h-[200px] px-4 py-3 mx-auto', isMarkdown && 'prose-editor'),
        style: 'max-width: var(--docs-editor-max-width, 65ch)',
      },
      handleKeyDown: isMarkdown
        ? (_view, event) => {
            // Alt+0 → Paragraph
            if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === '0') {
              event.preventDefault();
              _view.dispatch(_view.state.tr);
              return true;
            }
            // Alt+1-4 → Headings
            if (
              event.altKey &&
              !event.ctrlKey &&
              !event.metaKey &&
              event.key >= '1' &&
              event.key <= '4'
            ) {
              event.preventDefault();
              return true;
            }
            return false;
          }
        : undefined,
    },
    onUpdate: () => {
      onDirtyChange(true);
    },
  });

  // Register custom keyboard shortcuts via editor commands
  useEffect(() => {
    if (!editor || !isMarkdown) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editor.isFocused) return;

      const isMod = e.ctrlKey || e.metaKey;

      // Alt+0 → Normal Text (no Ctrl/Cmd)
      if (e.altKey && !isMod && e.key === '0') {
        e.preventDefault();
        editor.chain().focus().setParagraph().run();
        return;
      }
      // Alt+1-4 → Headings (no Ctrl/Cmd)
      if (e.altKey && !isMod && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const level = parseInt(e.key) as 1 | 2 | 3 | 4;
        editor.chain().focus().toggleHeading({ level }).run();
        return;
      }
      // Ctrl+Shift+B → Blockquote
      if (isMod && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        editor.chain().focus().toggleBlockquote().run();
        return;
      }
      // Ctrl+Alt+C → Code Block
      if (isMod && e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        editor.chain().focus().toggleCodeBlock().run();
        return;
      }
      // Ctrl+Shift+9 → Task List
      if (isMod && e.shiftKey && e.key === '9') {
        e.preventDefault();
        editor.chain().focus().toggleTaskList().run();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, isMarkdown]);

  useImperativeHandle(
    ref,
    () => ({
      getContent: () => {
        if (!editor) return '';
        if (isMarkdown) {
          return htmlToMarkdown(editor.getHTML());
        }
        return editor.getText();
      },
      getHTML: () => {
        if (!editor) return '';
        return editor.getHTML();
      },
    }),
    [editor, isMarkdown]
  );

  // Update content when the doc changes externally (switching docs)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (content === initialContentRef.current) return;
    initialContentRef.current = content;

    const newContent = isMarkdown ? markdownToHtml(content) : textToHtml(content);
    editor.commands.setContent(newContent, { emitUpdate: false });
    onDirtyChange(false);
  }, [content, editor, isMarkdown, onDirtyChange]);

  if (!editor) return null;

  return (
    <div className={cn('docs-editor h-full flex flex-col', className)}>
      {isMarkdown && <DocsEditorToolbar editor={editor} />}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* Table context menu - shown on right-click inside table */}
      {isMarkdown && <DocsTableMenu editor={editor} />}

      {/* Bubble menu - shown on text selection (not in code blocks) */}
      {isMarkdown && (
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top' }}
          shouldShow={({ editor: e, state }) => {
            // Don't show in code blocks or when selection is empty
            if (e.isActive('codeBlock')) return false;
            const { from, to } = state.selection;
            return from !== to;
          }}
        >
          <EditorBubbleMenu editor={editor} />
        </BubbleMenu>
      )}

      {/* Slash command popup - shown when user types / at line start */}
      {isMarkdown && slashState && (
        <SlashCommandPopup
          editor={editor}
          query={slashState.query}
          from={slashState.from}
          onClose={() => setSlashState(null)}
        />
      )}

      <style>{editorStyles}</style>
    </div>
  );
});

// --- Bubble Menu Content ---

function EditorBubbleMenu({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const toggleBold = useCallback(() => editor.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor.chain().focus().toggleItalic().run(), [editor]);
  const toggleStrike = useCallback(() => editor.chain().focus().toggleStrike().run(), [editor]);
  const toggleCode = useCallback(() => editor.chain().focus().toggleCode().run(), [editor]);
  const toggleLink = useCallback(() => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('Enter URL:');
      if (url) {
        const href = url.match(/^https?:\/\//) ? url : `https://${url}`;
        editor.chain().focus().setLink({ href }).run();
      }
    }
  }, [editor]);

  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-popover/95 backdrop-blur-sm px-1 py-0.5 shadow-lg">
      <BubbleButton
        active={editor.isActive('bold')}
        onClick={toggleBold}
        icon={Bold}
        label="Bold"
      />
      <BubbleButton
        active={editor.isActive('italic')}
        onClick={toggleItalic}
        icon={Italic}
        label="Italic"
      />
      <BubbleButton
        active={editor.isActive('strike')}
        onClick={toggleStrike}
        icon={Strikethrough}
        label="Strikethrough"
      />
      <BubbleButton
        active={editor.isActive('code')}
        onClick={toggleCode}
        icon={Code}
        label="Code"
      />
      <div className="w-px h-4 bg-border mx-0.5" />
      <BubbleButton
        active={editor.isActive('link')}
        onClick={toggleLink}
        icon={LinkIcon}
        label="Link"
      />
      <div className="w-px h-4 bg-border mx-0.5" />
      <DocsAIMenu editor={editor} />
    </div>
  );
}

function BubbleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'inline-flex items-center justify-center rounded h-6 w-6 text-popover-foreground/70 hover:text-popover-foreground hover:bg-accent transition-colors',
              active && 'bg-accent text-popover-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
}

const editorStyles = `
  .docs-editor .tiptap {
    outline: none;
    min-height: 200px;
  }
  .docs-editor .tiptap p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: var(--muted-foreground);
    pointer-events: none;
    height: 0;
  }
  .prose-editor {
    font-family: var(--docs-font-family, inherit);
  }
  .prose-editor h1 {
    font-size: var(--docs-h1-size, 1.875rem);
    font-weight: var(--docs-h1-weight, 700);
    color: var(--docs-h1-color, var(--foreground));
    background: var(--docs-h1-gradient, none);
    -webkit-background-clip: var(--docs-h1-bg-clip, unset);
    background-clip: var(--docs-h1-bg-clip, unset);
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    line-height: 1.2;
  }
  .prose-editor h2 {
    font-size: var(--docs-h2-size, 1.5rem);
    font-weight: var(--docs-h2-weight, 600);
    color: var(--docs-h2-color, var(--foreground));
    background: var(--docs-h2-gradient, none);
    -webkit-background-clip: var(--docs-h2-bg-clip, unset);
    background-clip: var(--docs-h2-bg-clip, unset);
    margin-top: 1.25rem;
    margin-bottom: 0.5rem;
    line-height: 1.3;
  }
  .prose-editor h3 {
    font-size: var(--docs-h3-size, 1.25rem);
    font-weight: var(--docs-h3-weight, 600);
    color: var(--docs-h3-color, var(--foreground));
    background: var(--docs-h3-gradient, none);
    -webkit-background-clip: var(--docs-h3-bg-clip, unset);
    background-clip: var(--docs-h3-bg-clip, unset);
    margin-top: 1rem;
    margin-bottom: 0.375rem;
    line-height: 1.35;
  }
  .prose-editor h4, .prose-editor h5, .prose-editor h6 {
    font-size: var(--docs-h4-size, 1rem);
    font-weight: var(--docs-h4-weight, 600);
    color: var(--docs-h4-color, var(--foreground));
    background: var(--docs-h4-gradient, none);
    -webkit-background-clip: var(--docs-h4-bg-clip, unset);
    background-clip: var(--docs-h4-bg-clip, unset);
    margin-top: 0.75rem;
    margin-bottom: 0.25rem;
  }
  .prose-editor p {
    color: var(--foreground-secondary);
    font-size: var(--docs-body-font-size, 1rem);
    line-height: var(--docs-line-height, 1.7);
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }
  .prose-editor strong {
    color: var(--foreground);
    font-weight: 600;
  }
  .prose-editor em {
    font-style: italic;
  }
  .prose-editor u {
    text-decoration: underline;
  }
  .prose-editor s {
    text-decoration: line-through;
  }
  .prose-editor code {
    color: var(--chart-2);
    background: var(--muted);
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
    font-size: var(--docs-code-font-size, 0.875rem);
    font-family: var(--font-mono);
  }
  .prose-editor pre {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.75rem;
    margin: 0.5rem 0;
    overflow-x: auto;
  }
  .prose-editor pre code {
    background: transparent;
    padding: 0;
    color: var(--foreground);
    font-size: 0.8125rem;
    line-height: 1.6;
  }
  /* Lowlight syntax highlighting in editor */
  .prose-editor .code-block-lowlight .hljs-keyword { color: var(--chart-4, oklch(0.7 0.15 280)); }
  .prose-editor .code-block-lowlight .hljs-string { color: var(--chart-1, oklch(0.646 0.222 41.116)); }
  .prose-editor .code-block-lowlight .hljs-number { color: var(--chart-3, oklch(0.7 0.15 150)); }
  .prose-editor .code-block-lowlight .hljs-comment { color: var(--muted-foreground); font-style: italic; }
  .prose-editor .code-block-lowlight .hljs-function { color: var(--chart-2, oklch(0.6 0.118 184.704)); }
  .prose-editor .code-block-lowlight .hljs-title { color: var(--chart-2, oklch(0.6 0.118 184.704)); }
  .prose-editor .code-block-lowlight .hljs-params { color: var(--foreground); }
  .prose-editor .code-block-lowlight .hljs-built_in { color: var(--chart-5, oklch(0.769 0.188 70.08)); }
  .prose-editor .code-block-lowlight .hljs-type { color: var(--chart-5, oklch(0.769 0.188 70.08)); }
  .prose-editor .code-block-lowlight .hljs-attr { color: var(--chart-2, oklch(0.6 0.118 184.704)); }
  .prose-editor .code-block-lowlight .hljs-variable { color: var(--foreground); }
  .prose-editor .code-block-lowlight .hljs-literal { color: var(--chart-4, oklch(0.7 0.15 280)); }
  .prose-editor .code-block-lowlight .hljs-meta { color: var(--muted-foreground); }
  .prose-editor .code-block-lowlight .hljs-selector-tag { color: var(--chart-1, oklch(0.646 0.222 41.116)); }
  .prose-editor .code-block-lowlight .hljs-selector-class { color: var(--chart-2, oklch(0.6 0.118 184.704)); }
  .prose-editor .code-block-lowlight .hljs-tag { color: var(--chart-1, oklch(0.646 0.222 41.116)); }
  .prose-editor .code-block-lowlight .hljs-name { color: var(--chart-1, oklch(0.646 0.222 41.116)); }
  .prose-editor .code-block-lowlight .hljs-attribute { color: var(--chart-2, oklch(0.6 0.118 184.704)); }

  .prose-editor blockquote {
    border-left: 3px solid var(--border);
    padding-left: 1rem;
    color: var(--muted-foreground);
    font-style: italic;
    margin: 0.5rem 0;
  }
  .prose-editor ul {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin: 0.25rem 0;
  }
  .prose-editor ol {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin: 0.25rem 0;
  }
  .prose-editor li {
    color: var(--foreground-secondary);
    font-size: var(--docs-body-font-size, 1rem);
    line-height: var(--docs-line-height, 1.7);
    margin: 0.125rem 0;
  }
  .prose-editor li p {
    margin: 0;
  }
  .prose-editor hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1rem 0;
  }
  .prose-editor a {
    color: var(--brand-500);
    text-decoration: underline;
    cursor: pointer;
  }
  .prose-editor a:hover {
    opacity: 0.8;
  }
  .prose-editor img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 0.5rem 0;
    border: 1px solid var(--border);
  }

  /* Task list styles */
  .prose-editor ul[data-type="taskList"] {
    list-style: none;
    padding-left: 0;
  }
  .prose-editor ul[data-type="taskList"] li {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .prose-editor ul[data-type="taskList"] li > label {
    flex-shrink: 0;
    margin-top: 0.25rem;
  }
  .prose-editor ul[data-type="taskList"] li > label input[type="checkbox"] {
    appearance: none;
    width: 1rem;
    height: 1rem;
    border: 1.5px solid var(--border);
    border-radius: 0.25rem;
    background: var(--background);
    cursor: pointer;
    display: block;
    position: relative;
  }
  .prose-editor ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
    background: var(--brand-500);
    border-color: var(--brand-500);
  }
  .prose-editor ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 1px;
    width: 5px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .prose-editor ul[data-type="taskList"] li[data-checked="true"] > div > p {
    text-decoration: line-through;
    color: var(--muted-foreground);
  }

  /* Table styles */
  .prose-editor .editor-table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.75rem 0;
    table-layout: fixed;
    overflow: hidden;
  }
  .prose-editor .editor-table td,
  .prose-editor .editor-table th {
    border: 1px solid var(--docs-table-border, var(--border));
    padding: var(--docs-table-cell-padding, 0.375rem 0.625rem);
    vertical-align: top;
    position: relative;
    min-width: 80px;
  }
  .prose-editor .editor-table th {
    background: var(--docs-table-header-bg, var(--muted));
    font-weight: 600;
    color: var(--foreground);
    font-size: 0.875rem;
  }
  .prose-editor .editor-table td {
    color: var(--foreground-secondary);
    font-size: 0.875rem;
  }
  .prose-editor .editor-table td > p,
  .prose-editor .editor-table th > p {
    margin: 0;
  }
  /* Selected cell highlight */
  .prose-editor .editor-table .selectedCell::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--brand-500);
    opacity: 0.12;
    pointer-events: none;
    z-index: 1;
  }
  /* Column resize handle */
  .prose-editor .editor-table .column-resize-handle {
    position: absolute;
    right: -2px;
    top: 0;
    bottom: -2px;
    width: 4px;
    background: var(--brand-500);
    cursor: col-resize;
    z-index: 2;
  }
  /* Scroll container for wide tables */
  .prose-editor .tableWrapper {
    overflow-x: auto;
    margin: 0.5rem 0;
  }
  /* Striped rows (controlled by docs-striped-rows class on parent) */
  .docs-striped-rows .prose-editor .editor-table tr:nth-child(even) td {
    background: var(--docs-table-stripe-color, color-mix(in srgb, var(--muted) 15%, transparent));
  }
`;
