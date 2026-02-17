import { memo, useCallback, useEffect, useState, useRef, lazy, Suspense } from 'react';
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
  Pencil,
  Save,
  FileCode2,
  Check,
  Keyboard,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Markdown } from '@/components/ui/markdown';
import { useAppStore } from '@/store/app-store';
import { useEditorTheme } from '@/hooks/use-editor-theme';
import { cn } from '@/lib/utils';
import type { DocContent } from '@automaker/types';
import type { DocsEditorHandle } from './docs-editor';
import { DocsThemeSettings } from './docs-theme-settings';
import type { SaveStatus } from '@/hooks/use-editor';

const DocsEditor = lazy(() => import('./docs-editor').then((m) => ({ default: m.DocsEditor })));

const DocsSourceEditor = lazy(() =>
  import('./docs-source-editor').then((m) => ({ default: m.DocsSourceEditor }))
);

const DocsShortcutsOverlay = lazy(() =>
  import('./docs-shortcuts-overlay').then((m) => ({ default: m.DocsShortcutsOverlay }))
);

type ViewerMode = 'view' | 'edit' | 'source';

interface DocsViewerProps {
  currentDoc: DocContent | null;
  isLoadingDoc: boolean;
  docError?: string | null;
  onClose: () => void;
  onDelete: (filePath: string) => void;
  onRetry?: () => void;
  onSave?: (content: string) => Promise<void>;
}

// ─── Save Status Indicator ──────────────────────────────────────────

