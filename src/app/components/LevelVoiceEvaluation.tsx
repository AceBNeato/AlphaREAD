import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Mic, Home, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, XCircle, MicOff, RotateCcw, AlertCircle, Volume2, Shuffle, Loader2, SkipForward, FastForward, X } from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { PushableButton } from "./ui/PushableButton";
import { shuffle } from "../data/levels";
import { useCurriculum } from "../hooks/useCurriculum";
import { useLanguage } from "../context/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { evaluateSyllable, isSyllableTarget } from "../utils/PhonemeEvaluator";
import { playSound, playExclusiveAudio } from "../utils/soundEffects";
import { LessonProgressHeader } from "./ui/LessonProgressHeader";
import { ActionToolbar } from "./ui/ActionToolbar";
import { AudioVisualizer } from "./AudioVisualizer";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { playTTS } from "../utils/tts";
import { useBatchedItems } from "../hooks/useBatchedItems";
import { useEvaluationFlow } from "../hooks/useEvaluationFlow";
import { useProgress } from "../hooks/useProgress";


interface LevelVoiceEvaluationProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  customWords?: string[];
  isSubPhase?: boolean;
  onComplete?: () => void;
  onBack?: () => void;
  wordHighlights?: Record<string, number[]>;
  gridColumns?: number;
  overrideBatchSize?: number;
}

