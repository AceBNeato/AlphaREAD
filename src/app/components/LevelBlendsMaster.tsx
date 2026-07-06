import { useState } from "react";
import { useNavigate } from "react-router";
import { LevelBlends } from "./LevelBlends";
import { supabase } from "../../lib/supabase";
import { CheckCircle2, X, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Confetti } from "./ui/Confetti";

interface LevelBlendsMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

import { useCurriculum } from "../hooks/useCurriculum";
import { useLanguage } from "../context/LanguageContext";

export function LevelBlendsMaster({ levelId, accent }: LevelBlendsMasterProps) {
  const navigate = useNavigate();
  const { BLENDS_DATA } = useCurriculum();
  const { language } = useLanguage();

  const isTagalog = language === "tl";

  const ENGLISH_CATEGORIES = [
    { id: "2-Letter Blends", label: "2-Letter Blends & Digraphs", desc: "e.g., bl, st, ch, sh", color: "#1CB0F6", darkColor: "#0a8ed4" },
    { id: "Three-Letter Blends", label: "3-Letter Blends", desc: "e.g., str, spl, scr", color: "#FF9600", darkColor: "#e08600" },
    { id: "Ending Blends", label: "Ending Blends", desc: "e.g., nd, st, mp", color: "#FF4B8A", darkColor: "#e0336e" }
  ];

  const TAGALOG_CATEGORIES = [
    { id: "Diptonggo", label: "Diptonggo", desc: "e.g., aw, ay, oy", color: "#FF9600", darkColor: "#e08600" },
    { id: "Kambal Katinig", label: "Kambal Katinig", desc: "e.g., bl, kr, dy", color: "#1CB0F6", darkColor: "#0a8ed4" }
  ];

  const activeCategories = isTagalog ? TAGALOG_CATEGORIES : ENGLISH_CATEGORIES;
  
  const availableCategories = activeCategories.filter(c => 
    BLENDS_DATA.some((d: any) => d.name === c.id)
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const [completedCategories, setCompletedCategories] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem("completedSubLevels_Level6") || "[]")
  );

  const handleQuizComplete = async () => {
    const pattern = selectedCategory!;
    const newCompleted = [...completedCategories];
    if (!newCompleted.includes(pattern)) {
      newCompleted.push(pattern);
      setCompletedCategories(newCompleted);
      localStorage.setItem("completedSubLevels_Level6", JSON.stringify(newCompleted));
    }

    const allDone = availableCategories.every(c => newCompleted.includes(c.id));
    
    if (allDone) {
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      setIsCompleted(true);
      setSelectedCategory(null);
    } else {
      // Return to picker to choose another category
      setSelectedCategory(null);
    }
  };

  const handleGoBack = () => {
    navigate("/levels");
  };

  // ── Phase: Lesson Execution ──────────────────────────────────────────
  if (selectedCategory) {
    return (
      <LevelBlends
        categoryFilter={selectedCategory}
        levelId={levelId}
        accent={accent}
        onComplete={handleQuizComplete}
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
            Amazing job! You have fully mastered consonant blends in <span className="font-bold text-blue-500">Blends Master</span>!
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
    <div className="h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-hidden">
      <div className="shrink-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" /> <span className="hidden sm:inline font-bold uppercase tracking-wider text-sm">EXIT</span>
          </Button>
          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              Level 6: Consonant Blends
            </h2>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black mb-2 text-gray-800 dark:text-gray-100">
              Choose a Group
            </h1>
            <p className="text-white text-base sm:text-lg font-bold mt-6 block">
              Which blends would you like to practice?
            </p>
          </div>

          <div className="space-y-4">
            {availableCategories.map((cat) => {
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="w-full relative overflow-hidden group rounded-3xl p-6 text-left transition-all bg-white dark:bg-gray-800 border-4 border-[color:var(--border-color)] hover:border-[color:var(--hover-color)] shadow-md hover:shadow-xl hover:-translate-y-1"
                  style={{ 
                    "--border-color": `${cat.color}40`,
                    "--hover-color": cat.color 
                  } as React.CSSProperties}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black mb-1" style={{ color: cat.color }}>
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
