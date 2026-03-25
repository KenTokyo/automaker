import { memo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { common, createLowlight } from 'lowlight';
import { toHtml } from 'hast-util-to-html';
import type { Root, Element, ElementContent } from 'hast';
import { cn } from '@/lib/utils';
import { Square, CheckSquare } from 'lucide-react';

const lowlight = createLowlight(common);

/**
 * Rehype plugin that fixes invalid `<p>` nested inside `<p>`.
 * This can happen when rehype-sanitize strips block-level elements (e.g. <div>)
 * and their inline children merge into a surrounding <p>, producing nested <p> tags.
 * We walk the tree and lift nested <p> into siblings of the parent <p>.
 */
function rehypeFixNestedP() {
  return (tree: Root) => {
    visit(tree);
  };
}

function visit(node: Root | Element) {
  if (!('children' in node)) return;

  // Process children bottom-up so indices stay valid
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === 'element') {
      visit(child);
    }
  }

  // Only fix <p> elements that contain nested <p>
  if (node.type === 'element' && node.tagName === 'p') {
    const hasNestedP = node.children.some((c) => c.type === 'element' && c.tagName === 'p');
    if (!hasNestedP) return;

    // Split children into groups separated by nested <p> elements.
    // Each nested <p> becomes a sibling; surrounding inline content stays in wrapper <p>.
    const fragments: ElementContent[][] = [[]];
    for (const child of node.children) {
      if (child.type === 'element' && child.tagName === 'p') {
        // Push the nested <p> as its own group
        fragments.push([child]);
        fragments.push([]);
      } else {
        fragments[fragments.length - 1].push(child);
      }
    }

    // Build replacement nodes
    const replacement: ElementContent[] = [];
    for (const frag of fragments) {
      if (frag.length === 0) continue;
      if (frag.length === 1 && frag[0].type === 'element' && frag[0].tagName === 'p') {
        // Already a <p>, keep it directly
        replacement.push(frag[0]);
      } else {
        // Wrap remaining inline content in a <p>
        const onlyWhitespace = frag.every((c) => c.type === 'text' && c.value.trim() === '');
        if (!onlyWhitespace) {
          replacement.push({
            type: 'element',
            tagName: 'p',
            properties: { ...node.properties },
            children: frag,
          });
        }
      }
    }

    // Replace this node's children with the flattened result
    // We need to splice into the parent, so we mark this for replacement
    (node as Element & { _replaceWith?: ElementContent[] })._replaceWith = replacement;
  }

  // Now apply replacements for children that were marked
  const newChildren: ElementContent[] = [];
  for (const child of node.children as (ElementContent & { _replaceWith?: ElementContent[] })[]) {
    if (child._replaceWith) {
      newChildren.push(...child._replaceWith);
      delete child._replaceWith;
    } else {
      newChildren.push(child);
    }
  }
  node.children = newChildren as typeof node.children;
}

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Syntax-highlight a code string using lowlight.
 * Returns an HTML string with hljs classes.
 */
