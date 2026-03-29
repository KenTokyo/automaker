import { memo, useCallback, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface QueueItem {
  id: string;
  message: string;
  imagePaths?: string[];
}

interface QueueDisplayProps {
  serverQueue: QueueItem[];
  onRemoveFromQueue: (id: string) => void;
  onClearQueue: () => void;
}

/** Einzelnes Queue-Item mit Expand/Collapse */
const QueueItemRow = memo(function QueueItemRow({
  item,
  index,
  onRemove,
}: {
  item: QueueItem;
  index: number;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(item.id);
    },
    [onRemove, item.id]
  );

  return (
    <div className="group text-sm bg-muted/50 rounded-lg border border-border transition-colors hover:bg-muted/70">
      {/* Kopfzeile – immer sichtbar, klickbar zum Auf-/Zuklappen */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={toggleExpanded}
        title={expanded ? 'Zuklappen' : 'Aufklappen – vollen Text anzeigen'}
      >
        {/* Expand/Collapse Indikator */}
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}

        <span className="text-xs text-muted-foreground font-medium min-w-[1.5rem] flex-shrink-0">
          {index + 1}.
        </span>

        {/* Vorschau (einzeilig, abgeschnitten) – nur wenn nicht expandiert */}
        {!expanded && <span className="flex-1 truncate text-foreground">{item.message}</span>}

        {/* Kurze Info wenn expandiert */}
        {expanded && (
          <span className="flex-1 truncate text-muted-foreground text-xs italic">
            Prompt #{index + 1}
          </span>
        )}

        {item.imagePaths && item.imagePaths.length > 0 && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            +{item.imagePaths.length} Datei{item.imagePaths.length > 1 ? 'en' : ''}
          </span>
        )}

        <button
          onClick={handleRemove}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all flex-shrink-0"
          title="Aus Queue entfernen"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Expandierter Inhalt – voller Text mit max-Höhe + Scroll */}
      {expanded && (
        <div className="px-3 pb-2.5 pt-0">
          <div className="max-h-48 overflow-y-auto rounded-md bg-background/60 border border-border/50 p-2.5 scrollbar-styled">
            <pre className="text-xs text-foreground whitespace-pre-wrap break-words font-sans leading-relaxed">
              {item.message}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
});

export const QueueDisplay = memo(function QueueDisplay({
  serverQueue,
  onRemoveFromQueue,
  onClearQueue,
}: QueueDisplayProps) {
  if (serverQueue.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {serverQueue.length} Prompt{serverQueue.length > 1 ? 's' : ''} in der Warteschlange
        </p>
        <button
          onClick={onClearQueue}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Alle entfernen
        </button>
      </div>
      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 scrollbar-styled">
        {serverQueue.map((item, index) => (
          <QueueItemRow key={item.id} item={item} index={index} onRemove={onRemoveFromQueue} />
        ))}
      </div>
    </div>
  );
});
