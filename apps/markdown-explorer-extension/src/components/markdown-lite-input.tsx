import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getHttpApiClient } from '@/lib/http-api-client';
import { useFileAttachments } from '@/components/views/agent-view/hooks/use-file-attachments';
import type { ImageAttachment, TextFileAttachment } from '@/store/app-store';
import { ImageAttachment as ImageAttachmentPreview } from './image-attachment';

interface MarkdownLiteInputProps {
  projectPath: string;
  onSaved: (savedPath: string) => void;
}

function sanitizeFileName(value: string): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 80) : 'Notiz';
}

function formatFileTimestamp(date: Date): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}_${hh}-${mm}-${ss}`;
}

function buildHistoryPath(projectPath: string): string {
  const separator = projectPath.includes('\\') ? '\\' : '/';
  const trimmed = projectPath.endsWith(separator) ? projectPath.slice(0, -1) : projectPath;
  return `${trimmed}${separator}History`;
}

function buildTargetPath(projectPath: string, fileName: string): string {
  const historyPath = buildHistoryPath(projectPath);
  const separator = historyPath.includes('\\') ? '\\' : '/';
  return `${historyPath}${separator}${fileName}`;
}

function firstMeaningfulLine(value: string): string {
  const lines = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] ?? 'Notiz';
}

function buildMarkdownContent(
  input: string,
  selectedImages: ImageAttachment[],
  selectedTextFiles: TextFileAttachment[]
): string {
  const createdAt = new Date().toLocaleString('de-DE');
  const parts: string[] = [];

  parts.push(`# Notiz`);
  parts.push('');
  parts.push(`Erstellt am: ${createdAt}`);
  parts.push('');

  if (input.trim()) {
    parts.push('## Text');
    parts.push('');
    parts.push(input.trim());
    parts.push('');
  }

  if (selectedImages.length > 0) {
    parts.push('## Bilder');
    parts.push('');
    for (let i = 0; i < selectedImages.length; i++) {
      const image = selectedImages[i];
      const imagePath = image.savedPath || image.filename;
      parts.push(`- Bild ${i + 1}: ${imagePath}`);
    }
    parts.push('');
  }

  if (selectedTextFiles.length > 0) {
    parts.push('## Datei-Inhalt');
    parts.push('');
    for (const textFile of selectedTextFiles) {
      parts.push(`### ${textFile.filename}`);
      parts.push('');
      parts.push('```text');
      parts.push(textFile.content);
      parts.push('```');
      parts.push('');
    }
  }

  if (!input.trim() && selectedImages.length === 0 && selectedTextFiles.length === 0) {
    parts.push('_(Leere Notiz)_');
    parts.push('');
  }

  return parts.join('\n');
}

export function MarkdownLiteInput({ projectPath, onSaved }: MarkdownLiteInputProps) {
  const [input, setInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<null | HTMLInputElement>(null);
  const isConnected = true;

  const fileAttachments = useFileAttachments({
    isProcessing: isSaving,
    isConnected,
    projectPath,
    maxImageFileSizeBytes: 20 * 1024 * 1024,
    maxFiles: 20,
    onInsertText: (text) => {
      setInput((prev) => {
        const trimmed = prev.replace(/\s+$/, '');
        const prefix = trimmed.length > 0 ? '\n\n' : '';
        return `${trimmed}${prefix}${text}\n`;
      });
    },
  });

  const hasContent =
    input.trim().length > 0 ||
    fileAttachments.selectedImages.length > 0 ||
    fileAttachments.selectedTextFiles.length > 0;

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelection = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files;
      if (!files || files.length === 0) return;
      await fileAttachments.processDroppedFiles(files);
      event.currentTarget.value = '';
    },
    [fileAttachments]
  );

  const handleClear = useCallback(() => {
    setInput('');
    fileAttachments.clearAllFiles();
    fileAttachments.setShowImageDropZone(false);
    toast.success('Eingabe wurde geleert.');
  }, [fileAttachments]);

  const handleSave = useCallback(async () => {
    if (!hasContent || isSaving) return;

    setIsSaving(true);
    try {
      const now = new Date();
      const title = sanitizeFileName(firstMeaningfulLine(input));
      const fileName = `${title}-${formatFileTimestamp(now)}.md`;
      const historyDir = buildHistoryPath(projectPath);
      const targetPath = buildTargetPath(projectPath, fileName);
      const content = buildMarkdownContent(
        input,
        fileAttachments.selectedImages,
        fileAttachments.selectedTextFiles
      );

      const api = getHttpApiClient();
      const mkdirResult = await api.mkdir(historyDir);
      if (!mkdirResult.success) {
        // Ordner kann schon existieren. Dann normal weiter.
      }

      const writeResult = await api.writeFile(targetPath, content);
      if (!writeResult.success) {
        throw new Error(writeResult.error || 'Datei konnte nicht gespeichert werden.');
      }

      let copied = false;
      try {
        await navigator.clipboard.writeText(targetPath);
        copied = true;
      } catch {
        copied = false;
      }

      if (copied) {
        toast.success('Als Markdown gespeichert und Pfad kopiert.');
      } else {
        toast.success('Als Markdown gespeichert. Pfad bitte manuell kopieren.');
      }

      onSaved(targetPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Speichern ist fehlgeschlagen.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [
    hasContent,
    input,
    isSaving,
    onSaved,
    projectPath,
    fileAttachments.selectedImages,
    fileAttachments.selectedTextFiles,
  ]);

  return (
    <section className="border-t border-muted bg-card/60 p-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,.txt,.md,text/plain,text/markdown"
        multiple
        onChange={(event) => {
          void handleFileSelection(event);
        }}
      />

      <div
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-muted bg-card p-2',
          fileAttachments.isDragOver && 'border-primary/50 bg-primary/5'
        )}
        onDragEnter={fileAttachments.handleDragEnter}
        onDragLeave={fileAttachments.handleDragLeave}
        onDragOver={fileAttachments.handleDragOver}
        onDrop={(event) => {
          void fileAttachments.handleDrop(event);
        }}
      >
        <ImageAttachmentPreview
          selectedImages={fileAttachments.selectedImages}
          selectedTextFiles={fileAttachments.selectedTextFiles}
          onOpenFileDialog={openFileDialog}
          onRemoveImage={fileAttachments.removeImage}
          onRemoveTextFile={fileAttachments.removeTextFile}
          disabled={isSaving}
        />

        <Textarea
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          onPaste={(event) => {
            void fileAttachments.handlePaste(event);
          }}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              void handleSave();
            }
          }}
          placeholder="Schreibe hier deinen Text. Bilder und Dateien kannst du unten anhängen."
          rows={4}
          className="min-h-[100px] resize-y border-muted bg-background text-sm"
        />

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Speichern legt eine Markdown-Datei in `History` an.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 border-muted"
              onClick={openFileDialog}
              disabled={isSaving}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Dateien
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 border-muted"
              onClick={handleClear}
              disabled={isSaving}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                void handleSave();
              }}
              disabled={!hasContent || isSaving}
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? 'Speichert...' : 'Save Doc'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
