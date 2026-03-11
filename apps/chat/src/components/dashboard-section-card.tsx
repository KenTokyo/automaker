import { useState } from 'react';
import { ChevronDown, Rocket, Bug, Wrench, FileText, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardSection } from '../stores/dashboard-types';

interface DashboardSectionCardProps {
  section: DashboardSection;
  defaultOpen?: boolean;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  feature: <Rocket className="h-3.5 w-3.5 text-blue-400" />,
  feat: <Rocket className="h-3.5 w-3.5 text-blue-400" />,
  bugfix: <Bug className="h-3.5 w-3.5 text-red-400" />,
  bug: <Bug className="h-3.5 w-3.5 text-red-400" />,
  fix: <Bug className="h-3.5 w-3.5 text-red-400" />,
  refactor: <Wrench className="h-3.5 w-3.5 text-amber-400" />,
  docs: <FileText className="h-3.5 w-3.5 text-emerald-400" />,
  doc: <FileText className="h-3.5 w-3.5 text-emerald-400" />,
};

function guessIcon(title: string): React.ReactNode {
  const lower = title.toLowerCase();
  for (const [key, icon] of Object.entries(TYPE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return <Pin className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function DashboardSectionCard({ section, defaultOpen = true }: DashboardSectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-muted">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
            !open && '-rotate-90'
          )}
        />
        <span className="flex-1 text-xs font-medium text-foreground">{section.title}</span>
        <span className="text-[10px] text-muted-foreground">{section.items.length}</span>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="space-y-1 px-3 pb-2">
          {section.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5">
              {guessIcon(item.text)}
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed text-foreground/90">{item.text}</p>
                {item.file && (
                  <p className="truncate text-[10px] text-muted-foreground">{item.file}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
