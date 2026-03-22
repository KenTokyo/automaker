import { FileText, Image as ImageIcon, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ImageAttachment, TextFileAttachment } from '@/store/app-store';

interface ImageAttachmentProps {
  selectedImages: ImageAttachment[];
  selectedTextFiles: TextFileAttachment[];
  onOpenFileDialog: () => void;
  onRemoveImage: (imageId: string) => void;
  onRemoveTextFile: (fileId: string) => void;
  disabled?: boolean;
}

function formatSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '';
  const megaBytes = bytes / (1024 * 1024);
  if (megaBytes >= 1) return `${megaBytes.toFixed(1)} MB`;
  const kiloBytes = bytes / 1024;
  return `${Math.max(1, Math.round(kiloBytes))} KB`;
}

export function ImageAttachment({
  selectedImages,
  selectedTextFiles,
  onOpenFileDialog,
  onRemoveImage,
  onRemoveTextFile,
  disabled = false,
}: ImageAttachmentProps) {
  if (selectedImages.length === 0 && selectedTextFiles.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-muted bg-card/70 p-2">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Anhänge</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onOpenFileDialog}
          className="h-7 gap-1 px-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Hinzufügen
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {selectedImages.map((image, index) => {
          const imageId = image.id || `image-${index}`;
          return (
            <div
              key={imageId}
              className="flex items-center gap-2 rounded-md border border-muted bg-background/70 p-2"
            >
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded border border-muted bg-muted/40">
                {image.data ? (
                  <img
                    src={image.data}
                    alt={image.filename}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{image.filename}</p>
                <p className="text-[11px] text-muted-foreground">{formatSize(image.size)}</p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => onRemoveImage(imageId)}
                className={cn('h-7 w-7 text-muted-foreground hover:text-destructive')}
                aria-label={`${image.filename} entfernen`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}

        {selectedTextFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-2 rounded-md border border-muted bg-background/70 p-2"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-muted bg-muted/40 text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{file.filename}</p>
              <p className="text-[11px] text-muted-foreground">{formatSize(file.size)}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              onClick={() => onRemoveTextFile(file.id)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label={`${file.filename} entfernen`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
