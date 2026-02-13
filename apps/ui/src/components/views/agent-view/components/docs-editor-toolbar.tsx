import { memo, useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  ChevronDown,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  CodeSquare,
  Link as LinkIcon,
  ImagePlus,
  Unlink,
  ExternalLink,
  Check,
  Pilcrow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DocsTablePicker } from './docs-table-picker';

interface DocsEditorToolbarProps {
  editor: Editor;
}

export const DocsEditorToolbar = memo(function DocsEditorToolbar({
  editor,
}: DocsEditorToolbarProps) {
  return (
    <div className="docs-editor-toolbar flex items-center gap-0.5 px-2 py-1 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex-wrap">
      {/* Text Formatting Group */}
      <ToolbarButton editor={editor} command="bold" icon={Bold} label="Bold" shortcut="Ctrl+B" />
      <ToolbarButton
        editor={editor}
        command="italic"
        icon={Italic}
        label="Italic"
        shortcut="Ctrl+I"
      />
      <ToolbarButton
        editor={editor}
        command="underline"
        icon={UnderlineIcon}
        label="Underline"
        shortcut="Ctrl+U"
      />
      <ToolbarButton
        editor={editor}
        command="strike"
        icon={Strikethrough}
        label="Strikethrough"
        shortcut="Ctrl+Shift+X"
      />
      <ToolbarButton
        editor={editor}
        command="code"
        icon={Code}
        label="Inline Code"
        shortcut="Ctrl+E"
      />

      <ToolbarSeparator />

      {/* Block Type Group */}
      <HeadingDropdown editor={editor} />

      <ToolbarSeparator />

      {/* List Group */}
      <ToolbarButton
        editor={editor}
        command="bulletList"
        icon={List}
        label="Bullet List"
        shortcut="Ctrl+Shift+8"
      />
      <ToolbarButton
        editor={editor}
        command="orderedList"
        icon={ListOrdered}
        label="Ordered List"
        shortcut="Ctrl+Shift+7"
      />
      <ToolbarButton
        editor={editor}
        command="taskList"
        icon={ListChecks}
        label="Task List"
        shortcut="Ctrl+Shift+9"
      />

      <ToolbarSeparator />

      {/* Block Elements Group */}
      <ToolbarButton
        editor={editor}
        command="blockquote"
        icon={Quote}
        label="Blockquote"
        shortcut="Ctrl+Shift+B"
      />
      <ToolbarButton
        editor={editor}
        command="codeBlock"
        icon={CodeSquare}
        label="Code Block"
        shortcut="Ctrl+Alt+C"
      />
      <ToolbarButton
        editor={editor}
        command="horizontalRule"
        icon={Minus}
        label="Horizontal Rule"
      />

      <ToolbarSeparator />

      {/* Table */}
      <DocsTablePicker editor={editor} />

      <ToolbarSeparator />

      {/* Inline Elements Group */}
      <LinkButton editor={editor} />
      <ImageButton editor={editor} />
    </div>
  );
});

// --- Toolbar Button ---

interface ToolbarButtonProps {
  editor: Editor;
  command: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
}

