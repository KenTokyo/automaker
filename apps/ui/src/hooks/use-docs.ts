import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { getHttpApiClient } from '@/lib/http-api-client';
import { useAppStore } from '@/store/app-store';
import type { DocFile, DocContent } from '@automaker/types';

export function useDocs(projectPath: string | undefined) {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<DocContent | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [currentSubfolder, setCurrentSubfolder] = useState('');

  const currentDocPath = useAppStore((s) => s.currentDocPath);
  const setCurrentDocPath = useAppStore((s) => s.setCurrentDocPath);
  const addRecentDoc = useAppStore((s) => s.addRecentDoc);

  const api = getHttpApiClient();

  // Load docs list
  const loadDocs = useCallback(async () => {
    if (!projectPath) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.docs.list(projectPath, currentSubfolder || undefined);
      setDocs(result.files);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load docs';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, currentSubfolder, api]);

  // Load docs when projectPath or subfolder changes
  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // Load document content when currentDocPath changes
  useEffect(() => {
    if (!projectPath || !currentDocPath) {
      setCurrentDoc(null);
      setDocError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingDoc(true);
    setDocError(null);

    api.docs
      .read(projectPath, currentDocPath)
      .then((result) => {
        if (!cancelled) {
          setCurrentDoc(result);
          addRecentDoc({
            path: result.file.path,
            name: result.file.name,
            absolutePath: result.file.absolutePath,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load document';
          setDocError(msg);
          setCurrentDoc(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingDoc(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectPath, currentDocPath, api]);

  const refresh = useCallback(() => {
    loadDocs();
  }, [loadDocs]);

  const openDoc = useCallback(
    (filePath: string) => {
      setCurrentDocPath(filePath);
    },
    [setCurrentDocPath]
  );

  const closeDoc = useCallback(() => {
    setCurrentDocPath(null);
    setCurrentDoc(null);
  }, [setCurrentDocPath]);

  const createDoc = useCallback(
    async (name: string, content?: string) => {
      if (!projectPath) return;
      try {
        const newDoc = await api.docs.create({
          projectPath,
          name,
          content,
          subfolder: currentSubfolder || undefined,
        });
        // Optimistic: add to list immediately
        setDocs((prev) => [...prev, newDoc].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Document created');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create document';
        toast.error(msg);
        throw err;
      }
    },
    [projectPath, currentSubfolder, api]
  );

  const updateDoc = useCallback(
    async (content: string) => {
      if (!projectPath || !currentDocPath) return;
      try {
        await api.docs.update({
          projectPath,
          filePath: currentDocPath,
          content,
        });
        // Update the current doc content in memory
        setCurrentDoc((prev) => (prev ? { ...prev, content } : null));
        toast.success('Document saved');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save document';
        toast.error(msg);
        throw err;
      }
    },
    [projectPath, currentDocPath, api]
  );

  const deleteDoc = useCallback(
    async (filePath: string) => {
      if (!projectPath) return;
      try {
        await api.docs.delete({ projectPath, filePath });
        // Optimistic: remove from list
        setDocs((prev) => prev.filter((d) => d.path !== filePath));
        // If the deleted doc was open, close it
        if (currentDocPath === filePath) {
          closeDoc();
        }
        toast.success('Document deleted');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete document';
        toast.error(msg);
        throw err;
      }
    },
    [projectPath, currentDocPath, closeDoc, api]
  );

  const createFolder = useCallback(
    async (name: string) => {
      if (!projectPath) return;
      try {
        const newFolder = await api.docs.mkdir(projectPath, name, currentSubfolder || undefined);
        setDocs((prev) =>
          [...prev, newFolder].sort((a, b) => {
            // Directories first, then alphabetically
            if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
        );
        toast.success('Folder created');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create folder';
        toast.error(msg);
        throw err;
      }
    },
    [projectPath, currentSubfolder, api]
  );

  const navigateToFolder = useCallback(
    (subfolder: string) => {
      setCurrentSubfolder(subfolder);
      closeDoc();
    },
    [closeDoc]
  );

  const navigateUp = useCallback(() => {
    if (!currentSubfolder) return;
    const parts = currentSubfolder.split('/');
    parts.pop();
    setCurrentSubfolder(parts.join('/'));
    closeDoc();
  }, [currentSubfolder, closeDoc]);

  const retryLoadDoc = useCallback(() => {
    if (!projectPath || !currentDocPath) return;
    setIsLoadingDoc(true);
    setDocError(null);

    api.docs
      .read(projectPath, currentDocPath)
      .then((result) => {
        setCurrentDoc(result);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load document';
        setDocError(msg);
        setCurrentDoc(null);
      })
      .finally(() => {
        setIsLoadingDoc(false);
      });
  }, [projectPath, currentDocPath, api]);

  const renameDoc = useCallback(
    async (oldPath: string, newName: string) => {
      if (!projectPath) return;
      try {
        await api.docs.rename(projectPath, oldPath, newName);
        toast.success('Renamed');
        loadDocs();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to rename';
        toast.error(msg);
        throw err;
      }
    },
    [projectPath, api, loadDocs]
  );

  return {
    docs,
    isLoading,
    error,
    currentDoc,
    isLoadingDoc,
    docError,
    refresh,
    openDoc,
    closeDoc,
    createDoc,
    updateDoc,
    deleteDoc,
    createFolder,
    navigateToFolder,
    navigateUp,
    retryLoadDoc,
    renameDoc,
    currentSubfolder,
  };
}
