import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
  unreadCount?: number;
}

export function ScrollToBottom({ visible, onClick, unreadCount = 0 }: ScrollToBottomProps) {
  return (
    <Button
      type="button"
      size="sm"
      className={cn(
        'absolute bottom-4 right-4 z-10 gap-1 rounded-full border border-muted bg-card/95 text-xs text-foreground shadow',
        'transition-all duration-200',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      )}
      onClick={onClick}
      aria-label="Zum Ende vom Chat springen"
    >
      <ArrowDown className="h-3.5 w-3.5" />
      Nach unten
      {unreadCount > 0 && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
          +{unreadCount}
        </span>
      )}
    </Button>
  );
}
