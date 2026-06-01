import { useEffect, useRef, useCallback, useState } from "react";
import { evaluateSyllable, isSyllableTarget } from "../utils/PhonemeEvaluator";

interface UsePhonemeRecognitionProps {
  evaluatingWord: string | null;
  enabled?: boolean;
  onResult: (word: string, status: "correct" | "close" | "wrong" | null, transcript: string) => void;
  onSilenceTimeout: () => void;
  onError: () => void;
}

// Global worker instance so it doesn't get destroyed between renders
let globalWorker: Worker | null = null;
let isWorkerReady = false;

// Fast downsampler for Wav2Vec2 (requires 16kHz)
function resampleTo16k(audioData: Float32Array, origSampleRate: number): Float32Array {
  if (origSampleRate === 16000) return audioData;
  const ratio = origSampleRate / 16000;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    let sum = 0;
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.ceil((i + 1) * ratio), audioData.length);
    let count = end - start;
    for (let j = start; j < end; j++) {
      sum += audioData[j];
    }
    result[i] = count > 0 ? sum / count : 0;
  }
  return result;
}

// Global worker instance so it doesn't get destroyed between renders
let globalWorker: Worker | null = null;
let isWorkerReady = false;

// Global model loading state - allows any component to subscribe to progress
export type ModelLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export const modelLoadState = {
  status: 'idle' as ModelLoadStatus,
  percent: 0,
  listeners: new Set<() => void>(),

  notify() {
    this.listeners.forEach(fn => fn());
  },

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
};

export function preloadPhonemeModel() {
  if (globalWorker) return; // Already started
  if (typeof window === 'undefined') return;

  modelLoadState.status = 'loading';
  modelLoadState.percent = 0;
  modelLoadState.notify();

  globalWorker = new Worker(new URL('../workers/phonemeWorker.ts', import.meta.url), { type: 'module' });

  globalWorker.onmessage = (e) => {
    if (e.data.type === 'READY') {
      isWorkerReady = true;
      modelLoadState.status = 'ready';
      modelLoadState.percent = 100;
      modelLoadState.notify();
      console.log("[PhonemeWorker] Model loaded in background.");
    } else if (e.data.type === 'PROGRESS') {
      const p = e.data.payload;
      // p.status is 'progress', p.loaded and p.total come from transformers.js
      if (p && p.total && p.loaded) {
        const pct = Math.round((p.loaded / p.total) * 100);
        modelLoadState.percent = Math.max(modelLoadState.percent, pct);
        modelLoadState.notify();
      }
    } else if (e.data.type === 'ERROR') {
      modelLoadState.status = 'error';
      modelLoadState.notify();
      console.error("[PhonemeWorker] Failed to load model:", e.data.error);
    }
  };

  globalWorker.onerror = () => {
    modelLoadState.status = 'error';
    modelLoadState.notify();
  };

  globalWorker.postMessage({ type: 'PRELOAD' });
}

/** React hook to subscribe to model loading state */
export function useModelLoadState() {
  const [state, setState] = useState<{ status: ModelLoadStatus; percent: number }>({
    status: modelLoadState.status,
    percent: modelLoadState.percent,
  });

  useEffect(() => {
    // Sync immediately in case it already changed before mount
    setState({ status: modelLoadState.status, percent: modelLoadState.percent });

    return modelLoadState.subscribe(() => {
      setState({ status: modelLoadState.status, percent: modelLoadState.percent });
    });
  }, []);

  return state;
}


