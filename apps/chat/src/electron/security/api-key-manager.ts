/**
 * API key management for Chat App
 *
 * Handles generation, storage, and retrieval of the API key for CSRF protection.
 * Uses separate key file (.chat-api-key) from Automaker UI for parallel usage.
 */

import crypto from 'crypto';
import {
  electronUserDataExists,
  electronUserDataReadFileSync,
  electronUserDataWriteFileSync,
} from '@automaker/platform';
import { createLogger } from '@automaker/utils/logger';
import { API_KEY_FILENAME } from '../constants';
import { state } from '../state';

const logger = createLogger('ChatApiKeyManager');

/**
 * Ensure an API key exists - load from file or generate new one.
 */
export function ensureApiKey(): string {
  try {
    if (electronUserDataExists(API_KEY_FILENAME)) {
      const key = electronUserDataReadFileSync(API_KEY_FILENAME).trim();
      if (key) {
        state.apiKey = key;
        logger.info('Loaded existing API key');
        return state.apiKey;
      }
    }
  } catch (error) {
    logger.warn('Error reading API key:', error);
  }

  // Generate new key
  state.apiKey = crypto.randomUUID();
  try {
    electronUserDataWriteFileSync(API_KEY_FILENAME, state.apiKey, {
      encoding: 'utf-8',
      mode: 0o600,
    });
    logger.info('Generated new API key');
  } catch (error) {
    logger.error('Failed to save API key:', error);
  }
  return state.apiKey;
}

/**
 * Get the current API key
 */
export function getApiKey(): string | null {
  return state.apiKey;
}
