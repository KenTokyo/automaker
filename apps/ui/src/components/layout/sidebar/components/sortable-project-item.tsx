import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder, Check, GripVertical, EyeOff, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import type { SortableProjectItemProps } from '../types';

export function SortableProjectItem({
  project,
  currentProjectId,
  isHighlighted,
  onSelect,
}: SortableProjectItemProps) {
  const toggleProjectHidden = useAppStore((s) => s.toggleProjectHidden);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 group',
        'text-muted-foreground hover:text-foreground hover:bg-accent/80',
        isDragging && 'bg-accent shadow-lg scale-[1.02]',
        isHighlighted && 'bg-brand-500/10 text-foreground ring-1 ring-brand-500/20',
        project.isHidden && 'opacity-50 hover:opacity-100'
      )}
      data-testid={`project-option-${project.id}`}
      onClick={() => onSelect(project)}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 rounded-md hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors"
        data-testid={`project-drag-handle-${project.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/60" />
      </button>

      {/* Project content */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Folder
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            currentProjectId === project.id ? 'text-brand-500' : 'text-muted-foreground'
          )}
        />
        <span className="flex-1 truncate text-xs font-medium">{project.name}</span>
        {project.isHidden && <EyeOff className="h-3 w-3 text-muted-foreground/50 shrink-0" />}
        {/* Hide/Show toggle on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleProjectHidden(project.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-all shrink-0"
          title={project.isHidden ? 'Show project' : 'Hide project'}
        >
          {project.isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
        {currentProjectId === project.id && (
          <Check className="h-3.5 w-3.5 text-brand-500 shrink-0" />
        )}
      </div>
    </div>
  );
}
