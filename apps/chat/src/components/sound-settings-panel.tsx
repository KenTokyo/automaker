import { useMemo } from 'react';
import { RotateCcw, TestTube2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { playSound } from '../services/sound-service';
import type { SoundEvent } from '../services/sound-service';
import { useSoundStore, type SoundProfile } from '../stores/sound-store';

const EVENT_ROWS: Array<{ event: SoundEvent; label: string; description: string }> = [
  {
    event: 'taskComplete',
    label: 'Task fertig',
    description: 'Spielt einen kurzen Ton, wenn eine Aufgabe fertig ist.',
  },
  {
    event: 'phaseComplete',
    label: 'Phase fertig',
    description: 'Spielt einen Ton, wenn eine Orchestrator-Phase endet.',
  },
  {
    event: 'error',
    label: 'Fehler',
    description: 'Spielt einen Warn-Ton, wenn etwas schiefläuft.',
  },
  {
    event: 'messageSent',
    label: 'Nachricht gesendet',
    description: 'Spielt einen sehr kurzen Ton direkt nach dem Senden.',
  },
];

function profileLabel(profile: SoundProfile): string {
  switch (profile) {
    case 'all':
      return 'Alle Sounds';
    case 'errorsOnly':
      return 'Nur Fehler';
    case 'completionOnly':
      return 'Nur Abschluss';
    case 'none':
      return 'Keine';
  }
}

export function SoundSettingsPanel() {
  const enabled = useSoundStore((state) => state.enabled);
  const volume = useSoundStore((state) => state.volume);
  const profile = useSoundStore((state) => state.profile);
  const events = useSoundStore((state) => state.events);
  const setEnabled = useSoundStore((state) => state.setEnabled);
  const setVolume = useSoundStore((state) => state.setVolume);
  const setProfile = useSoundStore((state) => state.setProfile);
  const setEventEnabled = useSoundStore((state) => state.setEventEnabled);
  const resetToDefaults = useSoundStore((state) => state.resetToDefaults);

  const currentStatus = useMemo(() => {
    if (!enabled) return 'Stumm';
    if (volume <= 0) return 'Praktisch stumm (Lautstärke 0%)';
    return `${profileLabel(profile)} (${volume}%)`;
  }, [enabled, profile, volume]);

  const handlePlayTest = () => {
    if (!enabled || volume <= 0 || profile === 'none') {
      toast.message('Gerade stumm. Aktiviere Sounds oder erhöhe die Lautstärke.');
      return;
    }

    const testEvent: SoundEvent = profile === 'errorsOnly' ? 'error' : 'taskComplete';
    const played = playSound(testEvent, volume);

    if (played) {
      toast.success('Testton wurde abgespielt.');
    } else {
      toast.error('Testton konnte nicht abgespielt werden.');
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Chat-Sounds</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hier stellst du Töne für Erfolg, Fehler und Orchestrator-Phasen ein.
        </p>
      </div>

      <div className="rounded-lg border border-muted bg-card/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Sounds an oder aus</p>
            <p className="mt-1 text-xs text-muted-foreground">Aktueller Status: {currentStatus}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Sounds an oder aus" />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Lautstärke</span>
            <span className="text-muted-foreground">{volume}%</span>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[volume]}
            onValueChange={(value) => setVolume(value[0] ?? 0)}
            aria-label="Lautstärke"
          />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">Profil</p>
          <Select value={profile} onValueChange={(value) => setProfile(value as SoundProfile)}>
            <SelectTrigger className="h-9 border-muted text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="errorsOnly">Nur Fehler</SelectItem>
              <SelectItem value="completionOnly">Nur Abschluss</SelectItem>
              <SelectItem value="none">Keine</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-muted bg-card/50 p-4">
        <h3 className="text-sm font-semibold">Ereignisse</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Wenn du hier etwas änderst, springt das Profil automatisch auf eigene Auswahl.
        </p>

        <div className="mt-3 space-y-3">
          {EVENT_ROWS.map((row) => (
            <label
              key={row.event}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-muted/70 bg-background/30 p-3"
            >
              <Checkbox
                checked={events[row.event]}
                onCheckedChange={(checked) => setEventEnabled(row.event, checked)}
                className="mt-0.5"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">{row.label}</span>
                <span className="block text-xs text-muted-foreground">{row.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="border-muted" onClick={handlePlayTest}>
          <TestTube2 className="mr-2 h-4 w-4" />
          Testton abspielen
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            resetToDefaults();
            toast.success('Sound-Einstellungen wurden zurückgesetzt.');
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Standard wiederherstellen
        </Button>

        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Volume2 className="h-3.5 w-3.5" />
          Tipp: Bei 0% ist es trotz „an“ praktisch stumm.
        </span>
      </div>
    </section>
  );
}
