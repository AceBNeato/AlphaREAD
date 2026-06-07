import { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore - Moonshine doesn't provide official TS typings yet
import * as Moonshine from "@usefulsensors/moonshine-js";
import { evaluateSyllable } from "../utils/PhonemeEvaluator";

// Hijack AudioContext creation to globally track instances and bypass minification hiding
const globalAudioContexts: AudioContext[] = [];
const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
if (OriginalAudioContext) {
  window.AudioContext = function(...args: any[]) {
    const ctx = new OriginalAudioContext(...args);
    globalAudioContexts.push(ctx);
    return ctx;
  } as any;
  window.AudioContext.prototype = OriginalAudioContext.prototype;
}

const HOMOPHONES: Record<string, string[]> = {
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
  "Z": ["z", "zee"],

};

export type ModelLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

class ModelLoadState {
  status: ModelLoadStatus = 'idle';
  percent: number = 0;
  listeners: Set<() => void> = new Set();

  notify() {
    for (const l of this.listeners) l();
  }
}
const modelLoadState = new ModelLoadState();

export function useModelLoadState() {
  const [state, setState] = useState({ status: modelLoadState.status, percent: modelLoadState.percent });
  useEffect(() => {
    const listener = () => setState({ status: modelLoadState.status, percent: modelLoadState.percent });
    modelLoadState.listeners.add(listener);

    if (modelLoadState.status === 'idle') {
      preloadMoonshineModel();
    }

    return () => { modelLoadState.listeners.delete(listener); };
  }, []);
  return state;
}

interface UseMoonshineRecognitionProps {
  evaluatingWord: string | null;
  enabled?: boolean;
  onResult: (targetWord: string, status: "correct" | "close" | "wrong" | null, transcript: string) => void;
  onSilenceTimeout?: () => void;
  onError: () => void;
}

let globalTranscriber: Moonshine.MicrophoneTranscriber | null = null;
let isInitializing = false;

export async function preloadMoonshineModel() {
  if (globalTranscriber || isInitializing) return;
  isInitializing = true;
  modelLoadState.status = 'loading';
  modelLoadState.percent = 0;
  modelLoadState.notify();

  try {
    console.log("[Moonshine] Fetching tiny model from JSdelivr...");
    globalTranscriber = new Moonshine.MicrophoneTranscriber(
      "model/tiny",
      {
        onModelLoadStarted() {
          modelLoadState.status = 'loading';
          modelLoadState.notify();
        },
        onModelLoaded() {
          modelLoadState.status = 'ready';
          modelLoadState.notify();
        },
        onError(e: any) {
          console.error("[Moonshine] Error:", e);
          modelLoadState.status = 'error';
          modelLoadState.notify();
        }
      },
      true // use VAD by default for cleaner chunks
    );
    // Warm the ONNX model explicitly without triggering the VAD/AudioContext.
    // This pre-downloads the 140MB weights into browser cache safely.
    if (Moonshine.Transcriber && Moonshine.Transcriber.model) {
      await Moonshine.Transcriber.model.loadModel();
      modelLoadState.status = 'ready';
      modelLoadState.notify();
    } else {
      console.warn("[Moonshine] Transcriber.model not found, fallback to wait for interaction");
      modelLoadState.status = 'ready'; // fake ready so UI button isn't disabled forever
      modelLoadState.notify();
    }
  } catch (err) {
    console.error("[Moonshine] Init error:", err);
    modelLoadState.status = 'error';
    modelLoadState.notify();
  } finally {
    isInitializing = false;
  }
}

export function useMoonshineRecognition({ evaluatingWord, enabled = true, onResult, onSilenceTimeout, onError }: UseMoonshineRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const isMountedRef = useRef(true);
  const activeTranscriberRef = useRef<Moonshine.MicrophoneTranscriber | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const stopMicrophone = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (activeTranscriberRef.current) {
      activeTranscriberRef.current.stop();
      activeTranscriberRef.current = null;
    }
    if (isMountedRef.current) setIsListening(false);
  }, []);

  const handleTranscription = useCallback((rawPhones: string, isFinal: boolean = true) => {
    if (!evaluatingWord || !rawPhones) return;

    const cleanedPhones = rawPhones.replace(/\[|\]|\/|\|/g, '').trim();
    const trimmedTarget = evaluatingWord.trim().toLowerCase();
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

      const phraseWords = cleanedPhones.toUpperCase().split(/\s+/);
      if (allowedWords.some(t => cleanedPhones.toUpperCase() === t || phraseWords.includes(t))) {
        phonemeResult = "correct";
      }
    } else {
      phonemeResult = evaluateSyllable(evaluatingWord, [cleanedPhones]);
    }

    const finalTranscript = (phonemeResult === "correct" || phonemeResult === "close")
      ? evaluatingWord.toLowerCase()
      : cleanedPhones || "...";

    if (phonemeResult === "correct" || phonemeResult === "close") {
      stopMicrophone(); // auto stop if they got it right
    }

    // Only report "wrong" if the transcript is finalized. Otherwise report null to just update the UI text.
    const reportedStatus = (phonemeResult === "wrong" && !isFinal) ? null : phonemeResult;
    onResult(evaluatingWord, reportedStatus, finalTranscript);
  }, [evaluatingWord, onResult, stopMicrophone]);

  useEffect(() => {
    if (!enabled || !evaluatingWord) {
      stopMicrophone();
      return;
    }

    let isMounted = true;

    // 🛑 FIX 1: Resume AudioContext IMMEDIATELY before any async/await.
    // This preserves the "user gesture" trust from the button click.
    try {
      globalAudioContexts.forEach(ctx => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(e => console.warn("AudioContext resume failed:", e));
        }
      });
      // Fallback just in case
      if (globalTranscriber) {
        for (const val of Object.values(globalTranscriber)) {
          if (val instanceof window.AudioContext && val.state === 'suspended') {
            val.resume().catch(e => console.warn("AudioContext fallback resume failed:", e));
          }
        }
      }
    } catch (e) {
      console.warn("Could not resume AudioContexts", e);
    }

    const startRecording = async () => {
      if (!globalTranscriber && !isInitializing) {
        await preloadMoonshineModel();
      }

      let waited = 0;
      while (modelLoadState.status !== 'ready' && waited < 30000) {
        await new Promise(r => setTimeout(r, 500));
        waited += 500;
      }

      if (modelLoadState.status !== 'ready' || !globalTranscriber) {
        console.error("[Moonshine] Model not ready");
        onError();
        return;
      }

      if (!isMounted) return;

      const transcriber = globalTranscriber!;

      const resetTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopMicrophone();
          if (onSilenceTimeout) onSilenceTimeout();
        }, 4000);
      };

      transcriber.callbacks.onTranscriptionUpdated = (text: string) => {
        resetTimer();
        if (text) handleTranscription(text, false);
      };
      transcriber.callbacks.onTranscriptionCommitted = (text: string) => {
        resetTimer();
        if (text) handleTranscription(text, true);
      };
      transcriber.callbacks.onError = (e: any) => {
        console.error("[Moonshine] Session error:", e);
        onError();
      };

      activeTranscriberRef.current = transcriber;

      try {
        // 🛑 FIX 2: Start the timer BEFORE awaiting start().
        // If start() hangs because of audio context issues, the timeout will save you
        resetTimer();
        
        await transcriber.start();
        if (isMounted) setIsListening(true);
      } catch (err) {
        console.error("[Moonshine] Mic error:", err);
        onError();
      }
    };

    startRecording();

    return () => {
      isMounted = false;
      stopMicrophone();
    };
  }, [enabled, evaluatingWord, stopMicrophone, handleTranscription, onError, onSilenceTimeout]);

  return { isListening };
}