function highlightCode(code: string, language?: string): string {
  if (!language || language === 'plaintext' || language === 'text') {
    return escapeHtml(code);
  }
  try {
    const tree = lowlight.highlight(language, code);
    return toHtml(tree);
  } catch {
    // Language not registered — fallback to auto-detect
    try {
      const tree = lowlight.highlightAuto(code);
      return toHtml(tree);
    } catch {
      return escapeHtml(code);
    }
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Renders a tasks code block as a proper task list with checkboxes
 */
function TasksBlock({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="my-4 space-y-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Check for phase/section headers (## Phase 1: ...)
        const headerMatch = trimmed.match(/^##\s+(.+)$/);
        if (headerMatch) {
          return (
            <div key={idx} className="text-foreground font-semibold mt-4 mb-2 text-sm">
              {headerMatch[1]}
            </div>
          );
        }

        // Check for task items (- [ ] or - [x])
        const taskMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.+)$/);
        if (taskMatch) {
          const isChecked = taskMatch[1].toLowerCase() === 'x';
          const taskText = taskMatch[2];

          return (
            <div key={idx} className="flex items-start gap-2 py-1">
              {isChecked ? (
                <CheckSquare className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm',
                  isChecked ? 'text-muted-foreground line-through' : 'text-foreground-secondary'
                )}
              >
                {taskText}
              </span>
            </div>
          );
        }

        // Empty lines
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // Other content (render as-is)
        return (
          <div key={idx} className="text-sm text-foreground-secondary">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Custom code component for react-markdown that adds syntax highlighting.
 * Also handles special 'tasks' code blocks from upstream.
 */
const CodeBlock = memo(function CodeBlock({
  className,
  children,
  ...props
}: React.ComponentProps<'code'> & { node?: unknown }) {
  const match = className?.match(/language-(\S+)/);
  const language = match ? match[1] : undefined;
  const code = String(children).replace(/\n$/, '');

  // Special handling for tasks code blocks (from upstream)
  if (language === 'tasks') {
    return <TasksBlock content={code} />;
  }

  // Inline code (no language class and no newlines)
  const isInline = !className && !String(children).includes('\n');
  if (isInline) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  // Code block with syntax highlighting
  const highlighted = highlightCode(code, language);

  return (
    <code
      className={cn(className, 'hljs')}
      dangerouslySetInnerHTML={{ __html: highlighted }}
      {...props}
    />
  );
});

/**
 * Wrap tables so they remain readable in narrow cards/bubbles.
 */
const TableBlock = memo(function TableBlock({
  children,
  className,
  ...props
}: React.ComponentProps<'table'> & { node?: unknown }) {
  return (
    <div className="my-3 w-full overflow-x-auto rounded-md border border-muted/60">
      <table className={cn('w-full border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  );
});

/**
 * Reusable Markdown component for rendering markdown content
 * Theme-aware styling that adapts to all predefined themes
 * Supports raw HTML elements including images
 * Includes syntax highlighting for code blocks via lowlight
 */
export const Markdown = memo(function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm prose-invert max-w-none prose-accents',
        // Headings — compact, closer to body text size (terminal-style)
        // Sizes scale with --heading-scale CSS variable (default 1.0, set by chat-display-styled)
        '[&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1',
        '[&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1',
        '[&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-0.5',
        '[&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-0.5',
        // Paragraphs — compact spacing between paragraphs
        '[&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:my-1.5 [&_p]:whitespace-pre-wrap',
        // Lists — modern, clean look with comfortable spacing (markers via CSS below)
        '[&_ul]:my-2 [&_ul]:pl-0 [&_ul]:list-none [&_ol]:my-2 [&_ol]:pl-0 [&_ol]:list-none',
        '[&_ul_ul]:my-0.5 [&_ol_ol]:my-0.5',
        '[&_li]:text-foreground-secondary [&_li]:my-0 [&_li]:whitespace-normal [&_li]:leading-relaxed',
        '[&_li_p]:!my-0 [&_li_p]:!leading-snug',
        // Code — subtle inline code, accent color set by .prose-accents
        '[&_code]:bg-muted/60 [&_code]:px-1 [&_code]:py-px [&_code]:rounded-sm [&_code]:text-[0.85em]',
        '[&_pre]:bg-card [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:my-1.5 [&_pre]:p-3 [&_pre]:overflow-x-auto',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        // Strong/Bold — accent color set by .prose-accents
        '[&_strong]:font-semibold',
        // Links
        '[&_a]:text-brand-500 [&_a]:no-underline hover:[&_a]:underline',
        // Blockquotes
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:my-1',
        // Horizontal rules
        '[&_hr]:border-border [&_hr]:my-3',
        // Images
        '[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-1.5 [&_img]:border [&_img]:border-border',
        // Tables
        '[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:bg-muted/50',
        '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-sm [&_td]:text-foreground-secondary [&_td]:align-top',
        '[&_tr:nth-child(even)_td]:bg-muted/25',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeFixNestedP]}
        components={{
          code: CodeBlock as React.ComponentType<React.ComponentProps<'code'>>,
          table: TableBlock as React.ComponentType<React.ComponentProps<'table'>>,
        }}
      >
        {children}
      </ReactMarkdown>

      <style>{syntaxStyles}</style>
    </div>
  );
});

/**
 * Syntax highlighting styles for lowlight/hljs classes.
 * Uses CSS variables so they adapt to all app themes.
 */
const syntaxStyles = `
  /* Heading sizes — scale with --heading-scale (default 1.0) */
  .prose h1 { font-size: calc(1rem * var(--heading-scale, 1)); }
  .prose h2 { font-size: calc(0.94rem * var(--heading-scale, 1)); }
  .prose h3 { font-size: calc(0.88rem * var(--heading-scale, 1)); }
  .prose h4 { font-size: calc(0.875rem * var(--heading-scale, 1)); }

  /* Remove excessive spacing from <p> inside list items (markdown parser wraps content in <p>) */
  .prose li > p,
  .prose li > p:first-child,
  .prose li > p:last-child {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }
  /* Adjacent <p> siblings in list items: tiny gap instead of full paragraph spacing */
  .prose li > p + p {
    margin-top: 0.15em !important;
  }

  /* Modern list styling — custom markers */
  .prose ul, .prose ol {
    padding-left: 0;
    list-style: none;
  }
  .prose li {
    position: relative;
    padding-left: 1.25em;
  }
  .prose ul > li + li,
  .prose ol > li + li {
    margin-top: 0.15em;
  }
  /* Unordered list bullets — round, cleaner and optically centered */
  .prose ul > li::before {
    content: "";
    position: absolute;
    left: 0.1em;
    top: 0.7em;
    transform: translateY(-50%);
    width: 0.34em;
    height: 0.34em;
    border-radius: 9999px;
    background: hsl(var(--muted-foreground));
    opacity: 0.9;
  }
  .prose ul ul > li::before {
    width: 0.28em;
    height: 0.28em;
    left: 0.13em;
    background: transparent;
    border: 1.5px solid hsl(var(--muted-foreground));
    opacity: 0.85;
  }
  .prose ul ul ul > li::before {
    width: 0.24em;
    height: 0.24em;
    left: 0.15em;
    border-radius: 2px;
    background: hsl(var(--muted-foreground));
    border: none;
    opacity: 0.82;
  }
  /* Ordered list numbers */
  .prose ol {
    counter-reset: list-counter;
  }
  .prose ol > li {
    counter-increment: list-counter;
  }
  .prose ol > li::before {
    content: counter(list-counter) ".";
    position: absolute;
    left: 0;
    color: var(--muted-foreground);
    font-weight: 600;
    font-size: 0.85em;
    font-variant-numeric: tabular-nums;
    min-width: 1.25em;
  }
  .prose ol ol > li::before {
    content: counter(list-counter, lower-alpha) ".";
  }

  .prose .hljs-keyword { color: var(--chart-4, oklch(0.7 0.15 280)); }
  .prose .hljs-string { color: var(--chart-1, oklch(0.646 0.222 41.116)); }
  .prose .hljs-number { color: var(--chart-3, oklch(0.7 0.15 150)); }
  .prose .hljs-comment { color: var(--muted-foreground); font-style: italic; }
  .prose .hljs-function,
  .prose .hljs-title { color: var(--chart-2, oklch(0.6 0.118 184.704)); }
  .prose .hljs-params { color: var(--foreground); }
  .prose .hljs-built_in,
  .prose .hljs-type { color: var(--chart-5, oklch(0.769 0.188 70.08)); }
  .prose .hljs-attr { color: var(--chart-2, oklch(0.6 0.118 184.704)); }
  .prose .hljs-variable { color: var(--foreground); }
  .prose .hljs-literal { color: var(--chart-4, oklch(0.7 0.15 280)); }
  .prose .hljs-meta { color: var(--muted-foreground); }
  .prose .hljs-selector-tag,
  .prose .hljs-tag,
  .prose .hljs-name { color: var(--chart-1, oklch(0.646 0.222 41.116)); }
  .prose .hljs-selector-class,
  .prose .hljs-attribute { color: var(--chart-2, oklch(0.6 0.118 184.704)); }
`;
