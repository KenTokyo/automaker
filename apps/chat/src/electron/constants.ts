/**
 * Electron main process constants for Chat App
 *
 * Simplified configuration - no Kanban board, smaller default window.
 */

// ============================================
// Window sizing constants (chat-optimized)
// ============================================
export const MIN_WIDTH = 500;
export const MIN_HEIGHT = 400;
export const DEFAULT_WIDTH = 1100;
export const DEFAULT_HEIGHT = 800;

// ============================================
// Port defaults
// ============================================
const parsedServerPort = Number.parseInt(process.env.PORT ?? '', 10);
const parsedStaticPort = Number.parseInt(process.env.TEST_PORT ?? '', 10);
export const DEFAULT_SERVER_PORT = Number.isFinite(parsedServerPort) ? parsedServerPort : 3008;
export const DEFAULT_STATIC_PORT = Number.isFinite(parsedStaticPort) ? parsedStaticPort : 3009;

// ============================================
// File names for userData storage
// ============================================
// Separate filenames from Automaker UI to allow parallel usage
export const API_KEY_FILENAME = '.chat-api-key';
export const WINDOW_BOUNDS_FILENAME = 'chat-window-bounds.json';

// ============================================
// Window bounds interface
// ============================================
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
}
