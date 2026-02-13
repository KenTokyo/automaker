import { memo, useCallback, useState } from 'react';
import { Plus, FolderPlus, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocs } from '@/hooks/use-docs';
import { useAppStore } from '@/store/app-store';
import { DocsList } from './docs-list';
import { DocsViewer } from './docs-viewer';
import { DocsCreateDialog, DocsFolderDialog, DocsDeleteDialog } from './docs-create-dialog';
import type { DocFile } from '@automaker/types';

interface DocsPanelProps {
  projectPath: string;
}

export const DocsPanel = memo(function DocsPanel({ projectPath }: DocsPanelProps) {
  const currentDocPath = useAppStore((s) => s.currentDocPath);

  const {
    docs,
    isLoading,
    error,
    currentDoc,
    isLoadingDoc,
    docError,
    openDoc,
    closeDoc,
    deleteDoc,
    navigateToFolder,
    currentSubfolder,
    createDoc,
    updateDoc,
    createFolder,
    retryLoadDoc,
    renameDoc,
  } = useDocs(projectPath);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DocFile | null>(null);

  // Build breadcrumb segments
  const breadcrumbs = currentSubfolder ? ['docs', ...currentSubfolder.split('/')] : ['docs'];

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      if (index === 0) {
        navigateToFolder('');
      } else {
        const parts = currentSubfolder.split('/');
        const targetPath = parts.slice(0, index).join('/');
        navigateToFolder(targetPath);
      }
    },
    [currentSubfolder, navigateToFolder]
  );

  const handleCreateDoc = useCallback(
    async (name: string, content: string) => {
      await createDoc(name, content);
    },
    [createDoc]
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      await createFolder(name);
    },
    [createFolder]
  );

  const handleDeleteRequest = useCallback((doc: DocFile) => {
    setFileToDelete(doc);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!fileToDelete) return;
    await deleteDoc(fileToDelete.path);
    setFileToDelete(null);
  }, [fileToDelete, deleteDoc]);

  const handleRenameDoc = useCallback(
    (oldPath: string, newName: string) => {
      renameDoc(oldPath, newName).catch(() => {
        // Error handled by hook toast
      });
    },
    [renameDoc]
  );

  const handleDeleteFromViewer = useCallback(
    (filePath: string) => {
      const doc = docs.find((d) => d.path === filePath);
      if (doc) {
        handleDeleteRequest(doc);
      } else {
        // File not in current list (could be from a different subfolder) — delete directly
        deleteDoc(filePath).catch(() => {});
      }
    },
    [docs, handleDeleteRequest, deleteDoc]
  );

  // If a doc is open, show the viewer
  if (currentDocPath) {
    return (
      <>
        <DocsViewer
          currentDoc={currentDoc}
          isLoadingDoc={isLoadingDoc}
          docError={docError}
          onClose={closeDoc}
          onDelete={handleDeleteFromViewer}
          onRetry={retryLoadDoc}
          onSave={updateDoc}
        />
        <DocsDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          fileName={fileToDelete?.name ?? ''}
          isDirectory={fileToDelete?.isDirectory ?? false}
          onConfirm={handleConfirmDelete}
        />
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-3 border-b space-y-2">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto">
          {breadcrumbs.map((segment, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <button
                className="hover:text-foreground transition-colors cursor-pointer"
                onClick={() => handleBreadcrumbClick(i)}
              >
                {segment}
              </button>
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Doc
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFolderDialogOpen(true)}>
            <FolderPlus className="w-3.5 h-3.5 mr-1" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && <div className="p-3 text-sm text-destructive">{error}</div>}

      {/* File List or Empty State */}
      {!isLoading && docs.length === 0 && !error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
          <FileText className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm font-medium mb-1">No documents</p>
          <p className="text-xs text-center mb-4">
            Create your first doc to store plans, notes and specs.
          </p>
          <Button variant="default" size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create First Doc
          </Button>
        </div>
      ) : (
        <DocsList
          docs={docs}
          isLoading={isLoading}
          onOpenDoc={openDoc}
          onNavigateToFolder={navigateToFolder}
          onDeleteDoc={handleDeleteRequest}
          onRenameDoc={handleRenameDoc}
          currentDocPath={currentDocPath}
        />
      )}

      {/* Dialogs */}
      <DocsCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateDoc}
        subfolder={currentSubfolder}
      />
      <DocsFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        onSubmit={handleCreateFolder}
      />
      <DocsDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        fileName={fileToDelete?.name ?? ''}
        isDirectory={fileToDelete?.isDirectory ?? false}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
});
