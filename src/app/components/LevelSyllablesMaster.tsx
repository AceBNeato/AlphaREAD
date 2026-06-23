import { useState } from "react";
import { useNavigate } from "react-router";
import { LevelSyllableQuiz } from "./LevelSyllableQuiz";
import { supabase } from "../../lib/supabase";
import {Home, CheckCircle2, X} from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "motion/react";

interface LevelSyllablesMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelSyllablesMaster({ levelId, accent }: LevelSyllablesMasterProps) {
  const navigate = useNavigate();

  const [selectedSubLevel, setSelectedSubLevel] = useState<"CV" | "VC" | null>(null);

  const [completedSubLevels, setCompletedSubLevels] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("completedSubLevels_Level2") || "[]")
  );

  const handleQuizComplete = async () => {
    const pattern = selectedSubLevel!;
    const newCompleted = [...completedSubLevels];
    if (!newCompleted.includes(pattern)) {
      newCompleted.push(pattern);
      setCompletedSubLevels(newCompleted);
      localStorage.setItem("completedSubLevels_Level2", JSON.stringify(newCompleted));
    }

    const bothDone = newCompleted.includes("CV") && newCompleted.includes("VC");
    if (bothDone) {


      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      navigate("/levels", { replace: true });
    } else {
      // Return to picker to choose the other sub-level
      setSelectedSubLevel(null);
    }
  };

  // ── Phase: Builder + Listen & Match ──────────────────────────────────────────
  if (selectedSubLevel) {
    return (
      <LevelSyllableQuiz
        pattern={selectedSubLevel}
        levelId={levelId}
        accent={accent}
        onComplete={handleQuizComplete}
      />
    );
  }

  // ── Selection Screen ─────────────────────────────────────────────────────────
  const isVCDone = completedSubLevels.includes("VC");
  const isCVDone = completedSubLevels.includes("CV");

  const handleSelect = (pattern: "VC" | "CV") => {
    setSelectedSubLevel(pattern);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-x-hidden">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={() => navigate("/levels")} className="rounded-full">
            <X className="w-5 h-5" /> Exit
          </Button>
          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              Lesson 2: Syllable Master
            </h2>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl font-black mb-2" style={{ color: accent.primary }}>
              Choose a Group
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">
              Build syllables, then listen and match by sound. Complete both to finish Lesson 2!
            </p>
          </div>

          <div className="space-y-4">
            {[
              { id: "VC", label: "Vowel + Consonant (VC)", desc: "Build & pronounce syllables like AB, IM, OT", color: "#CE82FF", darkColor: "#a25be0" },
              { id: "CV", label: "Consonant + Vowel (CV)", desc: "Build & pronounce syllables like BA, MI, TO", color: "#FF9600", darkColor: "#d47e02" }
            ].map((cat) => {
              const isDone = completedSubLevels.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelect(cat.id as "VC" | "CV")}
                  className="w-full relative overflow-hidden group rounded-3xl p-6 text-left transition-all bg-white dark:bg-gray-800 border-4 border-[color:var(--border-color)] hover:border-[color:var(--hover-color)] shadow-md hover:shadow-xl hover:-translate-y-1"
                  style={{ 
                    "--border-color": `${cat.color}40`,
                    "--hover-color": cat.color 
                  } as React.CSSProperties}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: cat.color }}>
                        {cat.label}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.darkColor})` }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
