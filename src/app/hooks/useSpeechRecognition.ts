import { useEffect, useRef, useState, useCallback } from "react";
import { evaluateSyllable, isSyllableTarget, PhonemeResult } from "../utils/PhonemeEvaluator";

// Logs only in development — automatically silent in production builds
const DEBUG = typeof process !== 'undefined'
  ? process.env.NODE_ENV !== 'production'
  : (import.meta as any).env?.DEV ?? false;

const DIGIT_MAP: Record<string, string> = {
  "0": "ZERO", "1": "ONE", "2": "TWO", "3": "THREE", "4": "FOUR",
  "5": "FIVE", "6": "SIX", "7": "SEVEN", "8": "EIGHT", "9": "NINE"
};

export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
}

export function normalizeTranscript(text: string): string {
  return text
    .toUpperCase()
    .replace(/[.,!?]/g, "")
    .trim()
    .split(/\s+/)
    .map(w => DIGIT_MAP[w] || w)
    .join(" ");
}

export function matchConsonants(word1: string, word2: string): boolean {
  const getConsonants = (w: string) => w.replace(/[AEIOU]/g, "");
  return getConsonants(word1) === getConsonants(word2);
}

export type EvaluationFeedback = "correct" | "close" | "wrong" | null;

interface UseSpeechRecognitionProps {
  evaluatingWord: string | null;
  enabled?: boolean;
  /** When true: continuous=false, interimResults=false — browser auto-stops after one phrase.
   *  Best for single letter/word tasks (Lesson 4 Letter Names, Lesson 5 Long Vowels). */
  singleShot?: boolean;
  onResult: (word: string, status: EvaluationFeedback, transcript: string) => void;
  onSilenceTimeout: () => void;
  onError: () => void;
}

// ... (HOMOPHONES block remains) ...
const HOMOPHONES: Record<string, string[]> = {
  // Alphabet phonetic homophones
  // Vowels — expanded to cover common Web Speech API phonetic outputs for single-letter sounds
  "A": ["a", "ay", "hey", "eight", "ah", "eh", "aye", "ha"],
  "E": ["e", "ee", "ih", "eh", "ea"],
  "I": ["i", "eye", "hi", "ai", "aye", "aye"],
  "O": ["o", "oh", "ow", "oe"],
  "U": ["u", "you", "yu", "uh", "yoo"],
  // Consonants
  "B": ["b", "bee", "be", "bi"],
  "C": ["c", "see", "sea", "si"],
  "D": ["d", "dee", "the", "di"],
  "F": ["f", "eff", "if", "half", "ef"],
  "G": ["g", "gee", "jee", "ji"],
  "H": ["h", "aitch", "age", "each", "haitch"],
  "J": ["j", "jay", "jai"],
  "K": ["k", "kay", "okay", "kei"],
  "L": ["l", "ell", "el"],
  "M": ["m", "em", "am", "him"],
  "N": ["n", "en", "an", "and", "in"],
  "P": ["p", "pee", "pea", "pi"],
  "Q": ["q", "cue", "queue", "kyu"],
  "R": ["r", "are", "our", "ar"],
  "S": ["s", "ess", "yes", "is", "es"],
  "T": ["t", "tee", "tea", "ti"],
  "V": ["v", "vee", "vi"],
  "W": ["w", "double u", "double you", "dub"],
  "X": ["x", "ex", "axe", "text", "eks"],
  "Y": ["y", "why", "wye", "wi"],
  "Z": ["z", "zee", "zed", "ze"],

  // Common CV/VC homophones
  "PI": ["pie", "pee", "p"],
  "ME": ["me", "mee", "m"],
  "BE": ["be", "bee", "b"],
  "TO": ["to", "too", "two", "t"],
  "DO": ["do", "doo", "d"],
  "WE": ["we", "wee", "w"],
  "HE": ["he", "hee", "h"],

  // CVC homophones
  "BAT": ["bad", "that", "but"],
  "CAT": ["cut", "cap", "can"],
  "DOG": ["dig", "doc", "dot"],
  "PIG": ["big", "pick", "peg"],
  "SUN": ["son", "some"],
  "RUN": ["one", "won", "ran"],
  "HOP": ["hope", "hot", "pop"],
  "BUG": ["bag", "pug", "bud"],
};

