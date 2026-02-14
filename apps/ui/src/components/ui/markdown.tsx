import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { common, createLowlight } from 'lowlight';
import { toHtml } from 'hast-util-to-html';
import { cn } from '@/lib/utils';

const lowlight = createLowlight(common);

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Preprocess text to preserve single line breaks as <br> tags
 * This ensures that newlines in the source text are rendered properly
 */
function preserveLineBreaks(text: string): string {
  if (!text) return text;

  // Split by code blocks to avoid processing them
  const codeBlockRegex = /(```[\s\S]*?```|`[^`\n]+`)/g;
  const parts = text.split(codeBlockRegex);

  return parts
    .map((part, index) => {
      // Even indices are regular text, odd indices are code blocks
      if (index % 2 === 0) {
        // Replace single newlines with <br> tags for proper line breaks
        // This works because we have rehype-raw enabled
        return part.replace(/(?<!\n)\n(?!\n)/g, '<br>\n');
      }
      return part;
    })
    .join('');
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
 * Custom code component for react-markdown that adds syntax highlighting.
 */
const CodeBlock = memo(function CodeBlock({
  className,
  children,
  ...props
}: React.ComponentProps<'code'> & { node?: unknown }) {
  const match = className?.match(/language-(\S+)/);
  const language = match ? match[1] : undefined;
  const code = String(children).replace(/\n$/, '');

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
 * Reusable Markdown component for rendering markdown content
 * Theme-aware styling that adapts to all predefined themes
 * Supports raw HTML elements including images
 * Includes syntax highlighting for code blocks via lowlight
 */
export const Markdown = memo(function Markdown({ children, className }: MarkdownProps) {
  const processedContent = useMemo(() => preserveLineBreaks(children), [children]);

  return (
    <div
      className={cn(
        'prose prose-sm prose-invert max-w-none',
        // Headings
        '[&_h1]:text-xl [&_h1]:text-foreground [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2',
        '[&_h2]:text-lg [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2',
        '[&_h3]:text-base [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
        '[&_h4]:text-sm [&_h4]:text-foreground [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1',
        // Paragraphs
        '[&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:my-2',
        // Lists
        '[&_ul]:my-2 [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:pl-4',
        '[&_li]:text-foreground-secondary [&_li]:my-0.5',
        // Code
        '[&_code]:text-chart-2 [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm',
        '[&_pre]:bg-card [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:my-2 [&_pre]:p-3 [&_pre]:overflow-x-auto',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        // Strong/Bold
        '[&_strong]:text-foreground [&_strong]:font-semibold',
        // Links
        '[&_a]:text-brand-500 [&_a]:no-underline hover:[&_a]:underline',
        // Blockquotes
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:my-2',
        // Horizontal rules
        '[&_hr]:border-border [&_hr]:my-4',
        // Images
        '[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2 [&_img]:border [&_img]:border-border',
        // Tables
        '[&_table]:w-full [&_table]:border-collapse [&_table]:my-3',
        '[&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-foreground [&_th]:bg-muted/50',
        '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:text-foreground-secondary',
        '[&_tr:nth-child(even)_td]:bg-muted/25',
        className
      )}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          code: CodeBlock as React.ComponentType<React.ComponentProps<'code'>>,
        }}
      >
        {processedContent}
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
