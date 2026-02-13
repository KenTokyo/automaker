import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useAppStore } from '@/store/app-store';

const GRADIENT_DIR_MAP: Record<string, string> = {
  'to-right': 'to right',
  'to-bottom-right': 'to bottom right',
  'to-bottom': 'to bottom',
};

const WIDTH_MAP: Record<string, string> = {
  narrow: '600px',
  medium: '768px',
  wide: '1024px',
  full: '100%',
};

const FONT_MAP: Record<string, string> = {
  system: 'inherit',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: 'var(--font-mono)',
  inter: '"Inter", system-ui, -apple-system, sans-serif',
};

const CELL_PADDING_MAP: Record<string, string> = {
  compact: '0.25rem 0.5rem',
  normal: '0.375rem 0.625rem',
  spacious: '0.625rem 1rem',
};

/**
 * Hook that reads editor theme from the store and generates CSS custom properties.
 * Memoized — only recomputes when editorTheme changes.
 */
export function useEditorTheme() {
  const editorTheme = useAppStore((s) => s.editorTheme);

  const { themeStyles, themeClass } = useMemo(() => {
    const t = editorTheme;
    const scale = t.fontScale / 100;
    const vars: Record<string, string> = {
      '--docs-font-scale': String(scale),
      '--docs-body-font-size': `${t.bodyFontSize * scale}px`,
      '--docs-code-font-size': `${t.codeFontSize * scale}px`,
      '--docs-line-height': String(t.lineHeight),
      '--docs-editor-max-width': WIDTH_MAP[t.editorWidth] || '768px',
      '--docs-font-family': FONT_MAP[t.fontFamily] || 'inherit',
      '--docs-table-cell-padding':
        CELL_PADDING_MAP[t.tableStyles.cellPadding] || CELL_PADDING_MAP.normal,
    };

    // Table styles (only set if custom, empty = use theme defaults)
    if (t.tableStyles.headerBackground) {
      vars['--docs-table-header-bg'] = t.tableStyles.headerBackground;
    }
    if (t.tableStyles.stripedColor) {
      vars['--docs-table-stripe-color'] = t.tableStyles.stripedColor;
    }
    if (t.tableStyles.borderColor) {
      vars['--docs-table-border'] = t.tableStyles.borderColor;
    }

    // Heading styles
    for (const level of ['h1', 'h2', 'h3', 'h4'] as const) {
      const hs = t.headingStyles[level];
      vars[`--docs-${level}-size`] = `${hs.fontSize * scale}px`;
      vars[`--docs-${level}-weight`] = String(hs.fontWeight);

      if (hs.gradientEnabled) {
        const dir = GRADIENT_DIR_MAP[hs.gradientDirection] || 'to right';
        vars[`--docs-${level}-gradient`] =
          `linear-gradient(${dir}, ${hs.gradientFrom}, ${hs.gradientTo})`;
        vars[`--docs-${level}-color`] = 'transparent';
        vars[`--docs-${level}-bg-clip`] = 'text';
      } else if (hs.color) {
        vars[`--docs-${level}-color`] = hs.color;
        vars[`--docs-${level}-gradient`] = 'none';
        vars[`--docs-${level}-bg-clip`] = 'unset';
      } else {
        // Use default theme foreground color
        vars[`--docs-${level}-color`] = 'var(--foreground)';
        vars[`--docs-${level}-gradient`] = 'none';
        vars[`--docs-${level}-bg-clip`] = 'unset';
      }
    }

    const themeClass = [
      t.tableStyles.stripedRows ? 'docs-striped-rows' : '',
      t.fontFamily !== 'system' ? `docs-font-${t.fontFamily}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      themeStyles: vars as unknown as CSSProperties,
      themeClass,
    };
  }, [editorTheme]);

  return { themeStyles, themeClass };
}
