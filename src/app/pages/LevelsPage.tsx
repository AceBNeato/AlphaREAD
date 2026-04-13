import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Trophy,
  Star,
  Lock,
  CheckCircle2,
  Sparkles,
  Music,
  Layers,
  Puzzle,
  Shapes,
  Brain,
  Mic,
  Home as HomeIcon,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { levels } from "../data/levels";
import { ThemeToggle } from "../components/ThemeToggle";

const levelColors = [
  {
    bg: "from-[#58CC02] to-[#46a302]",
    border: "border-[#58CC02]",
    light: "#e8f9d4",
    text: "#58CC02",
  },
  {
    bg: "from-[#1CB0F6] to-[#0a8ed4]",
    border: "border-[#1CB0F6]",
    light: "#d4f1ff",
    text: "#1CB0F6",
  },
  {
    bg: "from-[#FF9600] to-[#e08000]",
    border: "border-[#FF9600]",
    light: "#fff2d4",
    text: "#FF9600",
  },
  {
    bg: "from-[#CE82FF] to-[#a855f7]",
    border: "border-[#CE82FF]",
    light: "#f3e8ff",
    text: "#CE82FF",
  },
  {
    bg: "from-[#FF4B8A] to-[#e0336e]",
    border: "border-[#FF4B8A]",
    light: "#ffe4ef",
    text: "#FF4B8A",
  },
  {
    bg: "from-[#8B5CF6] to-[#7c3aed]",
    border: "border-[#8B5CF6]",
    light: "#f3e8ff",
    text: "#8B5CF6",
  },
];

const levelIcons = [Layers, Music, Puzzle, Shapes, Brain, Mic];

const levelDescriptions = [
  "Learn all 26 letters in shuffled pairs. Each pair has a listen button so you can hear each letter's sound.",
  "Explore all 26 letters on a tap-to-hear board. Press any letter to hear its pronunciation!",
  "Build CV (Consonant + Vowel) syllables! Click letters in order to form patterns like BA, MI, TO.",
  "Now add VC (Vowel + Consonant) syllables alongside CV! Build patterns like AB, IM, OT and more.",
  "Master all three patterns: CV, VC, and CVC! Form syllables like BAT, MIL, FUN in this ultimate challenge.",
  "Practice pronunciation with speech recognition! Say CVC words out loud and get instant feedback.",
];

const levelTags = [
  ["Letter Pairs", "26 Letters", "Audio"],
  ["Tap & Listen", "26 Letters", "Audio"],
  ["CV Pattern", "Syllables", "Audio"],
  ["CV + VC", "Syllables", "Audio"],
  ["CV + VC + CVC", "Syllables", "Audio"],
  ["Voice Recognition", "CVC Words", "Speech Practice"],
];

export default function LevelsPage() {
  const [userLevels] = useState(() => {
    // Clear cache if app version changed (forces Level 6 to appear)
    const APP_VERSION = "2.0"; // Increment this when adding new levels
    const storedVersion = localStorage.getItem("appVersion");
    if (storedVersion !== APP_VERSION) {
      localStorage.clear();
      localStorage.setItem("appVersion", APP_VERSION);
    }
    
    const completedLevels = JSON.parse(
      localStorage.getItem("completedLevels") || "[]"
    );
    return levels.map((level) => ({
      ...level,
      completed: completedLevels.includes(level.id),
      locked: false, // All levels are now unlocked
    }));
  });

  const completedCount = userLevels.filter((level) => level.completed).length;
  const totalProgress = (completedCount / levels.length) * 100;
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0fdf4] via-[#ecfeff] to-[#eff6ff] dark:from-gray-900 dark:via-gray-850 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Home Button */}
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
          >
            <HomeIcon className="w-5 h-5 mr-2" />
            Home
          </Button>
          <ThemeToggle />
        </div>

        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl shadow-lg bg-gradient-to-br from-[#58CC02] to-[#46a302]">
              <Sparkles className="w-8 h-8 text-white" fill="white" />
            </div>
            <h1 className="text-4xl bg-clip-text text-transparent bg-gradient-to-r from-[#58CC02] via-[#1CB0F6] to-[#FF9600]">
              Alphabet GO!
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Master the alphabet through 6 fun, progressive levels!
          </p>
        </header>

        {/* Progress Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-8 border-4 border-[#FFC800]/40 dark:border-[#FFC800]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-[#FFC800]" />
              <span className="text-gray-700 dark:text-gray-200">
                Your Progress
              </span>
            </div>
            <span className="text-sm" style={{ color: "#58CC02" }}>
              {completedCount} / {levels.length} Levels
            </span>
          </div>
          <div className="relative h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#58CC02] to-[#7ED321] transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Level Cards */}
        <div className="space-y-6">
          {userLevels.map((level, index) => {
            const isLocked =
              level.locked && !userLevels[index - 1]?.completed;
            const colors = levelColors[index % levelColors.length];
            const Icon = levelIcons[index % levelIcons.length];
            const tags = levelTags[index] || [];

            return (
              <div
                key={level.id}
                className={`bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden border-4 transition-all duration-300 ${
                  isLocked
                    ? "border-gray-200 dark:border-gray-700 opacity-60"
                    : level.completed
                      ? "border-[#58CC02] dark:border-[#46a302] hover:shadow-2xl"
                      : `${colors.border} dark:${colors.border} hover:shadow-2xl hover:scale-[1.02]`
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${
                            level.completed
                              ? "bg-gradient-to-br from-[#58CC02] to-[#46a302]"
                              : isLocked
                                ? "bg-gray-300 dark:bg-gray-600"
                                : `bg-gradient-to-br ${colors.bg}`
                          }`}
                        >
                          {level.completed ? (
                            <CheckCircle2 className="w-7 h-7" />
                          ) : isLocked ? (
                            <Lock className="w-7 h-7" />
                          ) : (
                            <Icon className="w-7 h-7" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl text-gray-800 dark:text-gray-100">
                            Level {level.id}: {level.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {level.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>
                    {level.completed && (
                      <Star
                        className="w-8 h-8 text-[#FFC800]"
                        fill="#FFC800"
                      />
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    {levelDescriptions[index]}
                  </p>

                  {/* Tags */}
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-3 py-1 rounded-full"
                        style={{
                          background: isLocked ? "#f1f5f9" : colors.light,
                          color: isLocked ? "#94a3b8" : colors.text,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Button */}
                  {!isLocked && (
                    <Link to={`/level/lesson/${level.id}`}>
                      <Button
                        className={`w-full py-6 text-lg rounded-2xl text-white shadow-md hover:shadow-lg transition-all ${
                          level.completed
                            ? "bg-gradient-to-r from-[#58CC02] to-[#46a302] hover:from-[#4db800] hover:to-[#3d8f02]"
                            : `bg-gradient-to-r ${colors.bg}`
                        }`}
                      >
                        {level.completed ? "Review Level" : "Start Learning"}
                      </Button>
                    </Link>
                  )}
                  {isLocked && (
                    <Button
                      disabled
                      className="w-full py-6 text-lg rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Complete previous level to unlock
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}