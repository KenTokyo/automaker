/**
 * Hook for managing task attachments via Supabase Storage.
 *
 * Provides upload, list, delete, and signed URL generation for files
 * stored in the `task-attachments` bucket. Metadata is tracked in the
 * `task_attachments` table.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/lib/supabase-types';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DbAttachment = Database['public']['Tables']['task_attachments']['Row'];
type DbAttachmentInsert = Database['public']['Tables']['task_attachments']['Insert'];

const BUCKET_NAME = 'task-attachments';

export interface TaskAttachment {
  id: string;
  taskId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdBy: string;
  createdAt: string;
}

/** A file queued for upload before a task has been created. */
export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dbToAttachment(row: DbAttachment): TaskAttachment {
  return {
    id: row.id,
    taskId: row.task_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function isImageMimeType(mime: string): boolean {
  return mime.startsWith('image/');
}

/** Read image dimensions from a File object. Returns null for non-images. */
function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!isImageMimeType(file.type)) return Promise.resolve(null);

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Generate a unique filename to avoid collisions. */
function uniqueFileName(original: string): string {
  const ext = original.lastIndexOf('.') >= 0 ? original.slice(original.lastIndexOf('.')) : '';
  const base =
    original.lastIndexOf('.') >= 0 ? original.slice(0, original.lastIndexOf('.')) : original;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${ts}-${rand}${ext}`;
}

// ---------------------------------------------------------------------------
// Hook: useTaskAttachments
// ---------------------------------------------------------------------------

export interface UseTaskAttachmentsResult {
  attachments: TaskAttachment[];
  loading: boolean;
  error: string | null;
  uploadAttachment: (taskId: string, file: File) => Promise<TaskAttachment | null>;
  uploadPendingAttachments: (
    taskId: string,
    pending: PendingAttachment[]
  ) => Promise<TaskAttachment[]>;
  getAttachments: (taskId: string) => Promise<TaskAttachment[]>;
  deleteAttachment: (id: string, storagePath: string) => Promise<boolean>;
  getSignedUrl: (storagePath: string, expiresIn?: number) => Promise<string | null>;
  refetch: () => Promise<void>;
}

export function useTaskAttachments(taskId: string | null): UseTaskAttachmentsResult {
  const user = useSupabaseAuthStore((s) => s.user);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch attachments for the current taskId
  const fetchAttachments = useCallback(async () => {
    if (!isSupabaseConfigured() || !taskId) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const { data, error: fetchError } = await client
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      if (mountedRef.current) {
        setAttachments(((data ?? []) as DbAttachment[]).map(dbToAttachment));
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Anhaenge');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [taskId]);

  useEffect(() => {
    void fetchAttachments();
  }, [fetchAttachments]);

  // Upload a single file for a given task
  const uploadAttachment = useCallback(
    async (targetTaskId: string, file: File): Promise<TaskAttachment | null> => {
      if (!isSupabaseConfigured() || !user) return null;

      const client = getSupabaseClient();
      const fileName = uniqueFileName(file.name);
      const storagePath = `${user.id}/${targetTaskId}/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await client.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return null;
      }

      // 2. Read image dimensions if applicable
      const dims = await readImageDimensions(file);

      // 3. Insert metadata row
      const insertData: DbAttachmentInsert = {
        task_id: targetTaskId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        created_by: user.id,
      };

      const { data, error: insertError } = await client
        .from('task_attachments')
        .insert(insertData)
        .select()
        .single();

      if (insertError || !data) {
        console.error('Attachment insert error:', insertError);
        return null;
      }

      const attachment = dbToAttachment(data as DbAttachment);

      // Update local state if this is for the currently viewed task
      if (mountedRef.current && targetTaskId === taskId) {
        setAttachments((prev) => [...prev, attachment]);
      }

      return attachment;
    },
    [user, taskId]
  );

  // Upload all pending attachments after task creation
  const uploadPendingAttachments = useCallback(
    async (targetTaskId: string, pending: PendingAttachment[]): Promise<TaskAttachment[]> => {
      const results: TaskAttachment[] = [];
      for (const p of pending) {
        const result = await uploadAttachment(targetTaskId, p.file);
        if (result) results.push(result);
      }
      return results;
    },
    [uploadAttachment]
  );

  // Fetch attachments for any task (not necessarily the current one)
  const getAttachments = useCallback(async (targetTaskId: string): Promise<TaskAttachment[]> => {
    if (!isSupabaseConfigured()) return [];

    const client = getSupabaseClient();
    const { data, error: fetchError } = await client
      .from('task_attachments')
      .select('*')
      .eq('task_id', targetTaskId)
      .order('created_at', { ascending: true });

    if (fetchError || !data) return [];
    return ((data ?? []) as DbAttachment[]).map(dbToAttachment);
  }, []);

  // Delete an attachment (storage + metadata)
  const deleteAttachment = useCallback(
    async (id: string, storagePath: string): Promise<boolean> => {
      if (!isSupabaseConfigured()) return false;

      const client = getSupabaseClient();

      // 1. Delete from storage
      const { error: storageError } = await client.storage.from(BUCKET_NAME).remove([storagePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue to delete metadata even if storage fails
      }

      // 2. Delete metadata row
      const { error: dbError } = await client.from('task_attachments').delete().eq('id', id);

      if (dbError) {
        console.error('Attachment delete error:', dbError);
        return false;
      }

      // Update local state
      if (mountedRef.current) {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      }

      return true;
    },
    []
  );

  // Generate a signed URL for private storage
  const getSignedUrl = useCallback(
    async (storagePath: string, expiresIn = 3600): Promise<string | null> => {
      if (!isSupabaseConfigured()) return null;

      const client = getSupabaseClient();
      const { data, error: urlError } = await client.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, expiresIn);

      if (urlError || !data) {
        console.error('Signed URL error:', urlError);
        return null;
      }

      return data.signedUrl;
    },
    []
  );

  return {
    attachments,
    loading,
    error,
    uploadAttachment,
    uploadPendingAttachments,
    getAttachments,
    deleteAttachment,
    getSignedUrl,
    refetch: fetchAttachments,
  };
}

// ---------------------------------------------------------------------------
// Hook: usePendingAttachments (for pre-creation clipboard/paste queue)
// ---------------------------------------------------------------------------

export interface UsePendingAttachmentsResult {
  pending: PendingAttachment[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clear: () => void;
}

export function usePendingAttachments(): UsePendingAttachmentsResult {
  const [pending, setPending] = useState<PendingAttachment[]>([]);

  const addFiles = useCallback((files: File[]) => {
    const newItems: PendingAttachment[] = files.map((file) => ({
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    }));

    setPending((prev) => [...prev, ...newItems]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setPending((prev) => {
      for (const item of prev) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
      return [];
    });
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      for (const item of pending) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
    // Only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pending, addFiles, removeFile, clear };
}
