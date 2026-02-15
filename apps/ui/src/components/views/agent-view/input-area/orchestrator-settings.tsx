/**
 * Orchestrator Settings
 *
 * A dropdown component for configuring the orchestrator mode.
 * When enabled, it monitors the last AI message for a trigger keyword and
 * automatically creates a new chat with that message as the prompt.
 */

import { memo, useState, useEffect } from 'react';
import { Repeat, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useOrchestratorStore } from '@/store/orchestrator-store';

interface OrchestratorSettingsProps {
  disabled?: boolean;
}

export const OrchestratorSettings = memo(function OrchestratorSettings({
  disabled,
}: OrchestratorSettingsProps) {
  const {
    isEnabled,
    triggerKeyword,
    maxIterations,
    currentIteration,
    autoSendEnabled,
    setEnabled,
    setTriggerKeyword,
    setMaxIterations,
    setAutoSendEnabled,
  } = useOrchestratorStore();

  const [isOpen, setIsOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState(triggerKeyword);
  const [maxInput, setMaxInput] = useState(maxIterations.toString());

  // Sync input values with store
  useEffect(() => {
    setKeywordInput(triggerKeyword);
  }, [triggerKeyword]);

  useEffect(() => {
    setMaxInput(maxIterations.toString());
  }, [maxIterations]);

  // Keyword input handlers
  const handleKeywordBlur = () => {
    const trimmed = keywordInput.trim();
    if (trimmed.length > 0) {
      setTriggerKeyword(trimmed);
    } else {
      setKeywordInput(triggerKeyword);
    }
  };

  // Max iterations input handlers
  const handleMaxBlur = () => {
    const parsed = parseInt(maxInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 999) {
      setMaxIterations(parsed);
    } else {
      setMaxInput(maxIterations.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, onBlur: () => void) => {
    if (e.key === 'Enter') {
      onBlur();
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className={cn(
            'h-11 rounded-xl border-border shrink-0',
            isEnabled ? 'border-purple-500/50 text-purple-600 w-auto min-w-11 px-2 gap-1.5' : 'w-11'
          )}
          title={
            isEnabled
              ? `Orchestrator: ${currentIteration}/${maxIterations}`
              : 'Orchestrator (disabled)'
          }
        >
          <Repeat className="w-4 h-4" />
          {isEnabled && (
            <span className="text-xs font-medium tabular-nums">
              {currentIteration}/{maxIterations}
            </span>
          )}
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
            <Settings className="w-4 h-4" />
            <h4 className="font-medium text-sm">Orchestrator Settings</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatically chain AI conversations when a trigger keyword is detected.
          </p>
        </div>

        {/* Settings */}
        <div className="p-3 space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="orchestrator-enabled" className="text-sm font-medium">
                Enable Orchestrator
              </Label>
              <p className="text-xs text-muted-foreground">Auto-chain on keyword detection</p>
            </div>
            <Switch id="orchestrator-enabled" checked={isEnabled} onCheckedChange={setEnabled} />
          </div>

          {/* Trigger Keyword Input */}
          <div className="space-y-2">
            <Label htmlFor="orchestrator-keyword" className="text-sm font-medium">
              Trigger Keyword
            </Label>
            <Input
              id="orchestrator-keyword"
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onBlur={handleKeywordBlur}
              onKeyDown={(e) => handleKeyDown(e, handleKeywordBlur)}
              disabled={!isEnabled}
              className="h-9 font-mono text-xs"
              placeholder="NEXT_PHASE_READY"
            />
            <p className="text-xs text-muted-foreground">
              Keyword to detect in the last AI message
            </p>
          </div>

          {/* Max Iterations Input */}
          <div className="space-y-2">
            <Label htmlFor="orchestrator-max" className="text-sm font-medium">
              Max Iterations
            </Label>
            <Input
              id="orchestrator-max"
              type="number"
              min={1}
              max={999}
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              onBlur={handleMaxBlur}
              onKeyDown={(e) => handleKeyDown(e, handleMaxBlur)}
              disabled={!isEnabled}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Auto-disables after reaching this limit (1-999)
            </p>
          </div>

          {/* Auto-Send Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="orchestrator-auto-send" className="text-sm font-medium">
                Auto-Send
              </Label>
              <p className="text-xs text-muted-foreground">Automatically send in new chat</p>
            </div>
            <Switch
              id="orchestrator-auto-send"
              checked={autoSendEnabled}
              onCheckedChange={setAutoSendEnabled}
              disabled={!isEnabled}
            />
          </div>

          {/* Current Status */}
          {isEnabled && currentIteration > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <Repeat className="w-4 h-4 text-purple-600" />
                <span>
                  Iteration: <strong>{currentIteration}</strong> / {maxIterations}
                </span>
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
