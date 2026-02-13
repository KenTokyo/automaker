import { memo, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/react';
import { Table } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const GRID_SIZE = 8;

interface DocsTablePickerProps {
  editor: Editor;
}

export const DocsTablePicker = memo(function DocsTablePicker({ editor }: DocsTablePickerProps) {
  const [open, setOpen] = useState(false);
  const [hoverRows, setHoverRows] = useState(0);
  const [hoverCols, setHoverCols] = useState(0);

  const handleCellHover = useCallback((row: number, col: number) => {
    setHoverRows(row);
    setHoverCols(col);
  }, []);

  const handleCellClick = useCallback(
    (rows: number, cols: number) => {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
      setOpen(false);
      setHoverRows(0);
      setHoverCols(0);
    },
    [editor]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverRows(0);
    setHoverCols(0);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center justify-center rounded-md h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
                  editor.isActive('table') && 'bg-accent text-foreground'
                )}
              >
                <Table className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Insert Table</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-auto p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            }}
            onMouseLeave={handleMouseLeave}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
              const row = Math.floor(i / GRID_SIZE) + 1;
              const col = (i % GRID_SIZE) + 1;
              const isHighlighted = row <= hoverRows && col <= hoverCols;
              return (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    'w-4 h-4 rounded-[2px] border transition-colors',
                    isHighlighted
                      ? 'bg-brand-500/60 border-brand-500/80'
                      : 'bg-muted/40 border-border hover:border-muted-foreground/40'
                  )}
                  onMouseEnter={() => handleCellHover(row, col)}
                  onClick={() => handleCellClick(row, col)}
                />
              );
            })}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {hoverRows > 0 && hoverCols > 0 ? `${hoverCols} x ${hoverRows}` : 'Select table size'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
});
