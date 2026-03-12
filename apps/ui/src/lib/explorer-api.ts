/**
 * Markdown Explorer API helpers for project file browsing.
 *
 * Endpoints (mounted at /api/markdown-explorer):
 *   POST /search        — Search files by name/content
 *   GET  /files-by-time — Get files modified within a time range
 */

import { apiFetch } from './api-fetch';
import type {
  ExplorerSearchResult,
  ExplorerSearchOptions,
  ExplorerTimeFilteredFile,
} from '@automaker/types';

const BASE = '/api/markdown-explorer';

/** Search files within a project. */
export async function searchExplorerFiles(
  options: ExplorerSearchOptions,
): Promise<{ results: ExplorerSearchResult[]; totalCount: number }> {
  const res = await apiFetch(`${BASE}/search`, 'POST', {
    body: {
      projectPath: options.projectPath,
      query: options.query,
      searchContent: options.searchContent ?? false,
      limit: options.limit ?? 100,
      sinceHours: options.sinceHours,
    },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Suche fehlgeschlagen (${res.status})`);
  }
  return { results: json.results, totalCount: json.totalCount };
}

/** Get files modified within the last N hours. */
export async function getFilesByTime(
  projectPath: string,
  sinceHours: number,
  limit = 500,
): Promise<{ files: ExplorerTimeFilteredFile[]; totalCount: number }> {
  const params = new URLSearchParams({
    projectPath,
    sinceHours: String(sinceHours),
    limit: String(limit),
  });

  const res = await apiFetch(`${BASE}/files-by-time?${params}`, 'GET');

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Zeitfilter-Abfrage fehlgeschlagen (${res.status})`);
  }
  return { files: json.files, totalCount: json.totalCount };
}
