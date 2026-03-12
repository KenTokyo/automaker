/**
 * Tree utilities for filtering, sorting, and counting in the file explorer.
 */

import type { FileTreeNode, MarkdownFileEntry } from '@/store/explorer-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortBy = 'modified' | 'created' | 'name';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOUR_MS = 3_600_000;

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

/**
 * Filters a flat file list by time window.
 * @param timeFilterHours 0 = all files, otherwise only files modified within this many hours
 */
export function filterFilesByTime(
  files: MarkdownFileEntry[],
  timeFilterHours: number
): MarkdownFileEntry[] {
  if (timeFilterHours <= 0) return files;
  const cutoff = Date.now() - timeFilterHours * HOUR_MS;
  return files.filter((f) => f.modified >= cutoff);
}

// ---------------------------------------------------------------------------
// Sort (tree nodes)
// ---------------------------------------------------------------------------

/**
 * Recursively sorts tree children: folders first, then files.
 * Both groups sorted by the chosen criterion. Returns a new tree.
 */
export function sortTreeChildren(nodes: FileTreeNode[], sortBy: SortBy): FileTreeNode[] {
  const folders: FileTreeNode[] = [];
  const files: FileTreeNode[] = [];

  for (const n of nodes) {
    if (n.isDirectory) {
      folders.push({
        ...n,
        children: sortTreeChildren(n.children, sortBy),
      });
    } else {
      files.push(n);
    }
  }

  const cmp = getNodeComparator(sortBy);
  folders.sort(cmp);
  files.sort(cmp);

  return [...folders, ...files];
}

function getNodeComparator(sortBy: SortBy): (a: FileTreeNode, b: FileTreeNode) => number {
  switch (sortBy) {
    case 'modified':
      return (a, b) => (b.modified ?? 0) - (a.modified ?? 0);
    case 'created':
      return (a, b) => (b.created ?? 0) - (a.created ?? 0);
    case 'name':
      return (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  }
}

// ---------------------------------------------------------------------------
// Folder metadata
// ---------------------------------------------------------------------------

/** Counts all file (non-directory) descendants recursively. */
export function countFilesInFolder(node: FileTreeNode): number {
  let count = 0;
  for (const child of node.children) {
    count += child.isDirectory ? countFilesInFolder(child) : 1;
  }
  return count;
}

/** Gets the newest modified timestamp among all descendants. */
export function getNewestModified(node: FileTreeNode): number {
  let newest = node.modified ?? 0;
  for (const child of node.children) {
    const ts = child.isDirectory ? getNewestModified(child) : (child.modified ?? 0);
    if (ts > newest) newest = ts;
  }
  return newest;
}

// ---------------------------------------------------------------------------
// Search filter (client-side name matching)
// ---------------------------------------------------------------------------

/**
 * Recursively filters tree nodes by name search query.
 * Keeps directories that contain matching descendants or whose own name matches.
 */
export function filterTreeByName(
  nodes: FileTreeNode[],
  query: string,
  filters: { folders: boolean; files: boolean }
): FileTreeNode[] {
  if (!query.trim()) return nodes;
  const lowerQuery = query.toLowerCase();

  return nodes.reduce<FileTreeNode[]>((acc, node) => {
    if (node.isDirectory) {
      const filteredChildren = filterTreeByName(node.children, query, filters);
      const nameMatches = filters.folders && node.name.toLowerCase().includes(lowerQuery);

      if (filteredChildren.length > 0 || nameMatches) {
        acc.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
    } else {
      if (filters.files && node.name.toLowerCase().includes(lowerQuery)) {
        acc.push(node);
      }
    }
    return acc;
  }, []);
}

/**
 * Collects all directory paths that contain search matches (for auto-expand).
 */
export function collectMatchingFolderPaths(
  nodes: FileTreeNode[],
  query: string,
  filters: { folders: boolean; files: boolean }
): Set<string> {
  const paths = new Set<string>();
  if (!query.trim()) return paths;
  const lowerQuery = query.toLowerCase();

  function walk(nodeList: FileTreeNode[], ancestors: string[]): boolean {
    let hasMatch = false;
    for (const node of nodeList) {
      if (node.isDirectory) {
        const nameMatches = filters.folders && node.name.toLowerCase().includes(lowerQuery);
        const childMatch = walk(node.children, [...ancestors, node.path]);
        if (nameMatches || childMatch) {
          hasMatch = true;
          // Expand this folder and all ancestors
          paths.add(node.path);
          for (const a of ancestors) paths.add(a);
        }
      } else {
        if (filters.files && node.name.toLowerCase().includes(lowerQuery)) {
          hasMatch = true;
          for (const a of ancestors) paths.add(a);
        }
      }
    }
    return hasMatch;
  }

  walk(nodes, []);
  return paths;
}

/**
 * Annotates each directory node with its recursive file count.
 * Mutates nodes in-place (call on freshly created tree from sortTreeChildren).
 */
export function annotateFolderMeta(nodes: FileTreeNode[]): void {
  for (const node of nodes) {
    if (node.isDirectory) {
      annotateFolderMeta(node.children);
      node.fileCount = countFilesInFolder(node);
    }
  }
}
