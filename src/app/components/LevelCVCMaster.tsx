import { useState, useMemo, useEffect } from "react";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { LevelCVCSentences } from "./LevelCVCSentences";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import { SyllableTarget } from "../data/levels";
import { useCurriculum } from "../hooks/useCurriculum";
import { X, ArrowLeft, Shuffle, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { confirmAction } from "../utils/alerts";
import { motion, AnimatePresence } from "motion/react";
import { Confetti } from "./ui/Confetti";
import { playExclusiveAudio } from "../utils/soundEffects";
import { playTTS } from "../utils/tts";
import { PushableButton } from "./ui/PushableButton";
import { ActionToolbar } from "./ui/ActionToolbar";

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
}: {
  accent: { primary: string; dark: string; lightBg: string };
  words: string[];
  onComplete: () => void;
  onBack: () => void;
  canBack: boolean;
  batchNumber?: number;
  totalBatches?: number;
  isReview?: boolean;
}) {
  const [order, setOrder] = useState<string[]>(words);
  useEffect(() => {
    setOrder(words);
  }, [words]);

  const handleShuffle = () => setOrder([...order].sort(() => Math.random() - 0.5));

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col w-full h-full"
    >
      <div className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col items-center">
        <div className="w-full max-w-4xl mx-auto px-15 py-4 text-center flex-1">
          <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 mb-8 block">
            {isReview
              ? `🎉 Great work! Review CVC words! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
              : `Review CVC words before we start! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
            }
          </p>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12 w-full max-w-4xl mx-auto">
            {order.map((word) => {
              return (
                <motion.div
                  key={word}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center w-[70px] sm:w-[90px]"
                >
                  <PushableButton
                    as="div"
                    isTile
                    disabled={!isReview}
                    onClick={() => {
                      if (isReview) {
                        const audioPath = `${(import.meta as any).env.BASE_URL}audio/cvc-audio/cvc-${word.toLowerCase()}.mp3`;
                        playExclusiveAudio(audioPath).catch((err: any) => {
                          console.warn(`[AlphabetGO] Local CVC audio not found: ${audioPath}, falling back to TTS`, err);
                          playTTS(word.toLowerCase());
                        });
                      }
                    }}
                    className="w-full aspect-square flex items-center justify-center"
                    frontStyle={{
                      background: 'linear-gradient(135deg, #FF9600 0%, #e08000 100%)',
                    }}
                    edgeStyle={{
                      backgroundColor: '#b06000',
                    }}
                  >
                    <span className="text-white text-lg sm:text-xl font-black drop-shadow-sm">
                      {word.toLowerCase()}
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
        onShuffle={handleShuffle}
        onNext={onComplete}
      />
    </motion.div>
  );
}

export function LevelCVCMaster({ levelId, accent }: LevelCVCMasterProps) {
  const navigate = useNavigate();
  const { CVC_WORDS } = useCurriculum();
  // We need to bring our own shuffle here or export it
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Dynamically generate a pool of all 85 CVC words each time the level starts!
  const STEPS: GameStep[] = useMemo(() => {
    const randomWords = shuffleArray([...CVC_WORDS]);

    const steps: GameStep[] = [];
    const PREVIEW_BATCH_SIZE = 30;
    const previewBatches = Math.ceil(randomWords.length / PREVIEW_BATCH_SIZE);

    // 1. Previews
    for (let i = 0; i < previewBatches; i++) {
      steps.push({
        phase: "preview",
        words: randomWords.slice(i * PREVIEW_BATCH_SIZE, (i + 1) * PREVIEW_BATCH_SIZE),
        batchNumber: i + 1,
        totalBatches: previewBatches
      });
    }

    // 2. Word Builder
    steps.push({ phase: "build", words: randomWords });

    // 3. Clickable Review Phase
    for (let i = 0; i < previewBatches; i++) {
      steps.push({
        phase: "review",
        words: randomWords.slice(i * PREVIEW_BATCH_SIZE, (i + 1) * PREVIEW_BATCH_SIZE),
        batchNumber: i + 1,
        totalBatches: previewBatches
      });
    }

    // 4. Voice Evaluation
    steps.push({ phase: "eval", words: randomWords });

    // 5. Final sentences quiz
    steps.push({ phase: "sentences", words: [] });

    return steps;
  }, [CVC_WORDS]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const step = STEPS[currentStep];

  const handleNextStep = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    } else {
      // Game Over, all completed!
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      setIsCompleted(true);
    }
  };

  const handleGoBack = async () => {
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const getPhaseTitle = () => {
    if (step.phase === "preview") {
      return `CVC Master - Word Preview ${step.batchNumber && step.totalBatches ? `(${step.batchNumber}/${step.totalBatches})` : ""}`;
    }
    if (step.phase === "review") {
      return `CVC Master - Word Review ${step.batchNumber && step.totalBatches ? `(${step.batchNumber}/${step.totalBatches})` : ""}`;
    }
    if (step.phase === "build") return "CVC Master - Word Builder";
    if (step.phase === "eval" || step.phase === "milestone") return "CVC Master - Voice Evaluation";
    if (step.phase === "sentences") return "CVC Master - Read Sentences";
    return "CVC Master";
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
      />
    );
  }
  // Phase: CVC Builder
  else if (step.phase === "build") {
    const customTargets: SyllableTarget[] = step.words.map(w => ({
      syllable: w,
      letters: w.split(""),
      pattern: "CVC"
    }));

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
              src={`${(import.meta as any).env.BASE_URL}dragon.png`}
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
            Amazing job! You have fully mastered CVC words in <span className="font-bold text-blue-500">CVC Master</span>!
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
      <div className="shrink-0 z-50 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-5 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" />
            <span className="hidden sm:inline font-bold uppercase tracking-wider text-sm">EXIT</span>
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
      <div className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col">
        {content}
      </div>
    </div>
  );
}
