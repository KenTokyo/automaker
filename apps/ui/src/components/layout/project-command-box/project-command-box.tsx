import { useMemo, useCallback } from 'react';
import { FolderOpen } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '@/store/app-store';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { getElectronAPI } from '@/lib/electron';
import { initializeProject } from '@/lib/project-init';
import { toast } from 'sonner';
import { ProjectCommandItem } from './project-command-item';

interface ProjectCommandBoxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_RECENT_PROJECTS = 5;

export function ProjectCommandBox({ open, onOpenChange }: ProjectCommandBoxProps) {
  const navigate = useNavigate();
  const {
    projects,
    currentProject,
    projectHistory,
    upsertAndSetCurrentProject,
    setCurrentProject,
  } = useAppStore();

  // Sort projects into groups
  const { favorites, recent, allSorted } = useMemo(() => {
    const favs = projects.filter((p) => p.isFavorite);

    // Recent: based on projectHistory (MRU order), exclude current project
    const recentProjects: typeof projects = [];
    for (const projectId of projectHistory) {
      if (recentProjects.length >= MAX_RECENT_PROJECTS) break;
      const project = projects.find((p) => p.id === projectId);
      if (project && project.id !== currentProject?.id) {
        recentProjects.push(project);
      }
    }

    // All projects alphabetically
    const sorted = [...projects].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    return { favorites: favs, recent: recentProjects, allSorted: sorted };
  }, [projects, projectHistory, currentProject?.id]);

  const handleSelectProject = useCallback(
    (project: (typeof projects)[number]) => {
      setCurrentProject(project);
      onOpenChange(false);
      navigate({ to: '/board' });
    },
    [setCurrentProject, onOpenChange, navigate]
  );

  const handleOpenFolder = useCallback(async () => {
    onOpenChange(false);
    const api = getElectronAPI();
    const result = await api.openDirectory();

    if (!result.canceled && result.filePaths[0]) {
      const path = result.filePaths[0];
      const name = path.split(/[/\\]/).filter(Boolean).pop() || 'Untitled Project';

      try {
        const initResult = await initializeProject(path);
        if (!initResult.success) {
          toast.error('Failed to initialize project', {
            description: initResult.error || 'Unknown error occurred',
          });
          return;
        }

        upsertAndSetCurrentProject(path, name);
        navigate({ to: '/board' });

        toast.success('Project opened', {
          description: `Opened ${name}`,
        });
      } catch (error) {
        toast.error('Failed to open project', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }, [onOpenChange, upsertAndSetCurrentProject, navigate]);

  // Generate hotkey labels (1-9, 0) for visible projects in "All Projects"
  const hotkeyMap = useMemo(() => {
    const map = new Map<string, string>();
    allSorted.forEach((project, index) => {
      if (index < 10) {
        map.set(project.id, index === 9 ? '0' : String(index + 1));
      }
    });
    return map;
  }, [allSorted]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Switch Project"
      description="Search and switch to a project"
      showCloseButton={false}
    >
      <CommandInput placeholder="Search projects..." />
      <CommandList>
        <CommandEmpty>No projects found.</CommandEmpty>

        {/* Favorites section */}
        {favorites.length > 0 && (
          <CommandGroup heading="Favorites">
            {favorites.map((project) => (
              <ProjectCommandItem
                key={`fav-${project.id}`}
                project={project}
                isActive={currentProject?.id === project.id}
                isFavorite={true}
                onSelect={() => handleSelectProject(project)}
              />
            ))}
          </CommandGroup>
        )}

        {/* Recent section */}
        {recent.length > 0 && (
          <>
            {favorites.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Recent">
              {recent.map((project) => (
                <ProjectCommandItem
                  key={`recent-${project.id}`}
                  project={project}
                  isActive={false}
                  isFavorite={!!project.isFavorite}
                  onSelect={() => handleSelectProject(project)}
                />
              ))}
            </CommandGroup>
          </>
        )}

        {/* All projects section */}
        {(favorites.length > 0 || recent.length > 0) && <CommandSeparator />}
        <CommandGroup heading="All Projects">
          {allSorted.map((project) => (
            <ProjectCommandItem
              key={`all-${project.id}`}
              project={project}
              isActive={currentProject?.id === project.id}
              isFavorite={!!project.isFavorite}
              hotkeyLabel={hotkeyMap.get(project.id)}
              onSelect={() => handleSelectProject(project)}
            />
          ))}
        </CommandGroup>

        {/* Open folder action */}
        <CommandSeparator />
        <CommandGroup>
          <CommandItem onSelect={handleOpenFolder} className="gap-3 py-2.5 px-3">
            <div className="w-7 h-7 rounded-md bg-muted border border-border/50 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-sm">Open Folder...</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
