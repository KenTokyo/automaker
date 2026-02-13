import { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  Folder,
  MoreVertical,
  Copy,
  Trash2,
  Edit2,
  MessageSquarePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import type { DocFile } from '@automaker/types';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocsListProps {
  docs: DocFile[];
  isLoading: boolean;
  onOpenDoc: (filePath: string) => void;
  onNavigateToFolder: (subfolder: string) => void;
  onDeleteDoc: (doc: DocFile) => void;
  onRenameDoc: (oldPath: string, newName: string) => void;
  currentDocPath: string | null;
}

export const DocsList = memo(function DocsList({
  docs,
  isLoading,
  onOpenDoc,
  onNavigateToFolder,
  onDeleteDoc,
  onRenameDoc,
  currentDocPath,
}: DocsListProps) {
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      // Select filename without extension
      const dotIndex = renameValue.lastIndexOf('.');
      if (dotIndex > 0) {
        renameInputRef.current.setSelectionRange(0, dotIndex);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [renamingPath, renameValue]);

  const startRename = useCallback((doc: DocFile) => {
    setRenamingPath(doc.path);
    setRenameValue(doc.name);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingPath && renameValue.trim()) {
      const doc = docs.find((d) => d.path === renamingPath);
      if (doc && renameValue.trim() !== doc.name) {
        onRenameDoc(renamingPath, renameValue.trim());
      }
    }
    setRenamingPath(null);
    setRenameValue('');
  }, [renamingPath, renameValue, docs, onRenameDoc]);

  const cancelRename = useCallback(() => {
    setRenamingPath(null);
    setRenameValue('');
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Sort: directories first, then alphabetically
  const sorted = [...docs].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const handleCopyPath = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleInsertIntoChat = (absolutePath: string) => {
    window.dispatchEvent(new CustomEvent('docs:insert-path', { detail: absolutePath }));
    toast.success('Path inserted into chat');
  };

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {sorted.map((doc) => (
          <div
            key={doc.path}
            className={cn(
              'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors hover:bg-accent/50 group',
              currentDocPath === doc.path && 'bg-primary/10 border border-primary/30'
            )}
            onClick={() => {
              if (renamingPath === doc.path) return;
              if (doc.isDirectory) {
                onNavigateToFolder(doc.path);
              } else {
                onOpenDoc(doc.path);
              }
            }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {doc.isDirectory ? (
                <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                {renamingPath === doc.path ? (
                  <Input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') cancelRename();
                    }}
                    onBlur={commitRename}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-sm"
                  />
                ) : (
                  <>
                    <div className="text-sm font-medium truncate">{doc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {doc.isDirectory ? (
                        'Folder'
                      ) : (
                        <>
                          {formatRelativeTime(doc.modifiedAt)}
                          <span className="mx-1">&middot;</span>
                          {formatFileSize(doc.size)}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {renamingPath !== doc.path && (
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!doc.isDirectory && (
                      <DropdownMenuItem onClick={() => handleInsertIntoChat(doc.absolutePath)}>
                        <MessageSquarePlus className="w-3.5 h-3.5 mr-2" />
                        Insert into Chat
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        Copy Path
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onClick={() => handleCopyPath(doc.absolutePath, 'Absolute path')}
                        >
                          Absolute Path
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleCopyPath(`.automaker/docs/${doc.path}`, 'Relative path')
                          }
                        >
                          Relative Path
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyPath(doc.name, 'Filename')}>
                          Filename Only
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => startRename(doc)}>
                      <Edit2 className="w-3.5 h-3.5 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteDoc(doc)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
});
