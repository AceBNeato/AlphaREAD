import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import {Home, Mic, MicOff, CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, RotateCcw, SkipForward, FastForward, Volume2, Shuffle, X, AlertCircle, Loader2} from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { CVC_SENTENCES } from "../data/levels";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { playSound } from "../utils/soundEffects";
import { playTTS as playTTSUtil } from "../utils/tts";
import { AudioVisualizer } from "./AudioVisualizer";

interface LevelCVCSentencesProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  isSubPhase?: boolean;
  onComplete?: () => void;
  onBack?: () => void;
}

const SENTENCES_PER_SET = 10;
const totalSets = Math.ceil(CVC_SENTENCES.length / SENTENCES_PER_SET);

export function LevelCVCSentences({ levelId, accent, isSubPhase, onComplete, onBack }: LevelCVCSentencesProps) {
  const navigate = useNavigate();

  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [activeSentences, setActiveSentences] = useState<string[]>([]);

  // Per-sentence state maps (matches Lesson 5 pattern)
  const [evaluatingSentenceId, setEvaluatingSentenceId] = useState<string | null>(null);
  const [completedSentences, setCompletedSentences] = useState<Set<string>>(new Set());
  const [sentenceFeedbackMap, setSentenceFeedbackMap] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [sentenceTranscriptsMap, setSentenceTranscriptsMap] = useState<Record<string, string>>({});

  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasClickedTTS, setHasClickedTTS] = useState(false);

  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);

  const clearEvalTimeout = useCallback(() => {
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearEvalTimeout(), [clearEvalTimeout]);

  // Load sentences for current set
  useEffect(() => {
    setActiveSentences(CVC_SENTENCES.slice(currentSetIndex * SENTENCES_PER_SET, (currentSetIndex + 1) * SENTENCES_PER_SET));
    setCompletedSentences(new Set());
    setSentenceFeedbackMap({});
    setSentenceTranscriptsMap({});
    setEvaluatingSentenceId(null);
  }, [currentSetIndex]);

  const playTTS = (text: string) => {
    setHasClickedTTS(true);
    playTTSUtil(text);
  };

  // Voice result handler (matches Lesson 5 pattern)
  const handleResult = useCallback(
    (target: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
      setSentenceTranscriptsMap(prev => ({ ...prev, [target]: transcript }));

      const tClean = transcript.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      const targetClean = target.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      const tNoSpace = tClean.replace(/\s+/g, "");
      const targetNoSpace = targetClean.replace(/\s+/g, "");
      const isCorrect = status === "correct" || tClean.includes(targetClean) || tNoSpace.includes(targetNoSpace);

      if (status === null && !isCorrect) return;

      clearEvalTimeout();

      if (isCorrect) {
        playSound("correct", 0.4);
        setSentenceFeedbackMap(prev => ({ ...prev, [target]: "correct" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setCompletedSentences(prev => new Set(prev).add(target));
          setEvaluatingSentenceId(null);
        }, 1500);
      } else {
        playSound("wrong", 0.35);
        setSentenceFeedbackMap(prev => ({ ...prev, [target]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setSentenceFeedbackMap(prev => ({ ...prev, [target]: null }));
          setEvaluatingSentenceId(null);
        }, 2000);
      }
    },
    [clearEvalTimeout]
  );

  useSpeechRecognition({
    evaluatingWord: evaluatingSentenceId,
    enabled: !!evaluatingSentenceId,
    singleShot: true,
    onResult: handleResult,
    onError: () => setEvaluatingSentenceId(null),
    onSilenceTimeout: () => {
      clearEvalTimeout();
      if (evaluatingSentenceId) {
        playSound("wrong", 0.35);
        const s = evaluatingSentenceId;
        setSentenceFeedbackMap(prev => ({ ...prev, [s]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setSentenceFeedbackMap(prev => ({ ...prev, [s]: null }));
          setEvaluatingSentenceId(null);
        }, 1500);
      }
    }
  });

  // Controls
  const handleShuffle = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setEvaluatingSentenceId(null);
    setActiveSentences(prev => [...prev].sort(() => Math.random() - 0.5));
    setCompletedSentences(new Set());
    setSentenceFeedbackMap({});
    setSentenceTranscriptsMap({});
  };

  const handleReset = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setEvaluatingSentenceId(null);
    setActiveSentences(CVC_SENTENCES.slice(currentSetIndex * SENTENCES_PER_SET, (currentSetIndex + 1) * SENTENCES_PER_SET));
    setCompletedSentences(new Set());
    setSentenceFeedbackMap({});
    setSentenceTranscriptsMap({});
  };

  const handleNextQuiz = () => {
    playSound("complete", 0.5);
    if (!isFinalSet) {
      setCurrentSetIndex(prev => prev + 1);
    } else {
      setShowConfetti(true);
    }
  };

  const handleSkip = () => {
    clearEvalTimeout();
    setEvaluatingSentenceId(null);
    setCompletedSentences(new Set(activeSentences));
    handleNextQuiz();
  };

  const handleGoBack = async () => {
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleFinish = async () => {
    setIsSaving(true);


    const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
    if (!completedLevels.includes(levelId)) {
      completedLevels.push(levelId);
      localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
    }
    setIsSaving(false);

    if (onComplete) {
      onComplete();
    } else {
      navigate("/levels");
    }
  };

  const isFinalSet = currentSetIndex === totalSets - 1;

  return (
    <div className={`flex flex-col overflow-x-hidden ${isSubPhase ? 'flex-1 w-full' : 'min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:bg-none dark:bg-[#0d141c]'}`}>
      <Confetti active={showConfetti} />

      {/* Listening Modal */}
      <AnimatePresence>
        {evaluatingSentenceId && !showConfetti && (
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
                <AudioVisualizer isListening={!!evaluatingSentenceId} isMobile={isMobile} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">Please read the sentence clearly.</p>
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 min-h-[100px] flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target</span>
                <span className="text-3xl font-extrabold mb-4 tracking-wider leading-snug" style={{ color: accent.primary }}>{evaluatingSentenceId}</span>
                
                <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />
                
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2">Heard</span>
                <span className="text-3xl font-extrabold tracking-wider leading-snug text-gray-700 dark:text-gray-300 min-h-[30px] flex items-center justify-center w-full break-words">
                  {sentenceTranscriptsMap[evaluatingSentenceId] ? `"${sentenceTranscriptsMap[evaluatingSentenceId]}"` : <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                </span>
              </div>
              
              {sentenceFeedbackMap[evaluatingSentenceId] === 'wrong' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-red-500 font-bold flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-xl">
                  <AlertCircle className="w-5 h-5" /> Let's try again!
                </motion.div>
              )}
              {sentenceFeedbackMap[evaluatingSentenceId] === 'correct' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-green-500 font-bold flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 py-2 px-4 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" /> Perfect!
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      {!isSubPhase && (
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full flex-shrink-0">
            <X className="w-5 h-5" /> Exit
          </Button>
          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            {levelId === 3 ? "CVC Master - Read the Sentences" : `Sentences Quiz (Set ${currentSetIndex + 1}/${totalSets}) Read the Sentences`}
          </h2>
          <span className="text-sm font-bold" style={{ color: accent.primary }}>
            Step {completedSentences.size}/{activeSentences.length}
          </span>
        </div>
      </div>
      )}

      {/* Content */}
      <div className={`w-full max-w-5xl mx-auto px-4 flex-1 flex flex-col ${isSubPhase ? 'py-2' : 'py-6'}`}>
        <AnimatePresence mode="wait">
          {!showConfetti ? (
            <motion.div
              key={`sentences-set-${currentSetIndex}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center"
            >
              <div className="text-center mb-8">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Read the sentences out loud into the microphone. (Batch {currentSetIndex + 1} of {totalSets})
                </p>
                <p className="text-sm font-semibold text-pink-300 dark:text-pink-400 mt-1 block">
                  Completed {(currentSetIndex * SENTENCES_PER_SET) + completedSentences.size} of {CVC_SENTENCES.length} sentences
                </p>
              </div>

              {/* Controls — identical to Lesson 5 */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  size="sm"
                  onClick={() => {
                    if (currentSetIndex > 0) {
                      setCurrentSetIndex(prev => prev - 1);
                    } else if (onBack) {
                      onBack();
                    }
                  }}
                  disabled={currentSetIndex === 0 && !onBack}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)",
                  }}
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
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
                  onClick={handleNextQuiz}
                  disabled={completedSentences.size < activeSentences.length}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                  }}
                >
                  <span className="hidden sm:inline">Proceed</span>
                  <ArrowRight className="w-4 h-4 sm:ml-1" />
                </Button>
              </div>

              {/* Sentence List — identical layout to Lesson 5 */}
              <div className="w-full text-center mb-8">
                <div className="w-full bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeSentences.map((s, idx) => {
                    const isDone = completedSentences.has(s);
                    const isEval = evaluatingSentenceId === s;
                    const vFeedback = sentenceFeedbackMap[s];
                    const vTranscript = sentenceTranscriptsMap[s];

                    return (
                      <div
                        key={s}
                        className={`flex items-center justify-between p-4 h-full rounded-2xl transition-all
                          ${isDone || vFeedback === "correct" ? "bg-green-50 dark:bg-green-900/20" : vFeedback === "wrong" ? "bg-red-50 dark:bg-red-900/10" : "bg-white dark:bg-gray-800"}
                          shadow-sm border-2
                          ${isEval ? "border-pink-400 shadow-md" : isDone || vFeedback === "correct" ? "border-green-200" : vFeedback === "wrong" ? "border-red-200" : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"}`}
                      >
                        {/* Left: TTS + Sentence text */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-3">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playTTS(s)}
                              className={`rounded-full w-10 h-10 flex-shrink-0 transition-all ${
                                idx === 0 && !hasClickedTTS
                                  ? "bg-indigo-100 hover:bg-indigo-200 text-indigo-600 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 dark:text-indigo-300 ring-2 ring-indigo-400 ring-offset-2 animate-pulse"
                                  : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                              }`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                            {idx === 0 && !hasClickedTTS && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                  duration: 1.5,
                                }}
                                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none"
                              >
                                Click to listen!
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45" />
                              </motion.div>
                            )}
                          </div>
                          <span
                            className="text-xl font-bold text-left leading-snug"
                            style={{ color: isDone || vFeedback === "correct" ? "#58CC02" : accent.primary }}
                          >
                            {s}
                          </span>
                        </div>

                        {/* Right: feedback + mic */}
                        <div className="flex items-center gap-3 flex-shrink-0">


                          {/* Mic button — identical to Lesson 5 */}
                          <button
                            onClick={() => {
                              if (isEval) {
                                setEvaluatingSentenceId(null);
                              } else if (!isDone) {
                                setEvaluatingSentenceId(s);
                                setSentenceFeedbackMap(prev => ({ ...prev, [s]: null }));
                                setSentenceTranscriptsMap(prev => ({ ...prev, [s]: "" }));
                              }
                            }}
                            disabled={(evaluatingSentenceId !== null && !isEval) || isDone}
                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0
                              ${isDone || vFeedback === "correct"
                                ? "bg-green-500 text-white shadow-none opacity-50 cursor-default"
                                : isEval
                                  ? "bg-red-500 text-white shadow-lg"
                                  : vFeedback === "wrong"
                                    ? "bg-red-400 text-white"
                                    : "bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95"
                              }`}
                          >
                            {isEval && (
                              <>
                                <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
                                <span className="absolute -inset-1 rounded-xl bg-red-500/20 animate-pulse" />
                              </>
                            )}
                            <span className="relative z-10">
                              {isDone || vFeedback === "correct"
                                ? <CheckCircle2 className="w-6 h-6" />
                                : vFeedback === "wrong"
                                  ? <XCircle className="w-6 h-6" />
                                  : isEval
                                    ? <MicOff className="w-5 h-5 animate-bounce" />
                                    : <Mic className="w-5 h-5" />
                              }
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            /* Completion screen */
            <motion.div
              key="completion-screen"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 max-w-md mx-auto"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-block mb-6"
              >
                <Sparkles className="w-20 h-20 text-[#FFC800]" />
              </motion.div>
              <h3 className="text-3xl font-black mb-4" style={{ color: accent.primary }}>
                {isFinalSet ? "Level Mastered! 🎉" : "Set Complete! ⭐"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                {isFinalSet
                  ? `You successfully read all ${CVC_SENTENCES.length} sentences out loud! Awesome job!`
                  : "You successfully read 6 sentences! Ready for the next set?"}
              </p>

              {isFinalSet ? (
                <Button
                  disabled={isSaving}
                  onClick={handleFinish}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                >
                  {isSaving ? "Saving..." : isSubPhase ? "Finish Level 3 🏆" : "Back to Levels"}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setCurrentSetIndex(prev => prev + 1);
                    setShowConfetti(false);
                  }}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                >
                  Start Next 6 Sentences <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
