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
import { playSound } from "../utils/soundEffects";
import { AudioVisualizer } from "./AudioVisualizer";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { playTTS } from "../utils/tts";


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
    setEvalFeedback({});
    setTranscripts({});
    setEvaluatingWord(null);
  };

  const handleReset = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setCompletedWords(new Set());
    setWordsIndex(0);
    setEvalFeedback({});
    setTranscripts({});
    setEvaluatingWord(null);
  };

  const handleNext = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    safeSetEvaluatingWordNull();
    setShowCompletionScreen(true);
  };

  const handleSkip = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    safeSetEvaluatingWordNull();
    setCompletedWords(new Set(words));
    setShowCompletionScreen(true);
  };

  const handlePlayTTS = async (text: string) => {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:bg-none dark:bg-[#0d141c] overflow-x-hidden">
      <Confetti active={showConfetti} />
      {/* Header */}
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

            {/* Teacher Controls Row */}
            <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
              <Button
                variant="outline"
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
                variant="outline"
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
                variant="outline"
                size="sm"
                onClick={handleSkip}
                className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                style={{
                  background: "linear-gradient(135deg, rgb(255, 200, 0) 0%, rgb(255, 150, 0) 100%)",
                }}
              >
                <FastForward className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Skip</span>
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                disabled={completedWords.size < words.length}
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
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
                  {words.map((w, idx) => {
                    const isDone = completedWords.has(w);
                    const isCurrent = evaluatingWord === w;
                    const isIndexMatch = idx === wordsIndex;
                    const feedback = evalFeedback[w];
                    const transcript = transcripts[w];

                    return (
                      <div key={w} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isCurrent ? 'border-pink-400 shadow-md' : isIndexMatch ? 'border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10' : isDone ? 'border-green-200' : 'border-transparent'}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 min-w-0 flex-1">
                          <span className={`text-3xl font-bold w-20 text-left tracking-widest flex items-center gap-1.5 ${w.length === 3 ? 'lowercase' : 'uppercase'}`} style={{ color: isDone ? '#58CC02' : accent.primary }}>
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
                          {isCurrent && !processingWord && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0 flex-wrap">
                              <span className="text-pink-500 text-sm font-bold animate-pulse">Listening...</span>
                              <AudioVisualizer isListening={!!evaluatingWord} isMobile={isMobile} />
                              {transcript && (
                                <span className="p-1 bg-gray-200 rounded text-[10px] font-mono text-gray-700 ml-1 truncate max-w-[120px]">
                                  [Heard: {transcript}]
                                </span>
                              )}
                            </div>
                          )}
                          {processingWord === w && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0 text-indigo-500">
                              <span className="text-sm font-bold animate-pulse">Thinking...</span>
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
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
                  onClick={() => handlePlayTTS(word)}
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
                className="text-white shadow-lg hover:shadow-xl font-bold rounded-xl px-8 py-6 text-lg transition-all hover:scale-105 active:scale-95 border-b-4 border-[#3c8c01] cursor-pointer inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                style={{ background: "linear-gradient(135deg, #58CC02 0%, #46A302 100%)" }}
              >
                Continue <ArrowRight className="w-6 h-6" />
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
