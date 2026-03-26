/**
 * KanbanTaskDrawer - Floating bottom drawer for creating tasks.
 *
 * Slides up from the bottom like a chatbox. Supports title, description,
 * tags, voice input (Web Speech API), and Ctrl+V image paste (queued as
 * pending, uploaded after task creation). Background stays visible.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, ImageIcon, Loader2, Mic, MicOff } from 'lucide-react';
import { Button } from '@ui/components/ui/button';
import { cn } from '@ui/lib/utils';
import type { CreateTaskInput, SupabaseTask } from '@ui/hooks/use-supabase-tasks';
import { useTaskAttachments, usePendingAttachments } from '@ui/hooks/use-task-attachments';

// ---------------------------------------------------------------------------
// Web Speech API declarations (not in all TS libs)
// ---------------------------------------------------------------------------

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KanbanTaskDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreateTask: (input: CreateTaskInput) => Promise<SupabaseTask | null>;
  projectId: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KanbanTaskDrawer({
  open,
  onClose,
  onCreateTask,
  projectId,
}: KanbanTaskDrawerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const { uploadAttachment } = useTaskAttachments(null);
  const { pending, addFiles, removeFile, clear: clearPending } = usePendingAttachments();

  // -------------------------------------------------------------------------
  // Textarea auto-grow
  // -------------------------------------------------------------------------

  const adjustHeight = useCallback(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newH = Math.min(Math.max(el.scrollHeight, 48), 320);
    el.style.height = `${newH}px`;
    el.style.overflowY = newH >= 320 ? 'auto' : 'hidden';
  }, []);

  // -------------------------------------------------------------------------
  // Speech recognition (microphone)
  // -------------------------------------------------------------------------

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setDescription((prev) => prev + (prev ? ' ' : '') + transcript);
      requestAnimationFrame(() => adjustHeight());
    };
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, adjustHeight]);

  // -------------------------------------------------------------------------
  // Animate open / close
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
      const timer = setTimeout(() => titleRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
      // Stop speech recognition when closing
      recognitionRef.current?.stop();
      const timer = setTimeout(() => setVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setTags([]);
      setTagInput('');
      setSubmitting(false);
      clearPending();
      // Reset textarea height
      requestAnimationFrame(() => {
        if (descRef.current) {
          descRef.current.style.height = '48px';
          descRef.current.style.overflowY = 'hidden';
        }
      });
    }
  }, [open, clearPending]);

  // -------------------------------------------------------------------------
  // Handle Ctrl+V paste for images
  // -------------------------------------------------------------------------

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const imageFiles = Array.from(e.clipboardData.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        e.preventDefault();
        addFiles(imageFiles);
      }
    },
    [addFiles]
  );

  // -------------------------------------------------------------------------
  // Tags handling
  // -------------------------------------------------------------------------

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim().replace(/,/g, '');
      if (!tag) return;
      if (!tags.includes(tag)) {
        setTags((prev) => [...prev, tag]);
      }
      setTagInput('');
    },
    [tags]
  );

  const removeTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === ',' || e.key === 'Enter') {
        e.preventDefault();
        addTag(tagInput);
      }
      // Backspace on empty input removes last tag
      if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
        setTags((prev) => prev.slice(0, -1));
      }
    },
    [tagInput, addTag, tags.length]
  );

  // -------------------------------------------------------------------------
  // Submit task
  // -------------------------------------------------------------------------

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || !projectId || submitting) return;

    setSubmitting(true);
    try {
      const task = await onCreateTask({
        projectId,
        title: trimmed,
        description: description.trim() || undefined,
        status: 'todo',
        tags: tags.length > 0 ? tags : undefined,
      });

      // Upload queued images after task exists
      if (task && pending.length > 0) {
        for (const p of pending) {
          await uploadAttachment(task.id, p.file);
        }
      }

      clearPending();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    description,
    tags,
    projectId,
    submitting,
    onCreateTask,
    pending,
    uploadAttachment,
    clearPending,
    onClose,
  ]);

  // -------------------------------------------------------------------------
  // Global key handler
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!visible) return null;

  return (
    <>
      {/* Transparent click-catcher (no blur, no dim) */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Floating drawer */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 px-3 pb-3',
          'transition-all duration-250 ease-out',
          animateIn ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        )}
      >
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/95 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] backdrop-blur-sm">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-zinc-700/60" />
          </div>

          {/* Header row: cyan status dot + close */}
          <div className="flex items-center justify-between px-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              <span className="text-xs font-medium text-zinc-500">Neuer Task</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Title input */}
          <div className="px-4">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Was muss erledigt werden?"
              className="w-full bg-transparent text-[15px] font-medium text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </div>

          {/* Description textarea (auto-grow) */}
          <div className="mt-2 px-4">
            <textarea
              ref={descRef}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                adjustHeight();
              }}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Beschreibung... (Strg+V für Bilder)"
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-400 outline-none placeholder:text-zinc-600"
              rows={2}
              style={{ minHeight: 48, maxHeight: 320, overflowY: 'hidden' }}
            />
          </div>

          {/* Tags section */}
          <div className="mt-2 px-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 rounded-full p-0.5 text-zinc-600 transition-colors hover:text-zinc-300"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) addTag(tagInput);
                }}
                placeholder={
                  tags.length === 0 ? 'Tags (Komma drücken zum Hinzufügen)' : 'Weiterer Tag...'
                }
                className="min-w-[120px] flex-1 bg-transparent text-xs text-zinc-400 outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Pending image previews */}
          {pending.length > 0 && (
            <div className="mt-1 flex gap-2 overflow-x-auto px-4 pb-1">
              {pending.map((p) => (
                <div key={p.id} className="group relative shrink-0">
                  {p.previewUrl ? (
                    <img
                      src={p.previewUrl}
                      alt={p.fileName}
                      className="h-14 w-14 rounded-lg border border-white/[0.08] object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-white/[0.08] bg-zinc-800">
                      <ImageIcon className="h-4 w-4 text-zinc-600" />
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(p.id)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-zinc-500 opacity-0 transition-opacity hover:text-zinc-200 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bottom bar: mic button + submit */}
          <div className="mt-1 flex items-center justify-between border-t border-white/[0.05] px-4 py-2.5">
            {/* Left: microphone button */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleListening}
                className={cn(
                  'relative rounded-lg p-2 transition-colors',
                  isListening
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'text-zinc-600 hover:bg-white/5 hover:text-zinc-300'
                )}
                title={isListening ? 'Spracheingabe stoppen' : 'Spracheingabe starten'}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    {/* Pulsating dot */}
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                  </>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
              {isListening && <span className="text-[11px] text-rose-400/80">Spricht...</span>}
            </div>

            {/* Right: submit button */}
            <Button
              onClick={() => void handleSubmit()}
              disabled={!title.trim() || submitting}
              size="sm"
              className={cn(
                'h-8 gap-1.5 rounded-xl border-0 text-white',
                'bg-cyan-600 hover:bg-cyan-500',
                'disabled:bg-zinc-800 disabled:text-zinc-600 disabled:opacity-100'
              )}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span className="text-xs">Erstellen</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
