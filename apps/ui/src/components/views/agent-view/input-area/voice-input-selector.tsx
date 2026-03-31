import { Check, ChevronDown, Loader2, Mic, MicOff, Waves } from 'lucide-react';
import { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type VoiceInputProvider = 'webspeech' | 'whisper-small' | 'whisper-base' | 'canary-1b-v2';

interface VoiceInputSelectorProps {
  provider: VoiceInputProvider;
  disabled?: boolean;
  isListening: boolean;
  isLoading: boolean;
  isSupported: boolean;
  errorMessage: string | null;
  onToggleListening: () => void | Promise<void>;
  onProviderChange: (provider: VoiceInputProvider) => void;
}

interface ProviderOption {
  id: VoiceInputProvider;
  label: string;
  description: string;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: 'webspeech',
    label: 'WebSpeech API',
    description: 'Sofort bereit, nutzt den Browserdienst.',
  },
  {
    id: 'whisper-small',
    label: 'Whisper Small',
    description: 'Lokal im Browser, sparsamer als Base.',
  },
  {
    id: 'whisper-base',
    label: 'Whisper Base',
    description: 'Lokal im Browser, bessere Genauigkeit.',
  },
  {
    id: 'canary-1b-v2',
    label: 'Canary 1B v2',
    description: 'Server/GPU-Modus über NeMo oder Riva.',
  },
];

function getProviderLabel(provider: VoiceInputProvider): string {
  const match = PROVIDER_OPTIONS.find((option) => option.id === provider);
  return match?.label ?? 'Voice';
}

export const VoiceInputSelector = memo(function VoiceInputSelector({
  provider,
  disabled,
  isListening,
  isLoading,
  isSupported,
  errorMessage,
  onToggleListening,
  onProviderChange,
}: VoiceInputSelectorProps) {
  const providerLabel = getProviderLabel(provider);
  const disabledMainButton = Boolean(disabled) || (!isSupported && !isLoading);
  const buttonTitle = !isSupported
    ? `${providerLabel} ist auf diesem Gerät nicht verfügbar`
    : isLoading
      ? `${providerLabel} lädt`
      : isListening
        ? `Aufnahme stoppen (${providerLabel})`
        : `Aufnahme starten (${providerLabel})`;

  const statusToneClass = !isSupported
    ? 'text-muted-foreground'
    : isListening
      ? 'text-red-600'
      : isLoading
        ? 'text-amber-600'
        : errorMessage
          ? 'text-red-600'
          : 'text-foreground';

  return (
    <div className="flex shrink-0">
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          void onToggleListening();
        }}
        disabled={disabledMainButton}
        className={cn(
          'h-7 w-7 rounded-r-none border-r-0',
          isListening && 'bg-red-500/10 border-red-500/30 animate-pulse'
        )}
        title={buttonTitle}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isListening ? (
          <MicOff className={cn('w-3.5 h-3.5', statusToneClass)} />
        ) : (
          <Mic className={cn('w-3.5 h-3.5', statusToneClass)} />
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={disabled}
            className="h-7 w-5 rounded-l-none px-0 border-l border-border"
            title="Voice-Modell auswählen"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72 p-1.5">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium">Voice-Eingabe</p>
            <p className="text-[11px] text-muted-foreground">
              Wähle die Quelle für Mikrofon-zu-Text.
            </p>
          </div>

          <div className="my-1 h-px bg-border" />

          {PROVIDER_OPTIONS.map((option) => {
            const active = option.id === provider;
            return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/60',
                  active && 'bg-primary/5'
                )}
                onClick={() => onProviderChange(option.id)}
              >
                <div className="flex items-start gap-2">
                  <Waves className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium leading-none">{option.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
