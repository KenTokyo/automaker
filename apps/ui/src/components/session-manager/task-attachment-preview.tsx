/**
 * TaskAttachmentPreview - Displays task attachments as a thumbnail row.
 *
 * - Image files show as thumbnails with lazy-loaded signed URLs
 * - Non-image files show a file type icon
 * - Click on image opens fullscreen lightbox
 * - Delete button per attachment
 *
 * Also exports PendingAttachmentPreview for files queued before task creation.
 */

import { useCallback, useEffect, useState } from 'react';
import { FileIcon, Loader2, Trash2, X, Paperclip } from 'lucide-react';
import type { TaskAttachment, PendingAttachment } from '@/hooks/use-task-attachments';
import { useTaskAttachments } from '@/hooks/use-task-attachments';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toUpperCase() : '?';
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

interface LightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

function Lightbox({ src, alt, onClose }: LightboxProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        className={cn(
          'absolute right-4 top-4 z-10 rounded-full p-2',
          'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white',
          'transition-colors'
        )}
        onClick={onClose}
        title="Schliessen"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single thumbnail with signed URL loading
// ---------------------------------------------------------------------------

interface AttachmentThumbnailProps {
  attachment: TaskAttachment;
  onDelete?: (id: string, storagePath: string) => void;
  onImageClick?: (signedUrl: string, fileName: string) => void;
  deleting?: boolean;
}

function AttachmentThumbnail({
  attachment,
  onDelete,
  onImageClick,
  deleting,
}: AttachmentThumbnailProps) {
  const { getSignedUrl } = useTaskAttachments(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const loadUrl = useCallback(async () => {
    if (!isImage(attachment.mimeType)) return;
    setLoadingUrl(true);
    const signed = await getSignedUrl(attachment.storagePath);
    setUrl(signed);
    setLoadingUrl(false);
  }, [attachment.storagePath, attachment.mimeType, getSignedUrl]);

  useEffect(() => {
    void loadUrl();
  }, [loadUrl]);

  const handleClick = useCallback(() => {
    if (url && isImage(attachment.mimeType) && onImageClick) {
      onImageClick(url, attachment.fileName);
    }
  }, [url, attachment.mimeType, attachment.fileName, onImageClick]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onDelete) onDelete(attachment.id, attachment.storagePath);
    },
    [onDelete, attachment.id, attachment.storagePath]
  );

  return (
    <div
      className={cn(
        'group relative flex h-16 w-16 shrink-0 items-center justify-center',
        'rounded-lg border border-white/5 bg-zinc-900/80',
        'overflow-hidden transition-all duration-150',
        isImage(attachment.mimeType) && url && 'cursor-pointer hover:border-cyan-500/30'
      )}
      onClick={handleClick}
      title={`${attachment.fileName} (${formatFileSize(attachment.sizeBytes)})`}
    >
      {isImage(attachment.mimeType) ? (
        loadingUrl ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
        ) : url ? (
          <img src={url} alt={attachment.fileName} className="h-full w-full object-cover" />
        ) : (
          <FileIcon className="h-5 w-5 text-zinc-600" />
        )
      ) : (
        <div className="flex flex-col items-center gap-0.5">
          <FileIcon className="h-5 w-5 text-zinc-500" />
          <span className="text-[8px] font-medium text-zinc-500">
            {getFileExtension(attachment.fileName)}
          </span>
        </div>
      )}

      {/* Delete button overlay */}
      {onDelete && (
        <button
          type="button"
          className={cn(
            'absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center',
            'rounded-full bg-rose-600 text-white shadow-sm',
            'opacity-0 transition-opacity group-hover:opacity-100',
            'hover:bg-rose-500'
          )}
          onClick={handleDelete}
          disabled={deleting}
          title="Anhang loeschen"
        >
          {deleting ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <Trash2 className="h-2.5 w-2.5" />
          )}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskAttachmentPreview (for existing attachments on a task)
// ---------------------------------------------------------------------------

interface TaskAttachmentPreviewProps {
  taskId: string;
  editable?: boolean;
}

export function TaskAttachmentPreview({ taskId, editable = false }: TaskAttachmentPreviewProps) {
  const { attachments, loading, deleteAttachment } = useTaskAttachments(taskId);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string, storagePath: string) => {
      setDeletingId(id);
      await deleteAttachment(id, storagePath);
      setDeletingId(null);
    },
    [deleteAttachment]
  );

  const handleImageClick = useCallback((signedUrl: string, fileName: string) => {
    setLightbox({ src: signedUrl, alt: fileName });
  }, []);

  if (loading && attachments.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Anhaenge laden...</span>
      </div>
    );
  }

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {attachments.map((att) => (
          <AttachmentThumbnail
            key={att.id}
            attachment={att}
            onDelete={editable ? handleDelete : undefined}
            onImageClick={handleImageClick}
            deleting={deletingId === att.id}
          />
        ))}
      </div>

      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// PendingAttachmentPreview (for files queued before task creation)
// ---------------------------------------------------------------------------

interface PendingAttachmentPreviewProps {
  pending: PendingAttachment[];
  onRemove: (id: string) => void;
}

export function PendingAttachmentPreview({ pending, onRemove }: PendingAttachmentPreviewProps) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  if (pending.length === 0) return null;

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Paperclip className="h-3 w-3 text-cyan-400" />
          <span className="text-[10px] font-medium text-zinc-400">
            {pending.length} Datei{pending.length !== 1 ? 'en' : ''} angehaengt
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pending.map((item) => (
            <div
              key={item.id}
              className={cn(
                'group relative flex h-16 w-16 shrink-0 items-center justify-center',
                'rounded-lg border border-cyan-500/20 bg-zinc-900/80',
                'overflow-hidden transition-all duration-150',
                isImage(item.mimeType) &&
                  item.previewUrl &&
                  'cursor-pointer hover:border-cyan-500/40'
              )}
              onClick={() => {
                if (isImage(item.mimeType) && item.previewUrl) {
                  setLightbox({ src: item.previewUrl, alt: item.fileName });
                }
              }}
              title={`${item.fileName} (${formatFileSize(item.sizeBytes)})`}
            >
              {isImage(item.mimeType) && item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.fileName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <FileIcon className="h-5 w-5 text-zinc-500" />
                  <span className="text-[8px] font-medium text-zinc-500">
                    {getFileExtension(item.fileName)}
                  </span>
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                className={cn(
                  'absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center',
                  'rounded-full bg-rose-600 text-white shadow-sm',
                  'opacity-0 transition-opacity group-hover:opacity-100',
                  'hover:bg-rose-500'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                title="Entfernen"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {lightbox && (
        <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// AttachmentCountBadge (for compact card views)
// ---------------------------------------------------------------------------

interface AttachmentCountBadgeProps {
  count: number;
  className?: string;
}

export function AttachmentCountBadge({ count, className }: AttachmentCountBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5',
        'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
        'text-[10px] font-medium',
        className
      )}
      title={`${count} Anhang${count !== 1 ? 'e' : ''}`}
    >
      <Paperclip className="h-2.5 w-2.5" />
      {count}
    </span>
  );
}
