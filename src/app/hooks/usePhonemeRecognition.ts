import { useEffect, useRef, useCallback, useState } from "react";
import { pipeline, env } from "@xenova/transformers";
import { evaluateSyllable } from "../utils/PhonemeEvaluator";

// Use HuggingFace CDN only (no local model files needed)
env.allowLocalModels = false;

interface UsePhonemeRecognitionProps {
  evaluatingWord: string | null;
  enabled?: boolean;
  onResult: (word: string, status: "correct" | "close" | "wrong" | null, transcript: string) => void;
  onSilenceTimeout: () => void;
  onError: () => void;
}

const HOMOPHONES: Record<string, string[]> = {
  // Alphabet phonetic homophones
  "A": ["a", "ay", "hey", "eight"],
  "B": ["b", "bee", "be"],
  "C": ["c", "see", "sea"],
  "D": ["d", "dee", "the"],
  "E": ["e", "ee", 'ih'],
  "F": ["f", "eff", "if", "half"],
  "G": ["g", "gee", "jee"],
  "H": ["h", "aitch", "hatch", "age", "each"],
  "I": ["i", "eye", "hi"],
  "J": ["j", "jay"],
  "K": ["k", "kay", "okay"],
  "L": ["l", "ell", "el"],
  "M": ["m", "em", "am", "him"],
  "N": ["n", "en", "an", "and", "in"],
  "O": ["o", "oh"],
  "P": ["p", "pee", "pea"],
  "Q": ["q", "cue", "queue"],
  "R": ["r", "are", "our"],
  "S": ["s", "ess", "yes", "is"],
  "T": ["t", "tee", "tea"],
  "U": ["u", "you", "yu"],
  "V": ["v", "vee", "we"],
  "W": ["w", "double u", "double you"],
  "X": ["x", "ex", "axe", "text"],
  "Y": ["y", "why", "while"],
  "Z": ["z", "zee", "zed", "c"],

  // Common CV/VC homophones
  "PI": ["pie", "pee", "p"],
  "ME": ["me", "mee", "m"],
  "BE": ["be", "bee", "b"],
  "TO": ["to", "too", "two", "t"],
  "DO": ["do", "doo", "d"],
  "WE": ["we", "wee", "w"],
  "HE": ["he", "hee", "h"],
};

// ─── GLOBAL MODEL CACHE ───────────────────────────────────────────────────────
// Keep the model in a global variable so it survives React re-renders and
// route changes without being garbage-collected or re-downloaded.
let globalTranscriber: any = null;
let isTranscriberReady = false;
let isInitializing = false;

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
    return () => {
      this.listeners.delete(fn);
    };
  }
};

/** Kick off the model download in the background. Safe to call multiple times. */
export async function preloadPhonemeModel() {
  if (globalTranscriber || isInitializing) return;
  isInitializing = true;
  modelLoadState.status = 'loading';
  modelLoadState.percent = 0;
  modelLoadState.notify();

  try {
    // Allow pulling from HuggingFace CDN directly since we are an online webapp
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    
    // IMPORTANT: Temporarily disable browser cache because it saved the 404 HTML page!
    env.useBrowserCache = false;
    
    // Explicitly tell Transformers.js to load its WebAssembly engine from CDN
    // Otherwise Vite tries to load it from the local server and returns index.html (404), causing the SyntaxError
    env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';

    console.log("[Phoneme] Fetching wav2vec2 model from HuggingFace CDN (cache bypassed)...");
    globalTranscriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/wav2vec2-base-960h",
      {
        quantized: true,
        progress_callback: (p: any) => {
          if (p && p.total && p.loaded) {
            const pct = Math.round((p.loaded / p.total) * 100);
            modelLoadState.percent = Math.max(modelLoadState.percent, pct);
            modelLoadState.notify();
          }
        }
      }
    );
    isTranscriberReady = true;
    modelLoadState.status = 'ready';
    modelLoadState.percent = 100;
    modelLoadState.notify();
    console.log("[Phoneme] Model ready!");
  } catch (err) {
    console.error("[Phoneme] Model load error:", err);
    modelLoadState.status = 'error';
    modelLoadState.notify();
  } finally {
    isInitializing = false;
  }
}

/** React hook — subscribe to real-time model loading state. */
export function useModelLoadState() {
  const [state, setState] = useState<{ status: ModelLoadStatus; percent: number }>({
    status: modelLoadState.status,
    percent: modelLoadState.percent,
  });

  useEffect(() => {
    setState({ status: modelLoadState.status, percent: modelLoadState.percent });
    return modelLoadState.subscribe(() => {
      setState({ status: modelLoadState.status, percent: modelLoadState.percent });
    });
  }, []);

  return state;
}