export function useSpeechRecognition({ evaluatingWord, enabled = true, singleShot = false, onResult, onSilenceTimeout, onError }: UseSpeechRecognitionProps) {
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resultReceivedRef = useRef(false);

  const onResultRef = useRef(onResult);
  const onSilenceTimeoutRef = useRef(onSilenceTimeout);
  const onErrorRef = useRef(onError);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onSilenceTimeoutRef.current = onSilenceTimeout; }, [onSilenceTimeout]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !evaluatingWord || typeof window === "undefined") {
      cleanup();
      return;
    }

    if (DEBUG) console.log(`\n[AlphabetGO Debug] 🎤 Starting SpeechRecognition for target: "${evaluatingWord}"`);

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      if (DEBUG) console.warn("[AlphabetGO Debug] ❌ SpeechRecognition API not supported in this browser.");
      cleanup();
      return;
    }

    resultReceivedRef.current = false;
    let latestTranscript = ""; // Track the latest thing heard for the timeout fallback
    let hasMatched = false; // Prevent race conditions while stopping
    let isActive = true; // Track if this specific effect is still active

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = !singleShot;      // singleShot: stops after one phrase
    recognition.interimResults = !singleShot;  // singleShot: only final results
    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;

    recognition.onresult = (event: any) => {
      if (!isActive || hasMatched) return; // Prevent overlapping events while stopping or after cleanup
      resultReceivedRef.current = true;

      let foundCorrect = false;
      let foundClose = false;
      let bestStatus: "correct" | "close" | "wrong" = "wrong";
      let bestTranscript = "";

      if (DEBUG) console.log(`[AlphabetGO Debug] 🗣️ Result Event Received. Evaluating against: "${evaluatingWord}"`);

      for (let r = 0; r < event.results.length; r++) {
        const results = event.results[r];
        const allTranscripts: string[] = [];
        for (let i = 0; i < results.length; i++) {
          allTranscripts.push(results[i].transcript.trim());
        }
        const primaryTranscript = allTranscripts[0] || "";
        latestTranscript = primaryTranscript; // Update fallback transcript

        if (DEBUG) console.log(`[AlphabetGO Debug] Alternatives [Index ${r}]:`, allTranscripts);

        let status: "correct" | "close" | "wrong" = "wrong";
        let matchStr = primaryTranscript;

        const trimmedWord = evaluatingWord.trim().toLowerCase();

        // NEW: Check if it's a single letter OR a magic E pattern (e.g., "a_e", "i_e")
        const isSingleLetter = trimmedWord.length === 1 && /[a-z]/.test(trimmedWord);
        const isMagicE = trimmedWord.length === 3 && /^[aeiou]_e$/.test(trimmedWord);

        if (isSingleLetter || isMagicE) {
          // If it's "a_e", grab just the "A". If it's a single letter, grab it.
          const letterUpper = trimmedWord.charAt(0).toUpperCase();
          let matched = false;

          for (let i = 0; i < results.length; i++) {
            const normalized = normalizeTranscript(results[i].transcript);

            // Look up the homophones for the base letter (e.g., "A")
            const allowedWords = [
              letterUpper,
              `LETTER ${letterUpper}`,
              ...(HOMOPHONES[letterUpper] || [])
            ].map(w => w.toUpperCase());
            const phraseWords = normalized.split(" ");

            if (allowedWords.some(t => normalized === t || phraseWords.includes(t))) {
              matched = true;
              matchStr = letterUpper.toLowerCase();
              break;
            }
          }
          status = matched ? "correct" : "wrong";
        }
        // PATH A: CV / VC Syllable
        else if (isSyllableTarget(evaluatingWord)) {
          const phonemeResult = evaluateSyllable(evaluatingWord, allTranscripts);
          status = phonemeResult;
          matchStr = (status === "correct" || status === "close") ? evaluatingWord.toLowerCase() : primaryTranscript;
        }
        // PATH B: Phrase / Sentence
        else if (evaluatingWord.toUpperCase().replace(/[.,!?]/g, "").trim().includes(" ")) {
          const targetUpper = evaluatingWord.toUpperCase().replace(/[.,!?]/g, "").trim();
          const targetWords = targetUpper.split(/\s+/);

          let matched = false;
          let closeMatched = false;

          for (let i = 0; i < results.length; i++) {
            const raw = results[i].transcript.trim().toUpperCase().replace(/[.,!?]/g, "");
            const rawWords = raw.split(/\s+/);

            // Strict subsequence match: all words in correct order
            let targetIdx = 0;
            for (let j = 0; j < rawWords.length; j++) {
              if (rawWords[j] === targetWords[targetIdx]) {
                targetIdx++;
                if (targetIdx === targetWords.length) break;
              }
            }

            if (targetIdx === targetWords.length || raw.includes(targetUpper)) {
              matched = true;
              matchStr = results[i].transcript.trim();
              break;
            }

            // Close match check (for feedback purposes)
            let matchCount = 0;
            const availableRawWords = [...rawWords];
            targetWords.forEach(tw => {
              const idx = availableRawWords.indexOf(tw);
              if (idx !== -1) {
                matchCount++;
                availableRawWords.splice(idx, 1);
              }
            });

            const matchRatio = matchCount / targetWords.length;
            if (matchRatio >= 0.5) {
              closeMatched = true;
              matchStr = results[i].transcript.trim();
            }
          }
          status = matched ? "correct" : closeMatched ? "close" : "wrong";
        }
        // PATH C: Single Word
        else {
          let wordMatch = "";
          let bestSimilarity = 0;
          let isPerfectMatch = false;
          const wordUpper = evaluatingWord.toUpperCase();

          for (let i = 0; i < results.length; i++) {
            const normalized = normalizeTranscript(results[i].transcript.trim());
            const allowedWords = [wordUpper, ...(HOMOPHONES[wordUpper] || [])].map(w => w.toUpperCase());
            const phraseWords = normalized.split(" ");

            if (allowedWords.some(t => normalized === t || phraseWords.includes(t))) {
              wordMatch = evaluatingWord;
              bestSimilarity = 1;
              isPerfectMatch = true;
              break;
            }

            for (const w of phraseWords) {
              const similarity = calculateSimilarity(w, wordUpper);
              if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                wordMatch = w;
              }
            }
          }
          if (!wordMatch) wordMatch = normalizeTranscript(results[0].transcript.trim());

          if (isPerfectMatch || bestSimilarity === 1) {
            status = "correct"; matchStr = wordMatch.toLowerCase();
          } else if (bestSimilarity >= 0.5 || matchConsonants(wordMatch, wordUpper)) {
            status = "close"; matchStr = wordMatch.toLowerCase();
          } else {
            status = "wrong"; matchStr = wordMatch.toLowerCase();
          }
        }

        if (DEBUG) console.log(`[AlphabetGO Debug] Evaluated primary "${primaryTranscript}" -> Status: ${status}, matchStr: "${matchStr}"`);

        if (status === "correct") {
          foundCorrect = true;
          bestStatus = "correct";
          bestTranscript = matchStr;
          break; // Stop evaluating, we found a perfect match!
        } else if (status === "close") {
          foundClose = true;
          bestStatus = "close";
          bestTranscript = matchStr;
        }
      }

      // If we found a success, trigger immediately and stop the mic!
      if (foundCorrect || (foundClose && event.results[event.results.length - 1].isFinal)) {
        hasMatched = true; // Block future onresult events
        if (DEBUG) console.log(`[AlphabetGO Debug] ✅ Match successful! Best Status: ${bestStatus}, Best Transcript: "${bestTranscript}"`);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) { }
        }
        onResultRef.current(evaluatingWord, bestStatus, bestTranscript);
      } else {
        // Emit interim transcript so the UI can display "Heard: ..." or "Listening..."
        if (DEBUG) console.log(`[AlphabetGO Debug] ⏳ Interim Match failed or waiting for final... Best Status: ${bestStatus}, Primary Transcript: "${latestTranscript}"`);
        onResultRef.current(evaluatingWord, null, latestTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      if (!isActive || hasMatched) return; // Prevent overlapping events while stopping
      // Ignore no-speech errors during continuous listening
      if (event.error === "no-speech") return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (event.error === "aborted") {
        if (DEBUG) console.log(`[AlphabetGO Debug] ⚠️ Recognition aborted for "${evaluatingWord}".`);
        onErrorRef.current();
        return;
      }
      if (DEBUG) console.error("[AlphabetGO Debug] ❌ Speech recognition error:", event.error);
      hasMatched = true;
      onResultRef.current(evaluatingWord, "wrong", latestTranscript);
    };

    recognition.onend = () => {
      // In singleShot mode the browser fires onend after the phrase ends.
      // If we haven't matched yet and the timeout hasn't fired, treat it as silence.
      if (singleShot && isActive && !hasMatched) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        hasMatched = true;
        if (resultReceivedRef.current && latestTranscript) {
          if (DEBUG) console.log(`[AlphabetGO Debug] 🏁 singleShot onend — forcing "wrong" with: "${latestTranscript}"`);
          onResultRef.current(evaluatingWord, "wrong", latestTranscript);
        } else {
          if (DEBUG) console.log(`[AlphabetGO Debug] 🤫 singleShot onend — no speech, silence timeout.`);
          onSilenceTimeoutRef.current();
        }
      }
    };

    // In singleShot mode, add a 200ms warm-up delay before starting recognition.
    // The Web Speech API's audio pipeline needs ~100-200ms to fully initialize.
    // Without this, very short sounds like a single letter name ("A", "B") said
    // immediately after tapping the mic get clipped and are never captured.
    let startupTimerId: NodeJS.Timeout | null = null;

    const doStart = () => {
      if (!isActive) return;
      try {
        recognition.start();

        const isPhrase = evaluatingWord.toUpperCase().replace(/[.,!?]/g, "").trim().includes(" ");
        const timeoutDuration = isPhrase ? 10000 : 5000;

        timeoutRef.current = setTimeout(() => {
          if (!isActive || hasMatched) return;
          if (DEBUG) console.log(`[AlphabetGO Debug] ⏱️ Timeout reached (${timeoutDuration}ms) for "${evaluatingWord}". Evaluating final state...`);
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
          }
          hasMatched = true;
          if (resultReceivedRef.current && latestTranscript) {
            if (DEBUG) console.log(`[AlphabetGO Debug] 👎 Forcing "wrong" feedback with transcript: "${latestTranscript}"`);
            onResultRef.current(evaluatingWord, "wrong", latestTranscript);
          } else {
            if (DEBUG) console.log(`[AlphabetGO Debug] 🤫 No speech detected (silence timeout).`);
            onSilenceTimeoutRef.current();
          }
        }, timeoutDuration);
      } catch (error) {
        if (DEBUG) console.error("[AlphabetGO Debug] ❌ Error starting recognition:", error);
        onErrorRef.current();
      }
    };

    if (singleShot) {
      // 200ms delay — lets the browser open the mic fully before the student speaks
      startupTimerId = setTimeout(doStart, 200);
    } else {
      doStart();
    }

    return () => {
      isActive = false;
      if (startupTimerId) clearTimeout(startupTimerId);
      cleanup();
    };
  }, [evaluatingWord, enabled, cleanup]);
}
