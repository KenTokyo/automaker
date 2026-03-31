import { useCallback, useEffect, useRef, useState } from 'react';

const SAMPLE_RATE = 16_000;
const MIN_CHUNK_SECONDS = 1.6;
const TRANSCRIBE_INTERVAL_MS = 1_200;
const CAPTURE_PROCESSOR_NAME = 'whisper-capture-processor';
const CAPTURE_WORKLET_SOURCE = `
  class CaptureProcessor extends AudioWorkletProcessor {
    process(inputs) {
      const input = inputs[0];
      if (input.length > 0 && input[0].length > 0) {
        this.port.postMessage(input[0]);
      }
      return true;
    }
  }
  registerProcessor("whisper-capture-processor", CaptureProcessor);
`;

const WHISPER_MODEL_IDS = {
  small: 'onnx-community/whisper-small',
  base: 'onnx-community/whisper-base',
} as const;

export type WhisperModelVariant = keyof typeof WHISPER_MODEL_IDS;
export type WhisperStatus = 'unsupported' | 'idle' | 'loading' | 'ready' | 'listening' | 'error';

interface ProgressInfo {
  status?: string;
  file?: string;
  loaded?: number;
  total?: number;
}

interface PipelineOptions {
  device: 'webgpu';
  progress_callback: (info: ProgressInfo) => void;
}

interface WhisperResult {
  text?: string;
}

type WhisperTranscriber = (
  audio: Float32Array,
  options?: Record<string, unknown>
) => Promise<string | WhisperResult>;

interface WhisperRuntime {
  pipeline: (
    task: 'automatic-speech-recognition',
    modelId: string,
    options: PipelineOptions
  ) => Promise<WhisperTranscriber>;
  env?: {
    backends?: {
      onnx?: {
        wasm?: {
          proxy?: boolean;
        };
      };
    };
  };
}

interface UseWhisperSpeechRecognitionOptions {
  model: WhisperModelVariant;
  onTranscript?: (chunk: string) => void;
  onError?: (message: string) => void;
}

interface UseWhisperSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  isLoading: boolean;
  isReady: boolean;
  hasLoadedModel: boolean;
  status: WhisperStatus;
  loadingProgress: number;
  loadingMessage: string;
  error: string | null;
  toggleListening: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetSession: () => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function hasWebGpuSupport(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

function hasAudioCaptureSupport(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== 'undefined' &&
    'AudioWorkletNode' in window
  );
}

function getRuntimeExport<T>(runtimeModule: Record<string, unknown>, key: string): T {
  if (!(key in runtimeModule)) {
    throw new Error(`Whisper runtime export fehlt: ${key}`);
  }
  return runtimeModule[key] as T;
}

function normalizeWhisperOutput(result: string | WhisperResult): string {
  if (typeof result === 'string') {
    return result;
  }
  return result.text ?? '';
}

async function loadRuntime(): Promise<WhisperRuntime> {
  const runtimeModule = (await import('@huggingface/transformers')) as unknown as Record<
    string,
    unknown
  >;

  return {
    pipeline: getRuntimeExport<WhisperRuntime['pipeline']>(runtimeModule, 'pipeline'),
    env: runtimeModule.env as WhisperRuntime['env'],
  };
}

