/**
 * FilesPanelTerminalSplit - Vertical split: files content on top, terminal on bottom.
 *
 * Uses react-resizable-panels for the drag handle.
 * Reports size changes so the parent can persist them.
 */

import { memo, useCallback, useRef } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { FilesPanelTerminalEmbed } from './files-panel-terminal-embed';

interface FilesPanelTerminalSplitProps {
  /** Content node rendered in the top (files) area. */
  children: React.ReactNode;
  /** Terminal panel size in percent (15-85). */
  terminalSize: number;
  /** Called when the user finishes dragging the resize handle. */
  onTerminalResize: (size: number) => void;
}

export const FilesPanelTerminalSplit = memo(function FilesPanelTerminalSplit({
  children,
  terminalSize,
  onTerminalResize,
}: FilesPanelTerminalSplitProps) {
  const terminalPanelRef = useRef<ImperativePanelHandle>(null);

  const handleLayout = useCallback(
    (sizes: number[]) => {
      // sizes[1] is the terminal panel percentage
      if (sizes[1] != null && Math.abs(sizes[1] - terminalSize) > 0.5) {
        onTerminalResize(sizes[1]);
      }
    },
    [terminalSize, onTerminalResize]
  );

  const filesSize = 100 - terminalSize;

  return (
    <ResizablePanelGroup direction="vertical" onLayout={handleLayout}>
      {/* Files content (top) */}
      <ResizablePanel defaultSize={filesSize} minSize={15} order={1}>
        <div className="h-full min-h-0 overflow-hidden">{children}</div>
      </ResizablePanel>

      {/* Resize handle */}
      <ResizableHandle withHandle aria-label="Trennleiste zwischen Dateien und Terminal" />

      {/* Terminal (bottom) */}
      <ResizablePanel
        ref={terminalPanelRef}
        defaultSize={terminalSize}
        minSize={15}
        maxSize={85}
        order={2}
      >
        <FilesPanelTerminalEmbed />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
});
