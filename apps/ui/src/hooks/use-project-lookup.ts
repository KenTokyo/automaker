import { useMemo } from 'react';
import { useAppStore } from '@/store/app-store';

/**
 * Reusable hook for looking up project names by path.
 * Creates a memoized Map for O(1) lookups.
 */
export function useProjectLookup() {
  const projects = useAppStore((s) => s.projects);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.path, p])), [projects]);

  const getProjectName = (projectPath: string | undefined): string | null => {
    if (!projectPath) return null;

    const project = projectMap.get(projectPath);
    if (project) return project.name;

    // Fallback: extract last folder name from path
    const normalized = projectPath.replace(/[\\/]+$/, '');
    const lastSegment = normalized.split(/[\\/]/).pop();
    return lastSegment || null;
  };

  const getProject = (projectPath: string | undefined) => {
    if (!projectPath) return null;
    return projectMap.get(projectPath) || null;
  };

  const getBadgeColor = (projectPath: string | undefined): string | undefined => {
    if (!projectPath) return undefined;
    const project = projectMap.get(projectPath);
    return project?.badgeColor;
  };

  return { getProjectName, getProject, getBadgeColor, projectMap };
}
