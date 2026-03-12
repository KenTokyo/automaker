import { FileText, Star } from 'lucide-react';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface FileFavoritesProps {
  favorites: string[];
  selectedFilePath: string | null;
  onSelectFile: (filePath: string) => void;
  onRemoveFavorite: (filePath: string) => void;
}

function getFileName(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').pop() ?? filePath;
}

function getRelativePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  if (parts.length <= 3) return normalized;
  return '.../' + parts.slice(-3).join('/');
}

export function FileFavorites({
  favorites,
  selectedFilePath,
  onSelectFile,
  onRemoveFavorite,
}: FileFavoritesProps) {
  const handleRemove = useCallback(
    (event: React.MouseEvent, filePath: string) => {
      event.stopPropagation();
      onRemoveFavorite(filePath);
    },
    [onRemoveFavorite]
  );

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <Star className="h-6 w-6 opacity-40" />
        <p className="text-sm">Keine Favoriten vorhanden.</p>
        <p className="text-xs opacity-70">
          Klicke auf den Stern neben einer Datei, um sie als Favorit zu markieren.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-px py-1">
      {favorites.map((filePath) => (
        <button
          key={filePath}
          type="button"
          className={cn(
            'group flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
            'hover:bg-muted/60 transition-colors',
            selectedFilePath === filePath && 'bg-muted/80 text-foreground'
          )}
          onClick={() => onSelectFile(filePath)}
          title={filePath}
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{getFileName(filePath)}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {getRelativePath(filePath)}
            </p>
          </div>
          <button
            type="button"
            className="h-4 w-4 shrink-0 text-yellow-400 opacity-60 transition-opacity hover:opacity-100"
            onClick={(event) => handleRemove(event, filePath)}
            title="Aus Favoriten entfernen"
          >
            <Star className="h-3.5 w-3.5 fill-current" />
          </button>
        </button>
      ))}
    </div>
  );
}