export function LevelVoiceEvaluation({ levelId, accent, customWords, isSubPhase, onComplete, onBack, wordHighlights, gridColumns, overrideBatchSize }: LevelVoiceEvaluationProps) {
  const navigate = useNavigate();
  const { CVC_WORDS, getPhoneticPronunciation } = useCurriculum();
  const { language } = useLanguage();
  const [words, setWords] = useState<string[]>(() => customWords ? customWords : shuffle(CVC_WORDS).slice(0, 10));

  const BATCH_SIZE = overrideBatchSize || 12;
  const batched = useBatchedItems(words, BATCH_SIZE);
  const batchWords = batched.currentBatch;
  
  const { markLevelComplete, completedLevels } = useProgress();

  const [hasClickedTTS, setHasClickedTTS] = useState(false);
  const [hasClickedMic, setHasClickedMic] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [showShyTip, setShowShyTip] = useState(false);

  // Detect mobile — on phones we skip getUserMedia to avoid mic conflict with SpeechRecognition
  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);
  const isIOS = useMemo(() => /iPhone|iPad|iPod/i.test(navigator.userAgent), []);

  const handleNext = () => {
    playSound("complete", 0.5);
    wordsEval.safeSetEvaluatingWordNull();
    if (isSubPhase && onComplete) {
      onComplete();
      return;
    }

    markLevelComplete(levelId);

    if (onComplete) {
      onComplete();
    }
  };

  const wordsEval = useEvaluationFlow({
    words,
    lang: language === "tl" ? "fil-PH" : "en-US",
    onAllCompleted: () => setShowCompletionScreen(true),
    onWordCompleted: (word, newCompleted) => {
      // Option: Auto-advance batch if current batch is fully complete?
      // For now, keep the Next Batch button manual as in original.
    }
  });

  const isCurrentBatchDone = useMemo(() => {
    return batchWords.length > 0 && batchWords.every(w => wordsEval.completedWords.has(w));
  }, [batchWords, wordsEval.completedWords]);

  const handleShuffle = () => {
    playSound("click", 0.2);
    setWords(shuffle([...words]));
    batched.setBatchIndex(0);
    wordsEval.resetFlow();
  };

  const handleReset = () => {
    playSound("click", 0.2);
    batched.setBatchIndex(0);
    wordsEval.resetFlow();
  };

  const handleNextClick = () => {
    if (!batched.isLastBatch) {
      batched.nextBatch();
    } else {
      handleNext();
    }
  };

  const handleBackClick = () => {
    if (batched.batchIndex > 0) {
      const prevBatchIndex = batched.batchIndex - 1;
      const prevBatchWords = words.slice(prevBatchIndex * BATCH_SIZE, (prevBatchIndex + 1) * BATCH_SIZE);

      wordsEval.setCompletedWords(prev => {
        const next = new Set(prev);
        prevBatchWords.forEach(w => next.delete(w));
        return next;
      });

      wordsEval.setEvalFeedback(prev => {
        const next = { ...prev };
        prevBatchWords.forEach(w => delete next[w]);
        return next;
      });

      wordsEval.setTranscripts(prev => {
        const next = { ...prev };
        prevBatchWords.forEach(w => delete next[w]);
        return next;
      });

      batched.prevBatch();
    } else if (onBack) {
      onBack();
    }
  };

  const handleSkip = () => {
    wordsEval.skipFlow(batchWords);
    if (!batched.isLastBatch) {
      batched.nextBatch();
    } else {
      handleNext();
    }
  };

  const handlePlayTTS = async (text: string) => {
    setHasClickedTTS(true);
    const upper = text.toUpperCase();

    // Use local audio files for sentences (Level 3, 5, 6)
    if (text.includes(' ')) {
      const slugified = text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '.mp3';
      let audioPath = `${import.meta.env.BASE_URL}audio/english/sentences-audio/${slugified}`;

      if (language === "tl") {
        const lvlDir = levelId === 3 ? "level3" : "level4";
        audioPath = `${import.meta.env.BASE_URL}audio/filipino/sentences-audio/${lvlDir}/${slugified}`;
      }

      playExclusiveAudio(audioPath).catch((err) => {
        console.warn(`[AlphabetGO] Local sentence audio not found: ${audioPath}`, err);
      });
      return;
    }

    // Use local audio files for Words based on level
    let wordAudioPath = null;
    if (levelId === 6 || levelId === 4) {
      if (language === "tl") {
        playExclusiveAudio(`${import.meta.env.BASE_URL}audio/filipino/diptonggo/fil-level4-${text.toLowerCase()}.mp3`)
          .catch(() => playExclusiveAudio(`${import.meta.env.BASE_URL}audio/filipino/kambalkatinig/fil-level4-${text.toLowerCase()}.mp3`))
          .catch(() => playExclusiveAudio(`${import.meta.env.BASE_URL}audio/filipino/tagalog-words/fil-level4-${text.toLowerCase()}.mp3`))
          .catch(() => {
            console.warn(`[AlphabetGO] Local word audio not found for: ${text}`);
          });
        return;
      }
      wordAudioPath = `${import.meta.env.BASE_URL}audio/english/blends-audio/${text.toLowerCase()}.mp3`;
    } else if (levelId === 5) {
      wordAudioPath = `${import.meta.env.BASE_URL}audio/english/long-vowels-audio/${text.toLowerCase()}.mp3`;
    } else if (levelId === 3 && CVC_WORDS.includes(upper)) {
      wordAudioPath = language === "tl"
        ? `${import.meta.env.BASE_URL}audio/filipino/tagalog-words/fil-level3-${text.toLowerCase()}.mp3`
        : `${import.meta.env.BASE_URL}audio/english/cvc-audio/cvc-${text.toLowerCase()}.mp3`;
    }

    if (wordAudioPath) {
      playExclusiveAudio(wordAudioPath).catch((err) => {
        console.warn(`[AlphabetGO] Local word audio not found: ${wordAudioPath}, falling back to TTS`, err);
        playTTS(text.replace(/-HARD|-SOFT/i, "").toLowerCase());
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

  const handleGoBack = async () => {
    playSound("click", 0.2);
    if (!showCompletionScreen) {
      const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
      if (!confirmExit) return;
    }
    navigate("/levels", { replace: true });
  };

  return (
    <div className={`overflow-x-hidden ${isSubPhase ? 'flex-1 w-full flex flex-col' : 'min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:bg-none dark:bg-[#0d141c]'}`}>
      <Confetti active={wordsEval.showConfetti} />

      {/* Listening Modal */}
      <AnimatePresence>
        {wordsEval.evaluatingWord && !showCompletionScreen && (
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
                <AudioVisualizer isListening={!!wordsEval.evaluatingWord} isMobile={isMobile} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">Please say the word clearly.</p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 min-h-[100px] flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target</span>
                <span className={`${wordsEval.evaluatingWord?.includes(' ') ? 'text-2xl sm:text-2xl' : 'text-6xl'} font-extrabold mb-4 tracking-wider leading-snug`} style={{ color: accent.primary }}>
                  {wordsEval.evaluatingWord && wordsEval.evaluatingWord === wordsEval.evaluatingWord.toUpperCase() ? wordsEval.evaluatingWord.toLowerCase() : wordsEval.evaluatingWord}
                </span>

                <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />

                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2">Heard</span>
                <span className={`${wordsEval.evaluatingWord?.includes(' ') ? 'text-2xl sm:text-3xl' : 'text-6xl'} font-extrabold tracking-wider leading-snug text-gray-700 dark:text-gray-300 min-h-[60px] flex items-center justify-center w-full break-words`}>
                  {wordsEval.transcripts[wordsEval.evaluatingWord] ? `"${wordsEval.transcripts[wordsEval.evaluatingWord]}"` : <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                </span>
              </div>

              {wordsEval.evalFeedback[wordsEval.evaluatingWord] === 'wrong' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-red-500 font-bold flex items-center justify-center gap-2 bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-xl">
                  <AlertCircle className="w-5 h-5" /> Let's try again!
                </motion.div>
              )}
              {wordsEval.evalFeedback[wordsEval.evaluatingWord] === 'correct' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-green-500 font-bold flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 py-2 px-4 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" /> Perfect!
                </motion.div>
              )}
              {wordsEval.evalFeedback[wordsEval.evaluatingWord] === 'close' && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 text-blue-500 font-bold flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 py-2 px-4 rounded-xl">
                  <Sparkles className="w-5 h-5" /> Almost there!
                </motion.div>
              )}

              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => wordsEval.safeSetEvaluatingWordNull()}
                  className="flex-1 rounded-xl font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-2"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      {!isSubPhase && (
        <LessonProgressHeader
          useXIcon={true}
          onExit={handleGoBack}
          title={levelId === 3 ? "CVC Master - Voice Evaluation" : "Voice Evaluation"}
          progressPercentage={(wordsEval.completedWords.size / words.length) * 100}
          accentColor={accent.primary}
          rightContent={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShyTip(true)}
              className="rounded-full flex items-center gap-1.5 border-pink-200 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-500 font-medium text-xs px-3 py-1.5 shadow-sm"
            >
              <span>🗣️</span>
              <span className="hidden sm:inline">Shy Learner?</span>
            </Button>
          }
        />
      )}

      {/* iOS warning */}
      {isIOS && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 mx-4 text-amber-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p><strong>iOS Notice:</strong> Voice recognition requires Chrome on Android or a desktop browser. Safari on iPhone/iPad does not support this feature.</p>
        </div>
      )}

      <div className="flex-grow w-full flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto w-full">
          <div className={`w-full flex flex-col justify-center min-h-full ${isSubPhase ? 'max-w-5xl' : 'max-w-2xl'} mx-auto px-15 py-4`}>

            {!window.SpeechRecognition && !window.webkitSpeechRecognition && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-800 text-sm flex items-center gap-3 shrink-0">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>Your browser doesn't support the Voice Recognition API. Please use Chrome or a modern mobile browser.</p>
              </div>
            )}

            <>
              {/* Top Section: Instructions */}
              <div className="text-center shrink-0">
                <p className="text-gray-800 dark:text-gray-200 text-base sm:text-xl font-bold mt-4 block">
                  Say each {words.some(w => w.includes(' ')) ? 'sentence' : 'word'} out loud into the microphone. (Batch {batched.batchIndex + 1} of {batched.totalBatches})
                </p>
                <p className="text-sm font-semibold text-pink-600 dark:text-pink-400 mt-1 block">
                  Completed {wordsEval.completedWords.size} of {words.length} {words.some(w => w.includes(' ')) ? 'sentences' : levelId === 3 ? "CVC words" : levelId === 5 ? "Long Vowel words" : levelId === 6 ? "Blends" : "words"}
                </p>
              </div>

              {/* Middle Section: Centered Interactive Grid */}
              <div className="flex-1 flex flex-col justify-center w-full py-4 shrink-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key="list-phase"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="text-center w-full"
                  >
                    <div className={`${batchWords.length > 5 ? `grid grid-cols-1 ${gridColumns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3` : 'space-y-3'} bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 w-full`}>
                      {batchWords.map((w, idx) => {
                        const isDone = wordsEval.completedWords.has(w);
                        const isCurrent = wordsEval.evaluatingWord === w;
                        const feedback = wordsEval.evalFeedback[w];
                        const transcript = wordsEval.transcripts[w];

                        return (
                          <div key={w} className={`flex items-center justify-between ${batchWords.length >= 10 ? 'p-2 sm:p-3' : 'p-4'} rounded-2xl transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isCurrent ? 'border-pink-400 shadow-md' : isDone ? 'border-green-200' : 'border-transparent'}`}>
                            <div className="flex flex-row items-center gap-3 min-w-0 flex-1">
                              <div className="relative shrink-0 flex items-center justify-center pt-1 sm:pt-0">
                                <PushableButton
                                  as="button"
                                  isTile
                                  onClick={() => handlePlayTTS(w)}
                                  className={`w-14 h-14 flex-shrink-0 transition-all ${idx === 0 && !hasClickedTTS && !isDone ? 'ring-2 ring-blue-400 ring-offset-2 animate-pulse' : ''}`}
                                  frontClassName={
                                    isDone
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                      : "bg-[#1cb0f6] text-white"
                                  }
                                  edgeClassName={
                                    isDone
                                      ? "bg-green-200 dark:bg-green-900"
                                      : "bg-[#0979b5]"
                                  }
                                >
                                  <Volume2 className="w-6 h-6" />
                                </PushableButton>
                                {idx === 0 && !hasClickedTTS && !isDone && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                                    className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                                  >
                                    Tap to listen!
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rotate-45" />
                                  </motion.div>
                                )}
                              </div>

                              {(() => {
                                const isSentence = w.includes(' ');
                                const wordLen = w.replace(/-HARD|-SOFT/i, "").length;
                                const textClass = isSentence
                                  ? 'text-base sm:text-xl font-bold text-left flex-1 min-w-0 leading-snug'
                                  : wordLen >= 8
                                    ? 'text-lg sm:text-2xl font-bold text-left tracking-wider flex-1 min-w-0'
                                    : `text-2xl sm:text-4xl font-black text-left tracking-wider flex-1 min-w-0`;
                                return (
                                  <div className="flex flex-col">
                                    <span className={`${textClass} text-gray-800 dark:text-gray-200 flex items-center gap-1`} style={{ color: isDone ? '#58CC02' : undefined }}>
                                      {wordHighlights && wordHighlights[w] ? (
                                        (isSentence ? w : w.replace(/-HARD|-SOFT/i, "").toLowerCase()).split('').map((char, ci) => (
                                          <span key={ci} className={wordHighlights[w].includes(ci) ? 'font-black' : ''} style={{ color: wordHighlights[w].includes(ci) ? accent.primary : undefined }}>{char}</span>
                                        ))
                                      ) : (
                                        isSentence ? w : w.replace(/-HARD|-SOFT/i, "").toLowerCase()
                                      )}
                                      {w.toUpperCase().includes('-HARD') && <span className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider pt-1">HARD</span>}
                                      {w.toUpperCase().includes('-SOFT') && <span className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider pt-1">SOFT</span>}
                                    </span>
                                  </div>
                                );
                              })()}
                              {feedback === 'correct' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500 flex items-center gap-1 text-sm font-bold"><CheckCircle2 className="w-4 h-4" /> Correct!</motion.div>}
                              {feedback === 'close' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-blue-500 flex items-center gap-1 text-sm font-bold"><Sparkles className="w-4 h-4" /> Close enough!</motion.div>}

                            </div>

                            <div className="flex items-center gap-2 shrink-0 ml-2 relative">
                              <PushableButton
                                as="button"
                                isTile
                                onClick={() => {
                                  setHasClickedMic(true);
                                  if (isCurrent) {
                                    wordsEval.safeSetEvaluatingWordNull();
                                  } else {
                                    wordsEval.startRecording(w);
                                  }
                                }}
                                disabled={(wordsEval.evaluatingWord !== null && !isCurrent) || isDone || wordsEval.isMicResetting}
                                className="relative w-14 h-14 flex-shrink-0"
                                frontClassName={
                                  isDone
                                    ? "bg-green-500 text-white"
                                    : isCurrent
                                      ? "bg-red-500 text-white"
                                      : wordsEval.isMicResetting
                                        ? "bg-gray-300 dark:bg-gray-700 text-gray-400"
                                        : "bg-gradient-to-br from-pink-500 to-rose-500 text-white"
                                }
                                edgeClassName={
                                  isDone
                                    ? "bg-green-600"
                                    : isCurrent
                                      ? "bg-red-600"
                                      : wordsEval.isMicResetting
                                        ? "bg-gray-400 dark:bg-gray-800"
                                        : "bg-pink-700"
                                }
                              >
                                {isCurrent && (
                                  <>
                                    <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
                                    <span className="absolute -inset-1 rounded-xl bg-red-500/20 animate-pulse" />
                                  </>
                                )}
                                <span className="relative z-10 flex items-center justify-center h-full w-full">
                                  {isDone ? <CheckCircle2 className="w-6 h-6" /> : isCurrent ? <MicOff className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
                                </span>
                              </PushableButton>
                              {idx === 0 && !hasClickedMic && !isDone && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
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

                    <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                      Click the mic next to each word to practice its pronunciation
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          </div>
        </div>

        <ActionToolbar
          onBack={handleBackClick}
          canBack={!!(onBack || batched.batchIndex > 0)}
          onShuffle={handleShuffle}
          onReset={handleReset}
          onSkip={handleSkip}
          onNext={handleNextClick}
          canNext={isCurrentBatchDone}
        />
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