export function usePhonemeRecognition({ evaluatingWord, enabled = true, onResult, onSilenceTimeout, onError }: UsePhonemeRecognitionProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Guard flag to prevent duplicate processing
  const isProcessingRef = useRef(false);
  const evaluatingWordRef = useRef(evaluatingWord);
  // Store the active listener so we can cleanly remove it if the component unmounts
  const activeWorkerListenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  useEffect(() => {
    evaluatingWordRef.current = evaluatingWord;
  }, [evaluatingWord]);

  // Preload worker if it hasn't been yet
  useEffect(() => {
    preloadPhonemeModel();
  }, []);

  const stopMicrophone = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const processAudio = useCallback(async () => {
    if (isProcessingRef.current || !globalWorker || !evaluatingWordRef.current) return;
    isProcessingRef.current = true;
    const targetWord = evaluatingWordRef.current;

    stopMicrophone();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Merge chunks
    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample to 16kHz
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const audio16k = resampleTo16k(merged, sampleRate);

    // One-time message listener for this result
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'RESULT') {
        globalWorker?.removeEventListener('message', handleMessage);
        
        const rawPhones = e.data.text;
        
        // The model sometimes outputs IPA wrapped in brackets, e.g. "[b] [a]".
        // We MUST strip these brackets before sending to PhonemeEvaluator, otherwise it fails to match.
        const cleanedPhones = rawPhones.replace(/\[|\]|\/|\|/g, '').trim();
        
        // Evaluate the raw phonemes against the target syllable using the PhonemeEvaluator
        const phonemeResult = evaluateSyllable(targetWord, [cleanedPhones]);
        
        // Map UI text
        const finalTranscript = (phonemeResult === "correct" || phonemeResult === "close") 
          ? targetWord.toLowerCase() 
          : cleanedPhones || "..."; 

        onResult(targetWord, phonemeResult, finalTranscript);
        isProcessingRef.current = false;
        activeWorkerListenerRef.current = null;
      } else if (e.data.type === 'ERROR') {
        if (activeWorkerListenerRef.current) {
          globalWorker?.removeEventListener('message', activeWorkerListenerRef.current);
          activeWorkerListenerRef.current = null;
        }
        onError();
        isProcessingRef.current = false;
      }
    };

    activeWorkerListenerRef.current = handleMessage;
    globalWorker.addEventListener('message', handleMessage);
    globalWorker.postMessage({ type: 'RECOGNIZE', audioData: audio16k });

  }, [stopMicrophone, onResult, onError]);

  useEffect(() => {
    if (!enabled || !evaluatingWord) {
      stopMicrophone();
      return;
    }

    let isMounted = true;
    audioChunksRef.current = [];
    isProcessingRef.current = false;

    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then(stream => {
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContext();
        const source = context.createMediaStreamSource(stream);
        
        // 4096 buffer size is safe for most devices
        const processor = context.createScriptProcessor(4096, 1, 1);

        // Simple VAD (Voice Activity Detection) - Wait for sound, then stop after silence
        let hasHeardSound = false;
        let silenceFrames = 0;
        const SILENCE_THRESHOLD = 0.01;
        const MAX_SILENCE_FRAMES = 15; // ~1.5 seconds of silence

        processor.onaudioprocess = (e) => {
          if (isProcessingRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          audioChunksRef.current.push(new Float32Array(input));

          // Check volume
          let sum = 0;
          for (let i = 0; i < input.length; i++) sum += Math.abs(input[i]);
          const avg = sum / input.length;

          if (avg > SILENCE_THRESHOLD) {
            hasHeardSound = true;
            silenceFrames = 0;
          } else if (hasHeardSound) {
            silenceFrames++;
          }

          // If we heard sound and then heard silence, or if we hit the hard 4-second limit
          if ((hasHeardSound && silenceFrames > MAX_SILENCE_FRAMES) || audioChunksRef.current.length > 40) {
            processAudio();
          }
        };

        // Connect to destination to keep ScriptProcessor alive, but MUTE it to prevent hardware echo loop
        const gainNode = context.createGain();
        gainNode.gain.value = 0;
        source.connect(processor);
        processor.connect(gainNode);
        gainNode.connect(context.destination);

        audioContextRef.current = context;
        mediaStreamRef.current = stream;
        processorRef.current = processor;

        timeoutRef.current = setTimeout(() => {
          if (!hasHeardSound && !isProcessingRef.current) {
            stopMicrophone();
            onSilenceTimeout();
          } else if (!isProcessingRef.current) {
            processAudio();
          }
        }, 5000);

      })
      .catch(err => {
        console.error("Microphone access denied:", err);
        onError();
      });

    return () => {
      isMounted = false;
      stopMicrophone();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (activeWorkerListenerRef.current && globalWorker) {
        globalWorker.removeEventListener('message', activeWorkerListenerRef.current);
        activeWorkerListenerRef.current = null;
      }
    };
  }, [evaluatingWord, enabled, stopMicrophone, processAudio, onSilenceTimeout, onError]);
}
