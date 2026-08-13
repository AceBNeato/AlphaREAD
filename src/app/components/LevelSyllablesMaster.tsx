import { useState } from "react";
import { useNavigate } from "react-router";
import { LevelSyllableQuiz } from "./LevelSyllableQuiz";
import { supabase } from "../../lib/supabase";
import { Home, CheckCircle2, X, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Confetti } from "./ui/Confetti";
import { playSound } from "../utils/soundEffects";
import { useLanguage } from "../context/LanguageContext";
import { useProgress } from "../hooks/useProgress";

interface LevelSyllablesMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelSyllablesMaster({ levelId, accent }: LevelSyllablesMasterProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isTagalog = language === "tl";
  const { markLevelComplete } = useProgress();

  const [selectedSubLevel, setSelectedSubLevel] = useState<"CV" | "VC" | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const subLevelAccents = {
    VC: { primary: "#f43f5e", dark: "#be123c", lightBg: "#ffe4e6" }, // Rose
    CV: { primary: "#3b82f6", dark: "#1d4ed8", lightBg: "#dbeafe" }  // Blue
  };

  const [completedSubLevels, setCompletedSubLevels] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("completedSubLevels_Level2");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

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
      markLevelComplete(levelId);
      setIsCompleted(true);
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
        accent={subLevelAccents[selectedSubLevel]}
        onComplete={handleQuizComplete}
        onExit={() => setSelectedSubLevel(null)}
      />
    );
  }

  // ── Selection Screen ─────────────────────────────────────────────────────────
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
            {isTagalog ? "Kumpleto na ang Antas!" : "Level Complete!"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium leading-relaxed max-w-sm mx-auto mb-8">
            {isTagalog 
              ? <>Napakagaling! Ganap mo nang natutunan ang mga pantig sa <span className="font-bold text-blue-500">Syllable Master</span>!</>
              : <>Amazing job! You have fully mastered syllables in <span className="font-bold text-blue-500">Syllable Master</span>!</>
            }
          </p>

          <Button
            onClick={() => navigate("/levels")}
            className="w-full sm:w-auto px-10 py-6 rounded-2xl font-bold text-white text-lg shadow-lg border-b-[4px] border-[#3c8c01] hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            {isTagalog ? "Ipagpatuloy!" : "Keep Going!"} <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    );
  }
  const isVCDone = completedSubLevels.includes("VC");
  const isCVDone = completedSubLevels.includes("CV");

  const handleSelect = (pattern: "VC" | "CV") => {
    setSelectedSubLevel(pattern);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-hidden">
      <div className="shrink-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={() => { playSound("click", 0.2); navigate("/levels"); }} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <X className="!w-8 !h-8 sm:!w-10 sm:!h-10 stroke-[3]" />
          </Button>
          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              {isTagalog ? "Antas 2: Pantig Master" : "Level 2: Syllable Master"}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl font-black mb-2" style={{ color: accent.primary }}>
              {isTagalog ? "Pumili ng Grupo" : "Choose a Group"}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-6 block">
              {isTagalog ? "Bumuo ng mga pantig, tapos pakinggan at itugma ito. Kumpletuhin pareho para matapos ang Antas 2!" : "Build syllables, then listen and match by sound. Complete both to finish Level 2!"}
            </p>
          </div>

          <div className="space-y-4">
            {[
              { id: "VC", label: isTagalog ? "Patinig + Katinig (VC)" : "Vowel + Consonant (VC)", desc: isTagalog ? "Bumuo ng mga pantig gaya ng ab, im, ot" : "Build & pronounce syllables like ab, im, ot", color: "#f43f5e", darkColor: "#be123c" },
              { id: "CV", label: isTagalog ? "Katinig + Patinig (CV)" : "Consonant + Vowel (CV)", desc: isTagalog ? "Bumuo ng mga pantig gaya ng ba, mi, to" : "Build & pronounce syllables like ba, mi, to", color: "#3b82f6", darkColor: "#1d4ed8" }
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
                      <h3 className="text-xl sm:text-2xl font-black mb-1" style={{ color: cat.color }}>
                        {cat.label}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-semibold mt-1">
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
