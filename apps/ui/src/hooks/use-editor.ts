import { useState, useCallback, useRef, useEffect } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseEditorStateOptions {
  onSave: (content: string) => Promise<void>;
  autoSaveEnabled?: boolean;
  autoSaveDelayMs?: number;
}

export function useEditorState({
  onSave,
  autoSaveEnabled = false,
  autoSaveDelayMs = 3000,
}: UseEditorStateOptions) {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaveError, setLastSaveError] = useState<string | null>(null);
  const contentRef = useRef<string>('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (savedFeedbackTimerRef.current) clearTimeout(savedFeedbackTimerRef.current);
    };
  }, []);

  const doSave = useCallback(async () => {
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }
    if (!contentRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    setSaveStatus('saving');
    setLastSaveError(null);

    try {
      await onSave(contentRef.current);
      setIsDirty(false);
      setSaveStatus('saved');
      // Clear "saved" feedback after 2s
      if (savedFeedbackTimerRef.current) clearTimeout(savedFeedbackTimerRef.current);
      savedFeedbackTimerRef.current = setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      setSaveStatus('error');
      setLastSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;

      // If another save was requested while we were saving, run it now
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        doSave();
      }
    }
  }, [onSave]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setSaveStatus('pending');

    // Reset auto-save timer
    if (autoSaveEnabled) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        doSave();
      }, autoSaveDelayMs);
    }
  }, [autoSaveEnabled, autoSaveDelayMs, doSave]);

  const setContent = useCallback((content: string) => {
    contentRef.current = content;
  }, []);

  const save = useCallback(async () => {
    if (!isDirty && saveStatus !== 'error') return;
    // Cancel pending auto-save since manual save takes priority
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    await doSave();
  }, [isDirty, saveStatus, doSave]);

  const resetDirty = useCallback(() => {
    setIsDirty(false);
    setSaveStatus('idle');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, []);

  return {
    isDirty,
    isSaving,
    saveStatus,
    lastSaveError,
    markDirty,
    setContent,
    save,
    resetDirty,
    getContent: () => contentRef.current,
  };
}
