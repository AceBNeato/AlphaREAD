import { useState, useCallback, useRef, useEffect } from 'react';
import { playSound } from '../utils/soundEffects';
import { useSpeechRecognition } from './useSpeechRecognition';

export interface UseEvaluationFlowProps {
  words: string[];
  singleShot?: boolean;
  /** BCP-47 language tag for SpeechRecognition. Defaults to "en-US". */
  lang?: string;
  onAllCompleted?: () => void;
  onWordCompleted?: (word: string, newCompleted: Set<string>) => void;
  isCorrectOverride?: (word: string, status: "correct" | "close" | "wrong" | null, transcript: string) => boolean;
}

export function useEvaluationFlow({ words, singleShot, lang, onAllCompleted, onWordCompleted, isCorrectOverride }: UseEvaluationFlowProps) {
  const [evaluatingWord, setEvaluatingWord] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState<Record<string, "correct" | "close" | "wrong" | null>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [isMicResetting, setIsMicResetting] = useState(false);
  const [processingWord, setProcessingWord] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const evaluationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setEvaluatingWord(null);
    setIsMicResetting(true);
    setTimeout(() => {
      setIsMicResetting(false);
    }, 400);
  }, []);

  const handleResult = useCallback((word: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
    setTranscripts(prev => ({ ...prev, [word]: transcript }));
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
        safeSetEvaluatingWordNull();
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

  useSpeechRecognition({
    evaluatingWord,
    enabled: !!evaluatingWord,
    singleShot,
    lang,
    onResult: handleResult,
    onError: handleError,
    onSilenceTimeout: handleSilence
  });

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

  return {
    evaluatingWord,
    evalFeedback,
    transcripts,
    completedWords,
    isMicResetting,
    processingWord,
    showConfetti,
    startRecording,
    safeSetEvaluatingWordNull,
    setCompletedWords,
    setEvalFeedback,
    setTranscripts,
    resetFlow,
    skipFlow
  };
}
