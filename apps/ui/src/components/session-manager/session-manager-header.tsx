import {
  AArrowDown,
  AArrowUp,
  Archive,
  CheckSquare,
  MessageSquare,
  Plus,
  Square,
} from 'lucide-react';
import { CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HotkeyButton } from '@/components/ui/hotkey-button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { SessionSearchInput } from '@/components/session-manager/session-search-input';
import { ProjectFilterDropdown } from '@/components/session-manager/project-filter-dropdown';

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
  sessionCountByProject: Record<string, number>;
  sessionFontSize: number;
  onSessionFontSizeChange: (size: number) => void;
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
  sessionCountByProject,
  sessionFontSize,
  onSessionFontSizeChange,
}: SessionManagerHeaderProps) {
  return (
    <CardHeader className="gap-1.5 px-3 pb-2">
      <div className="flex items-center gap-1">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onActiveTabChange(value as 'active' | 'archived')}
          className="min-w-0 flex-1 gap-0"
        >
          <TabsList className="h-7 w-full rounded-md p-0.5">
            <TabsTrigger value="active" className="h-5 flex-1 gap-1 px-1 text-[11px]">
              <MessageSquare className="mr-0 h-3 w-3" />
              Active ({isFiltering ? `${filteredActiveCount}/${activeCount}` : activeCount})
            </TabsTrigger>

            <TabsTrigger value="archived" className="h-5 flex-1 gap-1 px-1 text-[11px]">
              <Archive className="mr-0 h-3 w-3" />
              Archived ({isFiltering ? `${filteredArchivedCount}/${archivedCount}` : archivedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          variant={isMultiselectMode ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={onToggleMultiselectMode}
          title={isMultiselectMode ? 'Exit select mode' : 'Select multiple sessions'}
          data-testid="multiselect-toggle"
          className="h-7 w-7 shrink-0"
        >
          {isMultiselectMode ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </Button>

        <HotkeyButton
          variant="default"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-xs"
          onClick={onQuickCreateSession}
          hotkey={newSessionHotkey}
          hotkeyActive={false}
          data-testid="new-session-button"
          title={`New Session (${newSessionHotkey})`}
        >
          <Plus className="mr-0.5 h-3.5 w-3.5" />
          New
        </HotkeyButton>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
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
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <AArrowDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        <Slider
          value={[sessionFontSize]}
          onValueChange={([value]) => onSessionFontSizeChange(value)}
          min={10}
          max={18}
          step={1}
          className="flex-1"
        />
        <AArrowUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">
          {sessionFontSize}
        </span>
      </div>
    </CardHeader>
  );
}
