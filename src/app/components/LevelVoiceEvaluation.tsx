import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Mic,
  Home,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  MicOff,
  RotateCcw,
  AlertCircle,
  Volume2,
  Shuffle,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { CVC_WORDS, shuffle, getPhoneticPronunciation } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { evaluateSyllable, isSyllableTarget } from "../utils/PhonemeEvaluator";
import { useAudioVisualizer } from "../hooks/useAudioVisualizer";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { usePhonemeRecognition } from "../hooks/usePhonemeRecognition";

interface LevelVoiceEvaluationProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  customWords?: string[];
  isSubPhase?: boolean;
  onComplete?: () => void;
}

export function LevelVoiceEvaluation({ levelId, accent, customWords, isSubPhase, onComplete }: LevelVoiceEvaluationProps) {
  const navigate = useNavigate();
  const [words, setWords] = useState<string[]>(() => customWords ? customWords : shuffle(CVC_WORDS).slice(0, 10));

  const [evaluatingWord, setEvaluatingWord] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState<Record<string, "correct" | "close" | "wrong" | null>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [wordsIndex, setWordsIndex] = useState(0);
  const [isMicResetting, setIsMicResetting] = useState(false);
  const [processingWord, setProcessingWord] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [showShyTip, setShowShyTip] = useState(false);

  // Detect mobile — on phones we skip getUserMedia to avoid mic conflict with SpeechRecognition
  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);
  const isIOS = useMemo(() => /iPhone|iPad|iPod/i.test(navigator.userAgent), []);

  const handleShuffle = () => {
    setWords(shuffle([...words]));
    setCompletedWords(new Set());
    setWordsIndex(0);
    setEvalFeedback({});
    setTranscripts({});
    setEvaluatingWord(null);
  };

  const handleReset = () => {
    setCompletedWords(new Set());
    setWordsIndex(0);
    setEvalFeedback({});
    setTranscripts({});
    setEvaluatingWord(null);
  };

  const handleNext = () => {
    const currentWord = words[wordsIndex];
    if (currentWord) {
      setCompletedWords(prev => {
        const next = new Set(prev);
        next.add(currentWord);
        return next;
      });
    }
    if (wordsIndex < words.length - 1) {
      setWordsIndex(prev => prev + 1);
    } else {
      setShowCompletionScreen(true);
    }
  };

  const playTTS = async (text: string) => {
    // For CV/VC syllables, look up the phonetically correct TTS string
    // so "PI" says "Pee", "BA" says "Bah", "AB" says "Ab" — not the letter names.
    let speakText = text.toLowerCase();
    if (isSyllableTarget(text)) {
      const upper = text.toUpperCase();
      // Determine pattern: first char consonant = CV, else VC
      const VOWELS = ["A", "E", "I", "O", "U"];
      const pattern = VOWELS.includes(upper[0]) ? "VC" : "CV";
      const phonetic = getPhoneticPronunciation(upper, pattern as any);
      if (phonetic !== upper) speakText = phonetic;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speakText);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const progress = (completedWords.size / words.length) * 100;
  const allDone = completedWords.size >= words.length;

  useAudioVisualizer(isMobile, !!evaluatingWord);

  const safeSetEvaluatingWordNull = useCallback(() => {
    setEvaluatingWord(null);
    setIsMicResetting(true);
    setTimeout(() => setIsMicResetting(false), 400);
  }, []);

  const handleResult = useCallback((word: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
    setTranscripts(prev => ({ ...prev, [word]: transcript }));
    setEvalFeedback(prev => ({ ...prev, [word]: status }));

    if (status === "correct" || status === "close") {
      setShowConfetti(true);
      const newCompleted = new Set(completedWords);
      newCompleted.add(word);
      setCompletedWords(newCompleted);

      setProcessingWord(null);
      setTimeout(() => {
        safeSetEvaluatingWordNull();
        setShowConfetti(false);
        if (newCompleted.size >= words.length) {
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
      setProcessingWord(null);
      setTimeout(() => {
        setEvalFeedback(prev => ({ ...prev, [word]: null }));
        safeSetEvaluatingWordNull();
      }, 2500);
    }
  }, [completedWords, words.length, safeSetEvaluatingWordNull]);

  const handleError = useCallback(() => {
    if (evaluatingWord) {
      safeSetEvaluatingWordNull();
    }
  }, [evaluatingWord, safeSetEvaluatingWordNull]);

  const handleSilence = useCallback((wordToUse?: string) => {
    const targetWord = wordToUse || evaluatingWord;
    if (!targetWord) return;
    setEvalFeedback(prev => ({ ...prev, [targetWord]: "wrong" }));
    setProcessingWord(null);
    setTimeout(() => {
      setEvalFeedback(prev => ({ ...prev, [targetWord]: null }));
      safeSetEvaluatingWordNull();
    }, 1500);
  }, [evaluatingWord, safeSetEvaluatingWordNull]);

  const isSyllable = evaluatingWord ? isSyllableTarget(evaluatingWord) : false;

  // Dedicated Phonetic Engine for Level 2 (CV / VC syllables)
  usePhonemeRecognition({
    evaluatingWord,
    enabled: !!evaluatingWord && isSyllable,
    onResult: handleResult,
    onError: handleError,
    onSilenceTimeout: handleSilence
  });

  // Fast Word-Level Engine for Level 3+ (CVC words)
  useSpeechRecognition({
    evaluatingWord,
    enabled: !!evaluatingWord && !isSyllable,
    onResult: handleResult,
    onError: handleError,
    onSilenceTimeout: handleSilence
  });

  const startRecording = (word: string) => {
    if (evaluatingWord || completedWords.has(word) || isMicResetting) return;
    setEvaluatingWord(word);
    setEvalFeedback(prev => ({ ...prev, [word]: null }));
    setTranscripts(prev => ({ ...prev, [word]: "" }));
  };

  const handleGoBack = () => {
    if (!showCompletionScreen) {
      const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
      if (!confirmExit) return;
    }
    navigate("/levels", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:bg-none dark:bg-[#0d141c]">
      <Confetti active={showConfetti} />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="rounded-full"
          >
            <Home className="w-5 h-5" />
          </Button>

          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            Voice Evaluation
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

      {/* iOS warning */}
      {isIOS && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 mx-4 text-amber-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p><strong>iOS Notice:</strong> Voice recognition requires Chrome on Android or a desktop browser. Safari on iPhone/iPad does not support this feature.</p>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {!(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>Your browser doesn't support the Voice Recognition API. Please use Chrome or a modern mobile browser.</p>
          </div>
        )}

        {!showCompletionScreen ? (
          <>
            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-200/80 dark:bg-gray-800 rounded-full overflow-hidden mb-6 shadow-inner border border-gray-100 dark:border-gray-700/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${accent.primary}, ${accent.dark})`,
                }}
              />
            </div>

            {/* Teacher Controls Row */}
            <div className="flex justify-center gap-3 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShuffle}
                className="flex items-center gap-1.5 border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
              >
                <Shuffle className="w-4 h-4" /> Shuffle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="flex items-center gap-1.5 border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                disabled={completedWords.size >= words.length}
                className="flex items-center gap-1.5 text-white shadow-md active:scale-95"
                style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
              >
                Next <ArrowRight className="w-4 h-4" />
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
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto">
                  {words.map((w, idx) => {
                    const isDone = completedWords.has(w);
                    const isCurrent = evaluatingWord === w;
                    const isIndexMatch = idx === wordsIndex;
                    const feedback = evalFeedback[w];
                    const transcript = transcripts[w];

                    return (
                      <div key={w} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isCurrent ? 'border-pink-400 shadow-md' : isIndexMatch ? 'border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10' : isDone ? 'border-green-200' : 'border-transparent'}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <span className="text-3xl font-bold w-20 text-left tracking-widest uppercase flex items-center gap-1.5" style={{ color: isDone ? '#58CC02' : accent.primary }}>
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
                          {isCurrent && transcript && (
                            <div className="p-1 bg-gray-200 rounded text-[10px] font-mono text-gray-700 mt-1 sm:mt-0">
                              Heard: {transcript}
                            </div>
                          )}
                          {isCurrent && !transcript && !processingWord && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0">
                              <span className="text-pink-500 text-sm font-bold animate-pulse">Listening...</span>
                              <div className="flex gap-1 items-center h-8 justify-center min-w-[50px]">
                                {isMobile ? (
                                  // CSS animated wave for mobile (no getUserMedia conflict)
                                  <>
                                    <div className="w-1.5 bg-pink-500 rounded-full animate-[wave_0.8s_ease-in-out_infinite_0ms]" style={{ height: '20px', animationName: 'wave', animationDuration: '0.8s', animationIterationCount: 'infinite', animationDelay: '0ms' }} />
                                    <div className="w-1.5 bg-pink-400 rounded-full" style={{ height: '28px', animation: 'wave 0.8s ease-in-out infinite 0.1s' }} />
                                    <div className="w-1.5 bg-pink-500 rounded-full" style={{ height: '36px', animation: 'wave 0.8s ease-in-out infinite 0.2s' }} />
                                    <div className="w-1.5 bg-pink-400 rounded-full" style={{ height: '28px', animation: 'wave 0.8s ease-in-out infinite 0.3s' }} />
                                    <div className="w-1.5 bg-pink-500 rounded-full" style={{ height: '20px', animation: 'wave 0.8s ease-in-out infinite 0.4s' }} />
                                  </>
                                ) : (
                                  // Real-time visualizer bars for desktop
                                  <>
                                    <div id="wave-bar-1" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-2" className="w-1.5 bg-pink-400 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-3" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-4" className="w-1.5 bg-pink-400 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-5" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          {processingWord === w && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0 text-indigo-500">
                              <span className="text-sm font-bold animate-pulse">Thinking...</span>
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (isCurrent) {
                                safeSetEvaluatingWordNull();
                              } else {
                                startRecording(w);
                              }
                            }}
                            disabled={(evaluatingWord !== null && !isCurrent) || isDone || isMicResetting}
                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default' : isCurrent ? 'bg-red-500 text-white shadow-lg' : isMicResetting ? 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'}`}
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
        ) : (
          /* All Done */
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block mb-6"
            >
              <Sparkles className="w-20 h-20 text-[#FFC800]" />
            </motion.div>
            <h3 className="text-3xl mb-4" style={{ color: accent.primary }}>
              Excellent Work!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You completed {words.length} out of {words.length} words correctly!
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {words.map((word, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => playTTS(word)}
                  className="px-4 py-2.5 rounded-full text-white text-lg font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all hover:brightness-105 active:brightness-95 border-b-4 border-black/20"
                  style={{
                    background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                  }}
                >
                  <Volume2 className="w-5 h-5 text-white/90" />
                  <span>{word}</span>
                </motion.button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full px-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  handleReset();
                  setShowCompletionScreen(false);
                }}
                className="rounded-xl px-8 py-6 text-lg border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 w-full sm:w-auto"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Retry
              </Button>
              <Button
                onClick={() => {
                  if (isSubPhase) {
                    if (onComplete) onComplete();
                    return;
                  }

                  const completedLevels = JSON.parse(
                    localStorage.getItem("completedLevels") || "[]"
                  );
                  if (!completedLevels.includes(levelId)) {
                    completedLevels.push(levelId);
                    localStorage.setItem(
                      "completedLevels",
                      JSON.stringify(completedLevels)
                    );
                  }

                  if (onComplete) {
                    onComplete();
                  } else {
                    navigate("/levels");
                  }
                }}
                size="lg"
                className="rounded-xl px-8 py-6 text-lg text-white w-full sm:w-auto"
                style={{
                  background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
                }}
              >
                {onComplete ? <ArrowRight className="w-5 h-5 mr-2" /> : <Home className="w-5 h-5 mr-2" />}
                {onComplete ? (isSubPhase ? "Next Challenge" : "Next Phase") : "Back to Levels"}
              </Button>
            </div>
          </motion.div>
        )}
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
