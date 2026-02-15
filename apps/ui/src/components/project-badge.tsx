import { Folder } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';

interface ProjectBadgeProps {
  projectName: string | null;
  projectPath?: string;
  /** Border color for the badge (hex color, e.g., "#ff0000") */
  badgeColor?: string;
  /** Background color for the badge */
  backgroundColor?: string;
  /** Text color for the project name */
  textColor?: string;
  /** Icon color (only applied to Lucide icons, not custom images) */
  iconColor?: string;
  /** Lucide icon name (e.g., "Rocket", "Code") */
  icon?: string;
  /** Custom icon image path */
  customIconPath?: string;
}

function getBadgeIcon(
  icon?: string,
  customIconPath?: string,
  projectPath?: string,
  iconColor?: string
) {
  // Custom icon image
  if (customIconPath && projectPath) {
    const imageUrl = getAuthenticatedImageUrl(customIconPath, projectPath);
    return <img src={imageUrl} alt="" className="w-3 h-3 shrink-0 rounded-sm object-cover" />;
  }

  // Lucide icon by name
  if (icon && icon in LucideIcons) {
    const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[icon];
    return (
      <IconComponent
        className="w-3 h-3 shrink-0"
        style={iconColor ? { color: iconColor } : undefined}
      />
    );
  }

  // Default: Folder icon
  return (
    <Folder className="w-3 h-3 shrink-0" style={iconColor ? { color: iconColor } : undefined} />
  );
}

export function ProjectBadge({
  projectName,
  projectPath,
  badgeColor,
  backgroundColor,
  textColor,
  iconColor,
  icon,
  customIconPath,
}: ProjectBadgeProps) {
  if (!projectName) return null;

  const displayName = projectName.length > 20 ? projectName.slice(0, 20) + '...' : projectName;

  const badgeStyle: React.CSSProperties = {};
  if (badgeColor) {
    badgeStyle.borderWidth = '1px';
    badgeStyle.borderStyle = 'solid';
    badgeStyle.borderColor = badgeColor;
  }
  if (backgroundColor) {
    badgeStyle.backgroundColor = backgroundColor;
  }

  const badge = (
    <span
      className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded max-w-[140px]"
      style={Object.keys(badgeStyle).length > 0 ? badgeStyle : undefined}
    >
      {getBadgeIcon(icon, customIconPath, projectPath, iconColor)}
      <span
        className="truncate text-foreground/80"
        style={textColor ? { color: textColor } : undefined}
      >
        {displayName}
      </span>
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
