import { Sparkles } from 'lucide-react';

interface ChatContextBarProps {
  title: null | string;
  description: null | string;
  isGenerating: boolean;
  isHidden?: boolean;
}

export function ChatContextBar({
  title,
  description,
  isGenerating,
  isHidden = false,
}: ChatContextBarProps) {
  if (isHidden) {
    return null;
  }

  const cleanTitle = title?.trim() || 'Neuer Chat';
  const cleanDescription = description?.trim() || '';

  return (
    <div className="border-b border-muted bg-muted/20 px-4 py-2">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          {isGenerating ? (
            <div className="space-y-1.5">
              <div className="h-3 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-60 animate-pulse rounded bg-muted/80" />
            </div>
          ) : (
            <>
              <p className="truncate text-sm font-medium text-foreground">{cleanTitle}</p>
              {cleanDescription ? (
                <p className="truncate text-xs text-muted-foreground">{cleanDescription}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Hier siehst du den Titel und eine kurze Zusammenfassung von diesem Chat.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
