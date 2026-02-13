import TurndownService from 'turndown';
import { marked } from 'marked';

// ============================================================================
// Markdown → HTML (for loading into TipTap)
// ============================================================================

/**
 * Convert Markdown to HTML for TipTap to consume.
 * Uses `marked` for parsing with GFM (GitHub Flavored Markdown).
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const html = marked.parse(markdown, {
    gfm: true,
    breaks: false,
  });

  // marked.parse can return string | Promise<string> depending on config.
  // With synchronous usage (no async extensions), it always returns string.
  return html as string;
}

// ============================================================================
// HTML → Markdown (for saving from TipTap)
// ============================================================================

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
});

// Preserve code block language tags
turndownService.addRule('fencedCodeBlock', {
  filter: (node) => {
    return (
      node.nodeName === 'PRE' && node.firstChild !== null && node.firstChild.nodeName === 'CODE'
    );
  },
  replacement: (_content, node) => {
    const codeEl = node.firstElementChild as HTMLElement | null;
    if (!codeEl) return _content;

    const text = codeEl.textContent || '';
    // Extract language from class="language-xxx"
    const langMatch = codeEl.className?.match(/language-(\S+)/);
    const lang = langMatch ? langMatch[1] : '';

    return `\n\n\`\`\`${lang}\n${text.replace(/\n$/, '')}\n\`\`\`\n\n`;
  },
});

// Handle strikethrough
turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`,
});

// Handle underline (non-standard but useful)
turndownService.addRule('underline', {
  filter: ['u'],
  replacement: (content) => `<u>${content}</u>`,
});

// Handle highlight/mark
turndownService.addRule('highlight', {
  filter: ['mark'],
  replacement: (content) => `==${content}==`,
});

// Handle tables → Markdown pipe format
turndownService.addRule('tableCell', {
  filter: ['th', 'td'],
  replacement: (content) => {
    // Trim and escape pipes in cell content
    const cleaned = content.trim().replace(/\|/g, '\\|').replace(/\n/g, ' ');
    return cleaned;
  },
});

turndownService.addRule('tableRow', {
  filter: 'tr',
  replacement: (_content, node) => {
    const cells = Array.from(node.childNodes).filter(
      (child) => child.nodeName === 'TD' || child.nodeName === 'TH'
    );

    const cellContents = cells.map((cell) => {
      const content = (cell.textContent || '').trim().replace(/\|/g, '\\|').replace(/\n/g, ' ');
      return content;
    });

    return '| ' + cellContents.join(' | ') + ' |';
  },
});

turndownService.addRule('table', {
  filter: 'table',
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const rows = Array.from(el.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const result: string[] = [];
    let headerDone = false;

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td, th'));
      const isHeader = cells.some((c) => c.nodeName === 'TH');
      const cellTexts = cells.map((cell) => {
        const text = (cell.textContent || '').trim().replace(/\|/g, '\\|').replace(/\n/g, ' ');
        return text;
      });

      result.push('| ' + cellTexts.join(' | ') + ' |');

      // Add separator after header row
      if (isHeader && !headerDone) {
        const separator = cells.map((cell) => {
          const align = (cell as HTMLElement).style?.textAlign;
          if (align === 'center') return ':---:';
          if (align === 'right') return '---:';
          return '---';
        });
        result.push('| ' + separator.join(' | ') + ' |');
        headerDone = true;
      }
    }

    // If no header row was found, add a separator after the first row
    if (!headerDone && result.length > 0) {
      const firstRowCells = Array.from(rows[0].querySelectorAll('td, th'));
      const separator = firstRowCells.map(() => '---');
      result.splice(1, 0, '| ' + separator.join(' | ') + ' |');
    }

    return '\n\n' + result.join('\n') + '\n\n';
  },
});

// Prevent turndown from processing thead/tbody/tfoot wrappers
turndownService.addRule('tableSection', {
  filter: ['thead', 'tbody', 'tfoot'],
  replacement: (content) => content,
});

/**
 * Convert HTML to Markdown for saving.
 * Uses Turndown with custom rules for code blocks, strikethrough, etc.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';

  let markdown = turndownService.turndown(html);

  // Clean up excessive blank lines (more than 2 consecutive)
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  // Ensure file ends with a single newline
  markdown = markdown.trimEnd() + '\n';

  return markdown;
}

/**
 * Get content from a TipTap editor as Markdown.
 * Combines getHTML() + htmlToMarkdown().
 */
export function editorHtmlToMarkdown(html: string): string {
  return htmlToMarkdown(html);
}
