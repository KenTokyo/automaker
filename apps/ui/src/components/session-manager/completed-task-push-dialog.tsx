/**
 * CompletedTaskPushDialog - Dialog for pushing completed tasks to Supabase.
 *
 * Shows a preview of selected tasks, progress during push, and a result
 * summary with error details. Follows the TaskMigrationDialog pattern.
 */

import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, ArrowUpFromLine, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { CompletedTask } from '@automaker/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  pushCompletedTasksToSupabase,
  type CompletedTaskPushProgress,
  type CompletedTaskPushReport,
} from '@/lib/completed-task-migration';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CompletedTaskPushDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The tasks to push (either selection or all) */
  tasks: CompletedTask[];
  supabaseProjectId: string;
  userId: string;
  onComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CompletedTaskPushDialog({
  open,
  onOpenChange,
  tasks,
  supabaseProjectId,
  userId,
  onComplete,
}: CompletedTaskPushDialogProps) {
  const [progress, setProgress] = useState<CompletedTaskPushProgress>({
    current: 0,
    total: 0,
    currentTitle: '',
    status: 'idle',
    report: null,
  });

  const runningRef = useRef(false);

  const handleStart = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    setProgress({
      current: 0,
      total: tasks.length,
      currentTitle: '',
      status: 'checking',
      report: null,
    });

    try {
      const report = await pushCompletedTasksToSupabase(tasks, supabaseProjectId, userId, (p) =>
        setProgress({ ...p })
      );

      setProgress((prev) => ({
        ...prev,
        status: report.errors.length > 0 && report.pushed === 0 ? 'error' : 'done',
        report,
      }));

      if (report.pushed > 0) {
        onComplete?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        report: {
          pushed: 0,
          skipped: 0,
          errors: [message],
          total: prev.total,
        },
      }));
    } finally {
      runningRef.current = false;
    }
  }, [tasks, supabaseProjectId, userId, onComplete]);

  const handleClose = useCallback(
    (value: boolean) => {
      if (runningRef.current) return;
      if (!value) {
        setProgress({
          current: 0,
          total: 0,
          currentTitle: '',
          status: 'idle',
          report: null,
        });
      }
      onOpenChange(value);
    },
    [onOpenChange]
  );

  const isRunning = progress.status === 'checking' || progress.status === 'pushing';
  const isDone = progress.status === 'done';
  const isError = progress.status === 'error';
  const progressPercent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md border-white/5 bg-zinc-950 p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <ArrowUpFromLine className="h-4 w-4 text-violet-400" />
            Erledigte Aufgaben pushen
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            {tasks.length} Aufgabe{tasks.length !== 1 ? 'n' : ''} in die Supabase-Datenbank
            übertragen. Duplikate (gleicher Titel) werden übersprungen.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Idle state: Preview + Start button */}
          {progress.status === 'idle' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-2.5">
                <p className="text-xs text-zinc-400">
                  Anzahl:{' '}
                  <span className="text-zinc-300">
                    {tasks.length} Aufgabe{tasks.length !== 1 ? 'n' : ''}
                  </span>
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Ziel: <span className="text-cyan-400">Supabase Datenbank</span>
                </p>
              </div>

              {/* Task preview (max 5 titles) */}
              {tasks.length > 0 && (
                <div className="max-h-28 space-y-0.5 overflow-y-auto rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-2">
                  {tasks.slice(0, 5).map((t) => (
                    <p
                      key={t.filename}
                      className="truncate text-[10px] text-zinc-500"
                      title={t.title}
                    >
                      {t.title}
                    </p>
                  ))}
                  {tasks.length > 5 && (
                    <p className="text-[10px] text-zinc-600">... und {tasks.length - 5} weitere</p>
                  )}
                </div>
              )}

              <Button
                onClick={() => void handleStart()}
                className="w-full bg-violet-600 text-xs font-medium text-white hover:bg-violet-500"
              >
                <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" />
                Jetzt pushen
              </Button>
            </div>
          )}

          {/* Checking state */}
          {progress.status === 'checking' && (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-3">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-400" />
              <p className="text-xs text-zinc-400">Bestehende Tasks werden geprüft...</p>
            </div>
          )}

          {/* Pushing state (progress bar) */}
          {progress.status === 'pushing' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">
                    {progress.current} / {progress.total} Aufgaben
                  </p>
                  <span className="text-xs font-medium tabular-nums text-cyan-400">
                    {progressPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {progress.currentTitle && (
                  <p className="mt-2 truncate text-[10px] text-zinc-600">{progress.currentTitle}</p>
                )}
              </div>
            </div>
          )}

          {/* Done state */}
          {isDone && progress.report && <PushResult report={progress.report} />}

          {/* Error state */}
          {isError && progress.report && <PushResult report={progress.report} />}

          {/* Close button (only when finished) */}
          {!isRunning && (isDone || isError) && (
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="w-full border-zinc-800 bg-transparent text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300"
            >
              Schließen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Result summary component
// ---------------------------------------------------------------------------

function PushResult({ report }: { report: CompletedTaskPushReport }) {
  const hasErrors = report.errors.length > 0;
  const allFailed = report.pushed === 0 && hasErrors;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div
        className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
          allFailed ? 'border-rose-500/20 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'
        }`}
      >
        {allFailed ? (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        )}
        <div className="min-w-0 space-y-1">
          <p className={`text-xs font-medium ${allFailed ? 'text-rose-300' : 'text-emerald-300'}`}>
            {allFailed
              ? 'Push fehlgeschlagen'
              : `${report.pushed} von ${report.total} Aufgaben gepusht`}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
            {report.pushed > 0 && (
              <span className="text-emerald-400/80">{report.pushed} gepusht</span>
            )}
            {report.skipped > 0 && (
              <span className="text-zinc-500">{report.skipped} übersprungen (Duplikat)</span>
            )}
            {hasErrors && <span className="text-rose-400/80">{report.errors.length} Fehler</span>}
          </div>
        </div>
      </div>

      {/* Errors list */}
      {hasErrors && (
        <div className="rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-rose-400" />
            <p className="text-[10px] font-medium text-rose-400">Fehler</p>
          </div>
          <div className="max-h-32 space-y-1 overflow-y-auto">
            {report.errors.map((err, i) => (
              <p key={i} className="text-[10px] leading-relaxed text-zinc-500">
                {err}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
