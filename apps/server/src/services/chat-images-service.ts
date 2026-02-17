/**
 * Chat Images Service - Manages images pasted/attached in chat sessions
 *
 * Provides operations for saving images to persistent storage.
 * Images are stored in DATA_DIR/chat-images/ for persistence across sessions.
 */

import path from 'path';
import { createLogger } from '@automaker/utils';
import {
  getGlobalChatImagesDir,
  ensureGlobalChatImagesDir,
  getDataDirectory,
  secureFs,
} from '@automaker/platform';

const logger = createLogger('ChatImagesService');

/**
 * Result of saving a chat image
 */
export interface SaveImageResult {
  success: boolean;
  path?: string;
  filename?: string;
  error?: string;
}

/**
 * Generate a unique filename for a chat image
 * Format: chat-img-{timestamp}-{randomId}.{ext}
 */
function generateImageFilename(mimeType: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const ext = getExtensionFromMimeType(mimeType) || 'png';
  return `chat-img-${timestamp}-${randomId}.${ext}`;
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
  };
  return mimeToExt[mimeType.toLowerCase()] || 'png';
}

/**
 * Extract base64 data from a data URL
 * Returns the raw base64 string without the data:image/xxx;base64, prefix
 */
function extractBase64Data(dataUrl: string): { base64: string; mimeType: string } | null {
  // Check if it's a data URL
  const dataUrlMatch = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      base64: dataUrlMatch[2],
    };
  }

  // If it's already raw base64, assume PNG
  if (/^[A-Za-z0-9+/=]+$/.test(dataUrl)) {
    return {
      mimeType: 'image/png',
      base64: dataUrl,
    };
  }

  return null;
}

/**
 * Save a chat image to persistent storage
 *
 * @param base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param mimeType - MIME type of the image (optional if included in data URL)
 * @returns SaveImageResult with path and filename on success
 */
export async function saveChatImage(
  base64Data: string,
  mimeType?: string
): Promise<SaveImageResult> {
  try {
    const dataDir = getDataDirectory();
    if (!dataDir) {
      logger.error('Cannot save chat image: DATA_DIR not configured');
      return { success: false, error: 'DATA_DIR not configured' };
    }

    // Extract base64 data and determine MIME type
    const extracted = extractBase64Data(base64Data);
    if (!extracted) {
      return { success: false, error: 'Invalid image data format' };
    }

    const finalMimeType = mimeType || extracted.mimeType;
    const filename = generateImageFilename(finalMimeType);

    // Ensure the chat images directory exists
    const imagesDir = await ensureGlobalChatImagesDir(dataDir);
    const filePath = path.join(imagesDir, filename);

    // Convert base64 to buffer and write to file
    const buffer = Buffer.from(extracted.base64, 'base64');
    await secureFs.writeFile(filePath, buffer);

    logger.info(`Saved chat image: ${filePath}`);

    return {
      success: true,
      path: filePath,
      filename,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to save image';
    logger.error('Failed to save chat image:', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Get the full path for a chat image filename
 */
export function getChatImagePath(filename: string): string | null {
  const dataDir = getDataDirectory();
  if (!dataDir) {
    return null;
  }
  return path.join(getGlobalChatImagesDir(dataDir), filename);
}

/**
 * Check if a chat image exists
 */
export async function chatImageExists(filename: string): Promise<boolean> {
  const filePath = getChatImagePath(filename);
  if (!filePath) return false;

  try {
    await secureFs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a chat image
 */
export async function deleteChatImage(filename: string): Promise<boolean> {
  const filePath = getChatImagePath(filename);
  if (!filePath) return false;

  try {
    await secureFs.unlink(filePath);
    logger.info(`Deleted chat image: ${filePath}`);
    return true;
  } catch (err) {
    logger.error(`Failed to delete chat image: ${filePath}`, err);
    return false;
  }
}
