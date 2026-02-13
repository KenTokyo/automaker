import { useCallback, useEffect, useRef, useState, memo } from 'react';
import type { Editor } from '@tiptap/react';
import {
  ArrowUpFromLine,
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  Trash2,
  TableProperties,
  Rows3,
  Columns3,
  Merge,
  Split,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Position {
  x: number;
  y: number;
}

interface DocsTableMenuProps {
  editor: Editor;
}

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  disabled?: boolean;
}

export const DocsTableMenu = memo(function DocsTableMenu({ editor }: DocsTableMenuProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setPosition(null);
  }, []);

  // Close on click outside or escape
  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, handleClose]);

  // Listen for right-click inside editor table cells
  useEffect(() => {
    let editorElement: HTMLElement | undefined;
    try {
      editorElement = editor.view?.dom;
    } catch {
      // editor.view may throw if editor is not yet mounted
      return;
    }
    if (!editorElement) return;

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('td, th');
      const table = target.closest('table');
      if (!cell || !table) return;

      e.preventDefault();
      setPosition({ x: e.clientX, y: e.clientY });
    };

    editorElement.addEventListener('contextmenu', handleContextMenu);
    return () => {
      editorElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [editor]);

  // Guard: if no position or editor view not ready, don't render
  if (!position) return null;

  let canMergeCells = false;
  let canSplitCell = false;
  try {
    canMergeCells = editor.can().mergeCells();
    canSplitCell = editor.can().splitCell();
  } catch {
    // editor.view may not be available yet (TipTap v3 Proxy throws)
    return null;
  }

  const rowItems: MenuItem[] = [
    {
      label: 'Insert Row Above',
      icon: ArrowUpFromLine,
      action: () => {
        editor.chain().focus().addRowBefore().run();
        handleClose();
      },
    },
    {
      label: 'Insert Row Below',
      icon: ArrowDownFromLine,
      action: () => {
        editor.chain().focus().addRowAfter().run();
        handleClose();
      },
    },
    {
      label: 'Delete Row',
      icon: Trash2,
      action: () => {
        editor.chain().focus().deleteRow().run();
        handleClose();
      },
    },
  ];

  const colItems: MenuItem[] = [
    {
      label: 'Insert Column Before',
      icon: ArrowLeftFromLine,
      action: () => {
        editor.chain().focus().addColumnBefore().run();
        handleClose();
      },
    },
    {
      label: 'Insert Column After',
      icon: ArrowRightFromLine,
      action: () => {
        editor.chain().focus().addColumnAfter().run();
        handleClose();
      },
    },
    {
      label: 'Delete Column',
      icon: Trash2,
      action: () => {
        editor.chain().focus().deleteColumn().run();
        handleClose();
      },
    },
  ];

  const cellItems: MenuItem[] = [
    {
      label: 'Merge Cells',
      icon: Merge,
      action: () => {
        editor.chain().focus().mergeCells().run();
        handleClose();
      },
      disabled: !canMergeCells,
    },
    {
      label: 'Split Cell',
      icon: Split,
      action: () => {
        editor.chain().focus().splitCell().run();
        handleClose();
      },
      disabled: !canSplitCell,
    },
  ];

  const headerItems: MenuItem[] = [
    {
      label: 'Toggle Header Row',
      icon: Rows3,
      action: () => {
        editor.chain().focus().toggleHeaderRow().run();
        handleClose();
      },
    },
    {
      label: 'Toggle Header Column',
      icon: Columns3,
      action: () => {
        editor.chain().focus().toggleHeaderColumn().run();
        handleClose();
      },
    },
  ];

  const tableItems: MenuItem[] = [
    {
      label: 'Delete Table',
      icon: TableProperties,
      action: () => {
        editor.chain().focus().deleteTable().run();
        handleClose();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <MenuGroup items={rowItems} />
      <MenuSeparator />
      <MenuGroup items={colItems} />
      <MenuSeparator />
      <MenuGroup items={cellItems} />
      <MenuSeparator />
      <MenuGroup items={headerItems} />
      <MenuSeparator />
      <MenuGroup items={tableItems} />
    </div>
  );
});

function MenuGroup({ items }: { items: MenuItem[] }) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            disabled={item.disabled}
            className={cn(
              'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
              item.disabled && 'pointer-events-none opacity-50'
            )}
          >
            <Icon className="w-4 h-4 mr-2 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </>
  );
}

function MenuSeparator() {
  return <div className="-mx-1 my-1 h-px bg-muted" />;
}
