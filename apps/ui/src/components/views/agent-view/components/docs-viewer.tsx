import { memo, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  Eye,
  Code,
  Copy,
  MoreVertical,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Loader2,
  MessageSquarePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/ui/markdown';
import { useAppStore } from '@/store/app-store';
import type { DocContent } from '@automaker/types';

interface DocsViewerProps {
  currentDoc: DocContent | null;
  isLoadingDoc: boolean;
  docError?: string | null;
  onClose: () => void;
  onDelete: (filePath: string) => void;
  onRetry?: () => void;
}

export const DocsViewer = memo(function DocsViewer({
  currentDoc,
  isLoadingDoc,
  docError,
  onClose,
  onDelete,
  onRetry,
}: DocsViewerProps) {
  const docsViewMode = useAppStore((s) => s.docsViewMode);
  const setDocsViewMode = useAppStore((s) => s.setDocsViewMode);
  const currentDocPath = useAppStore((s) => s.currentDocPath);

  const fileName = currentDocPath?.split('/').pop() ?? currentDocPath ?? '';

  const handleCopyPath = useCallback(
    (text?: string, label?: string) => {
      const copyText = text ?? currentDoc?.file.absolutePath;
      if (copyText) {
        navigator.clipboard.writeText(copyText);
        toast.success(`${label ?? 'Path'} copied`);
      }
    },
    [currentDoc]
  );

  const handleInsertIntoChat = useCallback(() => {
    if (currentDoc?.file.absolutePath) {
      window.dispatchEvent(
        new CustomEvent('docs:insert-path', { detail: currentDoc.file.absolutePath })
      );
      toast.success('Path inserted into chat');
    }
  }, [currentDoc]);

  const handleToggleViewMode = useCallback(() => {
    setDocsViewMode(docsViewMode === 'rendered' ? 'raw' : 'rendered');
  }, [docsViewMode, setDocsViewMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape → close viewer
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const isModKey = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + Shift + R → toggle raw/rendered
      if (isModKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        handleToggleViewMode();
        return;
      }

      // Ctrl/Cmd + Shift + C → copy path
      if (isModKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        handleCopyPath();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleToggleViewMode, handleCopyPath]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0 shrink-0"
          title="Back (Esc)"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{fileName}</span>
          {currentDoc?.file.extension && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
              {currentDoc.file.extension}
            </span>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center border rounded-md shrink-0">
          <Button
            variant={docsViewMode === 'rendered' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 rounded-r-none"
            onClick={() => setDocsViewMode('rendered')}
            title="Rendered view"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={docsViewMode === 'raw' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2 rounded-l-none"
            onClick={() => setDocsViewMode('raw')}
            title="Raw view"
          >
            <Code className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Insert into chat */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={handleInsertIntoChat}
          title="Insert path into chat"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
        </Button>

        {/* Copy path */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => handleCopyPath()}
          title="Copy absolute path"
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>

        {/* More actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleInsertIntoChat}>
              <MessageSquarePlus className="w-3.5 h-3.5 mr-2" />
              Insert into Chat
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Copy className="w-3.5 h-3.5 mr-2" />
                Copy Path
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleCopyPath(undefined, 'Absolute path')}>
                  Absolute Path
                </DropdownMenuItem>
                {currentDocPath && (
                  <DropdownMenuItem
                    onClick={() =>
                      handleCopyPath(`.automaker/docs/${currentDocPath}`, 'Relative path')
                    }
                  >
                    Relative Path
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleCopyPath(fileName, 'Filename')}>
                  Filename Only
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {window.electronAPI && (
              <DropdownMenuItem
                onClick={() => {
                  if (currentDoc?.file.absolutePath) {
                    window.electronAPI?.shell?.openPath?.(currentDoc.file.absolutePath);
                  }
                }}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                Open in Editor
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (currentDocPath) {
                  onDelete(currentDocPath);
                }
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content area */}
      {isLoadingDoc ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading document...</span>
        </div>
      ) : docError ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground mb-1">Could not load file</p>
            <p className="text-xs text-muted-foreground">The file may no longer exist.</p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Retry
            </Button>
          )}
        </div>
      ) : currentDoc ? (
        <ScrollArea className="flex-1">
          {docsViewMode === 'rendered' ? (
            <div className="p-4 max-w-prose mx-auto">
              <Markdown className="[&_h1]:text-[1.875rem] [&_h2]:text-2xl [&_h3]:text-xl [&_p]:text-base [&_p]:leading-[1.7] [&_li]:text-base [&_li]:leading-[1.7] [&_table]:w-full [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2">
                {currentDoc.content}
              </Markdown>
            </div>
          ) : (
            <div className="p-4">
              <pre className="font-mono text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                {currentDoc.content}
              </pre>
            </div>
          )}

          {/* Footer with file info */}
          <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center gap-3">
            <span>Modified: {new Date(currentDoc.file.modifiedAt).toLocaleString()}</span>
            <span>
              {currentDoc.file.size < 1024
                ? `${currentDoc.file.size} B`
                : currentDoc.file.size < 1024 * 1024
                  ? `${(currentDoc.file.size / 1024).toFixed(1)} KB`
                  : `${(currentDoc.file.size / (1024 * 1024)).toFixed(1)} MB`}
            </span>
          </div>
        </ScrollArea>
      ) : null}
    </div>
  );
});
