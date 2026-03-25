/**
 * TaskMigrationDialog - Dialog for migrating local tasks to Supabase
 *
 * Shows migration progress, results, and any errors encountered.
 * Only visible when Supabase is configured and local tasks exist.
 */

import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, ArrowUpFromLine, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  migrateLocalTasksToSupabase,
  type MigrationProgress,
  type MigrationReport,
} from '@/lib/task-migration';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TaskMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  supabaseProjectId: string;
  userId: string;
  onComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaskMigrationDialog({
  open,
  onOpenChange,
  projectPath,
  supabaseProjectId,
  userId,
  onComplete,
}: TaskMigrationDialogProps) {
  const [progress, setProgress] = useState<MigrationProgress>({
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
      total: 0,
      currentTitle: '',
      status: 'fetching',
      report: null,
    });

    try {
      const report = await migrateLocalTasksToSupabase(
        projectPath,
        supabaseProjectId,
        userId,
        (p) => setProgress({ ...p })
      );

      setProgress((prev) => ({
        ...prev,
        status: report.errors.length > 0 && report.migrated === 0 ? 'error' : 'done',
        report,
      }));

      if (report.migrated > 0) {
        onComplete?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        report: {
          migrated: 0,
          skipped: 0,
          errors: [message],
          total: prev.total,
        },
      }));
    } finally {
      runningRef.current = false;
    }
  }, [projectPath, supabaseProjectId, userId, onComplete]);

  const handleClose = useCallback(
    (value: boolean) => {
      if (runningRef.current) return;
      if (!value) {
        // Reset state on close
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

  const isRunning = progress.status === 'fetching' || progress.status === 'migrating';
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
            Tasks migrieren
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Bestehende lokale Tasks nach Supabase uebertragen. Bereits vorhandene Tasks (gleicher
            Titel) werden uebersprungen.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Idle state */}
          {progress.status === 'idle' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-2.5">
                <p className="text-xs text-zinc-400">
                  Quelle: <span className="text-zinc-300">{projectPath}</span>
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Ziel: <span className="text-cyan-400">Supabase Datenbank</span>
                </p>
              </div>
              <Button
                onClick={() => void handleStart()}
                className="w-full bg-violet-600 text-xs font-medium text-white hover:bg-violet-500"
              >
                <ArrowUpFromLine className="mr-1.5 h-3.5 w-3.5" />
                Migration starten
              </Button>
            </div>
          )}

          {/* Fetching state */}
          {progress.status === 'fetching' && (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-3">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-400" />
              <p className="text-xs text-zinc-400">Lokale Tasks werden geladen...</p>
            </div>
          )}

          {/* Migrating state */}
          {progress.status === 'migrating' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-800/50 bg-black/40 px-3 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">
                    {progress.current} / {progress.total} Tasks
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
          {isDone && progress.report && <MigrationResult report={progress.report} />}

          {/* Error state (no successful migrations) */}
          {isError && progress.report && <MigrationResult report={progress.report} />}

          {/* Close button (only when not running) */}
          {!isRunning && (isDone || isError) && (
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="w-full border-zinc-800 bg-transparent text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300"
            >
              Schliessen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Migration result component
// ---------------------------------------------------------------------------

function MigrationResult({ report }: { report: MigrationReport }) {
  const hasErrors = report.errors.length > 0;
  const allFailed = report.migrated === 0 && hasErrors;

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
              ? 'Migration fehlgeschlagen'
              : `${report.migrated} von ${report.total} Tasks migriert`}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
            {report.migrated > 0 && (
              <span className="text-emerald-400/80">{report.migrated} migriert</span>
            )}
            {report.skipped > 0 && (
              <span className="text-zinc-500">{report.skipped} uebersprungen</span>
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
