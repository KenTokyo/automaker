import { Info } from 'lucide-react';

interface MessageSystemProps {
  content: string;
}

export function MessageSystem({ content }: MessageSystemProps) {
  return (
    <div className="max-w-4xl rounded-xl border border-muted bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <div className="mb-1 flex items-center gap-1.5 font-medium">
        <Info className="h-3.5 w-3.5" />
        System-Hinweis
      </div>
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
}
