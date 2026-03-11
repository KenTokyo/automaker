/**
 * Overview API - HTTP-Client für Dashboard-Overview-Endpunkte.
 */

import { getApiKey, getServerUrlSync, getSessionToken } from '@/lib/http-api-client';
import type {
  DashboardMode,
  DashboardOverviewData,
  DashboardTimeRange,
} from '../stores/dashboard-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = getApiKey();
  if (apiKey) headers['X-API-Key'] = apiKey;

  const sessionToken = getSessionToken();
  if (sessionToken) headers['X-Session-Token'] = sessionToken;

  return headers;
}

function baseUrl(): string {
  return `${getServerUrlSync()}/api/overview`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GenerateOverviewOptions {
  mode?: DashboardMode;
  modelOverride?: string;
}

export async function generateOverview(
  projectPath: string,
  sinceHours: number,
  timeRange: DashboardTimeRange,
  options: GenerateOverviewOptions = {},
): Promise<DashboardOverviewData> {
  const res = await fetch(`${baseUrl()}/generate`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      projectPath,
      sinceHours,
      timeRange,
      mode: options.mode ?? 'standard',
      modelOverride: options.modelOverride,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Generierung fehlgeschlagen (${res.status})`);
  }
  return json.data as DashboardOverviewData;
}

export async function loadOverview(
  projectPath: string,
  timeRange: DashboardTimeRange,
): Promise<DashboardOverviewData | null> {
  const url = `${baseUrl()}/${timeRange}?projectPath=${encodeURIComponent(projectPath)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });

  if (res.status === 404) return null;

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Laden fehlgeschlagen (${res.status})`);
  }
  return json.data as DashboardOverviewData;
}

export interface OverviewStatusEntry {
  exists: boolean;
  generatedAt?: string;
}

export type OverviewStatusMap = Record<DashboardTimeRange, OverviewStatusEntry>;

export async function getOverviewStatus(projectPath: string): Promise<OverviewStatusMap> {
  const url = `${baseUrl()}/status?projectPath=${encodeURIComponent(projectPath)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Status-Abfrage fehlgeschlagen (${res.status})`);
  }
  return json.status as OverviewStatusMap;
}

export async function cancelOverview(): Promise<void> {
  await fetch(`${baseUrl()}/generate`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  });
}
