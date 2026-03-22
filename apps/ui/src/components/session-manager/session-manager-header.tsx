import {
  AArrowDown,
  AArrowUp,
  Archive,
  CheckSquare,
  MessageSquare,
  Plus,
  Square,
  Trash2,
} from 'lucide-react';
import { CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HotkeyButton } from '@/components/ui/hotkey-button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { SessionSearchInput } from '@/components/session-manager/session-search-input';
import { ProjectFilterDropdown } from '@/components/session-manager/project-filter-dropdown';
import { SessionTimeFilterDropdown } from '@/components/session-manager/session-time-filter-dropdown';

interface SessionManagerHeaderProps {
  activeTab: 'active' | 'archived';
  onActiveTabChange: (tab: 'active' | 'archived') => void;
  isMultiselectMode: boolean;
  onToggleMultiselectMode: () => void;
  onQuickCreateSession: () => void;
  newSessionHotkey: string;
  isFiltering: boolean;
  activeCount: number;
  filteredActiveCount: number;
  archivedCount: number;
  filteredArchivedCount: number;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onClearSearch: () => void;
  filterProjectPath: string | null;
  onFilterProjectPathChange: (projectPath: string | null) => void;
  filterTimeWindowHours: number | null;
  onFilterTimeWindowHoursChange: (hours: number | null) => void;
  sessionCountByProject: Record<string, number>;
  sessionFontSize: number;
  onSessionFontSizeChange: (size: number) => void;
  onDeleteOldSessions: () => void;
}

export function SessionManagerHeader({
  activeTab,
  onActiveTabChange,
  isMultiselectMode,
  onToggleMultiselectMode,
  onQuickCreateSession,
  newSessionHotkey,
  isFiltering,
  activeCount,
  filteredActiveCount,
  archivedCount,
  filteredArchivedCount,
  searchTerm,
  onSearchTermChange,
  onClearSearch,
  filterProjectPath,
  onFilterProjectPathChange,
  filterTimeWindowHours,
  onFilterTimeWindowHoursChange,
  sessionCountByProject,
  sessionFontSize,
  onSessionFontSizeChange,
  onDeleteOldSessions,
}: SessionManagerHeaderProps) {
  return (
    <CardHeader className="gap-1 px-2 pb-1.5 pt-1">
      <div className="flex items-center gap-0.5">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onActiveTabChange(value as 'active' | 'archived')}
          className="min-w-0 flex-1 gap-0"
        >
          <TabsList className="h-5.5 w-full rounded-md p-0.5">
            <TabsTrigger value="active" className="h-4 flex-1 gap-0.5 px-1 text-[10px]">
              <MessageSquare className="h-2.5 w-2.5" />
              {isFiltering ? `${filteredActiveCount}/${activeCount}` : activeCount}
            </TabsTrigger>

            <TabsTrigger value="archived" className="h-4 flex-1 gap-0.5 px-1 text-[10px]">
              <Archive className="h-2.5 w-2.5" />
              {isFiltering ? `${filteredArchivedCount}/${archivedCount}` : archivedCount}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant={isMultiselectMode ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={onToggleMultiselectMode}
          title={isMultiselectMode ? 'Exit select mode' : 'Select multiple sessions'}
          data-testid="multiselect-toggle"
          className="h-5.5 w-5.5 shrink-0"
        >
          {isMultiselectMode ? (
            <CheckSquare className="h-2.5 w-2.5" />
          ) : (
            <Square className="h-2.5 w-2.5" />
          )}
        </Button>

        <HotkeyButton
          variant="default"
          size="sm"
          className="h-5.5 shrink-0 gap-0.5 px-1.5 text-[10px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/25 hover:shadow-emerald-500/30 transition-all duration-200"
          onClick={onQuickCreateSession}
          hotkey={newSessionHotkey}
          hotkeyActive={false}
          data-testid="new-session-button"
          title={`New Session (${newSessionHotkey})`}
        >
          <Plus className="h-2.5 w-2.5" />
          New
        </HotkeyButton>
      </div>

      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <SessionSearchInput
            value={searchTerm}
            onChange={onSearchTermChange}
            onClear={onClearSearch}
          />
        </div>

        <ProjectFilterDropdown
          selectedProjectPath={filterProjectPath}
          onChange={onFilterProjectPathChange}
          sessionCounts={sessionCountByProject}
        />

        <SessionTimeFilterDropdown
          selectedHours={filterTimeWindowHours}
          onChange={onFilterTimeWindowHoursChange}
        />
      </div>

      <div className="flex items-center gap-1">
        <AArrowDown className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
        <Slider
          value={[sessionFontSize]}
          onValueChange={([value]) => onSessionFontSizeChange(value)}
          min={10}
          max={18}
          step={1}
          className="flex-1"
        />
        <AArrowUp className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="w-5 text-right text-[10px] tabular-nums text-muted-foreground">
          {sessionFontSize}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDeleteOldSessions}
          title="Alte Sessions löschen"
          className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </Button>
      </div>
    </CardHeader>
  );
}
