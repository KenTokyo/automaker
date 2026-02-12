import { useState, useMemo, useCallback } from 'react';
import type { SessionListItem } from '@/types/electron';

interface UseSessionFilterOptions {
  sessions: SessionListItem[];
  searchTerm: string;
}

/**
 * Manages filter state and applies project + search filtering on sessions.
 * All filtering is client-side with memoized results.
 */
export function useSessionFilter({ sessions, searchTerm }: UseSessionFilterOptions) {
  const [filterProjectPath, setFilterProjectPath] = useState<string | null>(null);

  const resetFilter = useCallback(() => {
    setFilterProjectPath(null);
  }, []);

  const sessionCountByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const session of sessions) {
      if (session.projectPath) {
        counts[session.projectPath] = (counts[session.projectPath] || 0) + 1;
      }
    }
    return counts;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    let result = sessions;

    // Filter by project
    if (filterProjectPath) {
      result = result.filter((s) => s.projectPath === filterProjectPath);
    }

    // Filter by search term (case-insensitive, matches name and preview)
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          (s.preview && s.preview.toLowerCase().includes(lower))
      );
    }

    return result;
  }, [sessions, filterProjectPath, searchTerm]);

  return {
    filterProjectPath,
    setFilterProjectPath,
    resetFilter,
    filteredSessions,
    sessionCountByProject,
  };
}
