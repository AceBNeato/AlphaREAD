import { useState } from "react";
import { useNavigate } from "react-router";
import { LevelSyllableQuiz } from "./LevelSyllableQuiz";
import { supabase } from "../../lib/supabase";
import { Home, CheckCircle2 } from "lucide-react";
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

  const handleSubLevelComplete = async (pattern: "CV" | "VC") => {
    const newCompleted = [...completedSubLevels];
    if (!newCompleted.includes(pattern)) {
      newCompleted.push(pattern);
      setCompletedSubLevels(newCompleted);
      localStorage.setItem("completedSubLevels_Level2", JSON.stringify(newCompleted));
    }

    const bothDone = newCompleted.includes("CV") && newCompleted.includes("VC");
    if (bothDone) {
      try {
        const profileStr = localStorage.getItem("userProfile");
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile.id) {
            await supabase.from("progress").insert({
              student_id: profile.id,
              level_id: levelId,
              score: 10,
            });
          }
        }
      } catch (err) {
        console.error("Error saving progress:", err);
      }

      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      navigate("/levels", { replace: true });
    } else {
      setSelectedSubLevel(null);
    }
  };

  // Show quiz for selected sub-level
  if (selectedSubLevel) {
    return (
      <LevelSyllableQuiz
        pattern={selectedSubLevel}
        levelId={levelId}
        accent={accent}
        onComplete={() => handleSubLevelComplete(selectedSubLevel)}
      />
    );
  }

  // Selection screen
  const isVCDone = completedSubLevels.includes("VC");
  const isCVDone = completedSubLevels.includes("CV");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] pb-12 flex flex-col">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/levels")} className="rounded-full">
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              Lesson 2: Syllable Quiz
            </h2>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 flex-1 flex flex-col justify-center w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2 text-gray-800 dark:text-gray-100">
            Choose a Pattern
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Review all syllables then practice matching by sound. Complete both to finish Lesson 2!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* VC */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedSubLevel("VC")}
            className="w-full text-left p-8 rounded-[2.5rem] border-3 bg-white dark:bg-gray-800/80 shadow-lg hover:shadow-xl transition-all flex flex-col sm:flex-row items-center sm:items-start gap-6 cursor-pointer"
            style={{ borderColor: "#CE82FF" }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #CE82FF 0%, #a25be0 100%)" }}>
              <span className="text-2xl font-black">2.1</span>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <h3 className="text-xl font-black text-[#CE82FF]">Vowel + Consonant (VC)</h3>
                {isVCDone && <CheckCircle2 className="w-5 h-5 text-[#58CC02] flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                58 syllables like <span className="font-bold">AB, IM, OT</span> — Review then Listen & Match
              </p>
            </div>
          </motion.button>

          {/* CV */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedSubLevel("CV")}
            className="w-full text-left p-8 rounded-[2.5rem] border-3 bg-white dark:bg-gray-800/80 shadow-lg hover:shadow-xl transition-all flex flex-col sm:flex-row items-center sm:items-start gap-6 cursor-pointer"
            style={{ borderColor: "#FF9600" }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #FF9600 0%, #d47e02 100%)" }}>
              <span className="text-2xl font-black">2.2</span>
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <h3 className="text-xl font-black text-[#FF9600]">Consonant + Vowel (CV)</h3>
                {isCVDone && <CheckCircle2 className="w-5 h-5 text-[#58CC02] flex-shrink-0" />}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                83 syllables like <span className="font-bold">BA, MI, TO</span> — Review then Listen & Match
              </p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
