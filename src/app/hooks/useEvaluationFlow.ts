import { useState, useCallback, useRef, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { playSound, stopExclusiveAudio } from '../utils/soundEffects';
import { stopTTS } from '../utils/tts';
import { useSpeechRecognition, normalizeFilipino, normalizeTranscript, calculateSimilarity, matchConsonants, EvaluationFeedback } from './useSpeechRecognition';
import { useWhisperRecognition, WhisperStatus } from './useWhisperRecognition';
import { evaluateSyllable, isSyllableTarget } from '../utils/PhonemeEvaluator';

export interface UseEvaluationFlowProps {
  words: string[];
  singleShot?: boolean;
  /** BCP-47 language tag for SpeechRecognition. Defaults to "en-US". */
  lang?: string;
  isFilipinoDictionary?: boolean;
  onAllCompleted?: () => void;
  onWordCompleted?: (word: string, newCompleted: Set<string>) => void;
  isCorrectOverride?: (word: string, status: "correct" | "close" | "wrong" | null, transcript: string) => boolean;
}




/**
 * Evaluate a Whisper transcript against a target Filipino word/sentence.
 * This mirrors the evaluation logic in useSpeechRecognition but works with
 * Whisper's output (which is already in Filipino, not English phonetics).
 */
export function evaluateWhisperTranscript(
  evaluatingWord: string,
  whisperText: string
): { status: EvaluationFeedback; transcript: string; matchedWordCount: number } {
  const normFn = normalizeFilipino;
  const whisperNorm = normFn(whisperText);
  const targetNorm = normFn(evaluatingWord);

  // Single word evaluation
  if (!targetNorm.includes(' ')) {
    const whisperWords = whisperNorm.split(/\s+/);
    
    // Direct match
    if (whisperNorm === targetNorm || whisperWords.includes(targetNorm)) {
      return { status: 'correct', transcript: whisperText, matchedWordCount: 1 };
    }
    
    // Similarity check
    let bestSim = 0;
    for (const w of whisperWords) {
      const sim = calculateSimilarity(w, targetNorm);
      if (sim > bestSim) bestSim = sim;
    }

    if (bestSim >= 0.75) {
      return { status: 'correct', transcript: whisperText, matchedWordCount: 1 };
    } else if (bestSim >= 0.5) {
      return { status: 'close', transcript: whisperText, matchedWordCount: 1 };
    }

    return { status: 'wrong', transcript: whisperText, matchedWordCount: 0 };
  }

  // Sentence / phrase evaluation
  const targetWords = targetNorm.split(/\s+/);
  const whisperWords = whisperNorm.split(/\s+/);

  let sequentialMatchCount = 0;
  let rawIdx = 0;

  while (sequentialMatchCount < targetWords.length && rawIdx < whisperWords.length) {
    const expected = targetWords[sequentialMatchCount];
    const spoken = whisperWords[rawIdx];

    if (expected === spoken || calculateSimilarity(expected, spoken) >= 0.5) {
      sequentialMatchCount++;
    }
    rawIdx++;
  }

  if (sequentialMatchCount === targetWords.length) {
    return { status: 'correct', transcript: whisperText, matchedWordCount: sequentialMatchCount };
  }
  return { status: 'wrong', transcript: whisperText, matchedWordCount: sequentialMatchCount };
}

export function useEvaluationFlow({ words, singleShot, lang, isFilipinoDictionary, onAllCompleted, onWordCompleted, isCorrectOverride }: UseEvaluationFlowProps) {
  const [evaluatingWord, setEvaluatingWord] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState<Record<string, "correct" | "close" | "wrong" | null>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [matchCountMap, setMatchCountMap] = useState<Record<string, number>>({});
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [isMicResetting, setIsMicResetting] = useState(false);
  const [isMicSleeping, setIsMicSleeping] = useState(false);
  const [processingWord, setProcessingWord] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [whisperProcessing, setWhisperProcessing] = useState(false);

  const evaluationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Determine if we should use Whisper ──────────────────────────────────────
  // Whisper is used ONLY when: offline + Filipino language
  const isFilipino = isFilipinoDictionary ?? (lang === "fil" || lang === "tl");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Initial check
    Network.getStatus().then(status => {
      setIsOnline(status.connected);
    });

    // Listen for changes
    const listener = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected);
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  const useWhisperMode = isFilipino && !isOnline;

  const clearEvalTimeout = useCallback(() => {
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearEvalTimeout();
  }, [clearEvalTimeout]);

  const safeSetEvaluatingWordNull = useCallback(() => {
    stopExclusiveAudio();
    stopTTS();
    clearEvalTimeout();
    setShowConfetti(false);
    setEvaluatingWord(null);
    setIsMicSleeping(false);
    setWhisperProcessing(false);
    setIsMicResetting(true);
    setTimeout(() => {
      setIsMicResetting(false);
    }, 150);

    if (completedWords.size >= words.length) {
      playSound("complete", 0.5);
      if (onAllCompleted) onAllCompleted();
    }
  }, [clearEvalTimeout, completedWords.size, words.length, onAllCompleted]);

  const handleResult = useCallback((word: string, status: "correct" | "close" | "wrong" | null, transcript: string, matchedWordCount?: number) => {
    setTranscripts(prev => ({ ...prev, [word]: transcript }));
    if (matchedWordCount !== undefined) {
      setMatchCountMap(prev => ({ ...prev, [word]: matchedWordCount }));
    }
    setEvalFeedback(prev => ({ ...prev, [word]: status }));
    clearEvalTimeout();

    const isCorrect = isCorrectOverride
      ? isCorrectOverride(word, status, transcript)
      : (status === "correct" || status === "close");

    if (isCorrect) {
      playSound("correct", 0.4);
      setShowConfetti(true);
      const newCompleted = new Set(completedWords);
      newCompleted.add(word);
      setCompletedWords(newCompleted);
      setProcessingWord(null);

      if (onWordCompleted) onWordCompleted(word, newCompleted);

      evaluationTimeoutRef.current = setTimeout(() => {
        setShowConfetti(false);
        if (newCompleted.size >= words.length) {
          playSound("complete", 0.5);
          if (onAllCompleted) onAllCompleted();
        }
      }, 2000);
    } else if (status === "wrong") {
      playSound("wrong", 0.35);
      setProcessingWord(null);
      evaluationTimeoutRef.current = setTimeout(() => {
        setEvalFeedback(prev => ({ ...prev, [word]: null }));
        safeSetEvaluatingWordNull();
      }, 2500);
    }
  }, [completedWords, words, clearEvalTimeout, safeSetEvaluatingWordNull, onAllCompleted, onWordCompleted]);

  const handleError = useCallback(() => {
    if (evaluatingWord) safeSetEvaluatingWordNull();
  }, [evaluatingWord, safeSetEvaluatingWordNull]);

  const handleSilence = useCallback((wordToUse?: string) => {
    const targetWord = wordToUse || evaluatingWord;
    if (!targetWord) return;
    playSound("wrong", 0.35);
    setEvalFeedback(prev => ({ ...prev, [targetWord]: "wrong" }));
    setProcessingWord(null);
    clearEvalTimeout();
    evaluationTimeoutRef.current = setTimeout(() => {
      setEvalFeedback(prev => ({ ...prev, [targetWord]: null }));
      safeSetEvaluatingWordNull();
    }, 1500);
  }, [evaluatingWord, clearEvalTimeout, safeSetEvaluatingWordNull]);

  // ─── Web Speech API path (English + Online Filipino) ─────────────────────────
  useSpeechRecognition({
    evaluatingWord: useWhisperMode ? null : evaluatingWord, // Disable when Whisper is active
    enabled: !useWhisperMode && !!evaluatingWord,
    singleShot,
    lang: navigator.onLine && (lang === "fil" || lang === "tl") ? "fil-PH" : (lang === "fil" || lang === "tl" ? "en-US" : lang),
    isFilipinoDictionary: isFilipinoDictionary ?? (lang === "fil" || lang === "tl"),
    refreshTrigger,
    onResult: handleResult,
    onError: handleError,
    onEngineStop: () => setIsMicSleeping(true),
    onSilenceTimeout: handleSilence
  });

  // ─── Whisper path (Offline Filipino) ─────────────────────────────────────────
  const handleWhisperResult = useCallback((transcript: string) => {
    if (!evaluatingWord) return;
    setWhisperProcessing(false);

    // Evaluate the Whisper transcript against the target word
    const { status, transcript: matchTranscript, matchedWordCount } = evaluateWhisperTranscript(
      evaluatingWord,
      transcript
    );

    handleResult(evaluatingWord, status, matchTranscript, matchedWordCount);
  }, [evaluatingWord, handleResult]);

  const handleWhisperError = useCallback((message: string) => {
    console.warn('[AlphabetGO] Whisper error:', message);
    alert('AI Error: ' + message);
    setWhisperProcessing(false);
    handleError();
  }, [handleError]);

  const { status: whisperStatus, loadProgress: whisperLoadProgress, preloadModel, stopRecording: stopWhisperRecording } = useWhisperRecognition({
    evaluatingWord: useWhisperMode ? evaluatingWord : null, // Only active in Whisper mode
    enabled: useWhisperMode && !!evaluatingWord,
    onResult: handleWhisperResult,
    onError: handleWhisperError,
    maxDuration: 15000, // Allow longer for sentences
    silenceTimeout: 2500, // Slightly longer silence threshold for Filipino
    preload: useWhisperMode, // Warm up the model as soon as offline Filipino mode is active
  });

  useEffect(() => {
    if (useWhisperMode && whisperStatus === 'processing') {
      setWhisperProcessing(true);
    } else if (whisperStatus === 'ready' || whisperStatus === 'idle' || whisperStatus === 'error') {
      setWhisperProcessing(false);
    }
  }, [whisperStatus, useWhisperMode]);

  const startRecording = useCallback((word: string) => {
    if (evaluatingWord || completedWords.has(word) || isMicResetting) return;
    setEvaluatingWord(word);
    setEvalFeedback(prev => ({ ...prev, [word]: null }));
    setTranscripts(prev => ({ ...prev, [word]: "" }));
  }, [evaluatingWord, completedWords, isMicResetting]);

  const resetFlow = useCallback(() => {
    clearEvalTimeout();
    setCompletedWords(new Set());
    setEvalFeedback({});
    setTranscripts({});
    setEvaluatingWord(null);
    setShowConfetti(false);
  }, [clearEvalTimeout]);

  const skipFlow = useCallback((wordsToSkip: string[]) => {
    clearEvalTimeout();
    safeSetEvaluatingWordNull();
    setCompletedWords(prev => {
      const next = new Set(prev);
      wordsToSkip.forEach(w => next.add(w));
      return next;
    });
  }, [clearEvalTimeout, safeSetEvaluatingWordNull]);

  const retryCurrentWord = useCallback(() => {
    if (!evaluatingWord) return;
    clearEvalTimeout();
    setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: null }));
    setTranscripts(prev => ({ ...prev, [evaluatingWord]: "" }));
    setMatchCountMap(prev => ({ ...prev, [evaluatingWord]: 0 }));
    setRefreshTrigger(prev => prev + 1);
  }, [evaluatingWord, clearEvalTimeout]);

  const forceStopRecording = useCallback(() => {
    if (useWhisperMode) {
      stopWhisperRecording();
    } else {
      safeSetEvaluatingWordNull();
    }
  }, [useWhisperMode, stopWhisperRecording, safeSetEvaluatingWordNull]);

  return {
    evaluatingWord,
    evalFeedback,
    transcripts,
    matchCountMap,
    completedWords,
    isMicResetting,
    isMicSleeping,
    setIsMicSleeping,
    setRefreshTrigger,
    processingWord,
    showConfetti,
    startRecording,
    safeSetEvaluatingWordNull,
    setCompletedWords,
    setEvalFeedback,
    setTranscripts,
    resetFlow,
    skipFlow,
    retryCurrentWord,
    // Whisper-specific state for UI
    whisperProcessing,
    whisperStatus,
    whisperLoadProgress,
    useWhisperMode,
    preloadWhisper: preloadModel,
    forceStopRecording,
  };
}

