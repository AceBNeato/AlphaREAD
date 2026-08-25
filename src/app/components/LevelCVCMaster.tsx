import React, { useState, useMemo, useEffect, cloneElement } from "react";
import { useLanguage } from "../context/LanguageContext";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { LevelCVCSentences } from "./LevelCVCSentences";
import { StepRenderer } from "./StepRenderer";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import { SyllableTarget } from "../data/levels";
import { TAGALOG_WORD_CHUNKS } from "../data/tagalog_levels";
import { useCurriculum } from "../hooks/useCurriculum";
import { X, ArrowLeft, Shuffle, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { confirmAction } from "../utils/alerts";
import { motion, AnimatePresence } from "motion/react";
import { Confetti } from "./ui/Confetti";
import { playExclusiveAudio, playSound } from "../utils/soundEffects";
import { playTTS } from "../utils/tts";
import { PushableButton } from "./ui/PushableButton";
import { ActionToolbar } from "./ui/ActionToolbar";
import { useProgress } from "../hooks/useProgress";

interface LevelCVCMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type StepPhase = "preview" | "build" | "type" | "eval" | "milestone" | "sentences" | "review";

interface GameStep {
  phase: StepPhase;
  words: string[];
  batchNumber?: number;
  totalBatches?: number;
  batchSize?: number;
}

function LevelCVCPreview({
  accent,
  words,
  onComplete,
  onSkip,
  onBack,
  canBack,
  batchNumber,
  totalBatches,
  isReview,
  onOrganize,
  onShuffle,
}: {
  accent: { primary: string; dark: string; lightBg: string };
  words: string[];
  onComplete: () => void;
  onSkip?: () => void;
  onBack: () => void;
  canBack: boolean;
  batchNumber?: number;
  totalBatches?: number;
  isReview?: boolean;
  onOrganize?: () => void;
  onShuffle?: () => void;
}) {
  const { language } = useLanguage();
  const isTagalog = language === "tl";
  const wordLabel = isTagalog ? "words" : "CVC words";
  
  const [flippedWords, setFlippedWords] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleShuffle = () => {
    setFlippedWords({});
    if (onShuffle) onShuffle();
  };

  const handleOrganize = () => {
    setFlippedWords({});
    if (onOrganize) onOrganize();
  };

  return (
    <div className="flex flex-col w-full h-full">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col items-center"
      >
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-10 py-4 text-center flex-1">
          <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 mb-12 sm:mb-16 block">
            {isReview
              ? `Great work! Review ${wordLabel}! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
              : `Review ${wordLabel} before we start! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
            }
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-8 lg:gap-12 mb-12 w-full max-w-6xl mx-auto justify-items-center px-2 sm:px-0">
            {words.map((word) => {
              let chunks: string[] = [];
              if (isTagalog) {
                const standardChunks = TAGALOG_WORD_CHUNKS[word.toUpperCase()];
                if (standardChunks && standardChunks.length > 0) {
                  chunks = standardChunks;
                } else {
                  chunks = word.match(/ng|Ng|NG|[A-Za-z]/g) || word.split("");
                }
              }

              const wordContent = (
                <span className="text-xl sm:text-2xl font-black drop-shadow-sm flex flex-col items-center justify-center">
                  <div className="flex">
                    {!isTagalog && word.length === 3 ? (
                      <>
                        <span style={{ color: "#FF6B8A" }}>{word.slice(0, 2).toLowerCase()}</span>
                        <span style={{ color: "#1CB0F6" }}>{word.slice(2).toLowerCase()}</span>
                      </>
                    ) : (
                      chunks.length > 0 ? (
                        chunks.map((ch, i) => (
                          <span key={i} style={{ color: i % 2 === 0 ? "#1CB0F6" : "#FF6B8A" }}>
                            {ch.toLowerCase()}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#1CB0F6" }}>{word.toLowerCase()}</span>
                      )
                    )}
                  </div>
                  {word.toUpperCase().includes('-HARD') && <span className="text-[8px] sm:text-[10px] text-gray-400 font-bold tracking-wider">HARD</span>}
                  {word.toUpperCase().includes('-SOFT') && <span className="text-[8px] sm:text-[10px] text-gray-400 font-bold tracking-wider">SOFT</span>}
                </span>
              );

              return (
                <motion.div
                  key={word}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center w-full gap-4 max-w-[160px] md:max-w-[220px]"
                >
                  {/* The Card */}
                  <div 
                    className="relative w-full aspect-[3/4] group cursor-pointer md:cursor-default" 
                    style={{ perspective: '1000px' }}
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        setFlippedWords(prev => ({...prev, [word]: !prev[word]}));
                      }
                    }}
                  >
                    <motion.div 
                      className="w-full h-full relative"
                      style={{ transformStyle: 'preserve-3d' }}
                      animate={ flippedWords[word] ? { rotateY: 180, y: [0, -30, 0] } : { rotateY: 0, y: 0 } }
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    >
                      {/* Front (Skeleton Question Mark) */}
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl border-4 border-dashed border-gray-300 dark:border-gray-600 transition-colors group-hover:border-blue-400 dark:group-hover:border-blue-500" style={{ backfaceVisibility: 'hidden' }}>
                        <span className="text-6xl sm:text-7xl font-black text-gray-300 dark:text-gray-600">?</span>
                      </div>
                      
                      {/* Back (Image) */}
                      <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 rounded-2xl border-4 border-blue-400 overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                         {!imageErrors[word] ? (
                           <img 
                             src={`${import.meta.env.BASE_URL}images/cvc/${word.toLowerCase()}.jpg`} 
                             alt={word} 
                             className="w-full h-full object-cover"
                             onError={() => setImageErrors(prev => ({...prev, [word]: true}))}
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/30">
                              <span className="scale-125">{wordContent}</span>
                           </div>
                         )}
                      </div>
                    </motion.div>
                  </div>

                  {/* The Button */}
                  <div className="w-full">
                    <PushableButton
                      as="button"
                      isTile
                      onClick={() => {
                        setFlippedWords(prev => ({...prev, [word]: !prev[word]}));
                        if (isReview) {
                          const audioPath = isTagalog
                            ? `${import.meta.env.BASE_URL}audio/filipino/tagalog-words/fil-level3-${word.toLowerCase()}.mp3`
                            : `${import.meta.env.BASE_URL}audio/english/cvc-audio/cvc-${word.toLowerCase()}.mp3`;
                          playExclusiveAudio(audioPath).catch((err: any) => {
                            console.warn(`[AlphabetGO] Local CVC audio not found: ${audioPath}, falling back to TTS`, err);
                            playTTS(word.replace(/-HARD|-SOFT/i, "").toLowerCase());
                          });
                        }
                      }}
                      className="w-full h-12 sm:h-14 flex items-center justify-center cursor-pointer"
                      frontClassName="bg-white dark:bg-gray-800 flex items-center justify-center"
                      edgeStyle={{ backgroundColor: '#e5e7eb' }}
                    >
                      {wordContent}
                    </PushableButton>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <ActionToolbar
        onBack={onBack}
        canBack={canBack}
        onShuffle={onShuffle ? handleShuffle : undefined}
        onReset={onOrganize ? handleOrganize : undefined}
        resetLabel="Organize"
        onSkip={onSkip || onComplete}
        onNext={onComplete}
      />
    </div>
  );
}

export function LevelCVCMaster({ levelId, accent }: LevelCVCMasterProps) {
  const navigate = useNavigate();
  const { CVC_WORDS, ASSESSMENT_WORDS } = useCurriculum();
  const { language } = useLanguage();
  const { markLevelComplete } = useProgress();
  const isTagalog = language === "tl";

  // We need to bring our own shuffle here or export it
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const [baseWords, setBaseWords] = useState<string[]>(() => shuffleArray([...CVC_WORDS]));
  // Assessment words are static 30 concrete nouns, randomized order on mount
  const [assessmentWords] = useState<string[]>(() => shuffleArray([...ASSESSMENT_WORDS]));

  const handleOrganizeAll = () => {
    setBaseWords([...CVC_WORDS].sort((a, b) => a.localeCompare(b)));
  };

  const handleShuffleAll = () => {
    setBaseWords(shuffleArray([...CVC_WORDS]));
  };

  const STEPS: GameStep[] = useMemo(() => {
    const wordsToUse = baseWords;

    const steps: GameStep[] = [];
    const PREVIEW_BATCH_SIZE = 5;
    const previewBatches = Math.ceil(wordsToUse.length / PREVIEW_BATCH_SIZE);

    // 1. Previews
    for (let i = 0; i < previewBatches; i++) {
      steps.push({
        phase: "preview",
        words: wordsToUse.slice(i * PREVIEW_BATCH_SIZE, (i + 1) * PREVIEW_BATCH_SIZE),
        batchNumber: i + 1,
        totalBatches: previewBatches
      });
    }

    // 2. Word Builder
    steps.push({ phase: "build", words: wordsToUse });

    // 3. Picture and Type Assessment
    steps.push({ 
      phase: "type", 
      words: assessmentWords,
      batchSize: 5
    });

    // 4. Clickable Review Phase
    for (let i = 0; i < previewBatches; i++) {
      steps.push({
        phase: "review",
        words: wordsToUse.slice(i * PREVIEW_BATCH_SIZE, (i + 1) * PREVIEW_BATCH_SIZE),
        batchNumber: i + 1,
        totalBatches: previewBatches
      });
    }

    // 4. Voice Evaluation
    steps.push({ phase: "eval", words: wordsToUse });

    // 5. Final sentences quiz
    steps.push({ phase: "sentences", words: [] });

    return steps;
  }, [CVC_WORDS, baseWords, isTagalog]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const step = STEPS[currentStep];

  const handleNextStep = async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    } else {
      // Game Over, all completed!
      markLevelComplete(levelId);
      setIsCompleted(true);
    }
    // Allow transitions again after React has had time to commit
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleGoBack = async () => {
    playSound("click", 0.2);
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const getPhaseTitle = () => {
    const title = isTagalog ? "Salita Master" : "CVC Master";
    if (step.phase === "preview") {
      return `${title} - Word Preview ${step.batchNumber && step.totalBatches ? `(${step.batchNumber}/${step.totalBatches})` : ""}`;
    }
    if (step.phase === "review") {
      return `${title} - Word Review ${step.batchNumber && step.totalBatches ? `(${step.batchNumber}/${step.totalBatches})` : ""}`;
    }
    if (step.phase === "build") return `${title} - Word Builder`;
    if (step.phase === "type") return `${title} - Picture & Type Assessment`;
    if (step.phase === "eval" || step.phase === "milestone") return `${title} - Voice Evaluation`;
    if (step.phase === "sentences") return `${title} - Read Sentences`;
    return title;
  };

  let content = null;

  // Phase: CVC Preview
  if (step.phase === "preview" || step.phase === "review") {
    const handleSkipPhase = () => {
      const nextPhaseIndex = STEPS.findIndex((s, idx) => idx > currentStep && s.phase !== step.phase);
      if (nextPhaseIndex !== -1) {
        setCurrentStep(nextPhaseIndex);
      } else {
        setIsCompleted(true);
      }
    };

    content = (
      <LevelCVCPreview
        accent={accent}
        words={step.words}
        onComplete={handleNextStep}
        onSkip={handleSkipPhase}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
        canBack={currentStep > 0}
        batchNumber={step.batchNumber}
        totalBatches={step.totalBatches}
        isReview={step.phase === "review"}
        onOrganize={handleOrganizeAll}
        onShuffle={handleShuffleAll}
      />
    );
  }
  // Phase: CVC Builder
  else if (step.phase === "build") {
    const customTargets: SyllableTarget[] = step.words.map(w => {
      let chunks = w.split("");
      if (isTagalog) {
        const standardChunks = TAGALOG_WORD_CHUNKS[w.toUpperCase()];
        if (standardChunks && standardChunks.length > 0) {
          chunks = standardChunks;
        } else {
          // Chunk into CV combinations or single letters (e.g., 'ilong' -> 'i', 'lo', 'ng')
          chunks = w.match(/(ng[aeiou]|[b-df-hj-np-tv-z][aeiou]|ng|[a-z])/ig) || w.split("");
        }
      }
      return {
        syllable: w,
        letters: chunks,
        pattern: "CVC"
      };
    });

    content = (
      <LevelSyllableBuilder
        levelId={levelId}
        patterns={["CVC"]}
        accent={accent}
        customTargets={customTargets}
        isSubPhase={true}
        embedded={true}
        onComplete={handleNextStep}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
      />
    );
  }
  // Phase: Picture and Type Assessment
  else if (step.phase === "type") {
    content = (
      <StepRenderer
        step={step}
        levelId={levelId}
        accent={accent}
        onNext={handleNextStep}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
        canBack={currentStep > 0}
        onItemClick={(item) => {
          const audioPath = isTagalog
            ? `${import.meta.env.BASE_URL}audio/filipino/tagalog-words/fil-level3-${item.toLowerCase()}.mp3`
            : `${import.meta.env.BASE_URL}audio/english/cvc-audio/cvc-${item.toLowerCase()}.mp3`;
          playExclusiveAudio(audioPath).catch((err: any) => {
            console.warn(`[AlphabetGO] Local CVC audio not found: ${audioPath}, falling back to TTS`, err);
            playTTS(item.replace(/-HARD|-SOFT/i, "").toLowerCase());
          });
        }}
      />
    );
  }
  // Phase: Voice Evaluation OR Milestone Evaluation
  else if (step.phase === "eval" || step.phase === "milestone") {
    content = (
      <LevelVoiceEvaluation
        key={`eval-step-${currentStep}`} // Key forces unmount/remount between steps to reset microphone state
        levelId={levelId}
        accent={accent}
        customWords={step.words}
        isSubPhase={true}
        onComplete={handleNextStep}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
      />
    );
  }
  // Phase: Sentences Quiz
  else if (step.phase === "sentences") {
    content = (
      <LevelCVCSentences
        levelId={levelId}
        accent={accent}
        isSubPhase={true}
        onComplete={handleNextStep}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
      />
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] flex flex-col items-center justify-center p-4">
        <Confetti active={true} />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12 max-w-lg w-full mx-auto flex flex-col items-center"
        >
          {/* Mascot Section */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-48 h-48 relative flex items-center justify-center mb-6"
          >
            {/* Glowing background */}
            <div className="absolute inset-0 bg-yellow-400/20 dark:bg-yellow-400/10 rounded-full blur-xl animate-pulse" />
            <motion.img
              src={`${import.meta.env.BASE_URL}dragon.png`}
              alt="Mascot"
              className="w-44 h-44 object-contain relative z-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 drop-shadow-sm mb-4">
            Level Complete!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium leading-relaxed max-w-sm mx-auto mb-8">
            Amazing job! You have fully mastered {isTagalog ? "words" : "CVC words"} in <span className="font-bold text-blue-500">{isTagalog ? "Salita Master" : "CVC Master"}</span>!
          </p>

          <Button
            onClick={() => navigate("/levels")}
            className="w-full sm:w-auto px-10 py-6 rounded-2xl font-bold text-white text-lg shadow-lg border-b-[4px] border-[#3c8c01] hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            Keep Going! <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const getCurrentPhaseIndex = () => {
    const phase = STEPS[currentStep]?.phase;
    if (phase === "build") return 1;
    if (phase === "type") return 2;
    if (phase === "review") return 3;
    if (phase === "eval") return 4;
    if (phase === "sentences" || phase === "milestone") return 5;
    return 0; // preview
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c]">
      <div className="shrink-0 z-50 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-5 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <X className="!w-8 !h-8 sm:!w-10 sm:!h-10 stroke-[3]" />
          </Button>

          <div className="flex-1 flex flex-col gap-1.5 mt-1">
            {/* Duolingo-style Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 sm:h-5 overflow-hidden relative shadow-inner">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out flex flex-col justify-start"
                style={{
                  width: `${Math.max(5, (getCurrentPhaseIndex() / 6) * 100)}%`,
                  backgroundColor: accent.primary
                }}
              >
                {/* Glossy reflection highlight */}
                <div className="w-[calc(100%-12px)] h-[30%] bg-white/30 rounded-full mx-1.5 mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden w-full flex flex-col">
        <AnimatePresence mode="wait">
          {React.cloneElement(content as React.ReactElement, { key: currentStep })}
        </AnimatePresence>
      </div>
    </div>
  );
}
