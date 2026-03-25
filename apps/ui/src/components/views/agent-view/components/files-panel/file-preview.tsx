import {
  FileText,
  Loader2,
  AlertTriangle,
  Copy,
  ClipboardCheck,
  ExternalLink,
  Pencil,
  Eye,
  Save,
  ArrowLeft,
} from 'lucide-react';
import { useExplorerStore } from '@/store/explorer-store';
import { useCallback, useState, useRef, useEffect, useMemo, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';
import { getHttpApiClient } from '@/lib/http-api-client';
import { toast } from 'sonner';
import { DEFAULT_CHAT_DISPLAY_SETTINGS } from '@/store/types/ui-types';
import type { ChatDisplaySettings } from '@/store/types/ui-types';
import { getGrayShadeColor, isDarkThemeActive } from '../chat-settings-popover';

const STORAGE_KEY = 'automaker:chatDisplaySettings';

/**
 * Read chat display settings from localStorage.
 * We only use color/weight/opacity/lineHeight – NOT fontSize (panel has its own control).
 */
function readChatDisplaySettings(): ChatDisplaySettings {
  if (typeof window === 'undefined') return DEFAULT_CHAT_DISPLAY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatDisplaySettings;
      return { ...DEFAULT_CHAT_DISPLAY_SETTINGS, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_CHAT_DISPLAY_SETTINGS;
}

interface FilePreviewProps {
  filePath: string | null;
  content: string | null;
  isLoading: boolean;
  error: string | null;
}

export function FilePreview({ filePath, content, isLoading, error }: FilePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Read chat display settings (live-sync via storage event when changed from chat)
  const [displaySettings, setDisplaySettings] =
    useState<ChatDisplaySettings>(readChatDisplaySettings);

  useEffect(() => {
    // Cross-tab sync via storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setDisplaySettings(readChatDisplaySettings());
      }
    };
    // Same-tab sync via custom event (dispatched from agent-view.tsx)
    const handleCustom = () => {
      setDisplaySettings(readChatDisplaySettings());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('chatDisplaySettingsChanged', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('chatDisplaySettingsChanged', handleCustom);
    };
  }, []);

  const fileName = filePath ? (filePath.replace(/\\/g, '/').split('/').pop() ?? '') : '';
  const isMarkdownFile = fileName.match(/\.(md|mdx|markdown)$/i) !== null;

  // Build style from chat settings (color, weight, opacity, lineHeight) — NOT fontSize
  const contentStyle = useMemo<CSSProperties>(() => {
    const style: CSSProperties = {
      fontWeight: displaySettings.fontWeight,
      opacity: displaySettings.fontOpacity,
      lineHeight: displaySettings.lineHeight,
      // heading scale CSS var
      '--heading-scale': displaySettings.headingScale ?? 1.0,
    } as CSSProperties;

    if (displaySettings.fontColorGray != null && displaySettings.fontColorGray < 900) {
      style.color = getGrayShadeColor(displaySettings.fontColorGray, isDarkThemeActive());
    }

    return style;
  }, [displaySettings]);

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }, [content]);

  const handleCopyPath = useCallback(async () => {
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(filePath);
    } catch {
      // Ignore clipboard errors
    }
  }, [filePath]);

  // Enter edit mode
  const handleStartEdit = useCallback(() => {
    setEditContent(content ?? '');
    setIsEditing(true);
  }, [content]);

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent('');
  }, []);

  // Save edited content
  const handleSave = useCallback(async () => {
    if (!filePath || isSaving) return;
    setIsSaving(true);
    try {
      const api = getHttpApiClient();
      const result = await api.writeFile(filePath, editContent);
      if (result.success) {
        toast.success('Datei gespeichert');
        setIsEditing(false);
        // Update the store so the preview shows the new content immediately
        useExplorerStore.getState().setFileContent(editContent);
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch {
      toast.error('Datei konnte nicht gespeichert werden');
    } finally {
      setIsSaving(false);
    }
  }, [filePath, editContent, isSaving]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Keyboard shortcuts: Ctrl+S to save, Esc to cancel
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    },
    [handleCancelEdit, handleSave]
  );

  // Reset editing state when file changes
  useEffect(() => {
    setIsEditing(false);
    setEditContent('');
  }, [filePath]);

  if (!filePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
        <FileText className="h-8 w-8 opacity-40" />
        <p className="text-sm">Wähle eine Datei aus, um sie hier anzuzeigen.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive/70" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-muted px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => useExplorerStore.getState().selectFile(null)}
            title="Zurück zur Liste"
          >
            <ArrowLeft className="h-3 w-3" />
          </button>
          <span
            className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground"
            title={filePath}
          >
            {fileName}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* Edit / Preview toggle */}
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-emerald-400 hover:text-emerald-300"
                onClick={() => void handleSave()}
                disabled={isSaving}
                title="Speichern (Ctrl+S)"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleCancelEdit}
                title="Abbrechen (Esc)"
              >
                <Eye className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleStartEdit}
              title="Bearbeiten"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => void handleCopyPath()}
            title="Pfad kopieren"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 text-muted-foreground hover:text-foreground',
              copied && 'text-emerald-400'
            )}
            onClick={() => void handleCopy()}
            title="Inhalt kopieren"
          >
            {copied ? <ClipboardCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-full w-full resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-foreground/90 outline-none"
            style={contentStyle}
            spellCheck={false}
          />
        ) : isMarkdownFile && content ? (
          <div className="chat-display-styled p-3" style={contentStyle}>
            <Markdown
              className={cn(
                '[&_p]:text-xs [&_p]:leading-relaxed',
                '[&_li]:text-xs [&_li]:leading-relaxed',
                '[&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h4]:text-xs',
                '[&_code]:text-[10px]',
                '[&_pre]:text-[10px]',
                '[&_td]:text-xs [&_th]:text-xs',
                '[&_blockquote]:text-xs',
                displaySettings.fontColorGray != null && displaySettings.fontColorGray < 900
                  ? 'text-inherit'
                  : 'text-foreground'
              )}
            >
              {content}
            </Markdown>
          </div>
        ) : (
          <pre
            className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-foreground/90"
            style={contentStyle}
          >
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
