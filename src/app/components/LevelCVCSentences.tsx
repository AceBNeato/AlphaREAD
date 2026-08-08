import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { Home, Mic, MicOff, CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, RotateCcw, SkipForward, FastForward, Volume2, Shuffle, X, AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { useCurriculum } from "../hooks/useCurriculum";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { playSound, playExclusiveAudio } from "../utils/soundEffects";
import { playTTS as playTTSUtil } from "../utils/tts";
import { AudioVisualizer } from "./AudioVisualizer";
import { PushableButton } from "./ui/PushableButton";
import { ActionToolbar } from "./ui/ActionToolbar";
import { useLanguage } from "../context/LanguageContext";
import { useProgress } from "../hooks/useProgress";

interface LevelCVCSentencesProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  isSubPhase?: boolean;
  onComplete?: () => void;
  onBack?: () => void;
}

const SENTENCES_PER_SET = 10;

export function LevelCVCSentences({ levelId, accent, isSubPhase, onComplete, onBack }: LevelCVCSentencesProps) {
  const navigate = useNavigate();
  const { sentences } = useCurriculum();
  const { language } = useLanguage();
  const { markLevelComplete } = useProgress();
  const totalSets = Math.ceil(sentences.length / SENTENCES_PER_SET);

  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [activeSentences, setActiveSentences] = useState<string[]>([]);

  // Per-sentence state maps (matches Lesson 5 pattern)
  const [evaluatingSentenceId, setEvaluatingSentenceId] = useState<string | null>(null);
  const [completedSentences, setCompletedSentences] = useState<Set<string>>(new Set());
  const [sentenceFeedbackMap, setSentenceFeedbackMap] = useState<Record<string, "correct" | "close" | "wrong" | null>>({});
  const [sentenceTranscriptsMap, setSentenceTranscriptsMap] = useState<Record<string, string>>({});
  const [isMicSleeping, setIsMicSleeping] = useState(false);

  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasClickedTTS, setHasClickedTTS] = useState(false);
  const [hasClickedMic, setHasClickedMic] = useState(false);

  const evaluationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sentenceMatchCountMap, setSentenceMatchCountMap] = useState<Record<string, number>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);

  const clearEvalTimeout = useCallback(() => {
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
  }, []);

  const safeSetEvaluatingSentenceNull = useCallback(() => {
    setEvaluatingSentenceId(null);
    setIsMicSleeping(false);
  }, []);

  useEffect(() => () => clearEvalTimeout(), [clearEvalTimeout]);

  // Load sentences for current set
  useEffect(() => {
    setActiveSentences(sentences.slice(currentSetIndex * SENTENCES_PER_SET, (currentSetIndex + 1) * SENTENCES_PER_SET));
    setCompletedSentences(new Set());
    setSentenceFeedbackMap({});
    setSentenceTranscriptsMap({});
    setSentenceMatchCountMap({});
    setEvaluatingSentenceId(null);
  }, [currentSetIndex]);

  const playTTS = (text: string) => {
    setHasClickedTTS(true);
    const slugified = text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '.mp3';
    let audioPath = `${import.meta.env.BASE_URL}audio/english/sentences-audio/${slugified}`;
    
    if (language === "tl") {
      const lvlDir = levelId === 3 ? "level3" : "level4";
      audioPath = `${import.meta.env.BASE_URL}audio/filipino/sentences-audio/${lvlDir}/${slugified}`;
    }

    playExclusiveAudio(audioPath).catch((err) => {
      console.warn(`[AlphabetGO] Local sentence audio not found: ${audioPath}`, err);
    });
  };

  // Voice result handler (matches Lesson 5 pattern)
  const handleResult = useCallback(
    (target: string, status: "correct" | "close" | "wrong" | null, transcript: string, matchedWordCount?: number) => {
      setSentenceTranscriptsMap(prev => ({ ...prev, [target]: transcript }));
      if (matchedWordCount !== undefined) {
        setSentenceMatchCountMap(prev => ({ ...prev, [target]: matchedWordCount }));
      }

      const tClean = transcript.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      const targetClean = target.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      const tNoSpace = tClean.replace(/\s+/g, "");
      const targetNoSpace = targetClean.replace(/\s+/g, "");
      const isCorrect = status === "correct" || status === "close" || tClean.includes(targetClean) || tNoSpace.includes(targetNoSpace);

      if (status === null && !isCorrect) return;

      clearEvalTimeout();

      if (isCorrect) {
        playSound("correct", 0.4);
        playTTS(target);
        setSentenceFeedbackMap(prev => ({ ...prev, [target]: "correct" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setCompletedSentences(prev => new Set(prev).add(target));
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
    [clearEvalTimeout, safeSetEvaluatingSentenceNull]
  );

  useSpeechRecognition({
    evaluatingWord: evaluatingSentenceId,
    enabled: !!evaluatingSentenceId,
    singleShot: false, // Continuous mode: keeps mic alive through pauses for slow readers
    lang: language === "tl" ? "fil-PH" : "en-US",
    refreshTrigger,
    initialTranscript: evaluatingSentenceId ? (sentenceTranscriptsMap[evaluatingSentenceId] || "") : "",
    onResult: handleResult,
    onError: () => safeSetEvaluatingSentenceNull(),
    onEngineStop: () => setIsMicSleeping(true),
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
    setSentenceMatchCountMap({});
  };

  const handleReset = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setEvaluatingSentenceId(null);
    setActiveSentences(sentences.slice(currentSetIndex * SENTENCES_PER_SET, (currentSetIndex + 1) * SENTENCES_PER_SET));
    setCompletedSentences(new Set());
    setSentenceFeedbackMap({});
    setSentenceTranscriptsMap({});
    setSentenceMatchCountMap({});
  };

  const handleNextQuiz = () => {
    playSound("click", 0.2);
    if (!isFinalSet) {
      setCurrentSetIndex(prev => prev + 1);
    } else if (isSubPhase && onComplete) {
      // Skip internal celebration — parent component shows its own completion screen
      handleFinish();
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
    playSound("click", 0.2);
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleFinish = async () => {
    setIsSaving(true);
    markLevelComplete(levelId);
    setIsSaving(false);

    if (onComplete) {
      onComplete();
    } else {
      navigate("/levels");
    }
  };

  const isFinalSet = currentSetIndex === totalSets - 1;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={showConfetti ? "completion-screen" : `sentences-set-${currentSetIndex}`}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className={`flex flex-col overflow-hidden ${isSubPhase ? 'flex-1 w-full h-full' : 'h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:bg-none dark:bg-[#0d141c]'}`}
      >
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
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-[0_12px_40px_rgba(0,0,0,0.2)] border-4 border-b-[10px]"
                style={{ borderColor: accent.primary }}
              >
                <div className="flex flex-col items-center justify-center gap-2 mb-6">
                  {sentenceFeedbackMap[evaluatingSentenceId] === 'correct' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center gap-2 text-green-500">
                      <CheckCircle2 className="w-10 h-10 mb-2" />
                      <h3 className="text-2xl font-bold tracking-tight">Perfect!</h3>
                    </motion.div>
                  ) : sentenceFeedbackMap[evaluatingSentenceId] === 'close' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center gap-2 text-blue-500">
                      <Sparkles className="w-10 h-10 mb-2" />
                      <h3 className="text-2xl font-bold tracking-tight">Almost there!</h3>
                    </motion.div>
                  ) : isMicSleeping ? (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center gap-2">
                      <MicOff className="w-6 h-6 text-gray-400" />
                      <h3 className="text-2xl font-bold tracking-tight text-gray-500">Paused</h3>
                    </motion.div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <Mic className="w-6 h-6 text-pink-500 animate-pulse" />
                        <h3 className="text-2xl font-bold tracking-tight text-pink-500 animate-pulse">Listening...</h3>
                      </div>
                      <AudioVisualizer isListening={!!evaluatingSentenceId} isMobile={isMobile} />
                    </>
                  )}
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">
                  {isMicSleeping ? "Take a breath and tap below to continue." : "Please read the sentence clearly."}
                </p>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 min-h-[100px] flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target</span>
                  
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mb-4">
                    {(() => {
                      const targetWords = evaluatingSentenceId.split(/\s+/);
                      const currentMatch = sentenceMatchCountMap[evaluatingSentenceId] || 0;
                      
                      return targetWords.map((word, idx) => {
                        const isMatched = idx < currentMatch;
                        const isCurrent = idx === currentMatch;
                        
                        let colorClass = "text-gray-300 dark:text-gray-600";
                        if (isMatched) colorClass = "text-green-500 font-extrabold";
                        else if (isCurrent) colorClass = "text-pink-500 font-extrabold";
                        
                        return (
                          <motion.span 
                            key={idx} 
                            animate={isMatched ? { y: [0, -10, 0] } : { y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`text-2xl sm:text-3xl inline-block ${colorClass}`}
                          >
                            {word}
                          </motion.span>
                        );
                      });
                    })()}
                  </div>
                </div>

                {sentenceFeedbackMap[evaluatingSentenceId] === 'wrong' && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-red-500 font-bold flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-xl">
                    <AlertCircle className="w-5 h-5" /> Let's try again!
                  </motion.div>
                )}
                {isMicSleeping ? (
                  <div className="mt-6">
                    <PushableButton
                      onClick={() => {
                        setIsMicSleeping(false);
                        setRefreshTrigger(prev => prev + 1);
                      }}
                      className="w-full"
                      frontClassName="bg-gradient-to-r from-pink-500 to-rose-500 text-white w-full rounded-xl py-4 flex items-center justify-center gap-2 font-bold text-lg"
                      edgeClassName="bg-rose-700"
                    >
                      <Mic className="w-6 h-6 animate-pulse" /> Continue Reading
                    </PushableButton>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col gap-3">
                    {sentenceFeedbackMap[evaluatingSentenceId] && sentenceFeedbackMap[evaluatingSentenceId] !== 'wrong' && (
                      <PushableButton
                        onClick={() => {
                          setSentenceTranscriptsMap(prev => ({ ...prev, [evaluatingSentenceId]: "" }));
                          setSentenceMatchCountMap(prev => ({ ...prev, [evaluatingSentenceId]: 0 }));
                          setRefreshTrigger(prev => prev + 1);
                          setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: null }));
                        }}
                        className="w-full mt-2"
                        frontClassName="bg-gradient-to-r from-[#1cb0f6] to-[#0a8ed4] text-white w-full rounded-xl py-3 flex items-center justify-center gap-2"
                        edgeClassName="bg-[#0979b5]"
                      >
                        <RefreshCcw className="w-5 h-5" /> Retry
                      </PushableButton>
                    )}
                    <PushableButton
                      onClick={() => {
                        clearEvalTimeout();
                        safeSetEvaluatingSentenceNull();
                        setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: null }));
                      }}
                      className="w-full"
                      frontClassName="bg-gradient-to-r from-[rgb(255,75,75)] to-[rgb(216,42,42)] text-white w-full rounded-xl py-3 flex items-center justify-center font-bold"
                      edgeClassName="bg-[rgb(168,34,34)]"
                    >
                      Close
                    </PushableButton>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        {!isSubPhase && (
          <div className="shrink-0 z-10 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 w-full">
              <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center p-2">
                <X className="!w-8 !h-8 sm:!w-10 sm:!h-10 stroke-[3]" />
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
        <div className={`w-full max-w-5xl mx-auto px-15 flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col ${isSubPhase ? 'py-2' : 'py-4'}`}>
          {!showConfetti ? (
            <div className="flex flex-col justify-between w-full flex-1">
              {/* Top Section: Instructions */}
              <div className="text-center shrink-0">
                <p className="text-gray-800 dark:text-gray-200 text-base sm:text-lg font-bold mt-2 block">
                  Read the sentences out loud into the microphone. (Batch {currentSetIndex + 1} of {totalSets})
                </p>
                <p className="text-sm font-semibold text-pink-650 dark:text-pink-400 mt-1 block">
                  Completed {(currentSetIndex * SENTENCES_PER_SET) + completedSentences.size} of {sentences.length} sentences
                </p>
              </div>

              {/* Middle Section: Centered Interactive Area */}
              <div className="flex-grow flex flex-col justify-center w-full py-4 shrink-0">
                <div className="w-full text-center">
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
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 mr-3">
                            <div className="relative">
                              <PushableButton
                                as="button"
                                isTile
                                onClick={() => playTTS(s)}
                                className={`w-14 h-14 flex-shrink-0 transition-all ${idx === 0 && !hasClickedTTS
                                  ? "ring-2 ring-indigo-400 ring-offset-2 animate-pulse"
                                  : ""
                                  }`}
                                frontClassName={
                                  idx === 0 && !hasClickedTTS
                                    ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300"
                                    : "bg-[#1cb0f6] text-white"
                                }
                                edgeClassName={
                                  idx === 0 && !hasClickedTTS
                                    ? "bg-indigo-200 dark:bg-indigo-950"
                                    : "bg-[#0979b5]"
                                }
                              >
                                <Volume2 className="w-6 h-6" />
                              </PushableButton>
                              {idx === 0 && !hasClickedTTS && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                    duration: 1.5,
                                  }}
                                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                                >
                                  Click to listen!
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45" />
                                </motion.div>
                              )}
                            </div>
                            <span
                              className={`text-base sm:text-xl font-bold text-left leading-snug ${!(isDone || vFeedback === "correct") ? "text-gray-800 dark:text-white" : ""}`}
                              style={{ color: isDone || vFeedback === "correct" ? "#58CC02" : undefined }}
                            >
                              {s}
                            </span>
                          </div>

                          {/* Right: feedback + mic */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Mic button — identical to Lesson 5 */}
                            <PushableButton
                              as="button"
                              isTile
                              onClick={() => {
                                setHasClickedMic(true);
                                if (isEval) {
                                  setEvaluatingSentenceId(null);
                                } else if (!isDone) {
                                  setEvaluatingSentenceId(s);
                                  setSentenceFeedbackMap(prev => ({ ...prev, [s]: null }));
                                  setSentenceTranscriptsMap(prev => ({ ...prev, [s]: "" }));
                                }
                              }}
                              disabled={(evaluatingSentenceId !== null && !isEval) || isDone}
                              className="relative w-14 h-14 flex-shrink-0"
                              frontClassName={
                                isDone || vFeedback === "correct"
                                  ? "bg-green-500 text-white"
                                  : isEval
                                    ? "bg-red-500 text-white"
                                    : vFeedback === "wrong"
                                      ? "bg-red-400 text-white"
                                      : "bg-gradient-to-br from-pink-500 to-rose-500 text-white"
                              }
                              edgeClassName={
                                isDone || vFeedback === "correct"
                                  ? "bg-green-600"
                                  : isEval
                                    ? "bg-red-600"
                                    : vFeedback === "wrong"
                                      ? "bg-red-500"
                                      : "bg-pink-700"
                              }
                            >
                              {isEval && (
                                <>
                                  <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
                                  <span className="absolute -inset-1 rounded-xl bg-red-500/20 animate-pulse" />
                                </>
                              )}
                              <span className="relative z-10 flex items-center justify-center h-full w-full">
                                {isDone || vFeedback === "correct" ? <CheckCircle2 className="w-6 h-6" /> : vFeedback === "wrong" ? <XCircle className="w-6 h-6" /> : isEval ? <MicOff className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
                              </span>
                            </PushableButton>
                            {idx === 0 && !hasClickedMic && (!isDone || vFeedback !== "correct") && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                  duration: 1.5,
                                }}
                                className="absolute -top-12 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
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
                </div>            </div>
            </div>
          ) : (
            /* Completion screen */
            <div className="text-center py-12 max-w-md mx-auto my-auto">
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
                  ? `You successfully read all ${sentences.length} sentences out loud! Awesome job!`
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
            </div>
          )}
        </div>

        {!showConfetti && (
          <div className="w-full shrink-0 mt-auto">
            <ActionToolbar
              onBack={() => {
                if (currentSetIndex > 0) {
                  setCurrentSetIndex(prev => prev - 1);
                } else if (onBack) {
                  onBack();
                }
              }}
              canBack={currentSetIndex > 0 || !!onBack}
              onShuffle={handleShuffle}
              onSkip={handleSkip}
              onNext={handleNextQuiz}
              canNext={completedSentences.size === activeSentences.length}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
