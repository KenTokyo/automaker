import { Bot, Copy, RotateCcw, User } from 'lucide-react';
import { toast } from 'sonner';
import type { Message } from '@/types/electron';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  modelLabel?: string;
  providerLabel?: string;
  onRetry?: (content: string) => void;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function copyText(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    toast.success('Nachricht kopiert');
  } catch {
    toast.error('Kopieren hat nicht geklappt');
  }
}

export function MessageBubble({ message, modelLabel, providerLabel, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const normalizedContent = isUser ? message.content : message.content.replace(/\\n/g, '\n');

  return (
    <div className={cn('group/message flex max-w-4xl gap-3', isUser && 'ml-auto flex-row-reverse')}>
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-muted',
          isUser ? 'bg-muted/40' : 'bg-card'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div
        className={cn(
          'max-w-[85%] rounded-2xl border border-muted px-4 py-3 shadow-sm',
          isUser ? 'bg-muted/35' : 'bg-card'
        )}
      >
        {!isUser && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {providerLabel ? (
              <span className="rounded-full border border-muted px-2 py-0.5">{providerLabel}</span>
            ) : null}
            {modelLabel ? <span className="rounded-full border border-muted px-2 py-0.5">{modelLabel}</span> : null}
          </div>
        )}

        <Markdown className="prose-p:my-1.5 [&_pre]:max-h-96 [&_pre]:overflow-auto">
          {normalizedContent || ' '}
        </Markdown>

        {isUser && message.images && message.images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.images.map((image, index) => {
              const src = image.data.startsWith('data:')
                ? image.data
                : `data:${image.mimeType || 'image/png'};base64,${image.data}`;

              return (
                <img
                  key={image.id || `${image.filename}-${index}`}
                  src={src}
                  alt={image.filename || `Bild ${index + 1}`}
                  className="h-20 w-20 rounded-lg border border-muted object-cover"
                  loading="lazy"
                />
              );
            })}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">{formatTimestamp(message.timestamp)}</span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover/message:opacity-100"
              onClick={() => {
                void copyText(message.content);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Kopieren
            </button>

            {!isUser && onRetry && (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover/message:opacity-100"
                onClick={() => onRetry(message.content)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Erneut senden
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
