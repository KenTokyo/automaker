/**
 * File Path Extraction Utilities
 *
 * Extracts file paths from chat message content using regex patterns.
 * Useful for summarizing which files were discussed in a session.
 */

// ============================================================================
// Types
// ============================================================================

export interface ExtractedFileInfo {
  /** All unique file paths found */
  allFiles: string[];
  /** .md files */
  mdFiles: string[];
  /** .ts, .tsx files */
  tsFiles: string[];
  /** .js, .jsx files */
  jsFiles: string[];
  /** .json, .yaml, .yml, .toml, .env, etc. */
  configFiles: string[];
  /** .css, .scss files */
  styleFiles: string[];
  /** Everything else */
  otherFiles: string[];
  /** Total count of unique files */
  totalCount: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * File extensions we want to detect.
 * Grouped by category for easier maintenance.
 */
const FILE_EXTENSIONS = {
  md: ['md'],
  ts: ['ts', 'tsx'],
  js: ['js', 'jsx'],
  config: ['json', 'yaml', 'yml', 'toml', 'env', 'lock', 'config'],
  style: ['css', 'scss'],
  other: [
    'html',
    'py',
    'rs',
    'go',
    'vue',
    'svelte',
    'astro',
    'prisma',
    'sql',
    'sh',
    'bash',
    'graphql',
    'gql',
    'xml',
    'txt',
    'log',
  ],
} as const;

/** All supported extensions as a flat array */
const ALL_EXTENSIONS = [
  ...FILE_EXTENSIONS.md,
  ...FILE_EXTENSIONS.ts,
  ...FILE_EXTENSIONS.js,
  ...FILE_EXTENSIONS.config,
  ...FILE_EXTENSIONS.style,
  ...FILE_EXTENSIONS.other,
];

/** Extensions pattern for regex (escaped dots not needed inside character class) */
const EXTENSIONS_PATTERN = ALL_EXTENSIONS.join('|');

/**
 * Main regex pattern for detecting file paths.
 *
 * Matches paths like:
 * - src/components/foo.tsx
 * - ./libs/types/index.ts
 * - ../utils/helper.js
 * - D:\path\to\file.ts (Windows absolute paths)
 * - /home/user/project/file.py (Unix absolute paths)
 *
 * Does NOT match:
 * - URLs (http://, https://)
 * - Email addresses (user@domain.com)
 * - Version numbers (v1.2.3)
 * - Bare extensions (.ts without path)
 */
const FILE_PATH_REGEX = new RegExp(
  // Negative lookbehind to exclude URLs and emails
  '(?<![a-zA-Z0-9@:/])' +
    // Start of path: relative (./ or ../) OR directory name OR Windows drive letter
    '(' +
    // Windows absolute path (D:\, C:\, etc.)
    '(?:[A-Za-z]:[/\\\\])' +
    '|' +
    // Unix absolute path
    '(?:/)' +
    '|' +
    // Relative paths (./ or ../)
    '(?:\\.{1,2}[/\\\\])' +
    '|' +
    // Directory name followed by slash (src/, libs/, etc.)
    '(?:[a-zA-Z_][a-zA-Z0-9_-]*[/\\\\])' +
    ')' +
    // Path segments: any combination of directory names and slashes
    '(?:[a-zA-Z0-9_@.-]+[/\\\\])*' +
    // Final filename with extension
    '[a-zA-Z0-9_@.-]+' +
    // File extension
    '\\.(' +
    EXTENSIONS_PATTERN +
    ')' +
    // Word boundary to prevent partial matches
    '(?![a-zA-Z0-9])',
  'gi'
);

/**
 * Pattern to detect URLs (to filter them out).
 */
const URL_PATTERN = /^https?:\/\//i;

/**
 * Pattern to detect email addresses (to filter them out).
 */
const EMAIL_PATTERN = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

/**
 * Pattern to detect version numbers like v1.2.3 or 1.2.3.
 */
const VERSION_PATTERN = /^v?\d+\.\d+(\.\d+)?$/i;

/**
 * Trailing punctuation to strip from detected paths.
 */
const TRAILING_PUNCTUATION = /[,);:'">\]]+$/;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalizes a file path by converting backslashes to forward slashes.
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Checks if a string looks like a URL.
 */
function isUrl(str: string): boolean {
  return URL_PATTERN.test(str);
}

/**
 * Checks if a string contains an email pattern.
 */
function containsEmail(str: string): boolean {
  return EMAIL_PATTERN.test(str);
}

/**
 * Checks if a string is a version number.
 */
function isVersionNumber(str: string): boolean {
  return VERSION_PATTERN.test(str);
}

/**
 * Gets the file extension from a path (lowercase, without dot).
 */
function getExtension(path: string): string {
  const match = path.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Categorizes a file path based on its extension.
 */
function categorizeFile(path: string): 'md' | 'ts' | 'js' | 'config' | 'style' | 'other' {
  const ext = getExtension(path);

  if (FILE_EXTENSIONS.md.includes(ext as never)) return 'md';
  if (FILE_EXTENSIONS.ts.includes(ext as never)) return 'ts';
  if (FILE_EXTENSIONS.js.includes(ext as never)) return 'js';
  if (FILE_EXTENSIONS.config.includes(ext as never)) return 'config';
  if (FILE_EXTENSIONS.style.includes(ext as never)) return 'style';
  return 'other';
}

/**
 * Cleans a detected path by stripping trailing punctuation.
 */
function cleanPath(path: string): string {
  return path.replace(TRAILING_PUNCTUATION, '');
}

/**
 * Validates that a detected path is actually a valid file path.
 * Filters out false positives.
 */
function isValidFilePath(path: string): boolean {
  // Must not be a URL
  if (isUrl(path)) return false;

  // Must not contain email patterns
  if (containsEmail(path)) return false;

  // Must not be a version number
  if (isVersionNumber(path)) return false;

  // Must have at least one path separator (not just a bare filename)
  // This is already enforced by the regex, but double-check
  if (!path.includes('/') && !path.includes('\\')) return false;

  // Must not be too short (at least "a/b.ts" = 6 chars)
  if (path.length < 5) return false;

  return true;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Extracts all file paths from a text string.
 *
 * @param content - The text content to search for file paths
 * @returns Array of unique file paths found, normalized with forward slashes
 *
 * @example
 * extractFilePaths("Check out src/components/Button.tsx and ./lib/utils.ts")
 * // Returns: ["src/components/Button.tsx", "lib/utils.ts"]
 */
export function extractFilePaths(content: string): string[] {
  const matches: string[] = [];

  // Reset regex state (global flag means it maintains state)
  FILE_PATH_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = FILE_PATH_REGEX.exec(content)) !== null) {
    const rawPath = match[0];
    const cleanedPath = cleanPath(rawPath);
    const normalizedPath = normalizePath(cleanedPath);

    if (isValidFilePath(normalizedPath)) {
      matches.push(normalizedPath);
    }
  }

  // Remove duplicates while preserving order
  return [...new Set(matches)];
}

/**
 * Message interface for extractFilePathsFromMessages.
 */
export interface MessageWithContent {
  content: string;
}

/**
 * Extracts and categorizes file paths from an array of messages.
 *
 * @param messages - Array of messages with content property
 * @returns Categorized file information
 *
 * @example
 * const messages = [
 *   { content: "I modified src/index.ts" },
 *   { content: "Also updated README.md" }
 * ];
 * const files = extractFilePathsFromMessages(messages);
 * // files.tsFiles = ["src/index.ts"]
 * // files.mdFiles = ["README.md"] // Note: README.md won't match without path
 */
export function extractFilePathsFromMessages(messages: MessageWithContent[]): ExtractedFileInfo {
  // Collect all paths from all messages
  const allPaths: string[] = [];

  for (const message of messages) {
    if (typeof message.content === 'string') {
      const paths = extractFilePaths(message.content);
      allPaths.push(...paths);
    }
  }

  // Remove duplicates
  const uniquePaths = [...new Set(allPaths)];

  // Categorize files
  const mdFiles: string[] = [];
  const tsFiles: string[] = [];
  const jsFiles: string[] = [];
  const configFiles: string[] = [];
  const styleFiles: string[] = [];
  const otherFiles: string[] = [];

  for (const path of uniquePaths) {
    const category = categorizeFile(path);
    switch (category) {
      case 'md':
        mdFiles.push(path);
        break;
      case 'ts':
        tsFiles.push(path);
        break;
      case 'js':
        jsFiles.push(path);
        break;
      case 'config':
        configFiles.push(path);
        break;
      case 'style':
        styleFiles.push(path);
        break;
      case 'other':
        otherFiles.push(path);
        break;
    }
  }

  // Sort each category alphabetically
  mdFiles.sort();
  tsFiles.sort();
  jsFiles.sort();
  configFiles.sort();
  styleFiles.sort();
  otherFiles.sort();

  // Build allFiles in priority order: md first, then ts/tsx, then js/jsx, then others
  const allFiles = [
    ...mdFiles,
    ...tsFiles,
    ...jsFiles,
    ...configFiles,
    ...styleFiles,
    ...otherFiles,
  ];

  return {
    allFiles,
    mdFiles,
    tsFiles,
    jsFiles,
    configFiles,
    styleFiles,
    otherFiles,
    totalCount: allFiles.length,
  };
}

/**
 * Builds a markdown-formatted text summarizing session files.
 * Suitable for pasting into another chat or documentation.
 *
 * @param sessionName - The name of the session
 * @param description - Optional session description
 * @param files - The extracted file information
 * @returns Formatted markdown string
 *
 * @example
 * const text = buildSessionFilesCopyText("Feature Implementation", "Added login", files);
 * // Returns formatted markdown with session info and categorized file list
 */
export function buildSessionFilesCopyText(
  sessionName: string,
  description: string | undefined,
  files: ExtractedFileInfo
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Session: ${sessionName}`);
  lines.push('');

  // Description if provided
  if (description && description.trim()) {
    lines.push(`> ${description}`);
    lines.push('');
  }

  // File count summary
  lines.push(`**Files Referenced:** ${files.totalCount}`);
  lines.push('');

  // No files case
  if (files.totalCount === 0) {
    lines.push('_No file paths were detected in this session._');
    return lines.join('\n');
  }

  // Categorized file lists
  if (files.mdFiles.length > 0) {
    lines.push('## Documentation');
    for (const file of files.mdFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  if (files.tsFiles.length > 0) {
    lines.push('## TypeScript');
    for (const file of files.tsFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  if (files.jsFiles.length > 0) {
    lines.push('## JavaScript');
    for (const file of files.jsFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  if (files.configFiles.length > 0) {
    lines.push('## Configuration');
    for (const file of files.configFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  if (files.styleFiles.length > 0) {
    lines.push('## Styles');
    for (const file of files.styleFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  if (files.otherFiles.length > 0) {
    lines.push('## Other Files');
    for (const file of files.otherFiles) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
