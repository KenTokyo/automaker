/**
 * Documentation types for the Docs panel feature
 *
 * Types shared between server and UI for browsing, viewing,
 * creating, and managing documentation files in .automaker/docs/
 */

/**
 * Supported document file extensions
 */
export const SUPPORTED_DOC_EXTENSIONS = ['.md', '.txt', '.markdown', '.mdown'] as const;

/**
 * Single document file metadata
 */
export interface DocFile {
  /** Filename (e.g. "plan.md") */
  name: string;
  /** Relative path within .automaker/docs/ */
  path: string;
  /** Absolute path on the filesystem */
  absolutePath: string;
  /** File extension (e.g. ".md", ".txt") */
  extension: string;
  /** File size in bytes */
  size: number;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last modification */
  modifiedAt: string;
  /** Whether this entry is a directory */
  isDirectory: boolean;
}

/**
 * Document file with its text content
 */
export interface DocContent {
  /** File metadata */
  file: DocFile;
  /** Text content of the file */
  content: string;
}

/**
 * Parameters for creating a new document
 */
export interface CreateDocParams {
  /** Project path */
  projectPath: string;
  /** Filename */
  name: string;
  /** Optional initial content */
  content?: string;
  /** Optional subfolder within docs/ */
  subfolder?: string;
}

/**
 * Parameters for updating a document
 */
export interface UpdateDocParams {
  /** Project path */
  projectPath: string;
  /** Relative path of the file within docs/ */
  filePath: string;
  /** New content */
  content: string;
}

/**
 * Parameters for deleting a document
 */
export interface DeleteDocParams {
  /** Project path */
  projectPath: string;
  /** Relative path of the file within docs/ */
  filePath: string;
}

/**
 * Parameters for listing documents
 */
export interface ListDocsParams {
  /** Project path */
  projectPath: string;
  /** Optional subfolder filter */
  subfolder?: string;
}

/**
 * Response for document listing
 */
export interface ListDocsResponse {
  /** List of document files */
  files: DocFile[];
  /** Total count */
  totalCount: number;
}

// ─── Editor Theme Settings ──────────────────────────────────────────

/**
 * Style settings for a single heading level (H1-H4)
 */
export interface HeadingStyle {
  color: string;
  gradientEnabled: boolean;
  gradientFrom: string;
  gradientTo: string;
  gradientDirection: 'to-right' | 'to-bottom-right' | 'to-bottom';
  fontSize: number;
  fontWeight: number;
}

/**
 * Style settings for tables in the editor
 */
export interface TableThemeStyles {
  headerBackground: string;
  stripedRows: boolean;
  stripedColor: string;
  borderColor: string;
  cellPadding: 'compact' | 'normal' | 'spacious';
}

/**
 * Complete editor theme settings
 */
export interface EditorThemeSettings {
  fontScale: number;
  bodyFontSize: number;
  codeFontSize: number;
  lineHeight: number;
  headingStyles: Record<'h1' | 'h2' | 'h3' | 'h4', HeadingStyle>;
  tableStyles: TableThemeStyles;
  editorWidth: 'narrow' | 'medium' | 'wide' | 'full';
  fontFamily: 'system' | 'serif' | 'mono' | 'inter';
}

/**
 * Default heading styles
 */
export const DEFAULT_HEADING_STYLES: Record<'h1' | 'h2' | 'h3' | 'h4', HeadingStyle> = {
  h1: {
    color: '',
    gradientEnabled: false,
    gradientFrom: '#3b82f6',
    gradientTo: '#8b5cf6',
    gradientDirection: 'to-right',
    fontSize: 30,
    fontWeight: 700,
  },
  h2: {
    color: '',
    gradientEnabled: false,
    gradientFrom: '#06b6d4',
    gradientTo: '#3b82f6',
    gradientDirection: 'to-right',
    fontSize: 24,
    fontWeight: 600,
  },
  h3: {
    color: '',
    gradientEnabled: false,
    gradientFrom: '#10b981',
    gradientTo: '#06b6d4',
    gradientDirection: 'to-right',
    fontSize: 20,
    fontWeight: 600,
  },
  h4: {
    color: '',
    gradientEnabled: false,
    gradientFrom: '#f59e0b',
    gradientTo: '#ef4444',
    gradientDirection: 'to-right',
    fontSize: 16,
    fontWeight: 600,
  },
};

/**
 * Default table theme styles
 */
export const DEFAULT_TABLE_STYLES: TableThemeStyles = {
  headerBackground: '',
  stripedRows: true,
  stripedColor: '',
  borderColor: '',
  cellPadding: 'normal',
};

/**
 * Default editor theme settings
 */
export const DEFAULT_EDITOR_THEME: EditorThemeSettings = {
  fontScale: 100,
  bodyFontSize: 16,
  codeFontSize: 14,
  lineHeight: 1.7,
  headingStyles: DEFAULT_HEADING_STYLES,
  tableStyles: DEFAULT_TABLE_STYLES,
  editorWidth: 'medium',
  fontFamily: 'system',
};
