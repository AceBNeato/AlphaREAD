import { useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router";
import { LevelBlends } from "./LevelBlends";
import { Button } from "./ui/button";
import { playSound } from "../utils/soundEffects";
import { useCurriculum } from "../hooks/useCurriculum";
import { useLanguage } from "../context/LanguageContext";
import { useProgress } from "../hooks/useProgress";
import { LevelCompleteScreen } from "./ui/LevelCompleteScreen";

interface LevelBlendsMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelBlendsMaster({ levelId, accent }: LevelBlendsMasterProps) {
  const navigate = useNavigate();
  const { BLENDS_DATA } = useCurriculum();
  const { language } = useLanguage();
  const { markLevelComplete } = useProgress();

  const isTagalog = language === "tl";

  const ENGLISH_CATEGORIES = [
    { id: "2-Letter Blends", label: "2-Letter Blends", desc: "Practicing words like 'blob', 'crab', 'frog'", color: "#3b82f6", darkColor: "#2563eb" },
    { id: "Three-Letter Blends", label: "3-Letter Blends", desc: "Practicing words like 'straw', 'splash', 'spring'", color: "#f97316", darkColor: "#ea580c" },
    { id: "Ending Blends", label: "Ending Blends", desc: "Practicing words like 'camp', 'desk', 'fast'", color: "#f43f5e", darkColor: "#e11d48" }
  ];

  const TAGALOG_CATEGORIES = [
    { id: "Diptonggo", label: "Diptonggo", desc: "e.g., aw, ay, oy", color: "#FF9600", darkColor: "#e08600" },
    { id: "Klaster", label: "Klaster / Kambal Katinig", desc: "e.g., br, dr, gr, pl, tr", color: "#3b82f6", darkColor: "#2563eb" }
  ];

  const categories = isTagalog ? TAGALOG_CATEGORIES : ENGLISH_CATEGORIES;
  
  const availableCategories = categories.filter(c => 
    BLENDS_DATA.some((d: any) => d.name === c.id)
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleCategoryComplete = () => {
    if (selectedCategory && !completedCategories.includes(selectedCategory)) {
      const updated = [...completedCategories, selectedCategory];
      setCompletedCategories(updated);
      
      // If all categories are completed, mark level complete!
      if (updated.length === availableCategories.length) {
        playSound("complete", 0.5);
        markLevelComplete(levelId);
        setIsCompleted(true);
      }
    }
    setSelectedCategory(null);
  };

  const handleGoBack = () => {
    playSound("click", 0.2);
    navigate("/levels");
  };

  // ── Phase: Lesson Execution ──────────────────────────────────────────
  if (selectedCategory) {
    return (
      <LevelBlends
        levelId={levelId}
        accent={accent}
        categoryFilter={selectedCategory}
        onExit={() => setSelectedCategory(null)}
        onComplete={handleCategoryComplete}
      />
    );
  }

  // ── Selection Screen ─────────────────────────────────────────────────────────
  if (isCompleted) {
    return (
      <LevelCompleteScreen
        title={isTagalog ? "Kumpleto na ang Antas!" : "Level Complete!"}
        subtitle={
          isTagalog ? (
            <>
              Napakagaling! Ganap mo nang natutunan ang{" "}
              <span className="font-bold text-blue-500">Kambal Katinig at Diptonggo</span>!
            </>
          ) : (
            <>
              Amazing job! You have fully mastered consonant blends in{" "}
              <span className="font-bold text-blue-500">Blends Master</span>!
            </>
          )
        }
        continueText={isTagalog ? "Ipagpatuloy!" : "Keep Going!"}
        onContinue={() => navigate("/levels")}
      />
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-hidden">
      <div className="shrink-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <X className="!w-8 !h-8 sm:!w-10 sm:!h-10 stroke-[3]" />
          </Button>
          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              {isTagalog ? "Antas 4: Kambal Katinig at Diptonggo" : "Level 6: Consonant Blends"}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black mb-2 text-gray-800 dark:text-gray-100">
              {isTagalog ? "Pumili ng Grupo" : "Choose a Group"}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-6 block">
              {isTagalog ? "Aling grupo ang gusto mong pag-aralan?" : "Which blends would you like to practice?"}
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
