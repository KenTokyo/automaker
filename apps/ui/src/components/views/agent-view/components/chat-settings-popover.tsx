import { useCallback, useMemo } from 'react';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ChatDisplaySettings, ChatDisplayPresetName } from '@/store/types/ui-types';
import { CHAT_DISPLAY_PRESETS, DEFAULT_CHAT_DISPLAY_SETTINGS } from '@/store/types/ui-types';
import { cn } from '@/lib/utils';

interface ChatSettingsPopoverProps {
  settings: ChatDisplaySettings;
  onChange: (settings: ChatDisplaySettings) => void;
}

const FONT_WEIGHT_LABELS: Record<number, string> = {
  300: 'Leicht',
  400: 'Normal',
  500: 'Mittel',
  600: 'Kräftig',
};

const GRAY_SHADE_LABELS: Record<number, string> = {
  400: 'Hell',
  500: 'Mittel-Hell',
  600: 'Mittel',
  700: 'Mittel-Dunkel',
  800: 'Dunkel',
  900: 'Sehr Dunkel',
};

/** Map gray shade to a Tailwind-like gray color for both light and dark mode */
const GRAY_SHADE_COLORS: Record<number, { light: string; dark: string }> = {
  400: { light: '#9ca3af', dark: '#9ca3af' },
  500: { light: '#6b7280', dark: '#a1a1aa' },
  600: { light: '#4b5563', dark: '#b4b4bc' },
  700: { light: '#374151', dark: '#c8c8ce' },
  800: { light: '#1f2937', dark: '#dcdce0' },
  900: { light: '#111827', dark: '#eeeeef' },
};

const GRAY_KEYS = [400, 500, 600, 700, 800, 900] as const;

function snapToClosestGray(shade: number): number {
  return GRAY_KEYS.reduce((prev, curr) =>
    Math.abs(curr - shade) < Math.abs(prev - shade) ? curr : prev
  );
}

function getClosestGrayLabel(shade: number): string {
  return GRAY_SHADE_LABELS[snapToClosestGray(shade)];
}

export function getGrayShadeColor(shade: number, isDark: boolean): string {
  const closest = snapToClosestGray(shade);
  return isDark ? GRAY_SHADE_COLORS[closest].dark : GRAY_SHADE_COLORS[closest].light;
}

/** Check if the current theme is dark by looking at the light theme list */
export function isDarkThemeActive(): boolean {
  const root = document.documentElement;
  // Light themes explicitly listed — everything else is dark
  const lightClasses = [
    'light',
    'cream',
    'solarizedlight',
    'github',
    'paper',
    'rose',
    'mint',
    'lavender',
    'sand',
    'sky',
    'peach',
    'snow',
    'sepia',
    'gruvboxlight',
    'nordlight',
    'blossom',
    'ayu-light',
    'onelight',
    'bluloco',
    'feather',
  ];
  return !lightClasses.some((cls) => root.classList.contains(cls));
}

function getClosestWeightLabel(weight: number): string {
  const keys = [300, 400, 500, 600];
  const closest = keys.reduce((prev, curr) =>
    Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev
  );
  return FONT_WEIGHT_LABELS[closest];
}

export function ChatSettingsPopover({ settings, onChange }: ChatSettingsPopoverProps) {
  // Determine which preset (if any) is currently active
  const activePreset = useMemo<ChatDisplayPresetName | null>(() => {
    for (const preset of CHAT_DISPLAY_PRESETS) {
      const s = preset.settings;
      if (
        s.fontSize === settings.fontSize &&
        s.fontWeight === settings.fontWeight &&
        s.fontOpacity === settings.fontOpacity &&
        s.lineHeight === settings.lineHeight &&
        s.codeBlockRelativeSize === settings.codeBlockRelativeSize &&
        s.fontColorGray === (settings.fontColorGray ?? 900) &&
        s.headingScale === (settings.headingScale ?? 1.0)
      ) {
        return preset.name;
      }
    }
    return null;
  }, [settings]);

  const handlePreset = useCallback(
    (presetName: ChatDisplayPresetName) => {
      const preset = CHAT_DISPLAY_PRESETS.find((p) => p.name === presetName);
      if (preset) {
        onChange({ ...preset.settings });
      }
    },
    [onChange]
  );

  const updateField = useCallback(
    <K extends keyof ChatDisplaySettings>(key: K, value: ChatDisplaySettings[K]) => {
      onChange({ ...settings, [key]: value });
    },
    [settings, onChange]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Chat-Darstellung"
          title="Chat-Darstellung anpassen"
        >
          <Type className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
        <div className="p-4 space-y-4">
          {/* Presets */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Vorlagen</p>
            <div className="flex flex-wrap gap-1.5">
              {CHAT_DISPLAY_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset.name)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-full border transition-colors',
                    activePreset === preset.name
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              ))}
              {activePreset === null && (
                <span className="px-2.5 py-1 text-xs rounded-full border border-primary/50 bg-primary/10 text-primary">
                  Eigene
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Sliders */}
          <div className="space-y-3">
            {/* Font Size */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Schriftgröße</span>
                <span className="text-xs font-mono text-foreground">{settings.fontSize}px</span>
              </div>
              <Slider
                value={[settings.fontSize]}
                min={10}
                max={20}
                step={1}
                onValueChange={([v]) => updateField('fontSize', v)}
              />
            </div>

            {/* Font Weight */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Schriftstärke</span>
                <span className="text-xs font-mono text-foreground">
                  {getClosestWeightLabel(settings.fontWeight)}
                </span>
              </div>
              <Slider
                value={[settings.fontWeight]}
                min={300}
                max={600}
                step={100}
                onValueChange={([v]) => updateField('fontWeight', v)}
              />
            </div>

            {/* Font Opacity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Text-Deckkraft</span>
                <span className="text-xs font-mono text-foreground">
                  {Math.round(settings.fontOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.fontOpacity]}
                min={0.5}
                max={1.0}
                step={0.05}
                onValueChange={([v]) => updateField('fontOpacity', v)}
              />
            </div>

            {/* Line Height */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Zeilenhöhe</span>
                <span className="text-xs font-mono text-foreground">
                  {settings.lineHeight.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[settings.lineHeight]}
                min={1.2}
                max={2.0}
                step={0.1}
                onValueChange={([v]) => updateField('lineHeight', Math.round(v * 10) / 10)}
              />
            </div>

            {/* Heading Scale */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Titelgröße</span>
                <span className="text-xs font-mono text-foreground">
                  {Math.round((settings.headingScale ?? 1.0) * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.headingScale ?? 1.0]}
                min={0.7}
                max={1.3}
                step={0.05}
                onValueChange={([v]) => updateField('headingScale', Math.round(v * 100) / 100)}
              />
            </div>

            {/* Font Color (Gray Shade) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Schriftfarbe</span>
                <span className="text-xs font-mono text-foreground">
                  {getClosestGrayLabel(settings.fontColorGray ?? 900)}
                </span>
              </div>
              <Slider
                value={[settings.fontColorGray ?? 900]}
                min={400}
                max={900}
                step={100}
                onValueChange={([v]) => updateField('fontColorGray', v)}
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Vorschau</p>
            <div
              className="rounded-lg bg-muted/30 border border-border px-3 py-2"
              style={{
                fontSize: `${settings.fontSize}px`,
                fontWeight: settings.fontWeight,
                opacity: settings.fontOpacity,
                lineHeight: settings.lineHeight,
                color: getGrayShadeColor(settings.fontColorGray ?? 900, isDarkThemeActive()),
              }}
            >
              Das ist ein Beispieltext für die Vorschau.
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
