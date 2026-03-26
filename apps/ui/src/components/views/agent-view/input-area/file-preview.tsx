import { memo, useState } from 'react';
import { X, FileText } from 'lucide-react';
import type { ImageAttachment, TextFileAttachment } from '@/store/app-store';

interface FilePreviewProps {
  selectedImages: ImageAttachment[];
  selectedTextFiles: TextFileAttachment[];
  isProcessing: boolean;
  onRemoveImage: (imageId: string) => void;
  onRemoveTextFile: (fileId: string) => void;
  onClearAll: () => void;
}

export const FilePreview = memo(function FilePreview({
  selectedImages,
  selectedTextFiles,
  isProcessing,
  onRemoveImage,
  onRemoveTextFile,
}: FilePreviewProps) {
  const totalFiles = selectedImages.length + selectedTextFiles.length;
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (totalFiles === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {/* Image attachments - compact floating thumbnails */}
        {selectedImages.map((image) => (
          <div key={image.id} className="group relative shrink-0">
            <button
              type="button"
              onClick={() => setLightboxSrc(image.data)}
              className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted/30 hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer"
              title="Click to preview"
            >
              <img src={image.data} alt={image.filename} className="w-full h-full object-cover" />
            </button>
            {/* Remove button - floating top-right */}
            {image.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage(image.id!);
                }}
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive"
                disabled={isProcessing}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}
        {/* Text file attachments - compact pill */}
        {selectedTextFiles.map((file) => (
          <div key={file.id} className="group relative shrink-0">
            <div className="h-10 rounded-lg border border-border bg-muted/30 hover:border-primary/30 transition-colors flex items-center gap-1.5 px-2.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-foreground truncate max-w-20">{file.filename}</span>
            </div>
            {/* Remove button - floating top-right */}
            <button
              onClick={() => onRemoveTextFile(file.id)}
              className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-full bg-destructive/90 text-white flex items-center justify-center hover:bg-destructive"
              disabled={isProcessing}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox overlay for image preview */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={lightboxSrc}
              alt="Preview"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
            />
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
});
