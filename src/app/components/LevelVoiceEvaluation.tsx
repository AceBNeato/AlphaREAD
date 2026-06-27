import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {Mic, Home, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, XCircle, MicOff, RotateCcw, AlertCircle, Volume2, Shuffle, Loader2, SkipForward, FastForward, X} from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { CVC_WORDS, shuffle, getPhoneticPronunciation } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { evaluateSyllable, isSyllableTarget } from "../utils/PhonemeEvaluator";
import { playSound, playExclusiveAudio } from "../utils/soundEffects";
import { AudioVisualizer } from "./AudioVisualizer";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { playTTS } from "../utils/tts";


interface LevelVoiceEvaluationProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  customWords?: string[];
  isSubPhase?: boolean;
  onComplete?: () => void;
  onBack?: () => void;
}

export function LevelVoiceEvaluation({ levelId, accent, customWords, isSubPhase, onComplete, onBack }: LevelVoiceEvaluationProps) {
  const navigate = useNavigate();
  const [words, setWords] = useState<string[]>(() => customWords ? customWords : shuffle(CVC_WORDS).slice(0, 10));

  const [evaluatingWord, setEvaluatingWord] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState<Record<string, "correct" | "close" | "wrong" | null>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [wordsIndex, setWordsIndex] = useState(0);
  const [isMicResetting, setIsMicResetting] = useState(false);
  const [processingWord, setProcessingWord] = useState<string | null>(null);
  const [hasClickedMic, setHasClickedMic] = useState(false);
  const [hasClickedTTS, setHasClickedTTS] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [showShyTip, setShowShyTip] = useState(false);

  // Internal batching configuration
  const BATCH_SIZE = 15;
  const [batchIndex, setBatchIndex] = useState(0);
  const totalBatches = Math.ceil(words.length / BATCH_SIZE);
  const batchWords = useMemo(() => {
    return words.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
  }, [words, batchIndex]);

  const isCurrentBatchDone = useMemo(() => {
    return batchWords.length > 0 && batchWords.every(w => completedWords.has(w));
  }, [batchWords, completedWords]);

  // Detect mobile — on phones we skip getUserMedia to avoid mic conflict with SpeechRecognition
  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);
  const isIOS = useMemo(() => /iPhone|iPad|iPod/i.test(navigator.userAgent), []);
  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearEvalTimeout = useCallback(() => {
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearEvalTimeout();
  }, [clearEvalTimeout]);

  const handleShuffle = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setWords(shuffle([...words]));
    setCompletedWords(new Set());
    setWordsIndex(0);
    setBatchIndex(0);
    setEvalFeedback({});
    setTranscripts({});
    setEvaluatingWord(null);
  };

  const handleReset = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setCompletedWords(new Set());
    setWordsIndex(0);
    setBatchIndex(0);
    setEvalFeedback({});
    setTranscripts({});
    setEvaluatingWord(null);
  };

  const handleNext = () => {
    playSound("complete", 0.5);
    clearEvalTimeout();
    safeSetEvaluatingWordNull();
    if (isSubPhase && onComplete) {
      onComplete();
      return;
    }
    
    const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
    if (!completedLevels.includes(levelId)) {
      completedLevels.push(levelId);
      localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
    }
    
    if (onComplete) {
      onComplete();
    }
  };

  const handleNextClick = () => {
    if (batchIndex < totalBatches - 1) {
      setBatchIndex(prev => prev + 1);
      setWordsIndex((batchIndex + 1) * BATCH_SIZE);
    } else {
      handleNext();
    }
  };

  const handleBackClick = () => {
    if (batchIndex > 0) {
      setBatchIndex(prev => prev - 1);
      setWordsIndex((batchIndex - 1) * BATCH_SIZE);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSkip = () => {
    clearEvalTimeout();
    safeSetEvaluatingWordNull();
    
    setCompletedWords(prev => {
      const next = new Set(prev);
      batchWords.forEach(w => next.add(w));
      return next;
    });

    if (batchIndex < totalBatches - 1) {
      setBatchIndex(prev => prev + 1);
      setWordsIndex((batchIndex + 1) * BATCH_SIZE);
    } else {
      handleNext();
    }
  };

  const handlePlayTTS = async (text: string) => {
    setHasClickedTTS(true);
    const upper = text.toUpperCase();

    // Use local audio files for CVC words
    if (CVC_WORDS.includes(upper)) {
      const audioPath = `${(import.meta as any).env.BASE_URL}audio/cvc-audio/cvc-${text.toLowerCase()}.mp3`;
      playExclusiveAudio(audioPath).catch((err) => {
        console.warn(`[AlphabetGO] Local CVC audio not found: ${audioPath}, falling back to TTS`, err);
        playTTS(text.toLowerCase());
      });
      return;
    }

    // For CV/VC syllables, look up the phonetically correct TTS string
    // so "PI" says "Pee", "BA" says "Bah", "AB" says "Ab" — not the letter names.
    let speakText = text.toLowerCase();
    if (isSyllableTarget(text)) {
      // Determine pattern: first char consonant = CV, else VC
      const VOWELS = ["A", "E", "I", "O", "U"];
      const pattern = VOWELS.includes(upper[0]) ? "VC" : "CV";
      const phonetic = getPhoneticPronunciation(upper, pattern as any);
      if (phonetic !== upper) speakText = phonetic;
    }
    playTTS(speakText);
  };

  const progress = (completedWords.size / words.length) * 100;
  const allDone = completedWords.size >= words.length;


  const safeSetEvaluatingWordNull = useCallback(() => {
    console.log("[AlphabetGO Debug] LevelVoiceEvaluation: safeSetEvaluatingWordNull called");
    setEvaluatingWord(null);
    setIsMicResetting(true);
    setTimeout(() => {
      console.log("[AlphabetGO Debug] LevelVoiceEvaluation: mic reset complete");
      setIsMicResetting(false);
    }, 400);
  }, []);

  const handleResult = useCallback((word: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
    console.log(`[AlphabetGO Debug] LevelVoiceEvaluation: handleResult for "${word}" | Status: ${status} | Transcript: "${transcript}"`);
    setTranscripts(prev => ({ ...prev, [word]: transcript }));
    setEvalFeedback(prev => ({ ...prev, [word]: status }));

    clearEvalTimeout();

    if (status === "correct" || status === "close") {
      playSound("correct", 0.4);
      setShowConfetti(true);
      const newCompleted = new Set(completedWords);
      newCompleted.add(word);
      setCompletedWords(newCompleted);

      setProcessingWord(null);
      evaluationTimeoutRef.current = setTimeout(() => {
        safeSetEvaluatingWordNull();
        setShowConfetti(false);
        if (newCompleted.size >= words.length) {
          playSound("complete", 0.5);
          setShowCompletionScreen(true);
        } else {
          setWordsIndex(prev => {
            let nextIdx = prev + 1;
            while (nextIdx < words.length && newCompleted.has(words[nextIdx])) {
              nextIdx++;
            }
            return Math.min(words.length - 1, nextIdx);
          });
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
  }, [completedWords, words, clearEvalTimeout, safeSetEvaluatingWordNull]);

  const handleError = useCallback(() => {
    if (evaluatingWord) {
      safeSetEvaluatingWordNull();
    }
  }, [evaluatingWord, safeSetEvaluatingWordNull]);

  const handleSilence = useCallback((wordToUse?: string) => {
    const targetWord = wordToUse || evaluatingWord;
    console.log(`[AlphabetGO Debug] LevelVoiceEvaluation: handleSilence triggered for "${targetWord}"`);
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

  // Fast Word-Level Engine for all targets
  useSpeechRecognition({
    evaluatingWord,
    enabled: !!evaluatingWord,
    onResult: handleResult,
    onError: handleError,
    onSilenceTimeout: handleSilence
  });

  const startRecording = (word: string) => {
    console.log(`[AlphabetGO Debug] LevelVoiceEvaluation: startRecording called for "${word}"`);
    if (evaluatingWord || completedWords.has(word) || isMicResetting) {
      console.log(`[AlphabetGO Debug] LevelVoiceEvaluation: startRecording blocked (evaluatingWord=${evaluatingWord}, completed=${completedWords.has(word)}, resetting=${isMicResetting})`);
      return;
    }
    setEvaluatingWord(word);
    setEvalFeedback(prev => ({ ...prev, [word]: null }));
    setTranscripts(prev => ({ ...prev, [word]: "" }));
  };

  const handleGoBack = async () => {
    if (!showCompletionScreen) {
      const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
      if (!confirmExit) return;
    }
    navigate("/levels", { replace: true });
  };

  return (
    <div className={`overflow-x-hidden ${isSubPhase ? 'flex-1 w-full flex flex-col' : 'min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:bg-none dark:bg-[#0d141c]'}`}>
      <Confetti active={showConfetti} />
      
      {/* Listening Modal */}
      <AnimatePresence>
        {evaluatingWord && !showCompletionScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border-4"
              style={{ borderColor: accent.primary }}
            >
              <div className="flex flex-col items-center justify-center gap-2 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <Mic className="w-6 h-6 text-pink-500 animate-pulse" />
                  <h3 className="text-2xl font-bold tracking-tight text-pink-500 animate-pulse">Listening...</h3>
                </div>
                <AudioVisualizer isListening={!!evaluatingWord} isMobile={isMobile} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">Please say the word clearly.</p>
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 min-h-[100px] flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target</span>
                <span className="text-6xl font-extrabold mb-4 tracking-wider" style={{ color: accent.primary }}>{evaluatingWord}</span>
                
                <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />
                
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2">Heard</span>
                <span className="text-6xl font-extrabold tracking-wider text-gray-700 dark:text-gray-300 min-h-[60px] flex items-center justify-center w-full break-words">
                  {transcripts[evaluatingWord] ? `"${transcripts[evaluatingWord]}"` : <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                </span>
              </div>
              
              {evalFeedback[evaluatingWord] === 'wrong' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-red-500 font-bold flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-xl">
                  <AlertCircle className="w-5 h-5" /> Let's try again!
                </motion.div>
              )}
              {evalFeedback[evaluatingWord] === 'correct' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-green-500 font-bold flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 py-2 px-4 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" /> Perfect!
                </motion.div>
              )}
              {evalFeedback[evaluatingWord] === 'close' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-blue-500 font-bold flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 py-2 px-4 rounded-xl">
                  <Sparkles className="w-5 h-5" /> Almost there!
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      {!isSubPhase && (
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="rounded-full"
          >
            <X className="w-5 h-5" /> Exit
          </Button>

          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            {levelId === 3 ? "CVC Master - Voice Evaluation" : "Voice Evaluation"}
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShyTip(true)}
            className="rounded-full flex items-center gap-1.5 border-pink-200 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-500 font-medium text-xs px-3 py-1.5 shadow-sm"
          >
            <span>🗣️</span>
            <span className="hidden sm:inline">Shy Learner?</span>
          </Button>
        </div>
      </div>
      )}

      {/* iOS warning */}
      {isIOS && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 mx-4 text-amber-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p><strong>iOS Notice:</strong> Voice recognition requires Chrome on Android or a desktop browser. Safari on iPhone/iPad does not support this feature.</p>
        </div>
      )}

      {/* Content */}
      <div className={`w-full ${batchWords.length >= 10 ? 'max-w-5xl py-2' : `max-w-2xl ${isSubPhase ? 'py-2' : 'py-6'}`} mx-auto px-4`}>

        {!(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>Your browser doesn't support the Voice Recognition API. Please use Chrome or a modern mobile browser.</p>
          </div>
        )}

        <>

            <div className="text-center mb-8">
              <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                Say each word out loud into the microphone. (Batch {batchIndex + 1} of {totalBatches})
              </p>
              <p className="text-sm font-semibold text-pink-300 dark:text-pink-400 mt-1 block">
                Completed {completedWords.size} of {words.length} CVC words
              </p>
            </div>

            {/* Teacher Controls Row */}
            <div className={`flex justify-center items-center w-full gap-2 sm:gap-3 ${onBack ? 'max-w-xl' : 'max-w-lg'} mx-auto mb-6`}>
              {(onBack || batchIndex > 0) && (
                <Button
                  size="sm"
                  onClick={handleBackClick}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)",
                  }}
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleShuffle}
                className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#883fba] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                style={{
                  background: "linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)",
                }}
              >
                <Shuffle className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Shuffle</span>
              </Button>
              <Button
                size="sm"
                onClick={handleReset}
                className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#b81d1d] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                style={{
                  background: "linear-gradient(135deg, rgb(255, 75, 75) 0%, rgb(216, 42, 42) 100%)",
                }}
              >
                <RotateCcw className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSkip}
                className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                style={{
                  background: "linear-gradient(135deg, rgb(255, 200, 0) 0%, rgb(255, 150, 0) 100%)",
                }}
              >
                <FastForward className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Forward</span>
              </Button>
              <Button
                size="sm"
                onClick={handleNextClick}
                disabled={!isCurrentBatchDone}
                className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
                style={{
                  background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                }}
              >
                <span className="hidden sm:inline">Next</span>
                <ArrowRight className="w-4 h-4 sm:ml-1" />
              </Button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key="list-phase"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-8"
              >
                <div className={`${batchWords.length === 15 ? 'grid grid-cols-1 sm:grid-cols-3 gap-3' : batchWords.length > 5 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'} bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700`}>
                  {batchWords.map((w) => {
                    const idx = words.indexOf(w);
                    const isDone = completedWords.has(w);
                    const isCurrent = evaluatingWord === w;
                    const isIndexMatch = idx === wordsIndex;
                    const feedback = evalFeedback[w];
                    const transcript = transcripts[w];

                    return (
                      <div key={w} className={`flex items-center justify-between ${batchWords.length >= 10 ? 'p-2 sm:p-3' : 'p-4'} rounded-2xl transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isCurrent ? 'border-pink-400 shadow-md' : isIndexMatch ? 'border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10' : isDone ? 'border-green-200' : 'border-transparent'}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0 flex items-center justify-center pt-1 sm:pt-0">
                            <button
                              onClick={() => handlePlayTTS(w)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDone ? 'bg-white/50 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40 text-green-700 dark:text-green-400 cursor-pointer shadow-sm active:scale-95' : 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 cursor-pointer shadow-sm active:scale-95'} ${idx === 0 && !hasClickedTTS && !isDone ? 'ring-2 ring-blue-400 ring-offset-1 animate-pulse' : ''}`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                            {idx === 0 && !hasClickedTTS && !isDone && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                              >
                                Tap to listen!
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rotate-45" />
                              </motion.div>
                            )}
                          </div>

                          <span className={`${batchWords.length >= 10 ? 'text-xl sm:text-2xl w-14 sm:w-16' : 'text-3xl w-20'} font-bold text-left tracking-widest flex items-center gap-1.5 ${w.length === 3 ? 'lowercase' : 'uppercase'}`} style={{ color: isDone ? '#58CC02' : accent.primary }}>
                            {w}
                            {isIndexMatch && !isDone && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />}
                          </span>
                          {feedback === 'correct' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500 flex items-center gap-1 text-sm font-bold"><CheckCircle2 className="w-4 h-4" /> Correct!</motion.div>}
                          {feedback === 'close' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-blue-500 flex items-center gap-1 text-sm font-bold"><Sparkles className="w-4 h-4" /> Close enough!</motion.div>}
                          {feedback === 'wrong' && (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`flex items-center justify-center gap-1 font-bold text-sm text-red-500`}>
                              <AlertCircle className="w-4 h-4" /> Try again!
                            </motion.div>
                          )}

                          {processingWord === w && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0 text-indigo-500">
                              <span className="text-sm font-bold animate-pulse">Thinking...</span>
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2 relative">
                          <button
                            onClick={() => {
                              setHasClickedMic(true);
                              if (isCurrent) {
                                safeSetEvaluatingWordNull();
                              } else {
                                startRecording(w);
                              }
                            }}
                            disabled={(evaluatingWord !== null && !isCurrent) || isDone || isMicResetting}
                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default' : isCurrent ? 'bg-red-500 text-white shadow-lg' : isMicResetting ? 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'} ${idx === 0 && !hasClickedMic && !isDone ? 'ring-2 ring-pink-400 ring-offset-2 animate-pulse' : ''}`}
                          >
                            {isCurrent && (
                              <>
                                <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
                                <span className="absolute -inset-1 rounded-xl bg-red-500/20 animate-pulse" />
                              </>
                            )}
                            <span className="relative z-10">
                              {isDone ? <CheckCircle2 className="w-6 h-6" /> : isCurrent ? <MicOff className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
                            </span>
                          </button>
                          {idx === 0 && !hasClickedMic && !isDone && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                            >
                              Tap to speak!
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                  Click the mic next to each word to practice its pronunciation
                </div>
              </motion.div>
            </AnimatePresence>
          </>
      </div>

      {/* Shy Mode Tips Modal Overlay */}
      <AnimatePresence>
        {showShyTip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-pink-200 dark:border-gray-700 text-center"
            >
              <span className="text-4xl">🗣️✨</span>
              <h3 className="text-xl font-bold mt-3 mb-2 text-pink-500">Shy Learner Tips</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                If your child is speaking softly or feeling a bit shy, try these simple tips to boost voice recognition:
              </p>
              <div className="text-left space-y-3.5 text-sm text-gray-600 dark:text-gray-300 mb-6">
                <div className="flex gap-2.5">
                  <span className="text-base">📣</span>
                  <span><strong>Speak Closer:</strong> Gently show them how to speak directly into the microphone at the bottom of the device.</span>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-base">👐</span>
                  <span><strong>Cup the Mic:</strong> Cup your hands around the microphone port to act as a megaphone, focusing their soft voice into the sensor.</span>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-base">⚙️</span>
                  <span><strong>Microphone Boost:</strong> Try raising your device's physical microphone gain in system sound settings.</span>
                </div>
              </div>
              <Button
                onClick={() => setShowShyTip(false)}
                className="w-full bg-gradient-to-br from-pink-500 to-rose-500 text-white font-bold rounded-2xl py-3 border-b-4 border-black/20"
              >
                Got it!
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
