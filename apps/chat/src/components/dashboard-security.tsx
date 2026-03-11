import { Shield, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardSecurityItem } from '../stores/dashboard-types';

interface DashboardSecurityProps {
  security: DashboardSecurityItem[];
}

const SEVERITY_STYLES: Record<
  DashboardSecurityItem['severity'],
  { bg: string; text: string; label: string }
> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Kritisch' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Warnung' },
  info: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Info' },
};

export function DashboardSecurity({ security }: DashboardSecurityProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 px-1">
        <Shield className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-medium text-foreground">Sicherheit</span>
      </div>

      {security.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-muted bg-emerald-500/5 px-3 py-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-xs text-muted-foreground">Keine Sicherheitsprobleme erkannt</span>
        </div>
      ) : (
        security.map((item, i) => {
          const style = SEVERITY_STYLES[item.severity];
          return (
            <div key={i} className={cn('rounded-md border border-muted px-3 py-2', style.bg)}>
              <div className="flex items-center gap-2">
                <span className={cn('flex-1 text-xs font-medium', style.text)}>{item.title}</span>
                <span className={cn('text-[10px]', style.text)}>{style.label}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}
