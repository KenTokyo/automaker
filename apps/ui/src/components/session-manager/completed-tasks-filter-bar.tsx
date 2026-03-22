/**
 * CompletedTasksFilterBar - Filter and sort controls for the Done tab.
 *
 * Contains a tag filter popover, a status filter popover,
 * an effort filter popover, and a sort dropdown.
 */

import { useMemo } from 'react';
import { Check, ChevronDown, ArrowUpDown, Tag, CircleDot, Gauge } from 'lucide-react';
import type {
  CompletedTaskSortField,
  CompletedTaskSortOrder,
  CompletedTaskFilter,
  CompletedTaskStatus,
  CompletedTaskEffort,
} from '@automaker/types';
import {
  COMPLETED_TASK_TAGS,
  COMPLETED_TASK_STATUSES,
  COMPLETED_TASK_EFFORTS,
} from '@automaker/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  getStatusLabel,
  getStatusDotColor,
  getEffortLabel,
  getEffortColor,
} from './completed-task-utils';

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

interface SortOption {
  field: CompletedTaskSortField;
  order: CompletedTaskSortOrder;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'date', order: 'desc', label: 'Neueste zuerst' },
  { field: 'date', order: 'asc', label: 'Aelteste zuerst' },
  { field: 'title', order: 'asc', label: 'A-Z' },
  { field: 'title', order: 'desc', label: 'Z-A' },
  { field: 'effort', order: 'desc', label: 'Nach Effort' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CompletedTasksFilterBarProps {
  filter: CompletedTaskFilter;
  onFilterChange: (filter: CompletedTaskFilter) => void;
  sortField: CompletedTaskSortField;
  sortOrder: CompletedTaskSortOrder;
  onSortChange: (field: CompletedTaskSortField, order: CompletedTaskSortOrder) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompletedTasksFilterBar({
  filter,
  onFilterChange,
  sortField,
  sortOrder,
  onSortChange,
}: CompletedTasksFilterBarProps) {
  const activeTags = filter.tags ?? [];
  const activeStatuses = filter.status ?? [];
  const activeEfforts = filter.effort ?? [];

  const currentSortLabel = useMemo(() => {
    const opt = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder);
    return opt?.label ?? 'Neueste zuerst';
  }, [sortField, sortOrder]);

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

  // Status filter handlers
  const toggleStatus = (status: CompletedTaskStatus) => {
    const next = activeStatuses.includes(status)
      ? activeStatuses.filter((s) => s !== status)
      : [...activeStatuses, status];
    onFilterChange({ ...filter, status: next.length ? next : undefined });
  };

  const clearStatuses = () => {
    onFilterChange({ ...filter, status: undefined });
  };

  // Effort filter handlers
  const toggleEffort = (effort: CompletedTaskEffort) => {
    const next = activeEfforts.includes(effort)
      ? activeEfforts.filter((e) => e !== effort)
      : [...activeEfforts, effort];
    onFilterChange({ ...filter, effort: next.length ? next : undefined });
  };

  const clearEfforts = () => {
    onFilterChange({ ...filter, effort: undefined });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Tag Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-6 gap-1 px-1.5 text-[11px]',
              activeTags.length > 0 && 'border-sky-500/50 text-sky-600'
            )}
          >
            <Tag className="h-2.5 w-2.5" />
            {activeTags.length > 0 ? `${activeTags.length} Tags` : 'Tags'}
            <ChevronDown className="h-2.5 w-2.5" />
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
          {COMPLETED_TASK_TAGS.map((tag) => {
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

      {/* Status Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-6 gap-1 px-1.5 text-[11px]',
              activeStatuses.length > 0 && 'border-sky-500/50 text-sky-600'
            )}
          >
            <CircleDot className="h-2.5 w-2.5" />
            {activeStatuses.length > 0 ? `${activeStatuses.length} Status` : 'Status'}
            <ChevronDown className="h-2.5 w-2.5" />
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
          {COMPLETED_TASK_STATUSES.map((status) => {
            const active = activeStatuses.includes(status);
            return (
              <button
                key={status}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                onClick={() => toggleStatus(status)}
              >
                <span className={cn('h-2 w-2 rounded-full', getStatusDotColor(status))} />
                <span className="flex-1 text-left">{getStatusLabel(status)}</span>
                {active && <Check className="h-3.5 w-3.5 text-sky-500" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Effort Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-6 gap-1 px-1.5 text-[11px]',
              activeEfforts.length > 0 && 'border-sky-500/50 text-sky-600'
            )}
          >
            <Gauge className="h-2.5 w-2.5" />
            {activeEfforts.length > 0 ? `${activeEfforts.length} Effort` : 'Effort'}
            <ChevronDown className="h-2.5 w-2.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="start">
          {activeEfforts.length > 0 && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              onClick={clearEfforts}
            >
              Alle anzeigen
            </button>
          )}
          {COMPLETED_TASK_EFFORTS.map((effort) => {
            const active = activeEfforts.includes(effort);
            return (
              <button
                key={effort}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                onClick={() => toggleEffort(effort)}
              >
                <span
                  className={cn(
                    'rounded px-1 text-[10px] font-medium border',
                    getEffortColor(effort)
                  )}
                >
                  {getEffortLabel(effort)}
                </span>
                <span className="flex-1 text-left" />
                {active && <Check className="h-3.5 w-3.5 text-sky-500" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Sort Dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 gap-1 px-1.5 text-[11px]">
            <ArrowUpDown className="h-2.5 w-2.5" />
            {currentSortLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1" align="start">
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