function SaveStatusBadge({ status, error }: { status: SaveStatus; error?: string | null }) {
  if (status === 'idle') return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1 shrink-0">
            {status === 'pending' && (
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            )}
            {status === 'saving' && (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            )}
            {status === 'saved' && <Check className="w-3 h-3 text-green-500" />}
            {status === 'error' && <AlertTriangle className="w-3 h-3 text-destructive" />}
            <span
              className={cn(
                'text-[10px]',
                status === 'saving' && 'text-muted-foreground',
                status === 'saved' && 'text-green-500',
                status === 'error' && 'text-destructive',
                status === 'pending' && 'text-orange-400'
              )}
            >
              {status === 'pending' && 'Unsaved'}
              {status === 'saving' && 'Saving...'}
              {status === 'saved' && 'Saved'}
              {status === 'error' && 'Failed'}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {status === 'pending' && 'Unsaved changes'}
          {status === 'saving' && 'Saving document...'}
          {status === 'saved' && 'Document saved'}
          {status === 'error' && (error || 'Save failed')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export const DocsViewer = memo(function DocsViewer({
  currentDoc,
  isLoadingDoc,
  docError,
  onClose,
  onDelete,
  onRetry,
  onSave,
}: DocsViewerProps) {
  const docsViewMode = useAppStore((s) => s.docsViewMode);
  const setDocsViewMode = useAppStore((s) => s.setDocsViewMode);
  const currentDocPath = useAppStore((s) => s.currentDocPath);
  const docsAutoSave = useAppStore((s) => s.docsAutoSave);
  const docsAutoSaveDelay = useAppStore((s) => s.docsAutoSaveDelay);
  const { themeStyles, themeClass } = useEditorTheme();

  const [mode, setMode] = useState<ViewerMode>('view');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const editorRef = useRef<DocsEditorHandle>(null);
  const sourceContentRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  const fileName = currentDocPath?.split('/').pop() ?? currentDocPath ?? '';
  const isMarkdown =
    currentDoc?.file.extension === '.md' ||
    currentDoc?.file.extension === '.markdown' ||
    currentDoc?.file.extension === '.mdown';

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (savedFeedbackTimerRef.current) clearTimeout(savedFeedbackTimerRef.current);
    };
  }, []);

  // beforeunload warning when dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Initialize source content when doc loads
  useEffect(() => {
    if (currentDoc) {
      sourceContentRef.current = currentDoc.content;
    }
  }, [currentDoc]);

  // Reset mode when doc changes
  useEffect(() => {
    setMode('view');
    setIsDirty(false);
    setSaveStatus('idle');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, [currentDocPath]);

  const doSave = useCallback(async () => {
    if (!onSave) return;
    if (savingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    let content: string;
    if (mode === 'source') {
      content = sourceContentRef.current;
    } else if (mode === 'edit' && editorRef.current) {
      content = editorRef.current.getContent();
    } else {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setSaveStatus('saving');
    setLastSaveError(null);

    try {
      await onSave(content);
      setIsDirty(false);
      setSaveStatus('saved');
      if (savedFeedbackTimerRef.current) clearTimeout(savedFeedbackTimerRef.current);
      savedFeedbackTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      setSaveStatus('error');
      setLastSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
      savingRef.current = false;

      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        doSave();
      }
    }
  }, [onSave, mode]);

  const handleSave = useCallback(async () => {
    if (!isDirty && saveStatus !== 'error') return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    await doSave();
  }, [isDirty, saveStatus, doSave]);

  // When isDirty becomes true, start auto-save timer
  const handleDirtyChange = useCallback(
    (dirty: boolean) => {
      setIsDirty(dirty);
      if (dirty) {
        setSaveStatus('pending');
        if (docsAutoSave && (mode === 'edit' || mode === 'source')) {
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = setTimeout(() => {
            doSave();
          }, docsAutoSaveDelay);
        }
      }
    },
    [docsAutoSave, docsAutoSaveDelay, mode, doSave]
  );

  // Guard action with unsaved changes check
  const guardUnsaved = useCallback(
    (action: () => void) => {
      if (isDirty) {
        pendingActionRef.current = action;
        setUnsavedDialogOpen(true);
      } else {
        action();
      }
    },
    [isDirty]
  );

  const handleSwitchToView = useCallback(() => {
    guardUnsaved(() => {
      setMode('view');
      setIsDirty(false);
      setSaveStatus('idle');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    });
  }, [guardUnsaved]);

  const handleSwitchMode = useCallback(
    (newMode: ViewerMode) => {
      if (newMode === mode) return;
      guardUnsaved(() => {
        setMode(newMode);
        setIsDirty(false);
        setSaveStatus('idle');
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      });
    },
    [mode, guardUnsaved]
  );

  const handleClose = useCallback(() => {
    guardUnsaved(() => onClose());
  }, [guardUnsaved, onClose]);

  const handleUnsavedSave = useCallback(async () => {
    await handleSave();
    setUnsavedDialogOpen(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, [handleSave]);

  const handleUnsavedDiscard = useCallback(() => {
    setIsDirty(false);
    setSaveStatus('idle');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setUnsavedDialogOpen(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, []);

  const handleUnsavedCancel = useCallback(() => {
    setUnsavedDialogOpen(false);
    pendingActionRef.current = null;
  }, []);

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

  const handleSourceChange = useCallback(
    (value: string) => {
      sourceContentRef.current = value;
      handleDirtyChange(true);
    },
    [handleDirtyChange]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape → close viewer (only when not editing, to avoid accidental close)
      if (e.key === 'Escape' && mode === 'view') {
        e.preventDefault();
        handleClose();
        return;
      }

      const isModKey = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + E → toggle edit mode
      if (isModKey && e.key === 'e') {
        e.preventDefault();
        if (mode === 'edit' || mode === 'source') {
          handleSwitchToView();
        } else {
          setMode('edit');
        }
        return;
      }

      // Ctrl/Cmd + S → save (in edit or source mode)
      if (isModKey && e.key === 's' && (mode === 'edit' || mode === 'source')) {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl/Cmd + Shift + M → toggle source mode (only for markdown files)
      if (isModKey && e.shiftKey && e.key === 'M' && isMarkdown) {
        e.preventDefault();
        if (mode === 'source') {
          handleSwitchToView();
        } else {
          handleSwitchMode('source');
        }
        return;
      }

      // Ctrl/Cmd + Shift + R → toggle raw/rendered (only in view mode)
      if (isModKey && e.shiftKey && e.key === 'R' && mode === 'view') {
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

      // Ctrl+/ or F1 → shortcuts overlay
      if ((isModKey && e.key === '/') || e.key === 'F1') {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    isMarkdown,
    handleClose,
    handleSwitchToView,
    handleSwitchMode,
    handleSave,
    handleToggleViewMode,
    handleCopyPath,
  ]);

  const isEditing = mode === 'edit' || mode === 'source';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
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
          {isEditing && <SaveStatusBadge status={saveStatus} error={lastSaveError} />}
        </div>

        {/* Mode toggle buttons */}
        {!isEditing ? (
          <>
            {/* View mode toggle (rendered/raw) */}
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

            {/* Edit button */}
            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={() => setMode('edit')}
                title="Edit (Ctrl+E)"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}

            {/* Source edit button (markdown files only) */}
            {onSave && isMarkdown && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={() => setMode('source')}
                title="Source edit (Ctrl+Shift+M)"
              >
                <FileCode2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Mode switcher: Edit / Source (only for markdown) */}
            {isMarkdown && (
              <div className="flex items-center border rounded-md shrink-0">
                <Button
                  variant={mode === 'edit' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 rounded-r-none gap-1"
                  onClick={() => handleSwitchMode('edit')}
                  title="Rich editor"
                >
                  <Pencil className="w-3 h-3" />
                  <span className="text-xs">Edit</span>
                </Button>
                <Button
                  variant={mode === 'source' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 rounded-l-none gap-1"
                  onClick={() => handleSwitchMode('source')}
                  title="Source (Ctrl+Shift+M)"
                >
                  <FileCode2 className="w-3 h-3" />
                  <span className="text-xs">Source</span>
                </Button>
              </div>
            )}

            {/* Save button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 shrink-0 gap-1"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              title="Save (Ctrl+S)"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span className="text-xs">Save</span>
            </Button>

            {/* Back to view button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 shrink-0 gap-1"
              onClick={handleSwitchToView}
              title="View mode (Ctrl+E)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="text-xs">View</span>
            </Button>
          </>
        )}

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

        {/* Theme settings */}
        <DocsThemeSettings />

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
                    window.electronAPI?.openPath?.(currentDoc.file.absolutePath);
                  }
                }}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                Open in Editor
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
              <Keyboard className="w-3.5 h-3.5 mr-2" />
              Keyboard Shortcuts
            </DropdownMenuItem>
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
        mode === 'edit' ? (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading editor...</span>
              </div>
            }
          >
            <ScrollArea className={cn('flex-1 docs-themed', themeClass)} style={themeStyles}>
              <DocsEditor
                ref={editorRef}
                content={currentDoc.content}
                onDirtyChange={handleDirtyChange}
                isMarkdown={!!isMarkdown}
              />
            </ScrollArea>
          </Suspense>
        ) : mode === 'source' ? (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading source editor...</span>
              </div>
            }
          >
            <DocsSourceEditor value={currentDoc.content} onChange={handleSourceChange} />
          </Suspense>
        ) : (
          <ScrollArea className={cn('flex-1 docs-themed', themeClass)} style={themeStyles}>
            {docsViewMode === 'rendered' ? (
              <div
                className="p-4 mx-auto"
                style={{ maxWidth: 'var(--docs-editor-max-width, 768px)' }}
              >
                <Markdown className="docs-themed-content">{currentDoc.content}</Markdown>
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
        )
      ) : null}

      {/* Theme CSS for rendered view */}
      <style>{docsThemedStyles}</style>

      {/* Unsaved Changes Dialog */}
      <Dialog open={unsavedDialogOpen} onOpenChange={setUnsavedDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. What would you like to do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={handleUnsavedCancel}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleUnsavedDiscard}>
              Discard
            </Button>
            <Button onClick={handleUnsavedSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Overlay */}
      <Suspense fallback={null}>
        <DocsShortcutsOverlay open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </Suspense>
    </div>
  );
});

/**
 * Styles that apply editor-theme CSS custom properties to the rendered Markdown view.
 * These only take effect inside `.docs-themed .docs-themed-content`.
 */
const docsThemedStyles = `
  .docs-themed .docs-themed-content {
    font-family: var(--docs-font-family, inherit);
  }
  .docs-themed .docs-themed-content h1 {
    font-size: var(--docs-h1-size, 1.875rem) !important;
    font-weight: var(--docs-h1-weight, 700);
    color: var(--docs-h1-color, var(--foreground)) !important;
    background: var(--docs-h1-gradient, none);
    -webkit-background-clip: var(--docs-h1-bg-clip, unset);
    background-clip: var(--docs-h1-bg-clip, unset);
  }
  .docs-themed .docs-themed-content h2 {
    font-size: var(--docs-h2-size, 1.5rem) !important;
    font-weight: var(--docs-h2-weight, 600);
    color: var(--docs-h2-color, var(--foreground)) !important;
    background: var(--docs-h2-gradient, none);
    -webkit-background-clip: var(--docs-h2-bg-clip, unset);
    background-clip: var(--docs-h2-bg-clip, unset);
  }
  .docs-themed .docs-themed-content h3 {
    font-size: var(--docs-h3-size, 1.25rem) !important;
    font-weight: var(--docs-h3-weight, 600);
    color: var(--docs-h3-color, var(--foreground)) !important;
    background: var(--docs-h3-gradient, none);
    -webkit-background-clip: var(--docs-h3-bg-clip, unset);
    background-clip: var(--docs-h3-bg-clip, unset);
  }
  .docs-themed .docs-themed-content h4 {
    font-size: var(--docs-h4-size, 1rem) !important;
    font-weight: var(--docs-h4-weight, 600);
    color: var(--docs-h4-color, var(--foreground)) !important;
    background: var(--docs-h4-gradient, none);
    -webkit-background-clip: var(--docs-h4-bg-clip, unset);
    background-clip: var(--docs-h4-bg-clip, unset);
  }
  .docs-themed .docs-themed-content p,
  .docs-themed .docs-themed-content li {
    font-size: var(--docs-body-font-size, 1rem);
    line-height: var(--docs-line-height, 1.7);
  }
  .docs-themed .docs-themed-content code {
    font-size: var(--docs-code-font-size, 0.875rem);
  }
  .docs-themed .docs-themed-content pre code {
    font-size: var(--docs-code-font-size, 0.8125rem);
  }
  .docs-themed .docs-themed-content th {
    background: var(--docs-table-header-bg, var(--muted)) !important;
    padding: var(--docs-table-cell-padding, 0.5rem 0.75rem) !important;
  }
  .docs-themed .docs-themed-content td {
    padding: var(--docs-table-cell-padding, 0.5rem 0.75rem) !important;
  }
  .docs-themed .docs-themed-content th,
  .docs-themed .docs-themed-content td {
    border-color: var(--docs-table-border, var(--border)) !important;
  }
  .docs-striped-rows .docs-themed-content tr:nth-child(even) td {
    background: var(--docs-table-stripe-color, color-mix(in srgb, var(--muted) 25%, transparent));
  }
`;
