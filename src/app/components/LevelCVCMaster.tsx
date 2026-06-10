import { useState, useMemo, useEffect } from "react";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { LevelCVCSentences } from "./LevelCVCSentences";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import { SyllableTarget, CVC_WORDS, shuffle } from "../data/levels";

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

  // Phase: CVC Builder
  if (step.phase === "build") {
    const customTargets: SyllableTarget[] = step.words.map(w => ({
      syllable: w,
      letters: w.split(""),
      pattern: "CVC"
    }));

    return (
      <LevelSyllableBuilder
        levelId={levelId}
        patterns={["CVC"]}
        accent={accent}
        customTargets={customTargets}
        isSubPhase={true}
        onComplete={handleNextStep}
      />
    );
  }

  // Phase: Voice Evaluation OR Milestone Evaluation
  if (step.phase === "eval" || step.phase === "milestone") {
    return (
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
  if (step.phase === "sentences") {
    return (
      <LevelCVCSentences
        levelId={levelId}
        accent={accent}
        isSubPhase={true}
        onComplete={handleNextStep}
      />
    );
  }

  return null;
}
