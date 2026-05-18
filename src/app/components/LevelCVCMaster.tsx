import { useState, useMemo, useEffect } from "react";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import { SyllableTarget, CVC_WORDS, shuffle } from "../data/levels";

interface LevelCVCMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type StepPhase = "build" | "eval" | "milestone";

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
      { phase: "eval", words: [...chunk1, ...chunk2] }
    ];
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const step = STEPS[currentStep];

  const handleNextStep = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Game Over, all completed!
      setIsSaving(true);
      try {
        const profileStr = localStorage.getItem("userProfile");
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile.id) {
            // Give them a perfect score (10 words)
            await supabase.from("progress").insert({ student_id: profile.id, level_id: levelId, score: 10 });
          }
        }
        const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
        if (!completedLevels.includes(levelId)) {
          completedLevels.push(levelId);
          localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
        }
        navigate("/levels");
      } catch (err) {
        console.error("Progress save failed:", err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isSaving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-pink-50">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Saving your fantastic progress!</h2>
      </div>
    );
  }

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

  return null;
}
