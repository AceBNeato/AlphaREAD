import { useState, useMemo, useEffect } from "react";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { LevelCVCSentences } from "./LevelCVCSentences";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import { SyllableTarget, CVC_WORDS, shuffle } from "../data/levels";
import { X, ArrowLeft, Shuffle, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { confirmAction } from "../utils/alerts";
import { motion, AnimatePresence } from "motion/react";
import { Confetti } from "./ui/Confetti";

interface LevelCVCMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type StepPhase = "preview" | "build" | "eval" | "milestone" | "sentences";

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
}: {
  accent: { primary: string; dark: string; lightBg: string };
  words: string[];
  onComplete: () => void;
  onBack: () => void;
  canBack: boolean;
  batchNumber?: number;
  totalBatches?: number;
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
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-8"
    >
      <div className="text-center mb-8">
        <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">
          Review CVC words before we start! {batchNumber && totalBatches ? `(Batch ${batchNumber} of ${totalBatches})` : ""}
        </p>

        <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
          <Button
            onClick={onBack}
            disabled={!canBack}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#086ca5] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none px-2"
            style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleShuffle}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
            style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
          >
            <Shuffle className="w-4 h-4 mr-1" /> Shuffle
          </Button>
          <Button
            onClick={onComplete}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#3c8c01] hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            Proceed <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12 w-full max-w-4xl mx-auto">
        {order.map((word) => {
          return (
            <motion.div
              key={word}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center w-[70px] sm:w-[90px]"
            >
              <div
                className="w-full aspect-square rounded-xl sm:rounded-2xl shadow-md flex items-center justify-center border-b-[4px] border-orange-400 select-none cursor-default"
                style={{
                  background: 'linear-gradient(135deg, #FF9600 0%, #e08000 100%)',
                }}
              >
                <span className="text-white text-lg sm:text-xl font-black drop-shadow-sm">
                  {word}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function LevelCVCMaster({ levelId, accent }: LevelCVCMasterProps) {
  const navigate = useNavigate();

  // Dynamically generate a pool of 60 random CVC words each time the level starts!
  const STEPS: GameStep[] = useMemo(() => {
    const randomWords = shuffle([...CVC_WORDS]).slice(0, 60);

    // Break into 4 chunks of 15 words each
    const chunk1 = randomWords.slice(0, 15);
    const chunk2 = randomWords.slice(15, 30);
    const chunk3 = randomWords.slice(30, 45);
    const chunk4 = randomWords.slice(45, 60);

    return [
      // Batch 1 Preview (words 1-30)
      { phase: "preview", words: CVC_WORDS.slice(0, 30), batchNumber: 1, totalBatches: 3 },
      // Batch 2 Preview (words 31-60)
      { phase: "preview", words: CVC_WORDS.slice(30, 60), batchNumber: 2, totalBatches: 3 },
      // Batch 3 Preview (words 61-85)
      { phase: "preview", words: CVC_WORDS.slice(60, 85), batchNumber: 3, totalBatches: 3 },
      
      // Chunk 1 (15 words)
      { phase: "build", words: chunk1 },
      { phase: "eval", words: chunk1 },
      
      // Chunk 2 (15 words)
      { phase: "build", words: chunk2 },
      { phase: "eval", words: chunk2 },

      // Chunk 3 (15 words)
      { phase: "build", words: chunk3 },
      { phase: "eval", words: chunk3 },

      // Chunk 4 (15 words)
      { phase: "build", words: chunk4 },
      { phase: "eval", words: chunk4 },

      // Final sentences quiz
      { phase: "sentences", words: [] }
    ];
  }, []);

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
    if (step.phase === "build") return "CVC Master - Word Builder";
    if (step.phase === "eval" || step.phase === "milestone") return "CVC Master - Voice Evaluation";
    if (step.phase === "sentences") return "CVC Master - Read Sentences";
    return "CVC Master";
  };

  let content = null;

  // Phase: CVC Preview
  if (step.phase === "preview") {
    content = (
      <LevelCVCPreview
        accent={accent}
        words={step.words}
        onComplete={handleNextStep}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
        canBack={currentStep > 0}
        batchNumber={step.batchNumber}
        totalBatches={step.totalBatches}
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] overflow-x-hidden">
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-5 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="hidden sm:inline font-bold">Exit</span>
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
      <div className="flex-1 w-full">
        {content}
      </div>
    </div>
  );
}
