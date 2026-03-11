import { AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSoundStore } from '../stores/sound-store';

interface SoundToggleProps {
  className?: string;
}

function getProfileLabel(profile: 'all' | 'errorsOnly' | 'completionOnly' | 'none'): string {
  switch (profile) {
    case 'all':
      return 'Alle Sounds';
    case 'errorsOnly':
      return 'Nur Fehler-Sounds';
    case 'completionOnly':
      return 'Nur Abschluss-Sounds';
    case 'none':
      return 'Keine Sounds';
  }
}

export function SoundToggle({ className }: SoundToggleProps) {
  const enabled = useSoundStore((state) => state.enabled);
  const volume = useSoundStore((state) => state.volume);
  const profile = useSoundStore((state) => state.profile);
  const setEnabled = useSoundStore((state) => state.setEnabled);

  const practicallyMuted = !enabled || volume <= 0 || profile === 'none';
  const profileLabel = getProfileLabel(profile);
  const statusLabel = practicallyMuted ? 'Stumm' : `${profileLabel} (${volume}%)`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 text-muted-foreground hover:text-foreground',
            !practicallyMuted && 'text-foreground',
            className
          )}
          onClick={() => setEnabled(!enabled)}
          aria-label={practicallyMuted ? 'Sounds aktivieren' : 'Sounds stummschalten'}
        >
          {practicallyMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : profile === 'errorsOnly' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{statusLabel}</p>
      </TooltipContent>
    </Tooltip>
  );
}
