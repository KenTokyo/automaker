import {
  AArrowDown,
  AArrowUp,
  Archive,
  CheckSquare,
  MessageSquare,
  Plus,
  Square,
} from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';
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
    <CardHeader className="pb-3">
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>Agent Sessions</CardTitle>

        <div className="flex items-center gap-2">
          <Button
            variant={isMultiselectMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleMultiselectMode}
            title={isMultiselectMode ? 'Exit select mode' : 'Select multiple sessions'}
            data-testid="multiselect-toggle"
          >
            {isMultiselectMode ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </Button>

          <HotkeyButton
            variant="default"
            size="sm"
            onClick={onQuickCreateSession}
            hotkey={newSessionHotkey}
            hotkeyActive={false}
            data-testid="new-session-button"
            title={`New Session (${newSessionHotkey})`}
          >
            <Plus className="mr-1 h-4 w-4" />
            New
          </HotkeyButton>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onActiveTabChange(value as 'active' | 'archived')}
        className="w-full"
      >
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">
            <MessageSquare className="mr-2 h-4 w-4" />
            Active ({isFiltering ? `${filteredActiveCount}/${activeCount}` : activeCount})
          </TabsTrigger>

          <TabsTrigger value="archived" className="flex-1">
            <Archive className="mr-2 h-4 w-4" />
            Archived ({isFiltering ? `${filteredArchivedCount}/${archivedCount}` : archivedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-3 flex items-center gap-2">
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

      <div className="mt-2 flex items-center gap-2">
        <AArrowDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Slider
          value={[sessionFontSize]}
          onValueChange={([value]) => onSessionFontSizeChange(value)}
          min={10}
          max={18}
          step={1}
          className="flex-1"
        />
        <AArrowUp className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
        <span className="w-7 text-right text-xs tabular-nums text-muted-foreground">
          {sessionFontSize}
        </span>
      </div>
    </CardHeader>
  );
}
