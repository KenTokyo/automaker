/**
 * Markdown Explorer Service
 *
 * Provides recursive file search (by name and content) within a project directory.
 * Uses secureFs for path-safe access.
 */

import path from 'path';
import { secureFs, isPathWithinDirectory } from '@automaker/platform';
import { createLogger } from '@automaker/utils';

const logger = createLogger('MarkdownExplorerService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult {
  name: string;
  path: string;
  isDirectory: boolean;
  /** Line number (1-based) of first match when searching content */
  matchLine?: number;
  /** Short excerpt around the match */
  snippet?: string;
}

export interface SearchOptions {
  projectPath: string;
  query: string;
  /** Also search file contents, not just filenames */
  searchContent?: boolean;
  /** Max results to return (default 100) */
  limit?: number;
  /** Only include files modified within the last N hours (0 = all) */
  sinceHours?: number;
}

export interface TimeFilteredFile {
  name: string;
  path: string;
  /** Last modified timestamp (ms since epoch) */
  modified: number;
  /** File size in bytes */
  size: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  '.cache',
  '.turbo',
  '.vercel',
  '__pycache__',
  '.automaker',
  '.vscode',
  '.idea',
  'coverage',
]);

/** Extensions considered text-searchable */
const TEXT_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.css',
  '.scss',
  '.html',
  '.yml',
  '.yaml',
  '.toml',
  '.xml',
  '.svg',
  '.env',
  '.sh',
  '.bash',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.vue',
  '.svelte',
  '.astro',
]);

const MAX_CONTENT_SEARCH_FILE_SIZE = 512 * 1024; // 512 KB
const MAX_DEPTH = 12;
const DEFAULT_LIMIT = 100;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

function shouldIgnore(name: string): boolean {
  return IGNORED_NAMES.has(name) || name.startsWith('.');
}

function isTextFile(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

/**
 * Build a short snippet around a match position in a line.
 */
function buildSnippet(line: string, matchIndex: number): string {
  const contextChars = 40;
  const start = Math.max(0, matchIndex - contextChars);
  const end = Math.min(line.length, matchIndex + contextChars);
  let snippet = line.slice(start, end).trim();
  if (start > 0) snippet = '…' + snippet;
  if (end < line.length) snippet = snippet + '…';
  return snippet;
}

/**
 * Recursively search a project directory for files matching a query.
 */
export async function searchProject(options: SearchOptions): Promise<SearchResult[]> {
  const { projectPath, query, searchContent = false, limit = DEFAULT_LIMIT, sinceHours } = options;
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];
  const cutoffMs = sinceHours && sinceHours > 0 ? Date.now() - sinceHours * 3600000 : 0;

  async function walk(dirPath: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH || results.length >= limit) return;

    // Safety: ensure we stay within the project
    if (!isPathWithinDirectory(dirPath, projectPath)) return;

    let entries;
    try {
      entries = await secureFs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= limit) return;
      if (shouldIgnore(entry.name)) continue;

      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Directories are never time-filtered — always recurse
        if (entry.name.toLowerCase().includes(lowerQuery)) {
          results.push({ name: entry.name, path: entryPath, isDirectory: true });
        }
        await walk(entryPath, depth + 1);
        continue;
      }

      // Time filter: skip files older than the cutoff
      if (cutoffMs > 0) {
        try {
          const stat = await secureFs.stat(entryPath);
          if (Number(stat.mtimeMs) < cutoffMs) continue;
        } catch {
          continue;
        }
      }

      // Filename match
      if (entry.name.toLowerCase().includes(lowerQuery)) {
        results.push({ name: entry.name, path: entryPath, isDirectory: false });
      } else if (searchContent && isTextFile(entry.name)) {
        // Content search (only if not already matched by filename)
        try {
          const stat = await secureFs.stat(entryPath);
          if (Number(stat.size) > MAX_CONTENT_SEARCH_FILE_SIZE) continue;

          const raw = await secureFs.readFile(entryPath, 'utf-8');
          const content = typeof raw === 'string' ? raw : raw.toString('utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const idx = lines[i].toLowerCase().indexOf(lowerQuery);
            if (idx !== -1) {
              results.push({
                name: entry.name,
                path: entryPath,
                isDirectory: false,
                matchLine: i + 1,
                snippet: buildSnippet(lines[i], idx),
              });
              break; // One result per file
            }
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  try {
    await walk(projectPath, 0);
  } catch (err) {
    logger.error('Search failed:', err);
  }

  return results;
}

/**
 * Get all files modified within the last N hours.
 * Used by the Dashboard generation (Plan 21) and the Explorer time filter.
 * Returns files sorted by modified date (newest first).
 */
export async function getFilesFilteredByTime(
  projectPath: string,
  sinceHours: number,
  limit = 500
): Promise<TimeFilteredFile[]> {
  const cutoffMs = Date.now() - sinceHours * 3600000;
  const results: TimeFilteredFile[] = [];

  async function walk(dirPath: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH || results.length >= limit) return;
    if (!isPathWithinDirectory(dirPath, projectPath)) return;

    let entries;
    try {
      entries = await secureFs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= limit) return;
      if (shouldIgnore(entry.name)) continue;

      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await walk(entryPath, depth + 1);
        continue;
      }

      try {
        const stat = await secureFs.stat(entryPath);
        const mtimeMs = Number(stat.mtimeMs);
        if (mtimeMs >= cutoffMs) {
          results.push({
            name: entry.name,
            path: entryPath,
            modified: mtimeMs,
            size: Number(stat.size),
          });
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  try {
    await walk(projectPath, 0);
  } catch (err) {
    logger.error('getFilesFilteredByTime failed:', err);
  }

  // Sort newest first
  results.sort((a, b) => b.modified - a.modified);
  return results;
}
