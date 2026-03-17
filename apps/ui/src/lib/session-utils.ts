/**
 * Session Data Validation Utilities
 *
 * Runtime-Validierung für Session-Daten aus der Electron IPC API.
 * TypeScript prüft nur zur Compile-Zeit – diese Funktionen schützen
 * vor korrupten/unvollständigen Daten zur Laufzeit.
 */

import { createLogger } from '@automaker/utils/logger';
import type { SessionListItem } from '@/types/electron';

const logger = createLogger('SessionValidator');

/**
 * Prüft ob ein Wert ein gültiger ISO-Zeitstempel oder parsebarer Date-String ist.
 */
function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

/**
 * Repariert einen einzelnen Session-Datensatz mit sicheren Defaults.
 *
 * Gibt `null` zurück wenn die Session nicht reparierbar ist (z.B. fehlende `id`).
 * Loggt eine Warnung für jeden reparierten Datensatz.
 */
function repairSessionItem(raw: unknown): SessionListItem | null {
  // Grundlegende Typprüfung
  if (!raw || typeof raw !== 'object') {
    logger.warn('Session-Datensatz ist kein Objekt, wird übersprungen:', raw);
    return null;
  }

  const item = raw as Record<string, unknown>;

  // id ist Pflicht – ohne ID kann keine Session identifiziert werden
  if (typeof item.id !== 'string' || item.id.trim() === '') {
    logger.warn('Session ohne gültige ID wird übersprungen:', item);
    return null;
  }

  const repairs: string[] = [];
  const now = new Date().toISOString();

  // Name reparieren
  const name =
    typeof item.name === 'string' && item.name.trim() !== ''
      ? item.name
      : (() => {
          repairs.push('name');
          return 'Unbenannte Session';
        })();

  // projectPath reparieren
  const projectPath =
    typeof item.projectPath === 'string' && item.projectPath.trim() !== ''
      ? item.projectPath
      : (() => {
          repairs.push('projectPath');
          return '';
        })();

  // Zeitstempel reparieren
  const createdAt = isValidTimestamp(item.createdAt)
    ? (item.createdAt as string)
    : (() => {
        repairs.push('createdAt');
        return now;
      })();

  const updatedAt = isValidTimestamp(item.updatedAt)
    ? (item.updatedAt as string)
    : (() => {
        repairs.push('updatedAt');
        return now;
      })();

  // Numerische Felder
  const messageCount =
    typeof item.messageCount === 'number' && Number.isFinite(item.messageCount)
      ? item.messageCount
      : (() => {
          repairs.push('messageCount');
          return 0;
        })();

  // Boolean-Felder
  const isArchived =
    typeof item.isArchived === 'boolean'
      ? item.isArchived
      : (() => {
          repairs.push('isArchived');
          return false;
        })();

  // Optionale Felder mit sicheren Defaults
  const tags = Array.isArray(item.tags) ? (item.tags as string[]) : [];
  const preview = typeof item.preview === 'string' ? item.preview : '';
  const description = typeof item.description === 'string' ? item.description : undefined;
  const orchestratorRunId =
    typeof item.orchestratorRunId === 'string' ? item.orchestratorRunId : undefined;
  const isDirty = typeof item.isDirty === 'boolean' ? item.isDirty : undefined;
  const status = isValidStatus(item.status) ? item.status : undefined;
  const lastError = typeof item.lastError === 'string' ? item.lastError : undefined;

  if (repairs.length > 0) {
    logger.warn(
      `Session "${item.id}" repariert – fehlende/ungültige Felder: ${repairs.join(', ')}`
    );
  }

  return {
    id: item.id as string,
    name,
    description,
    projectPath,
    createdAt,
    updatedAt,
    messageCount,
    isArchived,
    isDirty,
    tags,
    orchestratorRunId,
    preview,
    status,
    lastError,
  };
}

/**
 * Prüft ob ein Status-Wert gültig ist.
 */
function isValidStatus(value: unknown): value is SessionListItem['status'] {
  return value === 'idle' || value === 'running' || value === 'failed' || value === 'stopped';
}

/**
 * Validiert und repariert ein Array von Session-Datensätzen.
 *
 * - Komplett ungültige Sessions (ohne `id`) werden gefiltert
 * - Sessions mit fehlenden Feldern werden mit sicheren Defaults repariert
 * - Alle Reparaturen werden geloggt
 *
 * @returns Nur gültige/reparierte Sessions
 */
export function validateSessionData(sessions: unknown[]): SessionListItem[] {
  if (!Array.isArray(sessions)) {
    logger.error('Session-Daten sind kein Array:', sessions);
    return [];
  }

  const validated: SessionListItem[] = [];
  let skippedCount = 0;

  for (const raw of sessions) {
    const repaired = repairSessionItem(raw);
    if (repaired) {
      validated.push(repaired);
    } else {
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    logger.warn(`${skippedCount} ungültige Session(s) übersprungen`);
  }

  return validated;
}
