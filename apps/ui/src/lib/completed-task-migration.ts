/**
 * Completed Task Migration - Push local .completed/ tasks to Supabase
 *
 * Maps CompletedTask data to the Supabase `tasks` table and inserts
 * them with duplicate detection (by normalized title).
 * Follows the same pattern as `task-migration.ts`.
 */

import type { CompletedTask, CompletedTaskStatus } from '@automaker/types';
import type { TaskStatus as DbTaskStatus } from '@/lib/supabase-types';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompletedTaskPushReport {
  pushed: number;
  skipped: number;
  errors: string[];
  total: number;
}

export interface CompletedTaskPushProgress {
  current: number;
  total: number;
  currentTitle: string;
  status: 'idle' | 'checking' | 'pushing' | 'done' | 'error';
  report: CompletedTaskPushReport | null;
}

// ---------------------------------------------------------------------------
// Status mapping: CompletedTask status -> Supabase tasks.status
// ---------------------------------------------------------------------------

function mapCompletedStatusToDb(status: CompletedTaskStatus): DbTaskStatus {
  switch (status) {
    case 'success':
    case 'partial':
      return 'completed';
    case 'failed':
      return 'todo';
    default:
      return 'completed';
  }
}

// ---------------------------------------------------------------------------
// Build rich description from CompletedTask metadata
// ---------------------------------------------------------------------------

function buildCompletedNotes(task: CompletedTask): string {
  const parts: string[] = [];

  if (task.description) {
    parts.push(task.description);
  }

  if (task.summary) {
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(task.summary);
  }

  // Metadata footer
  const meta: string[] = [];
  if (task.effort) meta.push(`Aufwand: ${task.effort}`);
  if (task.provider) meta.push(`Provider: ${task.provider}`);
  if (task.attempt > 1) meta.push(`Versuch: ${task.attempt}`);
  if (task.status) meta.push(`Ergebnis: ${task.status}`);

  if (meta.length > 0) {
    parts.push('');
    parts.push(`[${meta.join(' | ')}]`);
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Main push function
// ---------------------------------------------------------------------------

/**
 * Push selected CompletedTasks to Supabase `tasks` table.
 *
 * @param tasks - The CompletedTask items to push
 * @param supabaseProjectId - The target Supabase project UUID
 * @param userId - The authenticated user ID (for created_by)
 * @param onProgress - Optional progress callback
 */
export async function pushCompletedTasksToSupabase(
  tasks: CompletedTask[],
  supabaseProjectId: string,
  userId: string,
  onProgress?: (progress: CompletedTaskPushProgress) => void
): Promise<CompletedTaskPushReport> {
  const report: CompletedTaskPushReport = {
    pushed: 0,
    skipped: 0,
    errors: [],
    total: tasks.length,
  };

  // Validate prerequisites
  if (!isSupabaseConfigured()) {
    report.errors.push('Supabase ist nicht konfiguriert.');
    return report;
  }

  if (!supabaseProjectId) {
    report.errors.push('Kein Supabase-Projekt ausgewählt.');
    return report;
  }

  if (!userId) {
    report.errors.push('Kein authentifizierter Benutzer.');
    return report;
  }

  if (tasks.length === 0) {
    onProgress?.({
      current: 0,
      total: 0,
      currentTitle: '',
      status: 'done',
      report,
    });
    return report;
  }

  // Step 1: Fetch existing task titles from Supabase for duplicate detection
  onProgress?.({
    current: 0,
    total: tasks.length,
    currentTitle: '',
    status: 'checking',
    report: null,
  });

  const client = getSupabaseClient();
  let existingTitles: Set<string>;

  try {
    const { data: existingTasks } = await client
      .from('tasks')
      .select('title')
      .eq('project_id', supabaseProjectId);
    existingTitles = new Set((existingTasks ?? []).map((t) => t.title.toLowerCase().trim()));
  } catch {
    existingTitles = new Set();
  }

  // Step 2: Push each task individually (for progress tracking)
  onProgress?.({
    current: 0,
    total: tasks.length,
    currentTitle: '',
    status: 'pushing',
    report: null,
  });

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    onProgress?.({
      current: i,
      total: tasks.length,
      currentTitle: task.title,
      status: 'pushing',
      report: null,
    });

    // Skip duplicates (case-insensitive title match)
    if (existingTitles.has(task.title.toLowerCase().trim())) {
      report.skipped++;
      continue;
    }

    // Map CompletedTask -> Supabase tasks insert
    const dbStatus = mapCompletedStatusToDb(task.status);
    const completedNotes = buildCompletedNotes(task);
    const taskDate = task.date ? new Date(task.date).toISOString() : new Date().toISOString();

    const insertData = {
      project_id: supabaseProjectId,
      title: task.title,
      description: task.description || '',
      summary: task.summary || '',
      status: dbStatus,
      priority: '' as const,
      tags: Array.isArray(task.tags) ? task.tags : [],
      created_by: userId,
      created_at: taskDate,
      completed_notes: completedNotes,
      completed_files: task.files.length > 0 ? task.files : null,
      completed_at: dbStatus === 'completed' ? taskDate : null,
    };

    try {
      const { error } = await client.from('tasks').insert(insertData);
      if (error) {
        report.errors.push(`"${task.title}": ${error.message}`);
      } else {
        report.pushed++;
        existingTitles.add(task.title.toLowerCase().trim());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      report.errors.push(`"${task.title}": ${message}`);
    }
  }

  // Done
  onProgress?.({
    current: tasks.length,
    total: tasks.length,
    currentTitle: '',
    status: 'done',
    report,
  });

  return report;
}
