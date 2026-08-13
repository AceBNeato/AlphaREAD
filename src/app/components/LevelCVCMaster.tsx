import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { LevelCVCSentences } from "./LevelCVCSentences";
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

type StepPhase = "preview" | "build" | "eval" | "milestone" | "sentences" | "review";

interface GameStep {
  phase: StepPhase;
  words: string[];
  batchNumber?: number;
  totalBatches?: number;
}

function LevelCVCPreview({
  accent,
  words,
  onComplete,
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

  const handleShuffle = () => {
    if (onShuffle) onShuffle();
  };

  const handleOrganize = () => {
    if (onOrganize) onOrganize();
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto px-15 py-4 text-center flex-1">
          <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 mb-8 block">
            {isReview
              ? `Great work! Review ${wordLabel}! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
              : `Review ${wordLabel} before we start! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
            }
          </p>

          <div className={`grid ${isTagalog ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6' : 'grid-cols-4 sm:grid-cols-7'} gap-2 sm:gap-3 mb-12 w-full max-w-5xl mx-auto justify-items-center`}>
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

              const cleanW = word.replace(/-HARD|-SOFT/i, "");
              const fontSizeClass = cleanW.length >= 6 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl";

              return (
                <motion.div
                  key={word}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`flex flex-col items-center w-full ${isTagalog ? 'max-w-[135px] sm:max-w-[155px]' : 'max-w-[110px] sm:max-w-[125px]'}`}
                >
                  <PushableButton
                    as="div"
                    isTile
                    onClick={() => {
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
                    className={`w-full ${isTagalog ? 'aspect-[4/3]' : 'aspect-square'} flex items-center justify-center ${!isReview ? 'cursor-pointer' : ''}`}
                    frontClassName="bg-white dark:bg-gray-800"
                    edgeStyle={{ backgroundColor: '#e5e7eb' }}
                  >
                    <span className="text-xl sm:text-3xl font-black drop-shadow-sm flex flex-col items-center justify-center">
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
                      {word.toUpperCase().includes('-HARD') && <span className="text-[10px] sm:text-xs text-gray-400 font-bold mt-0.5 tracking-wider">HARD</span>}
                      {word.toUpperCase().includes('-SOFT') && <span className="text-[10px] sm:text-xs text-gray-400 font-bold mt-0.5 tracking-wider">SOFT</span>}
                    </span>
                  </PushableButton>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <ActionToolbar
        onBack={onBack}
        canBack={canBack}
        onShuffle={onShuffle ? handleShuffle : undefined}
        onReset={onOrganize ? handleOrganize : undefined}
        resetLabel="Organize"
        onNext={onComplete}
      />
    </div>
  );
}

export function LevelCVCMaster({ levelId, accent }: LevelCVCMasterProps) {
  const navigate = useNavigate();
  const { CVC_WORDS } = useCurriculum();
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

  const handleOrganizeAll = () => {
    setBaseWords([...CVC_WORDS].sort((a, b) => a.localeCompare(b)));
  };

  const handleShuffleAll = () => {
    setBaseWords(shuffleArray([...CVC_WORDS]));
  };

  const STEPS: GameStep[] = useMemo(() => {
    const wordsToUse = baseWords;

    const steps: GameStep[] = [];
    const targetBatches = isTagalog ? 5 : Math.ceil(wordsToUse.length / 30);
    const PREVIEW_BATCH_SIZE = Math.ceil(wordsToUse.length / targetBatches);
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

    // 3. Clickable Review Phase
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
    if (step.phase === "eval" || step.phase === "milestone") return `${title} - Voice Evaluation`;
    if (step.phase === "sentences") return `${title} - Read Sentences`;
    return title;
  };

  let content = null;

  // Phase: CVC Preview
  if (step.phase === "preview" || step.phase === "review") {
    content = (
      <LevelCVCPreview
        accent={accent}
        words={step.words}
        onComplete={handleNextStep}
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

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c]">
      <div className="shrink-0 z-50 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-5 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <X className="!w-8 !h-8 sm:!w-10 sm:!h-10 stroke-[3]" />
          </Button>

          <div className="flex-1 flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: accent.primary }}>
                {getPhaseTitle()}
              </h2>
            </div>

            {/* Duolingo-style Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 sm:h-5 overflow-hidden relative shadow-inner">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out flex flex-col justify-start"
                style={{
                  width: `${Math.max(5, (currentStep / STEPS.length) * 100)}%`,
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
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col w-full h-full"
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
