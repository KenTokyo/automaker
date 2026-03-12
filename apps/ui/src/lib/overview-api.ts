/**
 * Overview API helpers for the AI-powered project dashboard.
 *
 * Endpoints (mounted at /api/overview):
 *   POST   /generate    — Start overview generation
 *   DELETE /generate    — Cancel a running generation
 *   GET    /status      — Check which time ranges have data
 *   GET    /:timeRange  — Load a saved overview
 */

import { apiFetch } from './api-fetch';
import type {
  DashboardOverviewData,
  DashboardTimeRange,
  GenerateOverviewOptions,
  OverviewStatusMap,
} from '@automaker/types';

const BASE = '/api/overview';

/** Generate a new overview for a project. */
export async function generateOverview(
  projectPath: string,
  sinceHours: number,
  timeRange: DashboardTimeRange,
  options: GenerateOverviewOptions = {},
): Promise<DashboardOverviewData> {
  const res = await apiFetch(`${BASE}/generate`, 'POST', {
    body: {
      projectPath,
      sinceHours,
      timeRange,
      mode: options.mode ?? 'standard',
      modelOverride: options.modelOverride,
    },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Generierung fehlgeschlagen (${res.status})`);
  }
  return json.data as DashboardOverviewData;
}

/** Load a previously generated overview. Returns null if none exists. */
export async function loadOverview(
  projectPath: string,
  timeRange: DashboardTimeRange,
): Promise<DashboardOverviewData | null> {
  const res = await apiFetch(
    `${BASE}/${timeRange}?projectPath=${encodeURIComponent(projectPath)}`,
    'GET',
  );

  if (res.status === 404) return null;

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Laden fehlgeschlagen (${res.status})`);
  }
  return json.data as DashboardOverviewData;
}

/** Get the generation status for all time ranges. */
export async function getOverviewStatus(projectPath: string): Promise<OverviewStatusMap> {
  const res = await apiFetch(
    `${BASE}/status?projectPath=${encodeURIComponent(projectPath)}`,
    'GET',
  );

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Status-Abfrage fehlgeschlagen (${res.status})`);
  }
  return json.status as OverviewStatusMap;
}

/** Cancel a running overview generation. */
export async function cancelOverview(): Promise<void> {
  await apiFetch(`${BASE}/generate`, 'DELETE');
}

/** Save an overview as a Markdown file in the project. */
export async function saveOverviewAsFile(
  projectPath: string,
  markdown: string,
  fileName: string,
): Promise<{ filePath: string }> {
  const res = await apiFetch(`${BASE}/save`, 'POST', {
    body: { projectPath, markdown, fileName },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Speichern fehlgeschlagen (${res.status})`);
  }
  return { filePath: json.filePath as string };
}
