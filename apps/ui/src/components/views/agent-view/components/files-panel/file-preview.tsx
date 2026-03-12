import { FileText, Loader2, AlertTriangle, Copy, ClipboardCheck, ExternalLink } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  filePath: string | null;
  content: string | null;
  isLoading: boolean;
  error: string | null;
}

export function FilePreview({ filePath, content, isLoading, error }: FilePreviewProps) {
  const [copied, setCopied] = useState(false);

  const fileName = filePath ? (filePath.replace(/\\/g, '/').split('/').pop() ?? '') : '';

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }, [content]);

  const handleCopyPath = useCallback(async () => {
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(filePath);
    } catch {
      // Ignore clipboard errors
    }
  }, [filePath]);

  if (!filePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
        <FileText className="h-8 w-8 opacity-40" />
        <p className="text-sm">Waehle eine Datei aus, um sie hier anzuzeigen.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive/70" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-muted px-3 py-1.5">
        <span
          className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground"
          title={filePath}
        >
          {fileName}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => void handleCopyPath()}
            title="Pfad kopieren"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 text-muted-foreground hover:text-foreground',
              copied && 'text-emerald-400'
            )}
            onClick={() => void handleCopy()}
            title="Inhalt kopieren"
          >
            {copied ? <ClipboardCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-foreground/90">
          {content}
        </pre>
      </div>
    </div>
  );
}
