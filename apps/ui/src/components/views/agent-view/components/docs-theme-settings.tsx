import { useCallback } from 'react';
import { Settings2, RotateCcw, Sparkles, Type, Table2, Palette, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store/app-store';
import type { HeadingStyle, EditorThemeSettings } from '@automaker/types';
import { cn } from '@/lib/utils';

// ─── Heading Presets ────────────────────────────────────────────────

interface HeadingPreset {
  name: string;
  styles: Record<'h1' | 'h2' | 'h3' | 'h4', Partial<HeadingStyle>>;
}

const HEADING_PRESETS: HeadingPreset[] = [
  {
    name: 'Modern',
    styles: {
      h1: {
        gradientEnabled: true,
        gradientFrom: '#3b82f6',
        gradientTo: '#8b5cf6',
        gradientDirection: 'to-right',
        fontWeight: 700,
      },
      h2: {
        gradientEnabled: true,
        gradientFrom: '#06b6d4',
        gradientTo: '#3b82f6',
        gradientDirection: 'to-right',
        fontWeight: 600,
      },
      h3: { gradientEnabled: false, color: '#3b82f6', fontWeight: 600 },
      h4: { gradientEnabled: false, color: '#6366f1', fontWeight: 600 },
    },
  },
  {
    name: 'Classic',
    styles: {
      h1: { gradientEnabled: false, color: '', fontWeight: 700 },
      h2: { gradientEnabled: false, color: '', fontWeight: 600 },
      h3: { gradientEnabled: false, color: '', fontWeight: 600 },
      h4: { gradientEnabled: false, color: '', fontWeight: 600 },
    },
  },
  {
    name: 'Neon',
    styles: {
      h1: {
        gradientEnabled: true,
        gradientFrom: '#f472b6',
        gradientTo: '#c084fc',
        gradientDirection: 'to-right',
        fontWeight: 800,
      },
      h2: {
        gradientEnabled: true,
        gradientFrom: '#34d399',
        gradientTo: '#22d3ee',
        gradientDirection: 'to-right',
        fontWeight: 700,
      },
      h3: {
        gradientEnabled: true,
        gradientFrom: '#fbbf24',
        gradientTo: '#f97316',
        gradientDirection: 'to-right',
        fontWeight: 600,
      },
      h4: { gradientEnabled: false, color: '#a78bfa', fontWeight: 600 },
    },
  },
  {
    name: 'Minimal',
    styles: {
      h1: { gradientEnabled: false, color: '', fontWeight: 600 },
      h2: { gradientEnabled: false, color: '', fontWeight: 500 },
      h3: { gradientEnabled: false, color: '', fontWeight: 500 },
      h4: { gradientEnabled: false, color: '', fontWeight: 500 },
    },
  },
];

// ─── Color Swatch Input ─────────────────────────────────────────────

function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label
        className="relative w-6 h-6 rounded border border-border cursor-pointer overflow-hidden shrink-0"
        title={label}
      >
        <input
          type="color"
          value={value || '#808080'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ background: value || 'var(--muted)' }} />
      </label>
      <span className="text-xs text-muted-foreground truncate">{label}</span>
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 pt-3 pb-1.5 first:pt-0">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}

// ─── Slider Row ─────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

// ─── Heading Section ────────────────────────────────────────────────

