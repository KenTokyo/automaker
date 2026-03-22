import { useMemo } from 'react';
import type { SessionListItem } from '@/types/electron';
import type { SessionDisplayEntry } from '@/hooks/use-session-grouping';
import { buildDisplayEntries } from '@/hooks/use-session-grouping';

export interface ProjectGroup {
  /** Display name of the project (e.g. "automaker") */
  projectName: string;
  /** Full project path for identification */
  projectPath: string;
  /** All sessions belonging to this project, sorted newest first */
  allSessions: SessionListItem[];
  /** Total number of sessions in this project */
  totalCount: number;
}

interface UseProjectGroupingOptions {
  sessions: SessionListItem[];
  getProjectName: (projectPath: string | undefined) => string | null;
  /** Kept in the options for API consistency; not used internally. */
  expandedRunIds?: Record<string, boolean>;
}

/**
 * Groups sessions by project, sorted alphabetically by project name.
 * Each project group contains all sessions for that project.
 * Sessions within each group maintain their original ordering (newest first by updatedAt).
 */
export function useProjectGrouping({
  sessions,
  getProjectName,
  expandedRunIds,
}: UseProjectGroupingOptions): ProjectGroup[] {
  return useMemo(() => {
    // Group sessions by projectPath
    const byProject = new Map<string, SessionListItem[]>();

    for (const session of sessions) {
      const key = session.projectPath || '__no_project__';
      const existing = byProject.get(key);
      if (existing) {
        existing.push(session);
      } else {
        byProject.set(key, [session]);
      }
    }

    // Build project groups
    const groups: ProjectGroup[] = [];

    for (const [projectPath, projectSessions] of byProject) {
      const name =
        projectPath === '__no_project__'
          ? 'Unbekannt'
          : getProjectName(projectPath) || extractFolderName(projectPath);

      // Sort sessions within group by updatedAt descending (newest first)
      const sorted = [...projectSessions].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      groups.push({
        projectName: name,
        projectPath,
        allSessions: sorted,
        totalCount: sorted.length,
      });
    }

    // Sort groups alphabetically by project name (case-insensitive)
    groups.sort((a, b) => a.projectName.toLowerCase().localeCompare(b.projectName.toLowerCase()));

    return groups;
  }, [sessions, getProjectName]);
}

/**
 * Given a subset of sessions (visible ones for a project), build display entries
 * that respect orchestrator run grouping.
 */
export function buildProjectDisplayEntries(
  sessions: SessionListItem[],
  expandedRunIds: Record<string, boolean>
): SessionDisplayEntry[] {
  return buildDisplayEntries(sessions, expandedRunIds);
}

function extractFolderName(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '');
  return normalized.split(/[\\/]/).pop() || path;
}
