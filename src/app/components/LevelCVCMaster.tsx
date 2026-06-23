import { useState, useMemo, useEffect } from "react";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { LevelCVCSentences } from "./LevelCVCSentences";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import { SyllableTarget, CVC_WORDS, shuffle } from "../data/levels";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { confirmAction } from "../utils/alerts";

interface LevelCVCMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type StepPhase = "build" | "eval" | "milestone" | "sentences";

interface GameStep {
  phase: StepPhase;
  words: string[];
}

export function LevelCVCMaster({ levelId, accent }: LevelCVCMasterProps) {
  const navigate = useNavigate();

  // Dynamically generate a single random pool of 10 CVC words each time the level starts!
  const STEPS: GameStep[] = useMemo(() => {
    const randomWords = shuffle([...CVC_WORDS]).slice(0, 10);

    // Break into chunks of 5 words
    const chunk1 = randomWords.slice(0, 5);
    const chunk2 = randomWords.slice(5, 10);

    return [
      // 5 first
      { phase: "build", words: chunk1 },
      { phase: "eval", words: chunk1 },

      // 5 next
      { phase: "build", words: chunk2 },
      { phase: "eval", words: chunk2 },

      // 10 last (eval only)
      { phase: "eval", words: [...chunk1, ...chunk2] },

      // Final sentences quiz
      { phase: "sentences", words: [] }
    ];
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

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
      navigate("/levels");
    }
  };

  const handleGoBack = async () => {
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const getPhaseTitle = () => {
    if (step.phase === "build") return "CVC Master - Word Builder";
    if (step.phase === "eval" || step.phase === "milestone") return "CVC Master - Voice Evaluation";
    if (step.phase === "sentences") return "CVC Master - Read Sentences";
    return "CVC Master";
  };

  let content = null;

  // Phase: CVC Builder
  if (step.phase === "build") {
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
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] overflow-x-hidden">
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-5 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-6 h-6 sm:w-7 sm:h-7" />
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
