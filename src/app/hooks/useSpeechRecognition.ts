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
      try { r.stop(); } catch (e) {}
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

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;

    recognition.onresult = (event: any) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      resultReceivedRef.current = true;
      const results = event.results[0];

      const allTranscripts: string[] = [];
      for (let i = 0; i < results.length; i++) {
        allTranscripts.push(results[i].transcript.trim());
      }
      const primaryTranscript = allTranscripts[0] || "";

      // PATH A: CV / VC Syllable
      if (isSyllableTarget(evaluatingWord)) {
        const phonemeResult = evaluateSyllable(evaluatingWord, allTranscripts);
        const finalTranscript = (phonemeResult === "correct" || phonemeResult === "close")
          ? evaluatingWord.toLowerCase()
          : primaryTranscript;
        onResultRef.current(evaluatingWord, phonemeResult, finalTranscript);
        return;
      }

      // PATH B: Phrase / Sentence (contains a space)
      const targetUpper = evaluatingWord.toUpperCase().replace(/[.,!?]/g, "");
      if (targetUpper.includes(" ")) {
        let matched = false;
        let sentenceBestMatch = "";
        for (let i = 0; i < results.length; i++) {
          const raw = results[i].transcript.trim().toUpperCase().replace(/[.,!?]/g, "");
          const targetWords = targetUpper.split(/\s+/);
          let matchCount = 0;
          targetWords.forEach(tw => { if (raw.includes(tw)) matchCount++; });
          if (matchCount / targetWords.length >= 0.7 || raw.includes(targetUpper)) {
            matched = true;
            sentenceBestMatch = results[i].transcript.trim();
            break;
          }
        }
        onResultRef.current(evaluatingWord, matched ? "correct" : "wrong", sentenceBestMatch || primaryTranscript);
        return;
      }

      // PATH C: Single word
      let bestMatch = "";
      let bestSimilarity = 0;
      let isPerfectMatch = false;
      const wordUpper = evaluatingWord.toUpperCase();

      for (let i = 0; i < results.length; i++) {
        const normalized = normalizeTranscript(results[i].transcript.trim());
        const allowedWords = [wordUpper, ...(HOMOPHONES[wordUpper] || [])];
        const phraseWords = normalized.split(" ");

        if (allowedWords.some(t => normalized === t || phraseWords.includes(t))) {
          bestMatch = evaluatingWord;
          bestSimilarity = 1;
          isPerfectMatch = true;
          break;
        }

        for (const word of phraseWords) {
          const similarity = calculateSimilarity(word, wordUpper);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = word;
          }
        }
      }

      if (!bestMatch) bestMatch = normalizeTranscript(results[0].transcript.trim());

      if (isPerfectMatch || bestSimilarity === 1) {
        onResultRef.current(evaluatingWord, "correct", bestMatch.toLowerCase());
      } else if (bestSimilarity >= 0.5 || matchConsonants(bestMatch, wordUpper)) {
        onResultRef.current(evaluatingWord, "close", bestMatch.toLowerCase());
      } else {
        onResultRef.current(evaluatingWord, "wrong", bestMatch.toLowerCase());
      }
    };

    recognition.onerror = (event: any) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (resultReceivedRef.current) return;
      if (event.error === "no-speech" || event.error === "aborted") {
        onErrorRef.current();
        return;
      }
      console.error("Speech recognition error:", event.error);
      onResultRef.current(evaluatingWord, "wrong", "");
    };

    recognition.onend = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!resultReceivedRef.current && recognitionRef.current === recognition) {
        onErrorRef.current();
      }
    };

    try {
      recognition.start();
      timeoutRef.current = setTimeout(() => {
        console.warn("[Speech] Auto-silence timeout.");
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) {}
        }
        onSilenceTimeoutRef.current();
      }, 5000);
    } catch (error) {
      console.error("Error starting recognition:", error);
      onErrorRef.current();
    }

    return cleanup;
  }, [evaluatingWord, enabled, cleanup]);
}
