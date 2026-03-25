/**
 * Task Migration - Migrate local file-based tasks to Supabase
 *
 * Reads local tasks via the server API, maps them to the Supabase schema,
 * and inserts them into the database. Returns a detailed migration report.
 */

import type { Task } from '@automaker/types';
import type {
  TaskStatus as DbTaskStatus,
  TaskPriority as DbTaskPriority,
} from '@/lib/supabase-types';
import { apiFetch } from '@/lib/api-fetch';
import { isSupabaseConfigured, getSupabaseClient } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MigrationReport {
  migrated: number;
  skipped: number;
  errors: string[];
  total: number;
}

export interface MigrationProgress {
  current: number;
  total: number;
  currentTitle: string;
  status: 'idle' | 'fetching' | 'migrating' | 'done' | 'error';
  report: MigrationReport | null;
}

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

/**
 * Map file-based status (open/in_progress/done) to Supabase status (todo/in_progress/completed).
 */
function mapFileStatusToDb(status: string): DbTaskStatus {
  switch (status) {
    case 'open':
      return 'todo';
    case 'in_progress':
      return 'in_progress';
    case 'done':
      return 'completed';
    default:
      return 'todo';
  }
}

/**
 * Map file-based priority to DB-compatible priority.
 * Passes through valid priorities, defaults to empty string.
 */
function mapPriority(priority: string): DbTaskPriority {
  const validPriorities: DbTaskPriority[] = ['P1', 'P2', 'P3', 'P4', ''];
  return validPriorities.includes(priority as DbTaskPriority) ? (priority as DbTaskPriority) : '';
}

// ---------------------------------------------------------------------------
// Fetch local tasks
// ---------------------------------------------------------------------------

/**
 * Fetch all local tasks for a project from the server API.
 */
export async function fetchLocalTasks(projectPath: string): Promise<Task[]> {
  const url = `/api/tasks?projectPath=${encodeURIComponent(projectPath)}`;
  const response = await apiFetch(url, 'GET');

  if (!response.ok) {
    throw new Error(`Fehler beim Laden lokaler Tasks: HTTP ${response.status}`);
  }

  const data = (await response.json()) as { tasks: Task[] };
  return data.tasks ?? [];
}

// ---------------------------------------------------------------------------
// Main migration function
// ---------------------------------------------------------------------------

/**
 * Migrate local file-based tasks to Supabase.
 *
 * @param projectPath - The local project path to read tasks from
 * @param supabaseProjectId - The Supabase project UUID to write tasks to
 * @param userId - The authenticated Supabase user ID (used as created_by)
 * @param onProgress - Optional callback for progress updates
 * @returns A MigrationReport with migrated/skipped/errors counts
 */
export async function migrateLocalTasksToSupabase(
  projectPath: string,
  supabaseProjectId: string,
  userId: string,
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationReport> {
  const report: MigrationReport = {
    migrated: 0,
    skipped: 0,
    errors: [],
    total: 0,
  };

  // Validate prerequisites
  if (!isSupabaseConfigured()) {
    report.errors.push('Supabase ist nicht konfiguriert.');
    return report;
  }

  if (!supabaseProjectId) {
    report.errors.push('Kein Supabase-Projekt ausgewaehlt.');
    return report;
  }

  if (!userId) {
    report.errors.push('Kein authentifizierter Benutzer.');
    return report;
  }

  // Step 1: Fetch local tasks
  onProgress?.({
    current: 0,
    total: 0,
    currentTitle: '',
    status: 'fetching',
    report: null,
  });

  let localTasks: Task[];
  try {
    localTasks = await fetchLocalTasks(projectPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
    report.errors.push(`Laden fehlgeschlagen: ${message}`);
    return report;
  }

  report.total = localTasks.length;

  if (localTasks.length === 0) {
    onProgress?.({
      current: 0,
      total: 0,
      currentTitle: '',
      status: 'done',
      report,
    });
    return report;
  }

  // Step 2: Fetch existing tasks from Supabase to detect duplicates
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

  // Step 3: Migrate each task individually (for progress tracking)
  onProgress?.({
    current: 0,
    total: localTasks.length,
    currentTitle: '',
    status: 'migrating',
    report: null,
  });

  for (let i = 0; i < localTasks.length; i++) {
    const task = localTasks[i];

    onProgress?.({
      current: i,
      total: localTasks.length,
      currentTitle: task.title,
      status: 'migrating',
      report: null,
    });

    // Skip duplicates (by normalized title)
    if (existingTitles.has(task.title.toLowerCase().trim())) {
      report.skipped++;
      continue;
    }

    // Map to Supabase insert format
    const dbStatus = mapFileStatusToDb(task.status);
    const dbPriority = mapPriority(task.priority);

    const insertData = {
      project_id: supabaseProjectId,
      title: task.title,
      description: task.description || '',
      summary: task.summary || '',
      status: dbStatus,
      priority: dbPriority,
      tags: Array.isArray(task.tags) ? task.tags : [],
      created_by: userId,
      created_at: task.date ? new Date(task.date).toISOString() : new Date().toISOString(),
    };

    try {
      const { error } = await client.from('tasks').insert(insertData);
      if (error) {
        report.errors.push(`"${task.title}": ${error.message}`);
      } else {
        report.migrated++;
        existingTitles.add(task.title.toLowerCase().trim());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      report.errors.push(`"${task.title}": ${message}`);
    }
  }

  // Done
  onProgress?.({
    current: localTasks.length,
    total: localTasks.length,
    currentTitle: '',
    status: 'done',
    report,
  });

  return report;
}
