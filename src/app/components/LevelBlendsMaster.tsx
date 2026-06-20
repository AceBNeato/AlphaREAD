import { useState } from "react";
import { useNavigate } from "react-router";
import { LevelBlends } from "./LevelBlends";
import { supabase } from "../../lib/supabase";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "./ui/button";

interface LevelBlendsMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type BlendCategoryName = "2-Letter Blends" | "Three-Letter Blends" | "Ending Blends";

const CATEGORIES: { id: BlendCategoryName; label: string; desc: string; color: string; darkColor: string }[] = [
  { id: "2-Letter Blends", label: "2-Letter Blends & Digraphs", desc: "e.g., bl, st, ch, sh", color: "#1CB0F6", darkColor: "#0a8ed4" },
  { id: "Three-Letter Blends", label: "3-Letter Blends", desc: "e.g., str, spl, scr", color: "#FF9600", darkColor: "#e08600" },
  { id: "Ending Blends", label: "Ending Blends", desc: "e.g., nd, st, mp", color: "#FF4B8A", darkColor: "#e0336e" }
];

export function LevelBlendsMaster({ levelId, accent }: LevelBlendsMasterProps) {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<BlendCategoryName | null>(null);

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

    const allDone = CATEGORIES.every(c => newCompleted.includes(c.id));
    
    if (allDone) {
      try {
        const profileStr = localStorage.getItem("userProfile");
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile.id) {
            const deviceId = localStorage.getItem("activated_device_id");
            if (profile.role === "student" && deviceId) {
              await supabase.rpc("record_student_progress", {
                p_student_id: profile.id,
                p_device_id: deviceId,
                p_level_id: levelId,
                p_score: 10,
              });
            } else if (profile.role !== "student") {
              console.log("Preview mode: progress not recorded.");
            }
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
      // Return to picker to choose another category
      setSelectedCategory(null);
    }
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-x-hidden">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={() => navigate("/levels")} className="rounded-full">
            <X className="w-5 h-5" /> Exit
          </Button>
          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              Lesson 6: Consonant Blends
            </h2>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black mb-2 text-gray-800 dark:text-gray-100">
              Choose a Group
            </h1>
            <p className="text-gray-500 mt-2">
              Which blends would you like to practice?
            </p>
          </div>

          <div className="space-y-4">
            {CATEGORIES.map((cat) => {
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
                      <h3 className="text-xl font-black mb-1" style={{ color: cat.color }}>
                        {cat.label}
                      </h3>
                      <p className="text-gray-500 mt-2">
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
