import { Calendar, FileText, FolderOpen, Loader2, Pencil, SearchX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';
import { formatSmartDate } from './recency-utils';

const logger = createLogger('FileSearch');

interface FileSearchProps {
  query: string;
  projectPath: string | null;
  selectedFilePath: string | null;
  onSelectFile: (filePath: string) => void;
  /** When set, filter results to only show folders. Default: true (show all). */
  filterFolders?: boolean;
  /** When set, filter results to only show files. Default: true (show all). */
  filterFiles?: boolean;
}

interface SearchResultEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  matchLine?: number;
  snippet?: string;
  /** Last modified timestamp (ms) */
  modified?: number;
  /** Created timestamp (ms) */
  created?: number;
  /** File size in bytes */
  size?: number;
}

function getRelativePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  if (parts.length <= 3) return normalized;
  return '.../' + parts.slice(-3).join('/');
}

export function FileSearch({
  query,
  projectPath,
  selectedFilePath,
  onSelectFile,
  filterFolders = true,
  filterFiles = true,
}: FileSearchProps) {
  const [results, setResults] = useState<SearchResultEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef(0);

  // Suche ignoriert bewusst den Zeitfilter – durchsucht ALLE Dateien im Projekt
  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !projectPath) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      const searchId = ++abortRef.current;
      setIsSearching(true);

      try {
        const api = getHttpApiClient();
        const res = await api.explorerSearch(projectPath, q, {
          searchContent: true,
          limit: 200,
          // Kein sinceHours → alle Dateien durchsuchen, egal wie alt
        });

        if (searchId !== abortRef.current) return;

        if (res.success) {
          setResults(res.results);
        } else {
          setResults([]);
        }
      } catch (err) {
        if (searchId !== abortRef.current) return;
        logger.error('Search failed:', err);
        setResults([]);
      } finally {
        if (searchId === abortRef.current) {
          setIsSearching(false);
          setHasSearched(true);
        }
      }
    },
    [projectPath]
  );

  // Debounce the search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      void doSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, doSearch]);

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <SearchX className="h-6 w-6 opacity-40" />
        <p className="text-sm">Gib einen Suchbegriff ein.</p>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Apply folder/file type filter
  const visibleResults = results.filter((entry) => {
    if (entry.isDirectory && !filterFolders) return false;
    if (!entry.isDirectory && !filterFiles) return false;
    return true;
  });

  if (hasSearched && visibleResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <SearchX className="h-6 w-6 opacity-40" />
        <p className="text-sm">Keine Treffer fuer &ldquo;{query}&rdquo;.</p>
      </div>
    );
  }

  return (
    <div className="space-y-px py-1">
      <p className="px-2 pb-1 text-[10px] text-muted-foreground">
        {visibleResults.length} Treffer{results.length >= 100 ? ' (max.)' : ''}
      </p>
      {visibleResults.map((entry) => {
        const Icon = entry.isDirectory ? FolderOpen : FileText;
        const iconColor = entry.isDirectory ? 'text-blue-400' : 'text-emerald-400';
        const key = entry.matchLine ? `${entry.path}:${entry.matchLine}` : entry.path;

        return (
          <button
            key={key}
            type="button"
            className={cn(
              'group flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
              'hover:bg-muted/60 transition-colors',
              selectedFilePath === entry.path && 'bg-muted/80 text-foreground'
            )}
            onClick={() => onSelectFile(entry.path)}
            title={entry.path}
          >
            <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', iconColor)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{entry.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {getRelativePath(entry.path)}
              </p>
              {/* Erstellt- und Geändert-Datum */}
              {!entry.isDirectory && (entry.created || entry.modified) && (
                <div className="mt-0.5 flex items-center gap-3 text-[10px] leading-tight text-muted-foreground">
                  {entry.created ? (
                    <span className="flex items-center gap-0.5">
                      <Calendar className="h-2.5 w-2.5 shrink-0 opacity-60" />
                      {formatSmartDate(entry.created)}
                    </span>
                  ) : null}
                  {entry.modified ? (
                    <span className="flex items-center gap-0.5">
                      <Pencil className="h-2.5 w-2.5 shrink-0 opacity-60" />
                      {formatSmartDate(entry.modified)}
                    </span>
                  ) : null}
                </div>
              )}
              {entry.snippet && (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70 italic">
                  {entry.matchLine && (
                    <span className="not-italic font-medium">L{entry.matchLine}: </span>
                  )}
                  {entry.snippet}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
