import { useState } from 'react';
import { ChevronDown, Folder, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProjectLookup } from '@/hooks/use-project-lookup';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

interface ProjectFilterDropdownProps {
  selectedProjectPath: string | null;
  onChange: (projectPath: string | null) => void;
  sessionCounts: Record<string, number>;
}

export function ProjectFilterDropdown({
  selectedProjectPath,
  onChange,
  sessionCounts,
}: ProjectFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const projects = useAppStore((s) => s.projects);
  const { getProjectName } = useProjectLookup();

  // Sort: favorites first, then alphabetically
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return a.name.localeCompare(b.name);
  });

  // Only show projects that have sessions
  const projectsWithSessions = sortedProjects.filter((p) => sessionCounts[p.path]);

  const selectedName = selectedProjectPath ? getProjectName(selectedProjectPath) : null;

  const handleSelect = (projectPath: string | null) => {
    onChange(projectPath);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-6 text-[10px] gap-0.5 shrink-0 max-w-[120px] px-1.5',
            selectedProjectPath && 'border-primary/50'
          )}
          aria-label="Filter by project"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <Folder className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{selectedName || 'All'}</span>
          <ChevronDown className="w-2 h-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-1"
        align="start"
        role="listbox"
        aria-label="Project filter options"
      >
        {/* All Projects option */}
        <button
          className={cn(
            'flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent cursor-pointer',
            !selectedProjectPath && 'bg-accent'
          )}
          onClick={() => handleSelect(null)}
          role="option"
          aria-selected={!selectedProjectPath}
        >
          <span>All Projects</span>
          {!selectedProjectPath && <Check className="w-3 h-3" />}
        </button>

        {projectsWithSessions.length > 0 && <div className="my-1 border-t" />}

        {/* Project options */}
        {projectsWithSessions.map((project) => (
          <button
            key={project.id}
            className={cn(
              'flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent cursor-pointer',
              selectedProjectPath === project.path && 'bg-accent'
            )}
            onClick={() => handleSelect(project.path)}
            role="option"
            aria-selected={selectedProjectPath === project.path}
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <Folder className="w-3 h-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{project.name}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="text-muted-foreground">{sessionCounts[project.path] || 0}</span>
              {selectedProjectPath === project.path && <Check className="w-3 h-3" />}
            </span>
          </button>
        ))}

        {projectsWithSessions.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No projects with sessions</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
