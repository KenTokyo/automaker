import type { Notification } from '@automaker/types';
import { createLogger } from '@automaker/utils/logger';

const logger = createLogger('NotificationSounds');

export const DEFAULT_NOTIFICATION_SOUND_FILE = 'notification.mp3';
export const DEFAULT_NOTIFICATION_SOUND_VOLUME = 0.5;

export interface NotificationSoundOption {
  value: string;
  label: string;
}

export const BUILT_IN_NOTIFICATION_SOUNDS: NotificationSoundOption[] = [
  { value: 'notification.mp3', label: 'Notification (Default)' },
  { value: 'phase-transition.mp3', label: 'Phase Transition' },
  { value: 'notify.mp3', label: 'Notify' },
  { value: 'notify1.mp3', label: 'Notify 1' },
  { value: 'question.mp3', label: 'Question' },
];

const BUILT_IN_SOUND_SET = new Set(BUILT_IN_NOTIFICATION_SOUNDS.map((sound) => sound.value));
const CUSTOM_SOUND_PREFIX = 'custom:';

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return DEFAULT_NOTIFICATION_SOUND_VOLUME;
  }
  return Math.min(1, Math.max(0, volume));
}

export function isCustomSoundFile(soundFile: string | null | undefined): soundFile is string {
  return typeof soundFile === 'string' && soundFile.startsWith(CUSTOM_SOUND_PREFIX);
}

export function getCustomSoundPath(soundFile: string): string | null {
  if (!isCustomSoundFile(soundFile)) {
    return null;
  }

  const customPath = soundFile.slice(CUSTOM_SOUND_PREFIX.length).trim();
  return customPath.length > 0 ? customPath : null;
}

export function getCustomSoundDisplayName(soundFile: string): string {
  const customPath = getCustomSoundPath(soundFile);
  if (!customPath) {
    return 'Custom Sound';
  }

  const normalizedPath = customPath.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop() || customPath;
  return fileName.replace(/\.mp3$/i, '');
}

export function normalizeNotificationSoundFile(soundFile: string | null | undefined): string {
  if (isCustomSoundFile(soundFile)) {
    return soundFile;
  }

  if (typeof soundFile === 'string' && BUILT_IN_SOUND_SET.has(soundFile)) {
    return soundFile;
  }

  return DEFAULT_NOTIFICATION_SOUND_FILE;
}

export function getNotificationSoundUrl(soundFile: string): string {
  if (isCustomSoundFile(soundFile)) {
    const customPath = getCustomSoundPath(soundFile);
    if (customPath) {
      return `/api/workspace/sounds/file?path=${encodeURIComponent(customPath)}`;
    }
  }

  const normalizedSoundFile = normalizeNotificationSoundFile(soundFile);
  return `/sounds/${normalizedSoundFile}`;
}

function getFallbackSoundFile(soundFile: string): string | null {
  const normalized = normalizeNotificationSoundFile(soundFile);
  return normalized === DEFAULT_NOTIFICATION_SOUND_FILE ? null : DEFAULT_NOTIFICATION_SOUND_FILE;
}

async function playAudioUrl(url: string, volume: number): Promise<void> {
  const audio = new Audio(url);
  audio.volume = volume;
  await audio.play();
}

export interface PlayNotificationSoundInput {
  soundFile: string;
  volume?: number;
  muted?: boolean;
  ignoreMute?: boolean;
}

export async function playNotificationSound({
  soundFile,
  volume = DEFAULT_NOTIFICATION_SOUND_VOLUME,
  muted = false,
  ignoreMute = false,
}: PlayNotificationSoundInput): Promise<boolean> {
  if (muted && !ignoreMute) {
    return false;
  }

  const normalizedSoundFile = normalizeNotificationSoundFile(soundFile);
  const clampedVolume = clampVolume(volume);

  try {
    await playAudioUrl(getNotificationSoundUrl(normalizedSoundFile), clampedVolume);
    return true;
  } catch (error) {
    const fallback = getFallbackSoundFile(normalizedSoundFile);
    if (!fallback) {
      logger.warn('Could not play notification sound', error);
      return false;
    }

    try {
      await playAudioUrl(getNotificationSoundUrl(fallback), clampedVolume);
      return true;
    } catch (fallbackError) {
      logger.warn('Could not play notification sound fallback', fallbackError);
      return false;
    }
  }
}

export function selectSoundFileForNotification(
  notification: Notification,
  notificationSoundFile: string,
  allPhasesCompleteSoundFile: string
): string {
  if (
    notification.type === 'spec_regeneration_complete' ||
    notification.type === 'agent_complete'
  ) {
    return normalizeNotificationSoundFile(allPhasesCompleteSoundFile);
  }

  return normalizeNotificationSoundFile(notificationSoundFile);
}
