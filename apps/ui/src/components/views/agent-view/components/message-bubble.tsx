import { memo, useCallback, useState } from 'react';
import {
  Bot,
  User,
  AlertCircle,
  FileText,
  FilePlus,
  FileInput,
  ClipboardPaste,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getCopyableMessageContent } from '@/lib/message-copy';
import { Markdown } from '@/components/ui/markdown';
import type { ImageAttachment } from '@/store/app-store';
import { useAppStore } from '@/store/app-store';
import { getHttpApiClient } from '@/lib/http-api-client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  images?: ImageAttachment[];
  isError?: boolean;
  toolCalls?: Array<{ name: string; input: unknown }>;
}

interface MessageBubbleProps {
  message: Message;
  chatFontSize: number;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  chatFontSize,
}: MessageBubbleProps) {
  const isError = message.isError && message.role === 'assistant';
  const hasContent = message.content.trim().length > 0;
  const showCopyButton = hasContent;
  const showInsertDocs = message.role === 'assistant' && !isError && hasContent;

  return (
    <div
      className={cn(
        'group/msg flex gap-4 max-w-4xl',
        message.role === 'user' ? 'flex-row-reverse ml-auto' : ''
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
          isError
            ? 'bg-red-500/10 ring-1 ring-red-500/20'
            : message.role === 'assistant'
              ? 'bg-primary/10 ring-1 ring-primary/20'
              : 'bg-muted ring-1 ring-border'
        )}
      >
        {isError ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : message.role === 'assistant' ? (
          <Bot className="w-4 h-4 text-primary" />
        ) : (
          <User className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          'flex-1 max-w-[85%] rounded-2xl px-4 py-3 shadow-sm',
          isError
            ? 'bg-red-500/10 border border-red-500/30'
            : message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border'
        )}
      >
        {message.role === 'assistant' ? (
          <div style={{ fontSize: `${chatFontSize}px` }}>
            <Markdown
              className={cn(
                'prose-p:leading-relaxed prose-headings:text-foreground prose-strong:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
                isError
                  ? 'text-red-600 dark:text-red-400 prose-code:text-red-600 dark:prose-code:text-red-400 prose-code:bg-red-500/10'
                  : 'text-foreground prose-code:text-primary prose-code:bg-muted'
              )}
            >
              {message.content}
            </Markdown>
          </div>
        ) : (
          <p
            className="whitespace-pre-wrap leading-relaxed"
            style={{ fontSize: `${chatFontSize}px` }}
          >
            {message.content}
          </p>
        )}

        {/* Display attached images for user messages */}
        {message.role === 'user' && message.images && message.images.length > 0 && (
          <div className="mt-3 space-y-2">
            {/* Show image paths in chat for traceability/recovery */}
            {message.images.map((image, index) => (
              <div
                key={`path-${image.id || index}`}
                className="text-xs text-primary-foreground/90 font-mono whitespace-pre-wrap break-all rounded-md bg-primary-foreground/10 px-2 py-1"
              >
                {`Bild ${index + 1}: ${image.savedPath || image.filename || `Image ${index + 1}`}`}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {message.images.map((image, index) => {
                // Construct proper data URL from base64 data and mime type
                const dataUrl = image.data.startsWith('data:')
                  ? image.data
                  : `data:${image.mimeType || 'image/png'};base64,${image.data}`;
                return (
                  <div
                    key={image.id || `img-${index}`}
                    className="relative group rounded-lg overflow-hidden border border-primary-foreground/20 bg-primary-foreground/10"
                  >
                    <img
                      src={dataUrl}
                      alt={image.filename || `Attached image ${index + 1}`}
                      className="w-20 h-20 object-cover hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[9px] text-white truncate">
                      {image.filename || `Image ${index + 1}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer: timestamp + Insert into Docs */}
        <div className="flex items-center justify-between mt-2">
          <p
            className={cn(
              'text-[11px] font-medium',
              isError
                ? 'text-red-500/70'
                : message.role === 'user'
                  ? 'text-primary-foreground/70'
                  : 'text-muted-foreground'
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>

          <div className="flex items-center gap-1.5">
            {showCopyButton && (
              <CopyButton content={message.content} isUserMessage={message.role === 'user'} />
            )}
            {showInsertDocs && <InsertIntoDocsButton content={message.content} />}
          </div>
        </div>
      </div>
    </div>
  );
});

/** Direct copy-to-clipboard button (single click) */
function CopyButton({ content, isUserMessage }: { content: string; isUserMessage?: boolean }) {
  const handleCopy = useCallback(() => {
    const sanitizedContent = getCopyableMessageContent(content);
    navigator.clipboard.writeText(sanitizedContent).then(
      () => toast.success('Copied to clipboard'),
      () => toast.error('Failed to copy')
    );
  }, [content]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-[10px]',
              isUserMessage
                ? 'text-primary-foreground/70 hover:text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Copy className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Copy to clipboard
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Button with dropdown to insert AI message content into docs */
function InsertIntoDocsButton({ content }: { content: string }) {
  const [isCreating, setIsCreating] = useState(false);
  const projectPath = useAppStore((s) => s.currentProject?.path);
  const currentDocPath = useAppStore((s) => s.currentDocPath);
  const setDocsOpen = useAppStore((s) => s.setDocsOpen);
  const setCurrentDocPath = useAppStore((s) => s.setCurrentDocPath);

  const handleNewDoc = useCallback(async () => {
    if (!projectPath || isCreating) return;
    setIsCreating(true);
    try {
      const api = getHttpApiClient();
      // Generate a name from the first line of content
      const firstLine = content
        .split('\n')[0]
        .replace(/^#+\s*/, '')
        .trim();
      const name = (firstLine.slice(0, 40) || 'AI Response') + '.md';
      const newDoc = await api.docs.create({ projectPath, name, content });
      toast.success('Document created');
      // Open the new doc
      setDocsOpen(true);
      setCurrentDocPath(newDoc.path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create document';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  }, [content, projectPath, isCreating, setDocsOpen, setCurrentDocPath]);

  const handleAppendToCurrent = useCallback(async () => {
    if (!projectPath || !currentDocPath || isCreating) return;
    setIsCreating(true);
    try {
      const api = getHttpApiClient();
      // Read current content first
      const docContent = await api.docs.read(projectPath, currentDocPath);
      const existing = docContent.content || '';
      const separator = existing.trim().length > 0 ? '\n\n---\n\n' : '';
      await api.docs.update({
        projectPath,
        filePath: currentDocPath,
        content: existing + separator + content,
      });
      toast.success('Content appended to document');
      // Switch to docs view
      setDocsOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to append to document';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  }, [content, projectPath, currentDocPath, isCreating, setDocsOpen]);

  const handleCopyAsMarkdown = useCallback(() => {
    navigator.clipboard.writeText(content).then(
      () => toast.success('Copied to clipboard'),
      () => toast.error('Failed to copy')
    );
  }, [content]);

  if (!projectPath) return null;

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <FileText className="w-3 h-3" />
                Docs
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Insert into Docs
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleNewDoc} disabled={isCreating}>
          <FilePlus className="w-3.5 h-3.5 mr-2" />
          New Document
        </DropdownMenuItem>
        {currentDocPath && (
          <DropdownMenuItem onClick={handleAppendToCurrent} disabled={isCreating}>
            <FileInput className="w-3.5 h-3.5 mr-2" />
            Append to Current
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleCopyAsMarkdown}>
          <ClipboardPaste className="w-3.5 h-3.5 mr-2" />
          Copy as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