function HeadingSettings({ level }: { level: 'h1' | 'h2' | 'h3' | 'h4' }) {
  const style = useAppStore((s) => s.editorTheme.headingStyles[level]);
  const setHeadingStyle = useAppStore((s) => s.setHeadingStyle);

  const update = useCallback(
    (partial: Partial<HeadingStyle>) => setHeadingStyle(level, partial),
    [level, setHeadingStyle]
  );

  const label = level.toUpperCase();

  return (
    <div className="space-y-2 rounded-md border border-border/50 p-2">
      <div className="flex items-center justify-between">
        <span
          className="font-semibold"
          style={{
            fontSize: level === 'h1' ? 16 : level === 'h2' ? 14 : 13,
            fontWeight: style.fontWeight,
            ...(style.gradientEnabled
              ? {
                  background: `linear-gradient(to right, ${style.gradientFrom}, ${style.gradientTo})`,
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }
              : style.color
                ? { color: style.color }
                : {}),
          }}
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Gradient</Label>
          <Switch
            checked={style.gradientEnabled}
            onCheckedChange={(v) => update({ gradientEnabled: v })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {style.gradientEnabled ? (
          <>
            <ColorInput
              value={style.gradientFrom}
              onChange={(v) => update({ gradientFrom: v })}
              label="From"
            />
            <ColorInput
              value={style.gradientTo}
              onChange={(v) => update({ gradientTo: v })}
              label="To"
            />
            <div className="col-span-2">
              <Select
                value={style.gradientDirection}
                onValueChange={(v) =>
                  update({ gradientDirection: v as HeadingStyle['gradientDirection'] })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to-right">Horizontal</SelectItem>
                  <SelectItem value="to-bottom-right">Diagonal</SelectItem>
                  <SelectItem value="to-bottom">Vertical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <ColorInput value={style.color} onChange={(v) => update({ color: v })} label="Color" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SliderRow
          label="Size"
          value={style.fontSize}
          min={12}
          max={48}
          step={1}
          onChange={(v) => update({ fontSize: v })}
          unit="px"
        />
        <div className="space-y-1">
          <Label className="text-xs">Weight</Label>
          <Select
            value={String(style.fontWeight)}
            onValueChange={(v) => update({ fontWeight: Number(v) })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="400">Normal</SelectItem>
              <SelectItem value="500">Medium</SelectItem>
              <SelectItem value="600">Semibold</SelectItem>
              <SelectItem value="700">Bold</SelectItem>
              <SelectItem value="800">Extra Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ─── Auto-Save Settings ──────────────────────────────────────────────

function AutoSaveSettings() {
  const docsAutoSave = useAppStore((s) => s.docsAutoSave);
  const docsAutoSaveDelay = useAppStore((s) => s.docsAutoSaveDelay);
  const setDocsAutoSave = useAppStore((s) => s.setDocsAutoSave);
  const setDocsAutoSaveDelay = useAppStore((s) => s.setDocsAutoSaveDelay);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Enable Auto-Save</Label>
        <Switch checked={docsAutoSave} onCheckedChange={setDocsAutoSave} />
      </div>
      {docsAutoSave && (
        <SliderRow
          label="Delay"
          value={docsAutoSaveDelay / 1000}
          min={1}
          max={10}
          step={0.5}
          onChange={(v) => setDocsAutoSaveDelay(Math.round(v * 1000))}
          unit="s"
        />
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DocsThemeSettings() {
  const editorTheme = useAppStore((s) => s.editorTheme);
  const setEditorTheme = useAppStore((s) => s.setEditorTheme);
  const setHeadingStyle = useAppStore((s) => s.setHeadingStyle);
  const setTableStyles = useAppStore((s) => s.setTableStyles);
  const resetEditorTheme = useAppStore((s) => s.resetEditorTheme);

  const applyPreset = useCallback(
    (preset: HeadingPreset) => {
      for (const level of ['h1', 'h2', 'h3', 'h4'] as const) {
        setHeadingStyle(level, preset.styles[level]);
      }
    },
    [setHeadingStyle]
  );

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                <Settings2 className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Theme settings
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent side="bottom" align="end" className="w-80 p-0">
        <ScrollArea className="max-h-[70vh]">
          <div className="p-3 space-y-3">
            {/* ── Typography ─────────────────── */}
            <SectionHeader icon={Type} title="Typography" />

            <SliderRow
              label="Font Scale"
              value={editorTheme.fontScale}
              min={80}
              max={150}
              step={5}
              onChange={(v) => setEditorTheme({ fontScale: v })}
              unit="%"
            />
            <SliderRow
              label="Body Font Size"
              value={editorTheme.bodyFontSize}
              min={12}
              max={22}
              step={1}
              onChange={(v) => setEditorTheme({ bodyFontSize: v })}
              unit="px"
            />
            <SliderRow
              label="Code Font Size"
              value={editorTheme.codeFontSize}
              min={10}
              max={20}
              step={1}
              onChange={(v) => setEditorTheme({ codeFontSize: v })}
              unit="px"
            />
            <SliderRow
              label="Line Height"
              value={editorTheme.lineHeight}
              min={1.2}
              max={2.2}
              step={0.1}
              onChange={(v) => setEditorTheme({ lineHeight: Math.round(v * 10) / 10 })}
            />

            <div className="space-y-1">
              <Label className="text-xs">Font Family</Label>
              <Select
                value={editorTheme.fontFamily}
                onValueChange={(v) =>
                  setEditorTheme({ fontFamily: v as EditorThemeSettings['fontFamily'] })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System Default</SelectItem>
                  <SelectItem value="serif">Serif (Georgia)</SelectItem>
                  <SelectItem value="mono">Monospace</SelectItem>
                  <SelectItem value="inter">Inter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Editor Width</Label>
              <Select
                value={editorTheme.editorWidth}
                onValueChange={(v) =>
                  setEditorTheme({ editorWidth: v as EditorThemeSettings['editorWidth'] })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow (600px)</SelectItem>
                  <SelectItem value="medium">Medium (768px)</SelectItem>
                  <SelectItem value="wide">Wide (1024px)</SelectItem>
                  <SelectItem value="full">Full Width</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Headings ───────────────────── */}
            <div className="h-px bg-border" />
            <SectionHeader icon={Palette} title="Headings" />

            {/* Presets */}
            <div className="flex items-center gap-1 flex-wrap">
              {HEADING_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => applyPreset(preset)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {preset.name}
                </Button>
              ))}
            </div>

            <HeadingSettings level="h1" />
            <HeadingSettings level="h2" />
            <HeadingSettings level="h3" />
            <HeadingSettings level="h4" />

            {/* ── Tables ─────────────────────── */}
            <div className="h-px bg-border" />
            <SectionHeader icon={Table2} title="Tables" />

            <ColorInput
              value={editorTheme.tableStyles.headerBackground}
              onChange={(v) => setTableStyles({ headerBackground: v })}
              label="Header Background"
            />

            <div className="flex items-center justify-between">
              <Label className="text-xs">Striped Rows</Label>
              <Switch
                checked={editorTheme.tableStyles.stripedRows}
                onCheckedChange={(v) => setTableStyles({ stripedRows: v })}
              />
            </div>

            {editorTheme.tableStyles.stripedRows && (
              <ColorInput
                value={editorTheme.tableStyles.stripedColor}
                onChange={(v) => setTableStyles({ stripedColor: v })}
                label="Stripe Color"
              />
            )}

            <ColorInput
              value={editorTheme.tableStyles.borderColor}
              onChange={(v) => setTableStyles({ borderColor: v })}
              label="Border Color"
            />

            <div className="space-y-1">
              <Label className="text-xs">Cell Padding</Label>
              <Select
                value={editorTheme.tableStyles.cellPadding}
                onValueChange={(v) =>
                  setTableStyles({ cellPadding: v as 'compact' | 'normal' | 'spacious' })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Auto-Save ──────────────────── */}
            <div className="h-px bg-border" />
            <SectionHeader icon={Save} title="Auto-Save" />

            <AutoSaveSettings />

            {/* ── Actions ────────────────────── */}
            <div className="h-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={resetEditorTheme}
            >
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Reset to Defaults
            </Button>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