function ToolbarButton({ editor, command, icon: Icon, label, shortcut }: ToolbarButtonProps) {
  const isActive = editor.isActive(command);

  const handleClick = useCallback(() => {
    const chain = editor.chain().focus();
    switch (command) {
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'underline':
        chain.toggleUnderline().run();
        break;
      case 'strike':
        chain.toggleStrike().run();
        break;
      case 'code':
        chain.toggleCode().run();
        break;
      case 'bulletList':
        chain.toggleBulletList().run();
        break;
      case 'orderedList':
        chain.toggleOrderedList().run();
        break;
      case 'taskList':
        chain.toggleTaskList().run();
        break;
      case 'blockquote':
        chain.toggleBlockquote().run();
        break;
      case 'codeBlock':
        chain.toggleCodeBlock().run();
        break;
      case 'horizontalRule':
        chain.setHorizontalRule().run();
        break;
    }
  }, [editor, command]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              'inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
              isActive && 'bg-accent text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span>{label}</span>
          {shortcut && <span className="ml-1.5 text-muted-foreground text-[10px]">{shortcut}</span>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// --- Toolbar Separator ---

function ToolbarSeparator() {
  return <div className="w-px h-4 bg-border mx-1 shrink-0" />;
}

// --- Heading Dropdown ---

const HEADING_OPTIONS = [
  { label: 'Normal Text', level: 0, icon: Pilcrow, shortcut: 'Alt+0' },
  { label: 'Heading 1', level: 1, icon: Heading1, shortcut: 'Alt+1' },
  { label: 'Heading 2', level: 2, icon: Heading2, shortcut: 'Alt+2' },
  { label: 'Heading 3', level: 3, icon: Heading3, shortcut: 'Alt+3' },
  { label: 'Heading 4', level: 4, icon: Heading4, shortcut: 'Alt+4' },
] as const;

const HEADING_FONT_SIZES: Record<number, string> = {
  0: 'text-sm',
  1: 'text-lg font-bold',
  2: 'text-base font-semibold',
  3: 'text-sm font-semibold',
  4: 'text-sm font-medium',
};

function HeadingDropdown({ editor }: { editor: Editor }) {
  const currentLevel = HEADING_OPTIONS.find((opt) =>
    opt.level === 0 ? !editor.isActive('heading') : editor.isActive('heading', { level: opt.level })
  );
  const currentLabel = currentLevel?.label ?? 'Normal Text';

  const handleSelect = useCallback(
    (level: number) => {
      if (level === 0) {
        editor.chain().focus().setParagraph().run();
      } else {
        editor
          .chain()
          .focus()
          .toggleHeading({ level: level as 1 | 2 | 3 | 4 })
          .run();
      }
    },
    [editor]
  );

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-[5.5rem]"
              >
                <span className="truncate">{currentLabel}</span>
                <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Block type</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="start" className="w-52">
        {HEADING_OPTIONS.map((opt) => {
          const isActive =
            opt.level === 0
              ? !editor.isActive('heading')
              : editor.isActive('heading', { level: opt.level });
          const Icon = opt.icon;
          return (
            <DropdownMenuItem
              key={opt.level}
              onClick={() => handleSelect(opt.level)}
              className={cn('gap-2', isActive && 'bg-accent')}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={cn('flex-1', HEADING_FONT_SIZES[opt.level])}>{opt.label}</span>
              {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-brand-500" />}
              <DropdownMenuShortcut>{opt.shortcut}</DropdownMenuShortcut>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --- Link Button with Popover ---

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const isActive = editor.isActive('link');

  const handleOpen = useCallback(() => {
    const existingUrl = editor.getAttributes('link').href ?? '';
    setUrl(existingUrl);
    setOpen(true);
  }, [editor]);

  const handleInsert = useCallback(() => {
    if (!url.trim()) return;
    const href = url.match(/^https?:\/\//) ? url : `https://${url}`;
    editor.chain().focus().setLink({ href }).run();
    setOpen(false);
    setUrl('');
  }, [editor, url]);

  const handleRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
    setUrl('');
  }, [editor]);

  const handleOpenExternal = useCallback(() => {
    const href = editor.getAttributes('link').href;
    if (href) window.open(href, '_blank');
  }, [editor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleInsert();
      }
    },
    [handleInsert]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={handleOpen}
                className={cn(
                  'inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
                  isActive && 'bg-accent text-foreground'
                )}
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span>Link</span>
            <span className="ml-1.5 text-muted-foreground text-[10px]">Ctrl+K</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex items-center gap-1.5 mt-1">
            <Button
              size="sm"
              className="h-7 px-3 text-xs flex-1"
              onClick={handleInsert}
              disabled={!url.trim()}
            >
              {isActive ? 'Update' : 'Insert'}
            </Button>
            {isActive && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleOpenExternal}
                  title="Open link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={handleRemove}
                  title="Remove link"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --- Image URL Button ---

function ImageButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const handleInsert = useCallback(() => {
    if (!url.trim()) return;
    editor.chain().focus().setImage({ src: url }).run();
    setOpen(false);
    setUrl('');
  }, [editor, url]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleInsert();
      }
    },
    [handleInsert]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ImagePlus className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Insert Image</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Image URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com/image.png"
            className="h-8 text-sm"
            autoFocus
          />
          <Button
            size="sm"
            className="h-7 text-xs mt-1"
            onClick={handleInsert}
            disabled={!url.trim()}
          >
            Insert Image
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
