import { useCallback, useEffect, useRef, useState } from 'react';

export type CanaryStatus = 'unsupported' | 'idle' | 'loading' | 'ready' | 'listening' | 'error';

interface UseCanarySpeechRecognitionOptions {
  onTranscript?: (chunk: string) => void;
  onError?: (message: string) => void;
}

interface UseCanarySpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  isLoading: boolean;
  isReady: boolean;
  hasLoadedModel: boolean;
  status: CanaryStatus;
  loadingProgress: number;
  loadingMessage: string;
  error: string | null;
  toggleListening: () => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetSession: () => void;
}

const CANARY_BROWSER_LIMITATION_MESSAGE =
  'Canary 1B v2 braucht aktuell ein Server-Backend mit NeMo/Riva und GPU. Direkter Browserbetrieb ist in diesem Stack noch nicht möglich.';

function hasAudioCaptureSupport(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== 'undefined' &&
    'AudioWorkletNode' in window
  );
}

export function useCanarySpeechRecognition({
  onTranscript,
  onError,
}: UseCanarySpeechRecognitionOptions = {}): UseCanarySpeechRecognitionResult {
  const [status, setStatus] = useState<CanaryStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Canary benötigt Server-Backend');

  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onError, onTranscript]);

  useEffect(() => {
    if (!hasAudioCaptureSupport()) {
      setLoadingMessage('Mikrofon wird im Browser nicht unterstützt');
    }
    setStatus('unsupported');
  }, []);

  const emitUnsupportedError = useCallback(() => {
    setError(CANARY_BROWSER_LIMITATION_MESSAGE);
    setStatus('error');
    onErrorRef.current?.(CANARY_BROWSER_LIMITATION_MESSAGE);
  }, []);

  const startListening = useCallback(async () => {
    emitUnsupportedError();
  }, [emitUnsupportedError]);

  const stopListening = useCallback(() => {
    setStatus('unsupported');
  }, []);

  const resetSession = useCallback(() => {
    setError(null);
    setStatus('unsupported');
    setLoadingMessage('Canary benötigt Server-Backend');
  }, []);

  const toggleListening = useCallback(async () => {
    if (status === 'listening') {
      stopListening();
      return;
    }

    await startListening();
  }, [startListening, status, stopListening]);

  return {
    isSupported: false,
    isListening: false,
    isLoading: false,
    isReady: false,
    hasLoadedModel: false,
    status,
    loadingProgress: 0,
    loadingMessage,
    error,
    toggleListening,
    startListening,
    stopListening,
    resetSession,
  };
}
