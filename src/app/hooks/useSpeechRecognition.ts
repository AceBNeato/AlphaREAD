import { useEffect, useRef, useState, useCallback } from "react";
import { evaluateSyllable, isSyllableTarget, PhonemeResult } from "../utils/PhonemeEvaluator";
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
  onResult: (word: string, status: EvaluationFeedback, transcript: string) => void;
  onSilenceTimeout: () => void;
  onError: () => void;
}

// ... (HOMOPHONES block remains) ...
const HOMOPHONES: Record<string, string[]> = {
  // Alphabet phonetic homophones
  "A": ["a", "ay", "hey", "eight"],
  "B": ["b", "bee", "be"],
  "C": ["c", "see", "sea"],
  "D": ["d", "dee", "the"],
  "E": ["e", "ee"],
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
  "U": ["u", "you"],
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

export function useSpeechRecognition({ evaluatingWord, enabled = true, onResult, onSilenceTimeout, onError }: UseSpeechRecognitionProps) {
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

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      cleanup();
      return;
    }

    resultReceivedRef.current = false;
    let latestTranscript = ""; // Track the latest thing heard for the timeout fallback

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = true; // Keep mic open!
    recognition.interimResults = true; // Evaluate as they speak!
    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;

    recognition.onresult = (event: any) => {
      resultReceivedRef.current = true;

      let foundCorrect = false;
      let foundClose = false;
      let bestStatus: "correct" | "close" | "wrong" = "wrong";
      let bestTranscript = "";

      for (let r = 0; r < event.results.length; r++) {
        const results = event.results[r];
        const allTranscripts: string[] = [];
        for (let i = 0; i < results.length; i++) {
          allTranscripts.push(results[i].transcript.trim());
        }
        const primaryTranscript = allTranscripts[0] || "";
        latestTranscript = primaryTranscript; // Update fallback transcript

        let status: "correct" | "close" | "wrong" = "wrong";
        let matchStr = primaryTranscript;

        // NEW PATH: Single Letter ("Say the Name")
        const isSingleLetter = evaluatingWord.trim().length === 1 && /[A-Za-z]/.test(evaluatingWord.trim());

        if (isSingleLetter) {
          const letterUpper = evaluatingWord.toUpperCase().trim();
          let matched = false;

          for (let i = 0; i < results.length; i++) {
            const normalized = normalizeTranscript(results[i].transcript);
            // Dynamically add "LETTER X" fallback to handle Google API auto-corrections!
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
          // Letters are either right or wrong—no "close" state.
          status = matched ? "correct" : "wrong";
        }
        // PATH A: CV / VC Syllable
        else if (isSyllableTarget(evaluatingWord)) {
          const phonemeResult = evaluateSyllable(evaluatingWord, allTranscripts);
          status = phonemeResult;
          matchStr = (status === "correct" || status === "close") ? evaluatingWord.toLowerCase() : primaryTranscript;
        }
        // PATH B: Phrase / Sentence
        else if (evaluatingWord.toUpperCase().replace(/[.,!?]/g, "").includes(" ")) {
          const targetUpper = evaluatingWord.toUpperCase().replace(/[.,!?]/g, "");
          let matched = false;
          for (let i = 0; i < results.length; i++) {
            const raw = results[i].transcript.trim().toUpperCase().replace(/[.,!?]/g, "");
            const targetWords = targetUpper.split(/\s+/);
            let matchCount = 0;
            targetWords.forEach(tw => { if (raw.includes(tw)) matchCount++; });
            if (matchCount / targetWords.length >= 0.7 || raw.includes(targetUpper)) {
              matched = true;
              matchStr = results[i].transcript.trim();
              break;
            }
          }
          status = matched ? "correct" : "wrong";
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
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) { }
        }
        onResultRef.current(evaluatingWord, bestStatus, bestTranscript);
      }
      // If wrong, do NOTHING. Let it keep listening until the 5s timeout!
    };

    recognition.onerror = (event: any) => {
      // Ignore no-speech errors during continuous listening
      if (event.error === "no-speech") return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (event.error === "aborted") {
        onErrorRef.current();
        return;
      }
      console.error("Speech recognition error:", event.error);
      onResultRef.current(evaluatingWord, "wrong", latestTranscript);
    };

    recognition.onend = () => {
      // If it ends naturally before timeout, don't trigger error.
      // The 5s timeout fallback handles the failure gracefully.
    };

    try {
      recognition.start();
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) { }
        }
        // If 5 seconds pass and we never got a correct match, THEN we fail them
        if (resultReceivedRef.current && latestTranscript) {
          onResultRef.current(evaluatingWord, "wrong", latestTranscript);
        } else {
          onSilenceTimeoutRef.current();
        }
      }, 5000);
    } catch (error) {
      console.error("Error starting recognition:", error);
      onErrorRef.current();
    }

    return cleanup;
  }, [evaluatingWord, enabled, cleanup]);
}
