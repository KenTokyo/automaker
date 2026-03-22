/**
 * Icon management utilities for Chat App
 */

import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { electronAppExists } from '@automaker/platform';
import { createLogger } from '@automaker/utils/logger';

const logger = createLogger('ChatIconManager');
const electronDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Get icon path - works in both dev and production, cross-platform
 */
export function getIconPath(): string | null {
  const isDev = !app.isPackaged;

  let iconFile: string;
  if (process.platform === 'win32') {
    iconFile = 'icon.ico';
  } else {
    iconFile = 'logo_larger.png';
  }

  const iconPath = isDev
    ? path.join(electronDir, '../public', iconFile)
    : path.join(electronDir, '../dist/public', iconFile);

  try {
    if (!electronAppExists(iconPath)) {
      logger.warn('Icon not found at:', iconPath);
      return null;
    }
  } catch (error) {
    logger.warn('Icon check failed:', iconPath, error);
    return null;
  }

  return iconPath;
}
