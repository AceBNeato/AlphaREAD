import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {Mic, Home, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, XCircle, MicOff, RotateCcw, AlertCircle, Volume2, Shuffle, Loader2, SkipForward, FastForward, X} from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { shuffle } from "../data/levels";
import { useCurriculum } from "../hooks/useCurriculum";
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
  const [words, setWords] = useState<string[]>(() => customWords ? customWords : shuffle(CVC_WORDS).slice(0, 10));

  const BATCH_SIZE = overrideBatchSize || 12;
  const batched = useBatchedItems(words, BATCH_SIZE);
  const batchWords = batched.currentBatch;

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
    
    const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
    if (!completedLevels.includes(levelId)) {
      completedLevels.push(levelId);
      localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
    }
    
    if (onComplete) {
      onComplete();
    }
  };

  const wordsEval = useEvaluationFlow({
    words,
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
      const audioPath = `${(import.meta as any).env.BASE_URL}audio/sentences-audio/${slugified}`;
      playExclusiveAudio(audioPath).catch((err) => {
        console.warn(`[AlphabetGO] Local sentence audio not found: ${audioPath}, falling back to TTS`, err);
        playTTS(text);
      });
      return;
    }

    // Use local audio files for Words based on level
    let wordAudioPath = null;
    if (levelId === 6) {
      wordAudioPath = `${(import.meta as any).env.BASE_URL}audio/blends-audio/${text.toLowerCase()}.mp3`;
    } else if (levelId === 5) {
      wordAudioPath = `${(import.meta as any).env.BASE_URL}audio/long-vowels-audio/${text.toLowerCase()}.mp3`;
    } else if (levelId === 3 && CVC_WORDS.includes(upper)) {
      wordAudioPath = `${(import.meta as any).env.BASE_URL}audio/cvc-audio/cvc-${text.toLowerCase()}.mp3`;
    }

    if (wordAudioPath) {
      playExclusiveAudio(wordAudioPath).catch((err) => {
        console.warn(`[AlphabetGO] Local word audio not found: ${wordAudioPath}, falling back to TTS`, err);
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

  const handleGoBack = async () => {
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
                <span className="text-6xl font-extrabold mb-4 tracking-wider" style={{ color: accent.primary }}>
                  {wordsEval.evaluatingWord && wordsEval.evaluatingWord === wordsEval.evaluatingWord.toUpperCase() ? wordsEval.evaluatingWord.toLowerCase() : wordsEval.evaluatingWord}
                </span>
                
                <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />
                
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2">Heard</span>
                <span className="text-6xl font-extrabold tracking-wider text-gray-700 dark:text-gray-300 min-h-[60px] flex items-center justify-center w-full break-words">
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

      {/* Content */}
      <div className={`w-full ${isSubPhase ? 'max-w-5xl py-2' : 'max-w-2xl py-6'} mx-auto px-4`}>

        {!(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>Your browser doesn't support the Voice Recognition API. Please use Chrome or a modern mobile browser.</p>
          </div>
        )}

        <>

            <div className="text-center">
              <p className="text-white text-base sm:text-lg font-bold mt-6 block">
                Say each word out loud into the microphone. (Batch {batched.batchIndex + 1} of {batched.totalBatches})
              </p>
              <p className="text-sm font-semibold text-pink-300 dark:text-pink-400 mt-1 block">
                Completed {wordsEval.completedWords.size} of {words.length} {levelId === 3 ? "CVC words" : levelId === 5 ? "Long Vowel words" : levelId === 6 ? "Blends" : "words"}
              </p>
            </div>

            {/* Teacher Controls Row */}
            <ActionToolbar
              onBack={handleBackClick}
              canBack={!!(onBack || batched.batchIndex > 0)}
              onShuffle={handleShuffle}
              onReset={handleReset}
              onSkip={handleSkip}
              onNext={handleNextClick}
              canNext={isCurrentBatchDone}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key="list-phase"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-8"
              >
                <div className={`${batchWords.length > 5 ? `grid grid-cols-1 ${gridColumns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3` : 'space-y-3'} bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700`}>
                  {batchWords.map((w, idx) => {
                    const isDone = wordsEval.completedWords.has(w);
                    const isCurrent = wordsEval.evaluatingWord === w;
                    const feedback = wordsEval.evalFeedback[w];
                    const transcript = wordsEval.transcripts[w];

                    return (
                      <div key={w} className={`flex items-center justify-between ${batchWords.length >= 10 ? 'p-2 sm:p-3' : 'p-4'} rounded-2xl transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isCurrent ? 'border-pink-400 shadow-md' : isDone ? 'border-green-200' : 'border-transparent'}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0 flex items-center justify-center pt-1 sm:pt-0">
                            <button
                              onClick={() => handlePlayTTS(w)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDone ? 'bg-white/50 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40 text-green-700 dark:text-green-400 cursor-pointer shadow-sm active:translate-y-1' : 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 cursor-pointer shadow-sm active:translate-y-1'} ${idx === 0 && !hasClickedTTS && !isDone ? 'ring-2 ring-blue-400 ring-offset-1 animate-pulse' : ''}`}
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

                          {(() => {
                            const isSentence = w.includes(' ');
                            const textClass = isSentence
                              ? 'text-lg sm:text-xl font-semibold text-left flex-1 min-w-0 leading-snug'
                              : `${batchWords.length >= 10 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-bold text-left tracking-wider flex-1 min-w-0`;
                            return (
                              <span className={`${textClass} text-gray-800 dark:text-gray-200`} style={{ color: isDone ? '#58CC02' : undefined }}>
                                {wordHighlights && wordHighlights[w] ? (
                                  (w === w.toUpperCase() ? w.toLowerCase() : w).split('').map((char, ci) => (
                                    <span key={ci} className={wordHighlights[w].includes(ci) ? 'text-rose-400 font-black' : ''}>{char}</span>
                                  ))
                                ) : (
                                  w === w.toUpperCase() ? w.toLowerCase() : w
                                )}
                              </span>
                            );
                          })()}
                          {feedback === 'correct' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500 flex items-center gap-1 text-sm font-bold"><CheckCircle2 className="w-4 h-4" /> Correct!</motion.div>}
                          {feedback === 'close' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-blue-500 flex items-center gap-1 text-sm font-bold"><Sparkles className="w-4 h-4" /> Close enough!</motion.div>}
                          {feedback === 'wrong' && (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`flex items-center justify-center gap-1 font-bold text-sm text-red-500`}>
                              <AlertCircle className="w-4 h-4" /> Try again!
                            </motion.div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2 relative">
                          <button
                            onClick={() => {
                              setHasClickedMic(true);
                              if (isCurrent) {
                                wordsEval.safeSetEvaluatingWordNull();
                              } else {
                                wordsEval.startRecording(w);
                              }
                            }}
                            disabled={(wordsEval.evaluatingWord !== null && !isCurrent) || isDone || wordsEval.isMicResetting}
                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default' : isCurrent ? 'bg-red-500 text-white shadow-lg' : wordsEval.isMicResetting ? 'bg-gray-300 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:translate-y-1'} ${idx === 0 && !hasClickedMic && !isDone ? 'ring-2 ring-pink-400 ring-offset-2 animate-pulse' : ''}`}
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