// ─── Fast downsampler (Wav2Vec2 needs exactly 16kHz) ─────────────────────────
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
    for (let j = start; j < end; j++) sum += audioData[j];
    result[i] = count > 0 ? sum / count : 0;
  }
  return result;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function usePhonemeRecognition({
  evaluatingWord,
  enabled = true,
  onResult,
  onSilenceTimeout,
  onError,
}: UsePhonemeRecognitionProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const evaluatingWordRef = useRef(evaluatingWord);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    evaluatingWordRef.current = evaluatingWord;
  }, [evaluatingWord]);

  // Ensure model starts loading as soon as the hook mounts
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
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const processAudio = useCallback(async (sampleRate: number) => {
    if (isProcessingRef.current || !evaluatingWordRef.current) return;
    isProcessingRef.current = true;
    const targetWord = evaluatingWordRef.current;

    stopMicrophone();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Merge all recorded chunks
    const totalLength = audioChunksRef.current.reduce((acc, c) => acc + c.length, 0);
    if (totalLength === 0) {
      isProcessingRef.current = false;
      onError();
      return;
    }
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const audio16k = resampleTo16k(merged, sampleRate);

    try {
      // If model isn't ready yet, wait for it (up to 60s)
      let waited = 0;
      while (!isTranscriberReady && waited < 60000) {
        await new Promise(r => setTimeout(r, 500));
        waited += 500;
      }
      if (!isTranscriberReady || !globalTranscriber) {
        throw new Error("Model not ready after timeout");
      }

      const output = await globalTranscriber(audio16k);
      
      if (!isMountedRef.current) return;

      const rawPhones = output.text || "";

      // Strip IPA brackets e.g. "[b] [æ]" → "b æ"
      const cleanedPhones = rawPhones.replace(/\[|\]|\/|\|/g, '').trim();

      const trimmedTarget = targetWord.trim().toLowerCase();
      const isSingleLetter = trimmedTarget.length === 1 && /[a-z]/.test(trimmedTarget);
      const isMagicE = trimmedTarget.length === 3 && /^[aeiou]_e$/.test(trimmedTarget);

      let phonemeResult: "correct" | "close" | "wrong" = "wrong";

      if (isSingleLetter || isMagicE) {
        const letterUpper = trimmedTarget.charAt(0).toUpperCase();
        const allowedWords = [
          letterUpper,
          `LETTER ${letterUpper}`,
          ...(HOMOPHONES[letterUpper] || [])
        ].map(w => w.toUpperCase());
        
        const phraseWords = cleanedPhones.toUpperCase().split(" ");
        if (allowedWords.some(t => cleanedPhones.toUpperCase() === t || phraseWords.includes(t))) {
          phonemeResult = "correct";
        }
      } else {
        phonemeResult = evaluateSyllable(targetWord, [cleanedPhones]);
      }
      const finalTranscript = (phonemeResult === "correct" || phonemeResult === "close")
        ? targetWord.toLowerCase()
        : cleanedPhones || "...";

      onResult(targetWord, phonemeResult, finalTranscript);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("[Phoneme] Recognition error:", err);
      onError();
    } finally {
      if (isMountedRef.current) {
        isProcessingRef.current = false;
      }
    }
  }, [stopMicrophone, onResult, onError]);

  useEffect(() => {
    if (!enabled || !evaluatingWord) {
      stopMicrophone();
      return;
    }

    let isMounted = true;
    audioChunksRef.current = [];
    isProcessingRef.current = false;

    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then(stream => {
        if (!isMounted) { stream.getTracks().forEach(t => t.stop()); return; }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContextClass();
        const source = context.createMediaStreamSource(stream);
        const processor = context.createScriptProcessor(4096, 1, 1);

        let hasHeardSound = false;
        let silenceFrames = 0;
        const SILENCE_THRESHOLD = 0.01;
        const MAX_SILENCE_FRAMES = 15; // ~1.5s of silence at 4096/44100

        processor.onaudioprocess = (e) => {
          if (isProcessingRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          audioChunksRef.current.push(new Float32Array(input));

          let sum = 0;
          for (let i = 0; i < input.length; i++) sum += Math.abs(input[i]);
          const avg = sum / input.length;

          if (avg > SILENCE_THRESHOLD) {
            hasHeardSound = true;
            silenceFrames = 0;
          } else if (hasHeardSound) {
            silenceFrames++;
          }

          if ((hasHeardSound && silenceFrames > MAX_SILENCE_FRAMES) || audioChunksRef.current.length > 40) {
            processAudio(context.sampleRate);
          }
        };

        // Muted GainNode prevents echo feedback loop
        const gainNode = context.createGain();
        gainNode.gain.value = 0;
        source.connect(processor);
        processor.connect(gainNode);
        gainNode.connect(context.destination);

        audioContextRef.current = context;
        mediaStreamRef.current = stream;
        processorRef.current = processor;

        // Hard 5-second fallback timeout
        timeoutRef.current = setTimeout(() => {
          if (!isProcessingRef.current) {
            if (!hasHeardSound) {
              stopMicrophone();
              onSilenceTimeout();
            } else {
              processAudio(context.sampleRate);
            }
          }
        }, 5000);
      })
      .catch(err => {
        console.error("Mic access error:", err);
        onError();
      });

    return () => {
      isMounted = false;
      stopMicrophone();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [evaluatingWord, enabled, stopMicrophone, processAudio, onSilenceTimeout, onError]);
}
