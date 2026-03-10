/**
 * Window bounds management for Chat App
 *
 * Functions for loading, saving, and validating window bounds.
 */

import { screen } from 'electron';
import {
  electronUserDataExists,
  electronUserDataReadFileSync,
  electronUserDataWriteFileSync,
} from '@automaker/platform';
import { createLogger } from '@automaker/utils/logger';
import { WindowBounds, WINDOW_BOUNDS_FILENAME, MIN_WIDTH, MIN_HEIGHT } from '../constants';
import { state } from '../state';

const logger = createLogger('ChatWindowBounds');

/**
 * Load saved window bounds from disk
 */
export function loadWindowBounds(): WindowBounds | null {
  try {
    if (electronUserDataExists(WINDOW_BOUNDS_FILENAME)) {
      const data = electronUserDataReadFileSync(WINDOW_BOUNDS_FILENAME);
      const bounds = JSON.parse(data) as WindowBounds;
      if (
        typeof bounds.x === 'number' &&
        typeof bounds.y === 'number' &&
        typeof bounds.width === 'number' &&
        typeof bounds.height === 'number'
      ) {
        return bounds;
      }
    }
  } catch (error) {
    logger.warn('Failed to load window bounds:', (error as Error).message);
  }
  return null;
}

/**
 * Save window bounds to disk
 */
export function saveWindowBounds(bounds: WindowBounds): void {
  try {
    electronUserDataWriteFileSync(WINDOW_BOUNDS_FILENAME, JSON.stringify(bounds, null, 2));
    logger.info('Window bounds saved');
  } catch (error) {
    logger.warn('Failed to save window bounds:', (error as Error).message);
  }
}

/**
 * Schedule a debounced save of window bounds (500ms delay)
 */
export function scheduleSaveWindowBounds(): void {
  if (!state.mainWindow || state.mainWindow.isDestroyed()) return;

  if (state.saveWindowBoundsTimeout) {
    clearTimeout(state.saveWindowBoundsTimeout);
  }

  state.saveWindowBoundsTimeout = setTimeout(() => {
    if (!state.mainWindow || state.mainWindow.isDestroyed()) return;

    const isMaximized = state.mainWindow.isMaximized();
    const bounds = isMaximized ? state.mainWindow.getNormalBounds() : state.mainWindow.getBounds();

    saveWindowBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    });
  }, 500);
}

/**
 * Validate that window bounds are visible on at least one display
 */
export function validateBounds(bounds: WindowBounds): WindowBounds {
  const displays = screen.getAllDisplays();

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  let isVisible = false;
  for (const display of displays) {
    const { x, y, width, height } = display.workArea;
    if (centerX >= x && centerX <= x + width && centerY >= y && centerY <= y + height) {
      isVisible = true;
      break;
    }
  }

  if (!isVisible) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { x, y, width, height } = primaryDisplay.workArea;

    return {
      x: x + Math.floor((width - bounds.width) / 2),
      y: y + Math.floor((height - bounds.height) / 2),
      width: Math.min(bounds.width, width),
      height: Math.min(bounds.height, height),
      isMaximized: bounds.isMaximized,
    };
  }

  return {
    ...bounds,
    width: Math.max(bounds.width, MIN_WIDTH),
    height: Math.max(bounds.height, MIN_HEIGHT),
  };
}
