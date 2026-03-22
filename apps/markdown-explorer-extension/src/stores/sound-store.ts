import { create } from 'zustand';
import type { SoundEvent } from '../services/sound-service';

const STORAGE_KEY = 'automaker-sound-settings';

export type SoundProfile = 'all' | 'errorsOnly' | 'completionOnly' | 'none';

export interface SoundEventSettings {
  taskComplete: boolean;
  phaseComplete: boolean;
  error: boolean;
  messageSent: boolean;
}

export interface SoundStoreState {
  /** Master on/off switch */
  enabled: boolean;
  /** Volume 0-100 */
  volume: number;
  /** Quick profile selector */
  profile: SoundProfile;
  /** Per-event toggles (override profile when profile is 'all') */
  events: SoundEventSettings;

  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setProfile: (profile: SoundProfile) => void;
  setEventEnabled: (event: SoundEvent, enabled: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULT_EVENTS: SoundEventSettings = {
  taskComplete: true,
  phaseComplete: true,
  error: true,
  messageSent: false,
};

const DEFAULT_STATE = {
  enabled: true,
  volume: 60,
  profile: 'all' as SoundProfile,
  events: { ...DEFAULT_EVENTS },
};

function loadFromStorage(): Partial<typeof DEFAULT_STATE> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveToStorage(state: Pick<SoundStoreState, 'enabled' | 'volume' | 'profile' | 'events'>) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        enabled: state.enabled,
        volume: state.volume,
        profile: state.profile,
        events: state.events,
      })
    );
  } catch {
    // Ignore storage errors
  }
}

function applyProfile(profile: SoundProfile): SoundEventSettings {
  switch (profile) {
    case 'all':
      return { taskComplete: true, phaseComplete: true, error: true, messageSent: false };
    case 'errorsOnly':
      return { taskComplete: false, phaseComplete: false, error: true, messageSent: false };
    case 'completionOnly':
      return { taskComplete: true, phaseComplete: true, error: false, messageSent: false };
    case 'none':
      return { taskComplete: false, phaseComplete: false, error: false, messageSent: false };
  }
}

const persisted = loadFromStorage();
const initialState = {
  ...DEFAULT_STATE,
  ...persisted,
  events: { ...DEFAULT_EVENTS, ...persisted.events },
};

export const useSoundStore = create<SoundStoreState>()((set, get) => ({
  ...initialState,

  setEnabled: (enabled) => {
    set({ enabled });
    saveToStorage({ ...get(), enabled });
  },

  setVolume: (volume) => {
    const clamped = Math.min(100, Math.max(0, Math.round(volume)));
    set({ volume: clamped });
    saveToStorage({ ...get(), volume: clamped });
  },

  setProfile: (profile) => {
    const events = applyProfile(profile);
    set({ profile, events });
    saveToStorage({ ...get(), profile, events });
  },

  setEventEnabled: (event, enabled) => {
    const events = { ...get().events, [event]: enabled };
    set({ events, profile: 'all' }); // Switch to custom/"all" when manually toggling
    saveToStorage({ ...get(), events, profile: 'all' });
  },

  resetToDefaults: () => {
    set({ ...DEFAULT_STATE });
    saveToStorage(DEFAULT_STATE);
  },
}));

/**
 * Check if a specific sound event should play.
 */
export function shouldPlayEvent(event: SoundEvent): boolean {
  const state = useSoundStore.getState();
  if (!state.enabled) return false;
  if (state.volume <= 0) return false;
  return state.events[event] ?? false;
}
