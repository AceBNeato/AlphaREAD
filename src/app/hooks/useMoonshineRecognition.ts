import { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore - Moonshine doesn't provide official TS typings yet
import * as Moonshine from "@usefulsensors/moonshine-js";
import { evaluateSyllable } from "../utils/PhonemeEvaluator";

const DEBUG = true;

// Hijack AudioContext creation to globally track instances and bypass minification hiding
const globalAudioContexts: AudioContext[] = [];
const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
if (OriginalAudioContext) {
  window.AudioContext = function (...args: any[]) {
    const ctx = new OriginalAudioContext(...args);
    globalAudioContexts.push(ctx);
    return ctx;
  } as any;
  window.AudioContext.prototype = OriginalAudioContext.prototype;
}

// 🛑 FIX 3: Global User Gesture Listener
// Chrome drops the "user gesture" token by the time React's useEffect runs.
// We MUST resume the AudioContext synchronously on the actual click event.
if (typeof window !== 'undefined') {
  const resumeAudio = () => {
    globalAudioContexts.forEach(ctx => {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
      }
    });
  };
  window.addEventListener('click', resumeAudio, { capture: true, passive: true });
  window.addEventListener('touchstart', resumeAudio, { capture: true, passive: true });
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
  const activeTranscriberRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // 🛑 FIX 5: Prevent infinite useEffect loops from inline function props
  const callbacksRef = useRef({ onResult, onError, onSilenceTimeout });
  useEffect(() => {
    callbacksRef.current = { onResult, onError, onSilenceTimeout };
  }, [onResult, onError, onSilenceTimeout]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const stopMicrophone = useCallback(() => {
    if (DEBUG) console.log(`[Moonshine Debug] 🛑 stopMicrophone called`);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (activeTranscriberRef.current) {
      // 🛑 FIX 4: Destroy the media stream manually!
      // Moonshine's internal stop() only pauses the VAD but leaves the mic stream active.
      const stream = (activeTranscriberRef.current as any).mediaStream;
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((track: MediaStreamTrack) => {
          track.stop();
          if (DEBUG) console.log(`[Moonshine Debug] 🎙️ MediaStreamTrack stopped: ${track.label}`);
        });
      }
      activeTranscriberRef.current.stop();
      activeTranscriberRef.current = null;
    }
    if (isMountedRef.current) setIsListening(false);
  }, []);

  const handleTranscription = useCallback((rawPhones: string, isFinal: boolean = true) => {
    if (!evaluatingWord) return;
    if (!rawPhones && !isFinal) return; // Ignore empty interim updates, but MUST process empty finals!

    const cleanedPhones = rawPhones.replace(/\[|\]|\/|\|/g, '').trim();
    const trimmedTarget = evaluatingWord.trim().toLowerCase();
    const isSingleLetter = trimmedTarget.length === 1 && /[a-z]/.test(trimmedTarget);
    const isMagicE = trimmedTarget.length === 3 && /^[aeiou]_e$/.test(trimmedTarget);

    if (DEBUG) console.log(`[Moonshine Debug] 📝 handleTranscription | target: "${evaluatingWord}" | raw: "${rawPhones}" | isFinal: ${isFinal}`);

    let phonemeResult: "correct" | "close" | "wrong" = "wrong";

    if (isSingleLetter || isMagicE) {
      const letterUpper = trimmedTarget.charAt(0).toUpperCase();
      const allowedWords = [
        letterUpper,
        `LETTER ${letterUpper}`,
        ...(HOMOPHONES[letterUpper] || [])
      ].map(w => w.toUpperCase());

      const phraseWords = cleanedPhones.toUpperCase().split(/\s+/);
      if (DEBUG) console.log(`[Moonshine Debug] 🔤 Letter mode | cleaned: "${cleanedPhones}" | allowed: [${allowedWords.join(', ')}]`);
      if (allowedWords.some(t => cleanedPhones.toUpperCase() === t || phraseWords.includes(t))) {
        phonemeResult = "correct";
      }
    } else {
      if (DEBUG) console.log(`[Moonshine Debug] 🔊 Syllable mode | cleaned: "${cleanedPhones}" | target: "${evaluatingWord}"`);
      phonemeResult = evaluateSyllable(evaluatingWord, [cleanedPhones]);
    }

    const finalTranscript = (phonemeResult === "correct" || phonemeResult === "close")
      ? evaluatingWord.toLowerCase()
      : cleanedPhones || "...";

    if (phonemeResult === "correct" || phonemeResult === "close") {
      if (DEBUG) console.log(`[Moonshine Debug] ✅ CORRECT! Stopping mic. target: "${evaluatingWord}" | heard: "${cleanedPhones}"`);
      stopMicrophone(); // auto stop if they got it right
    } else if (isFinal) {
      if (DEBUG) console.log(`[Moonshine Debug] ❌ WRONG (final). target: "${evaluatingWord}" | heard: "${cleanedPhones}"`);
    } else {
      if (DEBUG) console.log(`[Moonshine Debug] ⏳ interim wrong (still listening). target: "${evaluatingWord}" | heard: "${cleanedPhones}"`);
    }

    // Only report "wrong" if the transcript is finalized. Otherwise report null to just update the UI text.
    const reportedStatus = (phonemeResult === "wrong" && !isFinal) ? null : phonemeResult;
    if (DEBUG) console.log(`[Moonshine Debug] 📤 Reporting to component | status: ${reportedStatus} | transcript: "${finalTranscript}"`);
    callbacksRef.current.onResult(evaluatingWord, reportedStatus, finalTranscript);
  }, [evaluatingWord, stopMicrophone]);

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
      if (DEBUG) console.log(`\n[Moonshine Debug] 🎤 startRecording called for "${evaluatingWord}"`);

      if (!globalTranscriber && !isInitializing) {
        if (DEBUG) console.log(`[Moonshine Debug] ⏳ Model not loaded yet — triggering preload...`);
        await preloadMoonshineModel();
      }

      let waited = 0;
      while (modelLoadState.status !== 'ready' && waited < 30000) {
        await new Promise(r => setTimeout(r, 500));
        waited += 500;
        if (DEBUG && waited % 2000 === 0) console.log(`[Moonshine Debug] ⏳ Waiting for model... (${waited}ms elapsed, status: ${modelLoadState.status})`);
      }

      if (modelLoadState.status !== 'ready' || !globalTranscriber) {
        console.error(`[Moonshine Debug] ❌ Model not ready after ${waited}ms. Status: ${modelLoadState.status}`);
        callbacksRef.current.onError();
        return;
      }

      if (!isMounted) {
        if (DEBUG) console.log(`[Moonshine Debug] ⚠️ Component unmounted before mic could start. Aborting.`);
        return;
      }

      if (DEBUG) console.log(`[Moonshine Debug] ✅ Model ready. Attaching mic for "${evaluatingWord}"...`);

      const transcriber = globalTranscriber!;

      const resetTimer = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (DEBUG) console.log(`[Moonshine Debug] ⏱️ 4s silence timeout reached for "${evaluatingWord}". Stopping mic.`);
          stopMicrophone();
          if (callbacksRef.current.onSilenceTimeout) callbacksRef.current.onSilenceTimeout();
        }, 4000);
      };

      transcriber.callbacks.onTranscriptionUpdated = (text: string) => {
        if (DEBUG) console.log(`[Moonshine Debug] 🔄 onTranscriptionUpdated | target: "${evaluatingWord}" | heard: "${text}"`);
        resetTimer();
        if (text) handleTranscription(text, false);
      };
      transcriber.callbacks.onTranscriptionCommitted = (text: string) => {
        if (DEBUG) console.log(`[Moonshine Debug] 🏁 onTranscriptionCommitted | target: "${evaluatingWord}" | heard: "${text || '(empty)'}"`);
        resetTimer();
        // Even if text is empty, it means the speech chunk ended. We MUST evaluate it!
        handleTranscription(text || "", true);
      };
      transcriber.callbacks.onError = (e: any) => {
        console.error(`[Moonshine Debug] ❌ Session error for "${evaluatingWord}":`, e);
        callbacksRef.current.onError();
      };

      activeTranscriberRef.current = transcriber;

      try {
        // 🛑 FIX 2: Start the timer BEFORE awaiting start().
        // If start() hangs because of audio context issues, the timeout will save you
        resetTimer();
        if (DEBUG) console.log(`[Moonshine Debug] 🚀 Calling transcriber.start() for "${evaluatingWord}"...`);

        await transcriber.start();
        if (isMounted) {
          setIsListening(true);
          if (DEBUG) console.log(`[Moonshine Debug] 🎙️ Mic is LIVE and listening for "${evaluatingWord}"`);
        }
      } catch (err) {
        console.error(`[Moonshine Debug] ❌ Mic start() threw an error for "${evaluatingWord}":`, err);
        callbacksRef.current.onError();
      }
    };

    startRecording();

    return () => {
      isMounted = false;
      stopMicrophone();
    };
  }, [enabled, evaluatingWord, stopMicrophone, handleTranscription]);

  return { isListening };
}
