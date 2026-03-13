/**
 * Time Limiter Settings
 *
 * A dropdown component for configuring the session time limit.
 * When the time limit is exceeded, the chat is copied and a new session is started.
 *
 * Time limits are model-specific: each model remembers its own configured time limit.
 */

import { memo, useState, useEffect } from 'react';
import { Timer, Settings, Clock, Cpu } from 'lucide-react';
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
import { useTimeLimiterStore } from '@/store/time-limiter-store';

interface TimeLimiterSettingsProps {
  disabled?: boolean;
  elapsedSeconds?: number;
}

export const TimeLimiterSettings = memo(function TimeLimiterSettings({
  disabled,
  elapsedSeconds = 0,
}: TimeLimiterSettingsProps) {
  const { timeLimitSeconds, isEnabled, currentModelId, setTimeLimit, setEnabled } =
    useTimeLimiterStore();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(timeLimitSeconds.toString());

  // Sync input value with store (e.g. when model changes and time limit is restored)
  useEffect(() => {
    setInputValue(timeLimitSeconds.toString());
  }, [timeLimitSeconds]);

  // Handle input change
  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  // Handle input blur - validate and save
  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 60 && parsed <= 3600) {
      setTimeLimit(parsed);
    } else {
      // Reset to current value
      setInputValue(timeLimitSeconds.toString());
    }
  };

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format model ID for display (e.g. "claude-opus" -> "Claude Opus")
  const formatModelName = (modelId: string): string => {
    return modelId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Calculate remaining time
  const remainingSeconds = Math.max(0, timeLimitSeconds - elapsedSeconds);
  const isWarning = isEnabled && remainingSeconds < 60 && remainingSeconds > 0;
  const isExpired = isEnabled && remainingSeconds === 0 && elapsedSeconds > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={disabled}
          className={cn(
            'h-7 w-7 rounded-md border-border shrink-0',
            isEnabled && 'border-primary/30',
            isWarning && 'border-yellow-500/50 text-yellow-600',
            isExpired && 'border-red-500/50 text-red-600 animate-pulse'
          )}
          title={
            isEnabled
              ? `Time Limit: ${formatTime(remainingSeconds)} remaining${currentModelId ? ` (${currentModelId})` : ''}`
              : 'Time Limiter (disabled)'
          }
        >
          <Timer className="w-3.5 h-3.5" />
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
            <h4 className="font-medium text-sm">Time Limiter Settings</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatically switch to a new session when time limit is exceeded.
          </p>
        </div>

        {/* Settings */}
        <div className="p-3 space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="time-limiter-enabled" className="text-sm font-medium">
                Enable Time Limiter
              </Label>
              <p className="text-xs text-muted-foreground">Auto-switch sessions on timeout</p>
            </div>
            <Switch id="time-limiter-enabled" checked={isEnabled} onCheckedChange={setEnabled} />
          </div>

          {/* Current Model Indicator */}
          {currentModelId && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-lg">
              <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                Setting for:{' '}
                <strong className="text-foreground">{formatModelName(currentModelId)}</strong>
              </span>
            </div>
          )}

          {/* Time Limit Input */}
          <div className="space-y-2">
            <Label htmlFor="time-limit-seconds" className="text-sm font-medium">
              Time Limit (seconds)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="time-limit-seconds"
                type="number"
                min={60}
                max={3600}
                step={30}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                disabled={!isEnabled}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                = {formatTime(parseInt(inputValue, 10) || 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Range: 60s (1 min) - 3600s (60 min)</p>
          </div>

          {/* Current Status */}
          {isEnabled && elapsedSeconds > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  Elapsed: <strong>{formatTime(elapsedSeconds)}</strong>
                </span>
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 text-sm mt-1',
                  isWarning && 'text-yellow-600',
                  isExpired && 'text-red-600'
                )}
              >
                <Timer className="w-4 h-4" />
                <span>
                  Remaining: <strong>{isExpired ? 'EXPIRED' : formatTime(remainingSeconds)}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Quick Presets */}
          <div className="pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground mb-2 block">Quick Presets</Label>
            <div className="flex flex-wrap gap-1">
              {[300, 450, 600, 900, 1200].map((seconds) => (
                <Button
                  key={seconds}
                  variant={timeLimitSeconds === seconds ? 'secondary' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setTimeLimit(seconds);
                    setInputValue(seconds.toString());
                  }}
                  disabled={!isEnabled}
                >
                  {formatTime(seconds)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
