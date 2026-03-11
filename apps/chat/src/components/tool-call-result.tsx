import { ChevronDown, ChevronRight, FileJson, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ToolCallResultData } from '../services/tool-call-utils';

interface ToolCallResultProps {
  result: ToolCallResultData;
}

export function ToolCallResult({ result }: ToolCallResultProps) {
  const [open, setOpen] = useState(false);

  const content = useMemo(() => {
    if (!open) return result.preview;
    if (result.isJson && result.json !== null) {
      return JSON.stringify(result.json, null, 2);
    }
    return result.fullText;
  }, [open, result.fullText, result.isJson, result.json, result.preview]);

  return (
    <div className="rounded-lg border border-muted bg-card/70 p-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {result.isJson ? <FileJson className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
        {open ? 'Weniger anzeigen' : 'Ergebnis anzeigen'}
      </button>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded border border-muted bg-muted/20 p-2 text-[11px] text-muted-foreground">
        {content}
      </pre>
    </div>
  );
}
