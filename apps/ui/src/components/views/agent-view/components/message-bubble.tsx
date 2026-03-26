import { memo, useCallback, useMemo, useState, type CSSProperties } from 'react';
import type { ChatDisplaySettings } from '@/store/types/ui-types';
import { getGrayShadeColor, isDarkThemeActive } from './chat-settings-popover';
import {
  Bot,
  User,
  AlertCircle,
  FileText,
  FilePlus,
  FileInput,
  ClipboardPaste,
  Copy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getCopyableMessageContent } from '@/lib/message-copy';
import { splitOrchestratorMessage } from '@/lib/orchestrator-message';
import { stripEmbeddedSystemPrompts } from '@/lib/system-prompt-payload';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  chatDisplaySettings: ChatDisplaySettings;
  chatBubbleColor?: string;
  userBubbleColor?: string;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  chatDisplaySettings,
  chatBubbleColor,
  userBubbleColor,
}: MessageBubbleProps) {
  const isError = message.isError && message.role === 'assistant';
  const normalizedMessageContent = message.content.replace(/\\n/g, '\n');
  const visibleMessageContent = useMemo(
    () => stripEmbeddedSystemPrompts(normalizedMessageContent),
    [normalizedMessageContent]
  );
  const { preMessage, mainMessage, postMessage } = useMemo(
    () => splitOrchestratorMessage(visibleMessageContent),
    [visibleMessageContent]
  );
  const hasContent = visibleMessageContent.trim().length > 0;
  const showCopyButton = hasContent;
  const showInsertDocs = message.role === 'assistant' && !isError && mainMessage.length > 0;
  const hasCustomFontColor =
    chatDisplaySettings.fontColorGray != null && chatDisplaySettings.fontColorGray < 900;
  const markdownClassName = cn(
    '[&_p]:whitespace-pre-wrap [&_li]:whitespace-normal [&_code]:break-words',
    isError
      ? 'text-red-600 dark:text-red-400 prose-code:text-red-600 dark:prose-code:text-red-400 prose-code:bg-red-500/10'
      : hasCustomFontColor
        ? 'text-inherit'
        : 'text-foreground'
  );

  const isUserMessage = message.role === 'user';

  // User messages: render as plain text with preserved whitespace, not Markdown
  const renderUserContent = useCallback(() => {
    if (!mainMessage) return null;
    return (
      <div
        className={cn(
          'whitespace-pre-wrap break-words leading-relaxed',
          hasCustomFontColor ? 'text-inherit' : 'text-foreground'
        )}
      >
        {mainMessage}
      </div>
    );
  }, [mainMessage, hasCustomFontColor]);

  return (
    <div className={cn('group/msg', isUserMessage ? 'flex justify-end' : '')}>
      {/* Message Bubble */}
      <div
        className={cn(
          'shadow-sm',
          isUserMessage
            ? 'rounded-2xl rounded-br-md px-4 py-3 max-w-[85%]'
            : 'rounded-2xl px-4 py-3',
          isError
            ? 'bg-red-500/10 border border-red-500/30'
            : isUserMessage
              ? 'bg-secondary/80 text-foreground border border-border/50'
              : 'bg-card border border-border'
        )}
        style={
          !isError && (isUserMessage ? userBubbleColor || chatBubbleColor : chatBubbleColor)
            ? {
                backgroundColor: `color-mix(in oklch, ${isUserMessage ? (userBubbleColor || chatBubbleColor)! : chatBubbleColor!} 25%, ${isUserMessage ? 'hsl(var(--secondary))' : 'hsl(var(--card))'} 75%)`,
              }
            : undefined
        }
      >
        {/* Inline role indicator */}
        <div className={cn('flex items-center gap-1.5 mb-1.5', isUserMessage ? 'justify-end' : '')}>
          {isError ? (
            <AlertCircle className="w-3 h-3 text-red-500" />
          ) : message.role === 'assistant' ? (
            <Bot className="w-3 h-3 text-muted-foreground" />
          ) : (
            <User className="w-3 h-3 text-muted-foreground/70" />
          )}
          <span
            className={cn(
              'text-[11px] font-medium',
              isUserMessage ? 'text-muted-foreground/70' : 'text-muted-foreground'
            )}
          >
            {isError ? 'Error' : message.role === 'assistant' ? 'Assistant' : 'You'}
          </span>
        </div>

        <div
          className={cn('chat-display-styled', hasCustomFontColor && 'chat-color-override')}
          style={
            {
              fontSize: `${chatDisplaySettings.fontSize}px`,
              fontWeight: chatDisplaySettings.fontWeight,
              opacity: chatDisplaySettings.fontOpacity,
              lineHeight: chatDisplaySettings.lineHeight,
              '--code-font-size': `${chatDisplaySettings.fontSize + chatDisplaySettings.codeBlockRelativeSize}px`,
              '--heading-scale': chatDisplaySettings.headingScale ?? 1.0,
              ...(chatDisplaySettings.fontColorGray != null &&
                chatDisplaySettings.fontColorGray < 900 && {
                  color: getGrayShadeColor(chatDisplaySettings.fontColorGray, isDarkThemeActive()),
                }),
            } as CSSProperties
          }
        >
          {preMessage && (
            <OrchestratorContentDropdown title="Orchestrator Text Preview" content={preMessage} />
          )}
          {isUserMessage
            ? renderUserContent()
            : mainMessage && <Markdown className={markdownClassName}>{mainMessage}</Markdown>}
          {postMessage && (
            <OrchestratorContentDropdown title="Orchestrator Text After" content={postMessage} />
          )}
        </div>

        {/* Display attached images for user messages */}
        {isUserMessage && message.images && message.images.length > 0 && (
          <div className="mt-3 space-y-2">
            {/* Show image paths in chat for traceability/recovery */}
            {message.images.map((image, index) => (
              <div
                key={`path-${image.id || index}`}
                className="text-xs text-foreground/70 font-mono whitespace-pre-wrap break-all rounded-md bg-black/10 dark:bg-white/5 px-2 py-1"
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
                    className="relative group rounded-lg overflow-hidden border border-border/70 bg-muted/40"
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

        {/* Footer: timestamp + actions */}
        <div
          className={cn(
            'flex items-center mt-2',
            isUserMessage ? 'justify-between flex-row-reverse' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-1.5">
            {showCopyButton && (
              <CopyButton content={message.content} isUserMessage={isUserMessage} />
            )}
            {showInsertDocs && <InsertIntoDocsButton content={message.content} />}
          </div>

          <p
            className={cn(
              'text-[11px] font-medium',
              isError
                ? 'text-red-500/70'
                : isUserMessage
                  ? 'text-foreground/40'
                  : 'text-muted-foreground'
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
});

function OrchestratorContentDropdown({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mb-2 rounded-lg border border-border/70 bg-muted/40"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <span>{title}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2.5 pb-2.5">
        <Markdown className="text-xs [&_p]:my-1 [&_li]:my-0 [&_ul]:my-1 [&_ol]:my-1">
          {content}
        </Markdown>
      </CollapsibleContent>
    </Collapsible>
  );
}

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
                ? 'text-foreground/60 hover:text-foreground'
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
      setCurrentDocPath(newDoc.path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create document';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  }, [content, projectPath, isCreating, setCurrentDocPath]);

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to append to document';
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  }, [content, projectPath, currentDocPath, isCreating]);

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
