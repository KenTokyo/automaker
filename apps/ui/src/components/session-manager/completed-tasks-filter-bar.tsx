/**
 * CompletedTasksFilterBar - Filter and sort controls for the Done tab.
 *
 * Contains a category filter popover, a badge filter popover,
 * and a sort dropdown. Follows the project-filter-dropdown pattern.
 */

import { useMemo } from 'react';
import { Check, ChevronDown, ArrowUpDown, Filter, Tag } from 'lucide-react';
import type {
  CompletedTaskCategory,
  CompletedTaskBadge,
  CompletedTaskSortField,
  CompletedTaskSortOrder,
  CompletedTaskFilter,
} from '@automaker/types';
import { COMPLETED_TASK_CATEGORIES, COMPLETED_TASK_BADGE_OPTIONS } from '@automaker/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getCategoryIcon, getCategoryIconColor } from './completed-task-utils';

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

interface SortOption {
  field: CompletedTaskSortField;
  order: CompletedTaskSortOrder;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'completedAt', order: 'desc', label: 'Neueste zuerst' },
  { field: 'completedAt', order: 'asc', label: 'Älteste zuerst' },
  { field: 'title', order: 'asc', label: 'A–Z' },
  { field: 'title', order: 'desc', label: 'Z–A' },
  { field: 'category', order: 'asc', label: 'Nach Kategorie' },
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
  availableBadges: CompletedTaskBadge[];
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
  availableBadges,
}: CompletedTasksFilterBarProps) {
  const activeCategories = filter.categories ?? [];
  const activeBadges = filter.badges ?? [];

  const currentSortLabel = useMemo(() => {
    const opt = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder);
    return opt?.label ?? 'Neueste zuerst';
  }, [sortField, sortOrder]);

  // Category filter handlers
  const toggleCategory = (cat: CompletedTaskCategory) => {
    const next = activeCategories.includes(cat)
      ? activeCategories.filter((c) => c !== cat)
      : [...activeCategories, cat];
    onFilterChange({ ...filter, categories: next.length ? next : undefined });
  };

  const clearCategories = () => {
    onFilterChange({ ...filter, categories: undefined });
  };

  // Badge filter handlers
  const toggleBadge = (badge: CompletedTaskBadge) => {
    const next = activeBadges.includes(badge)
      ? activeBadges.filter((b) => b !== badge)
      : [...activeBadges, badge];
    onFilterChange({ ...filter, badges: next.length ? next : undefined });
  };

  const clearBadges = () => {
    onFilterChange({ ...filter, badges: undefined });
  };

  const categoryEntries = Object.entries(COMPLETED_TASK_CATEGORIES) as [
    CompletedTaskCategory,
    string,
  ][];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Category Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-7 gap-1 text-xs',
              activeCategories.length > 0 && 'border-sky-500/50 text-sky-600'
            )}
          >
            <Filter className="h-3 w-3" />
            {activeCategories.length > 0 ? `${activeCategories.length} gewählt` : 'Kategorie'}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          {activeCategories.length > 0 && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
              onClick={clearCategories}
            >
              Alle anzeigen
            </button>
          )}
          {categoryEntries.map(([key, label]) => {
            const CatIcon = getCategoryIcon(key);
            const active = activeCategories.includes(key);
            return (
              <button
                key={key}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                onClick={() => toggleCategory(key)}
              >
                <CatIcon className={cn('h-3.5 w-3.5', getCategoryIconColor(key))} />
                <span className="flex-1 text-left">{label}</span>
                {active && <Check className="h-3.5 w-3.5 text-sky-500" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Badge Filter */}
      {availableBadges.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-7 gap-1 text-xs',
                activeBadges.length > 0 && 'border-sky-500/50 text-sky-600'
              )}
            >
              <Tag className="h-3 w-3" />
              {activeBadges.length > 0 ? `${activeBadges.length} gewählt` : 'Badges'}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            {activeBadges.length > 0 && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                onClick={clearBadges}
              >
                Alle anzeigen
              </button>
            )}
            {availableBadges.map((badge) => {
              const active = activeBadges.includes(badge);
              return (
                <button
                  key={badge}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
                  onClick={() => toggleBadge(badge)}
                >
                  <span className="flex-1 text-left">
                    {COMPLETED_TASK_BADGE_OPTIONS[badge] ?? badge}
                  </span>
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
