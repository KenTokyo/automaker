/**
 * TasksFilterBar - Filter and sort controls for the Tasks tab.
 *
 * Contains a status filter popover, a priority filter popover,
 * a tag filter popover, and a sort dropdown.
 */

import { useMemo } from 'react';
import { Check, ChevronDown, ArrowUpDown, Tag, CircleDot, AlertTriangle } from 'lucide-react';
import type {
  TaskSortField,
  TaskSortOrder,
  TaskFilter,
  TaskStatus,
  TaskPriority,
} from '@automaker/types';
import { TASK_STATUSES, TASK_PRIORITIES } from '@automaker/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  getTaskStatusLabel,
  getTaskStatusDotColor,
  getTaskPriorityLabel,
  getTaskPriorityDotColor,
} from './task-utils';

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

interface SortOption {
  field: TaskSortField;
  order: TaskSortOrder;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'date', order: 'desc', label: 'Neueste zuerst' },
  { field: 'date', order: 'asc', label: 'Aelteste zuerst' },
  { field: 'title', order: 'asc', label: 'A-Z' },
  { field: 'title', order: 'desc', label: 'Z-A' },
  { field: 'priority', order: 'asc', label: 'Prioritaet (hoch)' },
  { field: 'priority', order: 'desc', label: 'Prioritaet (niedrig)' },
  { field: 'status', order: 'asc', label: 'Nach Status' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TasksFilterBarProps {
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  sortField: TaskSortField;
  sortOrder: TaskSortOrder;
  onSortChange: (field: TaskSortField, order: TaskSortOrder) => void;
  availableTags?: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TasksFilterBar({
  filter,
  onFilterChange,
  sortField,
  sortOrder,
  onSortChange,
  availableTags = [],
}: TasksFilterBarProps) {
  const activeStatuses = filter.status ?? [];
  const activePriorities = filter.priority ?? [];
  const activeTags = filter.tags ?? [];

  const currentSortLabel = useMemo(() => {
    const opt = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder);
    return opt?.label ?? 'Neueste zuerst';
  }, [sortField, sortOrder]);

  // Status filter handlers
  const toggleStatus = (status: TaskStatus) => {
    const next = activeStatuses.includes(status)
      ? activeStatuses.filter((s: TaskStatus) => s !== status)
      : [...activeStatuses, status];
    onFilterChange({ ...filter, status: next.length ? next : undefined });
  };

  const clearStatuses = () => {
    onFilterChange({ ...filter, status: undefined });
  };

  // Priority filter handlers
  const togglePriority = (priority: TaskPriority) => {
    const next = activePriorities.includes(priority)
      ? activePriorities.filter((p: TaskPriority) => p !== priority)
      : [...activePriorities, priority];
    onFilterChange({ ...filter, priority: next.length ? next : undefined });
  };

  const clearPriorities = () => {
    onFilterChange({ ...filter, priority: undefined });
  };

  // Tag filter handlers
  const toggleTag = (tag: string) => {
    const next = activeTags.includes(tag)
      ? activeTags.filter((t) => t !== tag)
      : [...activeTags, tag];
    onFilterChange({ ...filter, tags: next.length ? next : undefined });
  };

  const clearTags = () => {
    onFilterChange({ ...filter, tags: undefined });
  };

  // Filter priorities to only show actual priorities (exclude empty string)
  const filteredPriorities = TASK_PRIORITIES.filter((p) => p !== '');

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-7 gap-1 text-xs',
              activeStatuses.length > 0 && 'border-sky-500/50 text-sky-600'
            )}
          >
            <CircleDot className="h-3 w-3" />
            {activeStatuses.length > 0 ? `${activeStatuses.length} Status` : 'Status'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          {activeStatuses.length > 0 && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              onClick={clearStatuses}
            >
              Alle anzeigen
            </button>
          )}
          {TASK_STATUSES.map((status) => {
            const active = activeStatuses.includes(status);
            return (
              <button
                key={status}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                onClick={() => toggleStatus(status)}
              >
                <span className={cn('h-2 w-2 rounded-full', getTaskStatusDotColor(status))} />
                <span className="flex-1 text-left">{getTaskStatusLabel(status)}</span>
                {active && <Check className="h-3.5 w-3.5 text-sky-500" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Priority Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-7 gap-1 text-xs',
              activePriorities.length > 0 && 'border-sky-500/50 text-sky-600'
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            {activePriorities.length > 0 ? `${activePriorities.length} Prio` : 'Prioritaet'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
          {activePriorities.length > 0 && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              onClick={clearPriorities}
            >
              Alle anzeigen
            </button>
          )}
          {filteredPriorities.map((priority) => {
            const active = activePriorities.includes(priority);
            return (
              <button
                key={priority}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                onClick={() => togglePriority(priority)}
              >
                <span className={cn('h-2 w-2 rounded-full', getTaskPriorityDotColor(priority))} />
                <span className="flex-1 text-left">{getTaskPriorityLabel(priority)}</span>
                {active && <Check className="h-3.5 w-3.5 text-sky-500" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Tag Filter (only show if there are tags) */}
      {availableTags.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-7 gap-1 text-xs',
                activeTags.length > 0 && 'border-sky-500/50 text-sky-600'
              )}
            >
              <Tag className="h-3 w-3" />
              {activeTags.length > 0 ? `${activeTags.length} Tags` : 'Tags'}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            {activeTags.length > 0 && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                onClick={clearTags}
              >
                Alle anzeigen
              </button>
            )}
            {availableTags.map((tag) => {
              const active = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                  onClick={() => toggleTag(tag)}
                >
                  <span className="flex-1 text-left">{tag}</span>
                  {active && <Check className="h-3.5 w-3.5 text-sky-500" />}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      )}

      {/* Sort Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <ArrowUpDown className="h-3 w-3" />
            {currentSortLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          {SORT_OPTIONS.map((opt) => {
            const active = opt.field === sortField && opt.order === sortOrder;
            return (
              <button
                key={`${opt.field}-${opt.order}`}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                onClick={() => onSortChange(opt.field, opt.order)}
              >
                <span className="flex-1 text-left">{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-sky-500" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
