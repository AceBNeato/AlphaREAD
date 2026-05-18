import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { generateSyllableTargets } from "../data/levels";
import { supabase } from "../../lib/supabase";
import { Home, CheckCircle2, Play } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "motion/react";

interface LevelSyllablesMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type StepPhase = "build" | "eval";

interface GameStep {
  phase: StepPhase;
  syllables: string[];
}

export function LevelSyllablesMaster({ levelId, accent }: LevelSyllablesMasterProps) {
  const navigate = useNavigate();
  
  const [selectedSubLevel, setSelectedSubLevel] = useState<"CV" | "VC" | null>(null);
  const [completedSubLevels, setCompletedSubLevels] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("completedSubLevels_Level2") || "[]");
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Generate targets dynamically depending on selected sub-level
  const { steps, allTargets } = useMemo(() => {
    if (!selectedSubLevel) return { steps: [], allTargets: [] };

    const targets = generateSyllableTargets([selectedSubLevel], 5);
    const syllablesList = targets.map(t => t.syllable);

    const generatedSteps: GameStep[] = [
      { phase: "build", syllables: syllablesList },
      { phase: "eval", syllables: syllablesList }
    ];

    return { steps: generatedSteps, allTargets: targets };
  }, [selectedSubLevel]);

  const currentStep = steps[currentStepIndex];

  const handleNextPhase = async () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Completed the final step of the selected sub-level!
      const newCompleted = [...completedSubLevels];
      if (selectedSubLevel && !newCompleted.includes(selectedSubLevel)) {
        newCompleted.push(selectedSubLevel);
        setCompletedSubLevels(newCompleted);
        localStorage.setItem("completedSubLevels_Level2", JSON.stringify(newCompleted));
      }

      // Check if both sub-levels (CV and VC) are finished
      const bothDone = newCompleted.includes("CV") && newCompleted.includes("VC");

      if (bothDone) {
        // Save overall level completion to DB and localStorage
        try {
          const profileStr = localStorage.getItem("userProfile");
          if (profileStr) {
            const profile = JSON.parse(profileStr);
            if (profile.id) {
              await supabase.from("progress").insert({
                student_id: profile.id,
                level_id: levelId,
                score: 10
              });
            }
          }
        } catch (err) {
          console.error("Error saving progress:", err);
        }

        const completedLevels = JSON.parse(
          localStorage.getItem("completedLevels") || "[]"
        );
        if (!completedLevels.includes(levelId)) {
          completedLevels.push(levelId);
          localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
        }

        // Navigate back to levels
        navigate("/levels", { replace: true });
      } else {
        // Go back to sublevel selection screen
        setSelectedSubLevel(null);
        setCurrentStepIndex(0);
      }
    }
  };

  // 1. Selection screen
  if (!selectedSubLevel) {
    const isCVDone = completedSubLevels.includes("CV");
    const isVCDone = completedSubLevels.includes("VC");

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] pb-12 flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/levels")}
              className="rounded-full"
            >
              <Home className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center pr-8">
              <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
                Level 2: Syllable Master
              </h2>
            </div>
          </div>
        </div>

        {/* Content Picker */}
        <div className="max-w-md mx-auto px-6 py-10 flex-1 flex flex-col justify-center w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black mb-2 text-gray-800 dark:text-gray-100">
              Syllable Mode
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Choose which sub-level you want to practice first! Complete both to unlock the next level.
            </p>
          </div>

          <div className="space-y-4">
            {/* CV Selection Card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedSubLevel("CV");
                setCurrentStepIndex(0);
              }}
              className="w-full text-left p-6 rounded-3xl border-3 bg-white dark:bg-gray-800/80 shadow-md hover:shadow-lg transition-all flex items-center gap-4 relative overflow-hidden cursor-pointer"
              style={{ borderColor: "#FF9600" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #FF9600 0%, #d47e02 100%)" }}
              >
                <span className="text-xl font-bold">2.1</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#FF9600]">
                    Consonant + Vowel (CV)
                  </h3>
                  {isCVDone && (
                    <CheckCircle2 className="w-5 h-5 text-[#58CC02] flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Build and pronounce syllables like <span className="font-bold">BA, MI, TO</span>
                </p>
              </div>
              <Play className="w-5 h-5 text-[#FF9600] flex-shrink-0 ml-2" />
            </motion.button>

            {/* VC Selection Card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedSubLevel("VC");
                setCurrentStepIndex(0);
              }}
              className="w-full text-left p-6 rounded-3xl border-3 bg-white dark:bg-gray-800/80 shadow-md hover:shadow-lg transition-all flex items-center gap-4 relative overflow-hidden cursor-pointer"
              style={{ borderColor: "#CE82FF" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #CE82FF 0%, #a25be0 100%)" }}
              >
                <span className="text-xl font-bold">2.2</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#CE82FF]">
                    Vowel + Consonant (VC)
                  </h3>
                  {isVCDone && (
                    <CheckCircle2 className="w-5 h-5 text-[#58CC02] flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Build and pronounce syllables like <span className="font-bold">AB, IM, OT</span>
                </p>
              </div>
              <Play className="w-5 h-5 text-[#CE82FF] flex-shrink-0 ml-2" />
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Play Sub-phase: Build Mode
  if (currentStep.phase === "build") {
    const currentTargets = currentStep.syllables.map(syl =>
      allTargets.find(t => t.syllable === syl)!
    );
    return (
      <LevelSyllableBuilder
        levelId={levelId}
        patterns={[selectedSubLevel]}
        accent={accent}
        customTargets={currentTargets}
        isSubPhase={true}
        onComplete={handleNextPhase}
      />
    );
  }

  // 3. Play Sub-phase: Evaluation Mode
  return (
    <LevelVoiceEvaluation
      levelId={levelId}
      accent={accent}
      customWords={currentStep.syllables}
      isSubPhase={true}
      onComplete={handleNextPhase}
    />
  );
}