export function useWhisperSpeechRecognition({
  model,
  onTranscript,
  onError,
}: UseWhisperSpeechRecognitionOptions): UseWhisperSpeechRecognitionResult {
  const [isSupported, setIsSupported] = useState(false);
  const [status, setStatus] = useState<WhisperStatus>('idle');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Bereit');
  const [hasLoadedModel, setHasLoadedModel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runtimeRef = useRef<WhisperRuntime | null>(null);
  const transcriberRef = useRef<WhisperTranscriber | null>(null);
  const loadedModelRef = useRef<WhisperModelVariant | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const processedSampleCountRef = useRef(0);
  const isRecordingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const transcriptionIntervalRef = useRef<number | null>(null);
  const pendingTranscriptionRef = useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onError, onTranscript]);

  useEffect(() => {
    const supported = hasWebGpuSupport() && hasAudioCaptureSupport();
    setIsSupported(supported);
    if (!supported) {
      setStatus('unsupported');
      setLoadingMessage('WebGPU fehlt');
    }
  }, []);

  const clearTranscriptionInterval = useCallback(() => {
    if (transcriptionIntervalRef.current !== null) {
      window.clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    isRecordingRef.current = false;
    clearTranscriptionInterval();
    pendingTranscriptionRef.current = false;

    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, [clearTranscriptionInterval]);

  const appendAudio = useCallback((newSamples: Float32Array) => {
    if (newSamples.length === 0) {
      return;
    }

    const previousSamples = audioBufferRef.current;
    const mergedSamples = new Float32Array(previousSamples.length + newSamples.length);
    mergedSamples.set(previousSamples);
    mergedSamples.set(newSamples, previousSamples.length);
    audioBufferRef.current = mergedSamples;
  }, []);

  const pruneProcessedAudio = useCallback(() => {
    const processed = processedSampleCountRef.current;
    if (processed <= 0) {
      return;
    }

    audioBufferRef.current = audioBufferRef.current.slice(processed);
    processedSampleCountRef.current = 0;
  }, []);

  const transcribePendingAudio = useCallback(
    async (force = false) => {
      const transcriber = transcriberRef.current;
      if (!transcriber || isTranscribingRef.current) {
        return;
      }

      const availableSamples = audioBufferRef.current.length - processedSampleCountRef.current;
      const minSamples = Math.floor(SAMPLE_RATE * MIN_CHUNK_SECONDS);

      if (availableSamples <= 0 || (!force && availableSamples < minSamples)) {
        return;
      }

      const startIndex = processedSampleCountRef.current;
      const chunk = audioBufferRef.current.slice(startIndex);
      processedSampleCountRef.current = audioBufferRef.current.length;
      isTranscribingRef.current = true;

      try {
        const result = await transcriber(chunk, {
          task: 'transcribe',
          return_timestamps: false,
        });

        if (!stopRequestedRef.current) {
          const transcript = normalizeWhisperOutput(result).trim();
          if (transcript.length > 0) {
            onTranscriptRef.current?.(transcript);
          }
        }
      } catch (transcriptionError) {
        if (!stopRequestedRef.current) {
          const errorMessage = getErrorMessage(
            transcriptionError,
            'Whisper konnte den Ton nicht umwandeln.'
          );
          setError(errorMessage);
          setStatus('error');
          onErrorRef.current?.(errorMessage);
        }
      } finally {
        isTranscribingRef.current = false;
        pruneProcessedAudio();

        if (pendingTranscriptionRef.current && !stopRequestedRef.current) {
          pendingTranscriptionRef.current = false;
          void transcribePendingAudio(force);
        }
      }
    },
    [pruneProcessedAudio]
  );

  const loadModel = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      const supportError = 'WebGPU oder Mikrofon wird hier nicht unterstützt.';
      setError(supportError);
      onErrorRef.current?.(supportError);
      return false;
    }

    if (status === 'loading' || status === 'listening') {
      return false;
    }

    if (transcriberRef.current && loadedModelRef.current === model) {
      setStatus('ready');
      setHasLoadedModel(true);
      return true;
    }

    if (transcriberRef.current && loadedModelRef.current !== model) {
      transcriberRef.current = null;
      loadedModelRef.current = null;
      setHasLoadedModel(false);
    }

    setStatus('loading');
    setLoadingProgress(0);
    setLoadingMessage('Whisper wird geladen...');
    setError(null);

    try {
      const runtime = runtimeRef.current ?? (await loadRuntime());
      runtimeRef.current = runtime;

      if (runtime.env?.backends?.onnx?.wasm) {
        runtime.env.backends.onnx.wasm.proxy = false;
      }

      const progressCallback = (info: ProgressInfo) => {
        if (info.status !== 'progress' || !info.total || info.total <= 0) {
          return;
        }
        const ratio = Math.min(Math.max((info.loaded ?? 0) / info.total, 0), 1);
        setLoadingProgress(ratio * 100);
        setLoadingMessage('Whisper lädt...');
      };

      const transcriber = await runtime.pipeline(
        'automatic-speech-recognition',
        WHISPER_MODEL_IDS[model],
        {
          device: 'webgpu',
          progress_callback: progressCallback,
        }
      );

      transcriberRef.current = transcriber;
      loadedModelRef.current = model;
      setLoadingProgress(100);
      setLoadingMessage('Whisper ist bereit');
      setHasLoadedModel(true);
      setStatus('ready');
      return true;
    } catch (loadError) {
      const errorMessage = getErrorMessage(loadError, 'Whisper konnte nicht geladen werden.');
      setError(errorMessage);
      setLoadingMessage('Laden fehlgeschlagen');
      setStatus('error');
      onErrorRef.current?.(errorMessage);
      return false;
    }
  }, [isSupported, model, status]);

  const startListening = useCallback(async () => {
    if (status === 'loading') {
      return;
    }

    const loaded = await loadModel();
    if (!loaded || !transcriberRef.current || isRecordingRef.current) {
      return;
    }

    setError(null);
    audioBufferRef.current = new Float32Array(0);
    processedSampleCountRef.current = 0;
    isRecordingRef.current = true;
    stopRequestedRef.current = false;
    setStatus('listening');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
        },
      });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const sourceNode = audioContext.createMediaStreamSource(stream);
      const silentGainNode = audioContext.createGain();
      silentGainNode.gain.value = 0;

      const workletBlob = new Blob([CAPTURE_WORKLET_SOURCE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(workletBlob);
      await audioContext.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const workletNode = new AudioWorkletNode(audioContext, CAPTURE_PROCESSOR_NAME);
      workletNode.port.onmessage = (event: MessageEvent<Float32Array>) => {
        if (isRecordingRef.current) {
          appendAudio(new Float32Array(event.data));
        }
      };

      sourceNode.connect(workletNode);
      workletNode.connect(silentGainNode);
      silentGainNode.connect(audioContext.destination);
      workletNodeRef.current = workletNode;

      clearTranscriptionInterval();
      transcriptionIntervalRef.current = window.setInterval(() => {
        if (!isRecordingRef.current || stopRequestedRef.current) {
          return;
        }

        if (isTranscribingRef.current) {
          pendingTranscriptionRef.current = true;
          return;
        }

        void transcribePendingAudio();
      }, TRANSCRIBE_INTERVAL_MS);
    } catch (recordingError) {
      const errorMessage = getErrorMessage(
        recordingError,
        'Mikrofon konnte nicht gestartet werden.'
      );
      setError(errorMessage);
      onErrorRef.current?.(errorMessage);
      cleanupAudio();
      setStatus('ready');
    }
  }, [
    appendAudio,
    cleanupAudio,
    clearTranscriptionInterval,
    loadModel,
    status,
    transcribePendingAudio,
  ]);

  const stopListening = useCallback(() => {
    stopRequestedRef.current = true;
    isRecordingRef.current = false;
    cleanupAudio();
    setStatus(transcriberRef.current ? 'ready' : 'idle');
  }, [cleanupAudio]);

  const resetSession = useCallback(() => {
    if (status === 'loading') {
      return;
    }

    stopRequestedRef.current = true;
    isRecordingRef.current = false;
    cleanupAudio();

    audioBufferRef.current = new Float32Array(0);
    processedSampleCountRef.current = 0;
    transcriberRef.current = null;
    loadedModelRef.current = null;

    setError(null);
    setHasLoadedModel(false);
    setLoadingProgress(0);
    setLoadingMessage(isSupported ? 'Bereit' : 'WebGPU fehlt');
    setStatus(isSupported ? 'idle' : 'unsupported');
  }, [cleanupAudio, isSupported, status]);

  const toggleListening = useCallback(async () => {
    if (isRecordingRef.current || status === 'listening') {
      stopListening();
      return;
    }

    await startListening();
  }, [startListening, status, stopListening]);

  useEffect(() => {
    return () => {
      stopRequestedRef.current = true;
      cleanupAudio();
    };
  }, [cleanupAudio]);

  useEffect(() => {
    if (loadedModelRef.current === null || loadedModelRef.current === model) {
      return;
    }
    resetSession();
  }, [model, resetSession]);

  return {
    isSupported,
    isListening: status === 'listening',
    isLoading: status === 'loading',
    isReady: status === 'ready',
    hasLoadedModel,
    status,
    loadingProgress,
    loadingMessage,
    error,
    toggleListening,
    startListening,
    stopListening,
    resetSession,
  };
}
