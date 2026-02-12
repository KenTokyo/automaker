import { Folder, Star, Check, type LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import { CommandItem, CommandShortcut } from '@/components/ui/command';
import type { Project } from '@/lib/electron';

interface ProjectCommandItemProps {
  project: Project;
  isActive: boolean;
  isFavorite: boolean;
  hotkeyLabel?: string;
  onSelect: () => void;
}

function getIconComponent(project: Project): LucideIcon {
  if (project.icon && project.icon in LucideIcons) {
    return (LucideIcons as unknown as Record<string, LucideIcon>)[project.icon];
  }
  return Folder;
}

function extractProjectDir(path: string): string {
  // Show parent directory for context, e.g. "~/Projects/myapp" → "Projects"
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(-2, -1)[0];
  }
  return path;
}

export function ProjectCommandItem({
  project,
  isActive,
  isFavorite,
  hotkeyLabel,
  onSelect,
}: ProjectCommandItemProps) {
  const IconComponent = getIconComponent(project);
  const hasCustomIcon = !!project.customIconPath;
  const parentDir = extractProjectDir(project.path);

  return (
    <CommandItem
      value={`${project.name} ${project.path}`}
      onSelect={onSelect}
      className="flex items-center gap-3 py-2.5 px-3"
    >
      {/* Project icon */}
      <div className="shrink-0">
        {hasCustomIcon ? (
          <img
            src={getAuthenticatedImageUrl(project.customIconPath!, project.path)}
            alt={project.name}
            className="w-7 h-7 rounded-md object-cover ring-1 ring-border/50"
          />
        ) : (
          <div
            className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center',
              isActive
                ? 'bg-brand-500/15 border border-brand-500/30'
                : 'bg-muted border border-border/50'
            )}
          >
            <IconComponent
              className={cn('w-4 h-4', isActive ? 'text-brand-500' : 'text-muted-foreground')}
            />
          </div>
        )}
      </div>

      {/* Project name and path */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium truncate', isActive && 'text-brand-500')}>
            {project.name}
          </span>
          {isFavorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
        </div>
        <span className="text-xs text-muted-foreground truncate block">{parentDir}</span>
      </div>

      {/* Active checkmark or hotkey */}
      {isActive ? (
        <Check className="w-4 h-4 text-brand-500 shrink-0" />
      ) : hotkeyLabel ? (
        <CommandShortcut>{hotkeyLabel}</CommandShortcut>
      ) : null}
    </CommandItem>
  );
}
