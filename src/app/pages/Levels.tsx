import { useMemo } from "react";
import { Link } from "react-router";
import {
  Home,
  Sparkles,
  Layers,
  Puzzle,
  Brain,
  BookOpen,
} from "lucide-react";
import { useCurriculum } from "../hooks/useCurriculum";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";
import { useLanguage } from "../context/LanguageContext";
import { useProgress } from "../hooks/useProgress";
import { translations } from "../utils/translations";
import { showAlert } from "../utils/alerts";
import { motion } from "motion/react";
import { PushableButton } from "../components/ui/PushableButton";
import { playSound } from "../utils/soundEffects";

const levelColors = [
  {
    bg: "from-[#58CC02] to-[#46a302]",
    border: "border-[#58CC02]",
    borderDark: "border-[#3c8c01]",
    bgDark: "bg-[#3c8c01]",
    light: "#e8f9d4",
    text: "#58CC02",
  },
  {
    bg: "from-[#1CB0F6] to-[#0a8ed4]",
    border: "border-[#1CB0F6]",
    borderDark: "border-[#0979b5]",
    bgDark: "bg-[#0979b5]",
    light: "#d4f1ff",
    text: "#1CB0F6",
  },
  {
    bg: "from-[#FF9600] to-[#e08000]",
    border: "border-[#FF9600]",
    borderDark: "border-[#b86800]",
    bgDark: "bg-[#b86800]",
    light: "#fff2d4",
    text: "#FF9600",
  },
  {
    bg: "from-[#CE82FF] to-[#a855f7]",
    border: "border-[#CE82FF]",
    borderDark: "border-[#883fba]",
    bgDark: "bg-[#883fba]",
    light: "#f3e8ff",
    text: "#a855f7",
  },
  {
    bg: "from-[#FF4B8A] to-[#e0336e]",
    border: "border-[#FF4B8A]",
    borderDark: "border-[#b51e4f]",
    bgDark: "bg-[#b51e4f]",
    light: "#ffe4ef",
    text: "#e0336e",
  },
  {
    bg: "from-[#7C3AED] to-[#6d28d9]",
    border: "border-[#7C3AED]",
    borderDark: "border-[#5b21b6]",
    bgDark: "bg-[#5b21b6]",
    light: "#f3e8ff",
    text: "#7C3AED",
  },
];

const levelIcons = [Layers, Puzzle, Brain, Sparkles, BookOpen];

export default function Levels() {
  const { levels } = useCurriculum();
  const { language } = useLanguage();
  const { completedLevels } = useProgress();
  const isTagalog = language === "tl";
  const t = translations[language].levels;
  
  const userLevels = useMemo(() => {
    return levels.map((level) => ({
      ...level,
      completed: completedLevels.includes(level.id),
      locked: false, // All levels are now unlocked
    }));
  }, [levels, completedLevels]);

  return (
    <>
      {/* Entry Transition Overlay */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#58CC02] to-[#46a302] pointer-events-none"
      />

      <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:bg-none dark:bg-[#0d141c]">
        {/* Sticky Top Navigation Bar */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#0d141c]/80 border-b border-gray-200/60 dark:border-gray-700/60 shadow-xs transition-colors">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link 
              to="/dashboard" 
              onClick={() => playSound("click", 0.2)} 
              className="inline-flex items-center"
            >
              <PushableButton
                as="div"
                className="h-10 w-auto min-w-[120px]"
                frontClassName="bg-gradient-to-r from-[#1cb0f6] to-[#0a8ed4] text-white px-4 py-0 flex items-center justify-center gap-2 font-bold h-full"
                edgeClassName="bg-[#0979b5]"
              >
                <Home className="w-5 h-5 text-white" />
                <span className="text-sm font-black tracking-wider uppercase">Home</span>
              </PushableButton>
            </Link>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="max-w-2xl mx-auto px-4 py-8 w-full">
          {/* Header Title Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="p-4 rounded-3xl shadow-xl bg-gradient-to-br from-[#58CC02] to-[#46a302] transform -rotate-3 hover:rotate-3 transition-transform">
                <Sparkles className="w-10 h-10 text-white" fill="white" />
              </div>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tighter drop-shadow-sm">
                <span className="text-[#58CC02]">Alpha</span>
                <span className="text-[#1CB0F6]">READ!</span>
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg sm:text-xl font-bold tracking-tight">
              {t.title} - {t.subtitle} ({levels.length})
            </p>
          </div>

          {/* Lesson Cards */}
          <div className="space-y-6">
            {userLevels.map((level, index) => {
              const colors = levelColors[index % levelColors.length];
              const Icon = levelIcons[index % levelIcons.length];

              return (
                <div
                  key={level.id}
                  className={`bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden border-3 transition-all duration-300 ${colors.border}`}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${colors.bg}`}
                      >
                        <Icon className="w-8 h-8" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2 flex-wrap">
                          {isTagalog ? `Antas ${level.id}` : `Level ${level.id}`}: {level.title}
                          {level.isUnderDevelopment && (
                            <span className="text-[10px] uppercase font-bold tracking-widest text-white bg-amber-500 px-2.5 py-0.5 rounded-full shadow-sm">
                              {t.underDevelopment}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {level.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    {level.isUnderDevelopment ? (
                      <PushableButton
                        onClick={() => {
                          playSound("click", 0.2);
                          showAlert(
                            t.underDevelopment,
                            isTagalog
                              ? "Ang antas na ito ay kasalukuyang inihahanda para sa bagong kurikulum sa Tagalog.<br><br>Mangyaring bumalik muli!"
                              : "This level is currently being customized for the new curriculum.<br><br>Please check back later!",
                            "info"
                          );
                        }}
                        className="w-full"
                        frontClassName={`bg-gradient-to-r ${colors.bg} text-white font-bold py-4 hover-shine overflow-hidden`}
                        edgeClassName={colors.bgDark}
                      >
                        {t.startLearning}
                      </PushableButton>
                    ) : (
                      <Link 
                        to={`/lesson/${level.id}`} 
                        className="block w-full" 
                        onClick={() => playSound("click", 0.2)}
                      >
                        <PushableButton
                          as="div"
                          className="w-full"
                          frontClassName={`bg-gradient-to-r ${colors.bg} text-white font-bold py-4 hover-shine overflow-hidden`}
                          edgeClassName={colors.bgDark}
                        >
                          {t.startLearning}
                        </PushableButton>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}