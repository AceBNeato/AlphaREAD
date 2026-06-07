import { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore - Moonshine doesn't provide official TS typings yet
import * as Moonshine from "@usefulsensors/moonshine-js";
import { evaluateSyllable } from "../utils/PhonemeEvaluator";

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
    // Force load the model without starting the mic
    await (globalTranscriber as any).load();
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

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const stopMicrophone = useCallback(() => {
    if (activeTranscriberRef.current) {
      activeTranscriberRef.current.stop();
      activeTranscriberRef.current = null;
    }
    if (isMountedRef.current) setIsListening(false);
  }, []);

  const handleTranscription = useCallback((rawPhones: string) => {
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

    onResult(evaluatingWord, phonemeResult, finalTranscript);
  }, [evaluatingWord, onResult, stopMicrophone]);

  useEffect(() => {
    if (!enabled || !evaluatingWord) {
      stopMicrophone();
      return;
    }

    let isMounted = true;

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
      
      transcriber.callbacks.onTranscriptionUpdated = (text: string) => {
        if (text) handleTranscription(text);
      };
      transcriber.callbacks.onTranscriptionCommitted = (text: string) => {
        if (text) handleTranscription(text);
      };
      transcriber.callbacks.onError = (e: any) => {
        console.error("[Moonshine] Session error:", e);
        onError();
      };

      activeTranscriberRef.current = transcriber;

      try {
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
  }, [enabled, evaluatingWord, stopMicrophone, handleTranscription, onError]);

  return { isListening };
}
