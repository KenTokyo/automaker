import { Archive, Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SessionListControlsProps {
  activeTab: 'active' | 'archived';
  archivedSessionCount: number;
  isMultiselectMode: boolean;
  selectedSessionCount: number;
  isCreating: boolean;
  newSessionName: string;
  onNewSessionNameChange: (value: string) => void;
  onCreateSession: () => void;
  onCancelCreate: () => void;
  onSelectAllInCurrentTab: () => void;
  onClearSelection: () => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  onDeleteAllArchived: () => void;
}

export function SessionListControls({
  activeTab,
  archivedSessionCount,
  isMultiselectMode,
  selectedSessionCount,
  isCreating,
  newSessionName,
  onNewSessionNameChange,
  onCreateSession,
  onCancelCreate,
  onSelectAllInCurrentTab,
  onClearSelection,
  onBulkArchive,
  onBulkDelete,
  onDeleteAllArchived,
}: SessionListControlsProps) {
  return (
    <>
      {isMultiselectMode && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border bg-muted/50 p-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedSessionCount} selected</span>
            <Button variant="ghost" size="sm" onClick={onSelectAllInCurrentTab} className="h-7">
              Select All
            </Button>
            {selectedSessionCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7">
                Clear
              </Button>
            )}
          </div>

          {selectedSessionCount > 0 && (
            <div className="flex items-center gap-1">
              {activeTab === 'active' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBulkArchive}
                  className="h-7"
                  title="Archive selected"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onBulkDelete}
                className="h-7 text-destructive hover:text-destructive"
                title="Delete selected"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {isCreating && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Session name..."
              value={newSessionName}
              onChange={(event) => onNewSessionNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onCreateSession();
                if (event.key === 'Escape') onCancelCreate();
              }}
              autoFocus
            />

            <Button size="sm" onClick={onCreateSession}>
              <Check className="h-4 w-4" />
            </Button>

            <Button size="sm" variant="ghost" onClick={onCancelCreate}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'archived' && archivedSessionCount > 0 && (
        <div className="mb-2 border-b pb-2">
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={onDeleteAllArchived}
            data-testid="delete-all-archived-sessions-button"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All Archived Sessions
          </Button>
        </div>
      )}
    </>
  );
}
