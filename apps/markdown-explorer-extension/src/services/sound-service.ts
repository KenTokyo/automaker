/**
 * Sound service using Web Audio API for programmatic tone generation.
 * No external audio files needed - all sounds are synthesized.
 */

export type SoundEvent = 'taskComplete' | 'phaseComplete' | 'error' | 'messageSent';

interface ToneConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  /** Optional second tone for two-note chimes */
  frequency2?: number;
  duration2?: number;
  /** Delay before second tone starts (relative to first) */
  delay2?: number;
  /** Gain envelope attack time in seconds */
  attack?: number;
  /** Gain envelope release time in seconds */
  release?: number;
}

const TONE_CONFIGS: Record<SoundEvent, ToneConfig> = {
  taskComplete: {
    frequency: 523.25, // C5
    frequency2: 659.25, // E5
    duration: 0.12,
    duration2: 0.18,
    delay2: 0.13,
    type: 'sine',
    attack: 0.01,
    release: 0.15,
  },
  phaseComplete: {
    frequency: 440, // A4
    frequency2: 554.37, // C#5
    duration: 0.1,
    duration2: 0.14,
    delay2: 0.11,
    type: 'sine',
    attack: 0.01,
    release: 0.12,
  },
  error: {
    frequency: 220, // A3
    frequency2: 196, // G3 (descending = warning)
    duration: 0.15,
    duration2: 0.2,
    delay2: 0.16,
    type: 'triangle',
    attack: 0.01,
    release: 0.18,
  },
  messageSent: {
    frequency: 880, // A5
    duration: 0.06,
    type: 'sine',
    attack: 0.005,
    release: 0.06,
  },
};

/** Minimum ms between plays of the same sound type */
const COOLDOWN_MS = 400;

let audioContext: AudioContext | null = null;
const lastPlayedAt: Partial<Record<SoundEvent, number>> = {};

function getAudioContext(): AudioContext | null {
  if (audioContext && audioContext.state !== 'closed') {
    return audioContext;
  }
  try {
    audioContext = new AudioContext();
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(ctx: AudioContext, config: ToneConfig, volume: number, startTime: number) {
  const attack = config.attack ?? 0.01;
  const release = config.release ?? 0.1;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = config.type;
  oscillator.frequency.setValueAtTime(config.frequency, startTime);

  // Envelope: quick attack, sustain, smooth release
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume * 0.3, startTime + attack);
  gainNode.gain.setValueAtTime(volume * 0.3, startTime + config.duration);
  gainNode.gain.linearRampToValueAtTime(0, startTime + config.duration + release);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + config.duration + release + 0.05);
}

/**
 * Play a sound event. Returns true if the sound was played, false if skipped.
 */
export function playSound(event: SoundEvent, volume: number): boolean {
  if (volume <= 0) return false;

  const now = Date.now();
  const last = lastPlayedAt[event] ?? 0;
  if (now - last < COOLDOWN_MS) return false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const config = TONE_CONFIGS[event];
  if (!config) return false;

  lastPlayedAt[event] = now;

  const startTime = ctx.currentTime;
  const clampedVolume = Math.min(1, Math.max(0, volume / 100));

  // First tone
  playTone(ctx, config, clampedVolume, startTime);

  // Optional second tone
  if (config.frequency2 && config.delay2) {
    const secondConfig: ToneConfig = {
      ...config,
      frequency: config.frequency2,
      duration: config.duration2 ?? config.duration,
    };
    playTone(ctx, secondConfig, clampedVolume, startTime + config.delay2);
  }

  return true;
}

/**
 * Play a test tone to verify audio output.
 */
export function playTestTone(volume: number): boolean {
  return playSound('taskComplete', volume);
}

/**
 * Dispose the audio context (cleanup on unmount).
 */
export function disposeAudioContext(): void {
  if (audioContext && audioContext.state !== 'closed') {
    void audioContext.close();
  }
  audioContext = null;
}
