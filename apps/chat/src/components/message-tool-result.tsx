import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface MessageToolResultProps {
  result: string;
  isError?: boolean;
  maxPreviewLength?: number;
}

export function MessageToolResult({
  result,
  isError = false,
  maxPreviewLength = 260,
}: MessageToolResultProps) {
  const [open, setOpen] = useState(false);

  const cleanResult = result.trim();
  const hasLongContent = cleanResult.length > maxPreviewLength;
  const preview = useMemo(() => {
    if (!hasLongContent) {
      return cleanResult;
    }
    return `${cleanResult.slice(0, maxPreviewLength)}...`;
  }, [cleanResult, hasLongContent, maxPreviewLength]);

  if (!cleanResult) {
    return null;
  }

  return (
    <div
      className={cn(
        'max-w-4xl rounded-xl border px-3 py-2',
        isError ? 'border-red-400/40 bg-red-500/5' : 'border-emerald-400/30 bg-emerald-500/5'
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-xs">
        {isError ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        )}
        <span className="font-medium text-foreground">Tool-Ergebnis</span>
      </div>

      <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
        {open || !hasLongContent ? cleanResult : preview}
      </p>

      {hasLongContent && (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {open ? 'Weniger anzeigen' : 'Mehr anzeigen'}
        </button>
      )}
    </div>
  );
}
