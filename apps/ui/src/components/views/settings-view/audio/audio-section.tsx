import { useCallback, useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, Play, RefreshCw, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getHttpApiClient } from '@/lib/http-api-client';
import {
  BUILT_IN_NOTIFICATION_SOUNDS,
  getCustomSoundDisplayName,
  isCustomSoundFile,
  normalizeNotificationSoundFile,
  playNotificationSound,
} from '@/lib/notification-sounds';
import { toast } from 'sonner';

interface AudioSectionProps {
  muteDoneSound: boolean;
  notificationSoundVolume: number;
  notificationSoundFile: string;
  allPhasesCompleteSoundFile: string;
  projectPath: string | null;
  onMuteDoneSoundChange: (value: boolean) => void;
  onNotificationSoundVolumeChange: (value: number) => void;
  onNotificationSoundFileChange: (soundFile: string) => void;
  onAllPhasesCompleteSoundFileChange: (soundFile: string) => void;
}

interface WorkspaceSound {
  name: string;
  path: string;
}

interface SoundOption {
  value: string;
  label: string;
}

function buildCustomSoundOption(soundFile: string): SoundOption {
  return {
    value: soundFile,
    label: `${getCustomSoundDisplayName(soundFile)} (Custom)`,
  };
}

export function AudioSection({
  muteDoneSound,
  notificationSoundVolume,
  notificationSoundFile,
  allPhasesCompleteSoundFile,
  projectPath,
  onMuteDoneSoundChange,
  onNotificationSoundVolumeChange,
  onNotificationSoundFileChange,
  onAllPhasesCompleteSoundFileChange,
}: AudioSectionProps) {
  const [workspaceSounds, setWorkspaceSounds] = useState<WorkspaceSound[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const scanWorkspaceSounds = useCallback(
    async (showToast = false) => {
      setIsScanning(true);
      try {
        const api = getHttpApiClient();
        const result = await api.workspace.scanSounds(projectPath ?? undefined);
        if (!result.success) {
          throw new Error(result.error || 'Failed to scan workspace sounds');
        }

        const sounds = result.sounds ?? [];
        setWorkspaceSounds(sounds);

        if (showToast) {
          toast.success(
            sounds.length > 0
              ? `Found ${sounds.length} custom sound${sounds.length === 1 ? '' : 's'}`
              : 'No custom sounds found in .uniai-chat/sounds'
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to scan workspace sounds';
        toast.error('Workspace scan failed', { description: message });
      } finally {
        setIsScanning(false);
      }
    },
    [projectPath]
  );

  useEffect(() => {
    void scanWorkspaceSounds(false);
  }, [scanWorkspaceSounds]);

  const selectedNotificationSoundFile = isCustomSoundFile(notificationSoundFile)
    ? notificationSoundFile
    : normalizeNotificationSoundFile(notificationSoundFile);
  const selectedAllPhasesSoundFile = isCustomSoundFile(allPhasesCompleteSoundFile)
    ? allPhasesCompleteSoundFile
    : normalizeNotificationSoundFile(allPhasesCompleteSoundFile);

  const customSoundOptions = useMemo<SoundOption[]>(() => {
    const optionByValue = new Map<string, SoundOption>();

    for (const sound of workspaceSounds) {
      const value = `custom:${sound.path}`;
      optionByValue.set(value, {
        value,
        label: `${sound.name.replace(/\.mp3$/i, '')} (Custom)`,
      });
    }

    for (const selected of [selectedNotificationSoundFile, selectedAllPhasesSoundFile]) {
      if (isCustomSoundFile(selected) && !optionByValue.has(selected)) {
        optionByValue.set(selected, buildCustomSoundOption(selected));
      }
    }

    return Array.from(optionByValue.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [workspaceSounds, selectedNotificationSoundFile, selectedAllPhasesSoundFile]);

  const soundOptions = useMemo<SoundOption[]>(
    () => [...BUILT_IN_NOTIFICATION_SOUNDS, ...customSoundOptions],
    [customSoundOptions]
  );

  const volumePercent = Math.round(notificationSoundVolume * 100);

  const handleTestSound = useCallback(
    async (soundFile: string) => {
      const played = await playNotificationSound({
        soundFile,
        volume: notificationSoundVolume,
        muted: muteDoneSound,
        ignoreMute: true,
      });

      if (!played) {
        toast.error('Could not play notification sound');
      }
    },
    [notificationSoundVolume, muteDoneSound]
  );

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        'border border-border/50',
        'bg-gradient-to-br from-card/90 via-card/70 to-card/80 backdrop-blur-xl',
        'shadow-sm shadow-black/5'
      )}
    >
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-transparent via-accent/5 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center border border-brand-500/20">
            <Bell className="w-5 h-5 text-brand-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Notifications</h2>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-12">
          Configure notification sound settings when Automaker finishes processing.
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-foreground font-medium">Notification Sound Volume</Label>
            <span className="text-sm text-muted-foreground">{volumePercent}%</span>
          </div>
          <Slider
            value={[volumePercent]}
            min={0}
            max={100}
            step={1}
            onValueChange={([value]) => onNotificationSoundVolumeChange(value / 100)}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Muted</span>
            <span>Maximum</span>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-foreground font-medium">Notification Sound</Label>
          <div className="flex items-center gap-2">
            <Select
              value={selectedNotificationSoundFile}
              onValueChange={onNotificationSoundFileChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select sound" />
              </SelectTrigger>
              <SelectContent>
                {soundOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleTestSound(selectedNotificationSoundFile);
              }}
              title="Test sound with current volume"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Plays when a task finishes processing.</p>
        </div>

        <div className="space-y-3">
          <Label className="text-foreground font-medium">All Phases Complete Sound</Label>
          <div className="flex items-center gap-2">
            <Select
              value={selectedAllPhasesSoundFile}
              onValueChange={onAllPhasesCompleteSoundFileChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select sound" />
              </SelectTrigger>
              <SelectContent>
                {soundOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleTestSound(selectedAllPhasesSoundFile);
              }}
              title="Test sound with current volume"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Plays when long-running workflows report a full completion.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-foreground font-medium">Custom Sounds</Label>
            <Button
              variant="outline"
              size="sm"
              disabled={isScanning}
              onClick={() => {
                void scanWorkspaceSounds(true);
              }}
              title="Scan workspace for custom MP3 files"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isScanning && 'animate-spin')} />
              {isScanning ? 'Scanning...' : 'Scan Workspace'}
            </Button>
          </div>

          {workspaceSounds.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No custom sounds found in <code>.uniai-chat/sounds/</code>
            </p>
          ) : (
            <div className="space-y-1 max-h-28 overflow-y-auto rounded-md border border-border/40 p-2">
              {workspaceSounds.map((sound) => (
                <p
                  key={sound.path}
                  className="text-xs text-muted-foreground truncate"
                  title={sound.path}
                >
                  {sound.name.replace(/\.mp3$/i, '')}
                </p>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Place <code>.mp3</code> files in <code>.uniai-chat/sounds/</code> in your workspace to
            use custom notification sounds.
          </p>
        </div>

        <div className="group flex items-start space-x-3 p-3 rounded-xl hover:bg-accent/30 transition-colors duration-200 -mx-3">
          <Checkbox
            id="mute-done-sound"
            checked={muteDoneSound}
            onCheckedChange={onMuteDoneSoundChange}
            className="mt-1"
            data-testid="mute-done-sound-checkbox"
          />
          <div className="space-y-1.5">
            <Label
              htmlFor="mute-done-sound"
              className="text-foreground cursor-pointer font-medium flex items-center gap-2"
            >
              <VolumeX className="w-4 h-4 text-brand-500" />
              Mute notification sounds
            </Label>
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              When enabled, sound playback is skipped for completion notifications and events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
