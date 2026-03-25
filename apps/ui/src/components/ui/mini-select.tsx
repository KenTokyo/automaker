/**
 * MiniSelect - Kompakte Auswahl-Komponente für Toolbars.
 *
 * Nutzt Radix DropdownMenu statt nativem <select>,
 * damit Dark Mode und Styling konsistent funktionieren.
 */

import { useState } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Radix React 19 compatibility wrappers
const DropdownMenuTriggerPrimitive =
  DropdownMenuPrimitive.Trigger as React.ForwardRefExoticComponent<
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger> & {
      children?: React.ReactNode;
      asChild?: boolean;
    } & React.RefAttributes<HTMLButtonElement>
  >;

const DropdownMenuItemPrimitive = DropdownMenuPrimitive.Item as React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    children?: React.ReactNode;
    className?: string;
  } & React.HTMLAttributes<HTMLDivElement> &
    React.RefAttributes<HTMLDivElement>
>;

export interface MiniSelectOption {
  value: string | number;
  label: string;
}

interface MiniSelectProps {
  value: string | number;
  options: MiniSelectOption[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function MiniSelect({
  value,
  options,
  onChange,
  icon,
  ariaLabel,
  className,
}: MiniSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => String(o.value) === String(value));

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownMenuTriggerPrimitive asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
            'h-6 min-w-0 max-w-full',
            'text-[11px] leading-tight',
            'bg-muted/50 text-foreground',
            'border border-border/60',
            'hover:bg-muted hover:border-border',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'transition-colors duration-150',
            'cursor-pointer select-none',
            open && 'bg-muted border-border',
            className
          )}
        >
          {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
          <span className="truncate">{selectedOption?.label ?? '–'}</span>
          <ChevronDown
            className={cn(
              'h-2.5 w-2.5 shrink-0 text-muted-foreground transition-transform duration-150',
              open && 'rotate-180'
            )}
          />
        </button>
      </DropdownMenuTriggerPrimitive>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-md',
            'border border-border bg-popover text-popover-foreground shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
          )}
        >
          <div className="p-0.5">
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <DropdownMenuItemPrimitive
                  key={String(opt.value)}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center',
                    'rounded-sm py-1 pl-6 pr-2 text-[11px]',
                    'outline-none transition-colors',
                    'focus:bg-accent focus:text-accent-foreground',
                    'hover:bg-accent hover:text-accent-foreground',
                    isSelected && 'font-medium'
                  )}
                  onSelect={() => {
                    onChange(String(opt.value));
                  }}
                >
                  {isSelected && <Check className="absolute left-1.5 h-3 w-3 text-primary" />}
                  {opt.label}
                </DropdownMenuItemPrimitive>
              );
            })}
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
