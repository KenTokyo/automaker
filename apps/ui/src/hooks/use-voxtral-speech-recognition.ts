import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * @deprecated Voxtral local realtime ASR is kept for reference only.
 * Prefer `useWhisperSpeechRecognition` with smaller models to reduce GPU pressure.
 */
const MODEL_ID = 'onnx-community/Voxtral-Mini-4B-Realtime-2602-ONNX';
const SAMPLE_RATE = 16_000;
const MODEL_FILE_COUNT = 3;
const CAPTURE_PROCESSOR_NAME = 'voxtral-capture-processor';
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
  registerProcessor("voxtral-capture-processor", CaptureProcessor);
`;

type VoxtralStatus = 'unsupported' | 'idle' | 'loading' | 'ready' | 'listening' | 'error';

interface ProgressInfo {
  status?: string;
  file?: string;
  loaded?: number;
  total?: number;
}

interface RuntimeProgressOptions {
  dtype: Record<string, string>;
  device: 'webgpu';
  progress_callback: (info: ProgressInfo) => void;
}

interface RuntimeModel {
  generate(options: {
    input_ids: unknown;
    input_features: AsyncGenerator<unknown, void, unknown>;
    max_new_tokens: number;
    streamer: unknown;
  }): Promise<void>;
}

interface RuntimeTokenizer {
  all_special_ids: number[];
  decode(tokens: bigint[], options: { skip_special_tokens: boolean }): string;
}

interface RuntimeFeatureExtractor {
  config: {
    hop_length: number;
    n_fft: number;
  };
}

interface RuntimeChunk {
  input_ids: unknown;
  input_features: {
    dims: number[];
  };
}

interface RuntimeProcessor {
  (
    audio: Float32Array,
    options: {
      is_streaming: boolean;
      is_first_audio_chunk: boolean;
    }
  ): Promise<RuntimeChunk>;
  num_samples_first_audio_chunk: number;
  num_mel_frames_first_audio_chunk: number;
  num_samples_per_audio_chunk: number;
  audio_length_per_tok: number;
  feature_extractor: RuntimeFeatureExtractor;
  tokenizer: RuntimeTokenizer;
}

interface RuntimeBaseStreamer {
  put(value: bigint[][]): void;
  end(): void;
}

interface VoxtralRuntime {
  BaseStreamer: new () => RuntimeBaseStreamer;
  VoxtralRealtimeForConditionalGeneration: {
    from_pretrained(modelId: string, options: RuntimeProgressOptions): Promise<RuntimeModel>;
  };
  VoxtralRealtimeProcessor: {
    from_pretrained(modelId: string): Promise<RuntimeProcessor>;
  };
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

interface UseVoxtralSpeechRecognitionOptions {
  onTranscript?: (chunk: string) => void;
  onError?: (message: string) => void;
}

interface UseVoxtralSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  isLoading: boolean;
  isReady: boolean;
  hasLoadedModel: boolean;
  status: VoxtralStatus;
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

function waitUntil(condition: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (condition()) {
      resolve();
      return;
    }

    const interval = window.setInterval(() => {
      if (condition()) {
        window.clearInterval(interval);
        resolve();
      }
    }, 50);
  });
}

function getRuntimeExport<T>(runtimeModule: Record<string, unknown>, key: string): T {
  if (!(key in runtimeModule)) {
    throw new Error(`Voxtral runtime export fehlt: ${key}`);
  }
  return runtimeModule[key] as T;
}

async function loadRuntime(): Promise<VoxtralRuntime> {
  const runtimeModule = (await import('@huggingface/transformers')) as unknown as Record<
    string,
    unknown
  >;

  return {
    BaseStreamer: getRuntimeExport<VoxtralRuntime['BaseStreamer']>(runtimeModule, 'BaseStreamer'),
    VoxtralRealtimeForConditionalGeneration: getRuntimeExport<
      VoxtralRuntime['VoxtralRealtimeForConditionalGeneration']
    >(runtimeModule, 'VoxtralRealtimeForConditionalGeneration'),
    VoxtralRealtimeProcessor: getRuntimeExport<VoxtralRuntime['VoxtralRealtimeProcessor']>(
      runtimeModule,
      'VoxtralRealtimeProcessor'
    ),
    env: runtimeModule.env as VoxtralRuntime['env'],
  };
}

export function useVoxtralSpeechRecognition({
  onTranscript,
  onError,
}: UseVoxtralSpeechRecognitionOptions = {}): UseVoxtralSpeechRecognitionResult {
  const [isSupported, setIsSupported] = useState(false);
  const [status, setStatus] = useState<VoxtralStatus>('idle');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Bereit');
  const [hasLoadedModel, setHasLoadedModel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runtimeRef = useRef<VoxtralRuntime | null>(null);
  const modelRef = useRef<RuntimeModel | null>(null);
  const processorRef = useRef<RuntimeProcessor | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioBufferRef = useRef<Float32Array>(new Float32Array(0));
  const isRecordingRef = useRef(false);
  const stopRequestedRef = useRef(false);

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

  const cleanupAudio = useCallback(() => {
    isRecordingRef.current = false;

    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

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

    if (modelRef.current && processorRef.current) {
      setStatus('ready');
      setHasLoadedModel(true);
      return true;
    }

    setStatus('loading');
    setLoadingProgress(0);
    setLoadingMessage('Voxtral wird geladen...');
    setError(null);

    try {
      const runtime = runtimeRef.current ?? (await loadRuntime());
      runtimeRef.current = runtime;
      if (runtime.env?.backends?.onnx?.wasm) {
        runtime.env.backends.onnx.wasm.proxy = false;
      }

      const progressMap = new Map<string, number>();
      const progressCallback = (info: ProgressInfo) => {
        if (
          info.status !== 'progress' ||
          !info.file?.endsWith('.onnx_data') ||
          !info.total ||
          info.total <= 0
        ) {
          return;
        }

        progressMap.set(info.file, (info.loaded ?? 0) / info.total);
        const totalProgress = Array.from(progressMap.values()).reduce(
          (sum, value) => sum + value,
          0
        );
        setLoadingMessage('Modell lädt...');
        setLoadingProgress(Math.min((totalProgress / MODEL_FILE_COUNT) * 100, 100));
      };

      const model = await runtime.VoxtralRealtimeForConditionalGeneration.from_pretrained(
        MODEL_ID,
        {
          dtype: {
            audio_encoder: 'q4f16',
            embed_tokens: 'q4f16',
            decoder_model_merged: 'q4f16',
          },
          device: 'webgpu',
          progress_callback: progressCallback,
        }
      );
      const processor = await runtime.VoxtralRealtimeProcessor.from_pretrained(MODEL_ID);

      modelRef.current = model;
      processorRef.current = processor;

      setLoadingProgress(100);
      setLoadingMessage('Voxtral ist bereit');
      setHasLoadedModel(true);
      setStatus('ready');
      return true;
    } catch (loadError) {
      const errorMessage = getErrorMessage(loadError, 'Voxtral konnte nicht geladen werden.');
      setError(errorMessage);
      setLoadingMessage('Laden fehlgeschlagen');
      setStatus('error');
      onErrorRef.current?.(errorMessage);
      return false;
    }
  }, [isSupported, status]);

  const runTranscription = useCallback(
    async (model: RuntimeModel, processor: RuntimeProcessor) => {
      const audio = () => audioBufferRef.current;
      const numSamplesFirst = processor.num_samples_first_audio_chunk;

      await waitUntil(() => audio().length >= numSamplesFirst || stopRequestedRef.current);

      if (stopRequestedRef.current) {
        cleanupAudio();
        setStatus('ready');
        return;
      }

      const firstChunkInputs = await processor(audio().subarray(0, numSamplesFirst), {
        is_streaming: true,
        is_first_audio_chunk: true,
      });

      const { hop_length: hopLength, n_fft: nFft } = processor.feature_extractor.config;
      const winHalf = Math.floor(nFft / 2);
      const samplesPerToken = processor.audio_length_per_tok * hopLength;

      async function* inputFeaturesGenerator(): AsyncGenerator<unknown, void, unknown> {
        yield firstChunkInputs.input_features;

        let melFrameIndex = processor.num_mel_frames_first_audio_chunk;
        let startIndex = melFrameIndex * hopLength - winHalf;

        while (!stopRequestedRef.current) {
          const endNeeded = startIndex + processor.num_samples_per_audio_chunk;
          await waitUntil(() => audio().length >= endNeeded || stopRequestedRef.current);

          if (stopRequestedRef.current) {
            break;
          }

          const availableSamples = audio().length;
          let batchEndSample = endNeeded;

          while (batchEndSample + samplesPerToken <= availableSamples) {
            batchEndSample += samplesPerToken;
          }

          const chunkInputs = await processor(audio().slice(startIndex, batchEndSample), {
            is_streaming: true,
            is_first_audio_chunk: false,
          });

          yield chunkInputs.input_features;

          melFrameIndex += chunkInputs.input_features.dims[2];
          startIndex = melFrameIndex * hopLength - winHalf;
        }
      }

      const tokenizer = processor.tokenizer;
      const specialIds = new Set(tokenizer.all_special_ids.map((id) => BigInt(id)));
      const BaseStreamerClass = runtimeRef.current?.BaseStreamer;
      if (!BaseStreamerClass) {
        throw new Error('Voxtral Streamer konnte nicht gestartet werden.');
      }

      let tokenCache: bigint[] = [];
      let printLength = 0;
      let isPrompt = true;

      const flushDecodedText = () => {
        if (tokenCache.length === 0) {
          return;
        }

        const text = tokenizer.decode(tokenCache, { skip_special_tokens: true });
        const printableText = text.slice(printLength);
        printLength = text.length;

        if (printableText.length > 0) {
          onTranscriptRef.current?.(printableText);
        }
      };

      const streamer = new (class extends BaseStreamerClass {
        put(value: bigint[][]) {
          if (stopRequestedRef.current) {
            return;
          }

          if (isPrompt) {
            isPrompt = false;
            return;
          }

          const tokens = value[0];
          if (tokens.length === 1 && specialIds.has(tokens[0])) {
            return;
          }

          tokenCache = tokenCache.concat(tokens);
          flushDecodedText();
        }

        end() {
          if (stopRequestedRef.current) {
            tokenCache = [];
            printLength = 0;
            isPrompt = true;
            return;
          }

          flushDecodedText();
          tokenCache = [];
          printLength = 0;
          isPrompt = true;
        }
      })();

      try {
        await model.generate({
          input_ids: firstChunkInputs.input_ids,
          input_features: inputFeaturesGenerator(),
          max_new_tokens: 4096,
          streamer,
        });
      } catch (transcriptionError) {
        if (!stopRequestedRef.current) {
          const errorMessage = getErrorMessage(
            transcriptionError,
            'Voxtral konnte den Ton nicht umwandeln.'
          );
          setError(errorMessage);
          onErrorRef.current?.(errorMessage);
        }
      } finally {
        cleanupAudio();
        if (!stopRequestedRef.current) {
          setStatus('ready');
        }
      }
    },
    [cleanupAudio]
  );

  const startListening = useCallback(async () => {
    if (status === 'loading') {
      return;
    }

    const loaded = await loadModel();
    if (!loaded || !modelRef.current || !processorRef.current || isRecordingRef.current) {
      return;
    }

    setError(null);
    audioBufferRef.current = new Float32Array(0);
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

      void runTranscription(modelRef.current, processorRef.current).catch((transcriptionError) => {
        const errorMessage = getErrorMessage(
          transcriptionError,
          'Voxtral konnte nicht gestartet werden.'
        );
        setError(errorMessage);
        onErrorRef.current?.(errorMessage);
        cleanupAudio();
        setStatus('ready');
      });
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
  }, [appendAudio, cleanupAudio, loadModel, runTranscription, status]);

  const stopListening = useCallback(() => {
    stopRequestedRef.current = true;
    isRecordingRef.current = false;
    cleanupAudio();
    setStatus(modelRef.current && processorRef.current ? 'ready' : 'idle');
  }, [cleanupAudio]);

  const resetSession = useCallback(() => {
    if (status === 'loading') {
      return;
    }

    stopRequestedRef.current = true;
    isRecordingRef.current = false;
    cleanupAudio();

    audioBufferRef.current = new Float32Array(0);
    modelRef.current = null;
    processorRef.current = null;

    setError(null);
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
