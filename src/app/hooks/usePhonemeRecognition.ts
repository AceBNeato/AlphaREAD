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

export function preloadPhonemeModel() {
  if (!globalWorker && typeof window !== 'undefined') {
    globalWorker = new Worker(new URL('../workers/phonemeWorker.ts', import.meta.url), { type: 'module' });
    globalWorker.onmessage = (e) => {
      if (e.data.type === 'READY') {
        isWorkerReady = true;
        console.log("[PhonemeWorker] Model loaded in background.");
      }
    };
    globalWorker.postMessage({ type: 'PRELOAD' });
  }
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
        
        // e.g. text: "[b] [a]"
        const rawPhones = e.data.text;
        
        // Evaluate the raw phonemes against the target syllable using the PhonemeEvaluator
        // We pass the raw string wrapped in an array to match the API
        const phonemeResult = evaluateSyllable(targetWord, [rawPhones]);
        
        // Map UI text
        const finalTranscript = (phonemeResult === "correct" || phonemeResult === "close") 
          ? targetWord.toLowerCase() 
          : rawPhones.replace(/\[|\]/g, '').trim() || "..."; // clean up [b] [a] to b a

        onResult(targetWord, phonemeResult, finalTranscript);
        isProcessingRef.current = false;
      } else if (e.data.type === 'ERROR') {
        globalWorker?.removeEventListener('message', handleMessage);
        onError();
        isProcessingRef.current = false;
      }
    };

    globalWorker.addEventListener('message', handleMessage);
    globalWorker.postMessage({ type: 'RECOGNIZE', audioData: audio16k });

  }, [stopMicrophone, onResult, onError]);

  useEffect(() => {
    if (!enabled || !evaluatingWord) {
      stopMicrophone();
      return;
    }

    if (!isWorkerReady) {
      console.warn("Worker not ready yet. Skipping recording.");
      onError();
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

        source.connect(processor);
        processor.connect(context.destination);

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
    };
  }, [evaluatingWord, enabled, stopMicrophone, processAudio, onSilenceTimeout, onError]);
}
