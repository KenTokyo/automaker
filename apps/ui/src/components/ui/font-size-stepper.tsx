/**
 * FontSizeStepper - Compact number input with +/- buttons for font size control.
 *
 * Shows a small input field flanked by minus/plus buttons.
 * Clamps values between min and max. Very compact for tight toolbars.
 */

import { memo, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FontSizeStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

export const FontSizeStepper = memo(function FontSizeStepper({
  value,
  onChange,
  min = 10,
  max = 20,
  step = 1,
  label,
  className,
}: FontSizeStepperProps) {
  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max]);

  const handleDecrement = useCallback(() => {
    onChange(clamp(value - step));
  }, [value, step, clamp, onChange]);

  const handleIncrement = useCallback(() => {
    onChange(clamp(value + step));
  }, [value, step, clamp, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10);
      if (Number.isFinite(parsed)) {
        onChange(clamp(parsed));
      }
    },
    [clamp, onChange]
  );

  return (
    <div className={cn('flex items-center gap-0.5', className)} title={label}>
      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Schrift kleiner"
      >
        <Minus className="h-2.5 w-2.5" />
      </button>

      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        step={step}
        className="h-5 w-8 rounded border border-border bg-transparent text-center text-[10px] tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label={label ?? 'Schriftgröße'}
      />

      <button
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30"
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Schrift größer"
      >
        <Plus className="h-2.5 w-2.5" />
      </button>
    </div>
  );
});
