/**
 * Completed Tasks Toggle
 *
 * A dropdown component for enabling/disabling automatic task capture.
 * When enabled, the AI agent documents completed tasks via the API.
 * The setting is per-project, stored in .automaker/settings.json.
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { CheckCircle, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { getHttpApiClient } from '@/lib/http-api-client';

interface CompletedTasksToggleProps {
  disabled?: boolean;
}

export const CompletedTasksToggle = memo(function CompletedTasksToggle({
  disabled,
}: CompletedTasksToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isEnabled = useAppStore((s) => s.completedTasksAutoCapture);
  const setAutoCapture = useAppStore((s) => s.setCompletedTasksAutoCapture);
  const taskCount = useAppStore((s) => s.completedTasks.length);
  const currentProject = useAppStore((s) => s.currentProject);

  // Load the setting from project settings when project changes
  useEffect(() => {
    if (!currentProject?.path) return;

    const client = getHttpApiClient();
    client.settings
      .getProject(currentProject.path)
      .then((result) => {
        if (result.success && result.settings) {
          const settings = result.settings as { completedTasksAutoCapture?: boolean };
          setAutoCapture(settings.completedTasksAutoCapture ?? false);
        }
      })
      .catch(() => {
        // Ignore errors - default to false
      });
  }, [currentProject?.path, setAutoCapture]);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      setAutoCapture(enabled);

      // Persist to project settings
      if (currentProject?.path) {
        const client = getHttpApiClient();
        client.settings
          .updateProject(currentProject.path, { completedTasksAutoCapture: enabled })
          .catch(() => {
            // Revert on failure
            setAutoCapture(!enabled);
          });
      }
    },
    [currentProject?.path, setAutoCapture]
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className={cn(
            'h-7 w-7 rounded-md border-border shrink-0',
            isEnabled &&
              'bg-emerald-500/10 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/15'
          )}
          title={isEnabled ? 'Aufgaben-Erfassung: Aktiv' : 'Aufgaben-Erfassung: Aus'}
        >
          <CheckCircle className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4" />
            <h4 className="font-medium text-sm">Aufgaben-Erfassung</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Wenn aktiviert, dokumentiert der KI-Agent automatisch alle erledigten Aufgaben.
          </p>
        </div>

        {/* Toggle */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="completed-tasks-capture" className="text-sm font-medium">
                Automatisch erfassen
              </Label>
              <p className="text-xs text-muted-foreground">Aufgaben nach Abschluss speichern</p>
            </div>
            <Switch
              id="completed-tasks-capture"
              checked={isEnabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 pb-3 pt-2 border-t border-border space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle
              className={cn(
                'w-3.5 h-3.5',
                isEnabled ? 'text-emerald-600' : 'text-muted-foreground'
              )}
            />
            <span>{isEnabled ? 'Aktiv für dieses Projekt' : 'Deaktiviert'}</span>
          </div>
          {taskCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>
                {taskCount} {taskCount === 1 ? 'Aufgabe' : 'Aufgaben'} bisher erfasst
              </span>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
