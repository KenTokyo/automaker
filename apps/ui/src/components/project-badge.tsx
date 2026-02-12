import { Folder } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProjectBadgeProps {
  projectName: string | null;
  projectPath?: string;
  /** Border color for the badge (hex color, e.g., "#ff0000") */
  badgeColor?: string;
}

export function ProjectBadge({ projectName, projectPath, badgeColor }: ProjectBadgeProps) {
  if (!projectName) return null;

  const displayName = projectName.length > 20 ? projectName.slice(0, 20) + '...' : projectName;

  const badge = (
    <span
      className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded max-w-[140px]"
      style={
        badgeColor
          ? {
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: badgeColor,
            }
          : undefined
      }
    >
      <Folder className="w-3 h-3 shrink-0" />
      <span className="truncate">{displayName}</span>
    </span>
  );

  if (projectPath) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent side="bottom">{projectPath}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}
