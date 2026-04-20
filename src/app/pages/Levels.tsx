import { useState } from "react";
import { Link } from "react-router";
import {
  Trophy,
  Home,
  Sparkles,
  Music,
  Layers,
  Puzzle,
  Shapes,
  Brain,
  Mic,
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
    bg: "from-[#7C3AED] to-[#6d28d9]",
    border: "border-[#7C3AED]",
    light: "#f3e8ff",
    text: "#7C3AED",
  },
];

const levelIcons = [Layers, Music, Puzzle, Shapes, Brain, Mic];

const levelDescriptions = [
  "Learn all 26 letters in shuffled pairs. Review each letter's uppercase and lowercase form.",
  "Explore all 26 letters on a QWERTY keyboard layout. Tap each letter to review!",
  "Build VC (Vowel + Consonant) syllables! Click letters in order to form patterns like AB, IM, OT. 65 total combinations randomized each time!",
  "Build CV (Consonant + Vowel) syllables! Click letters in order to form patterns like BA, MI, TO. 65 total combinations randomized each time!",
  "Build CVC (Consonant-Vowel-Consonant) words! Click letters in order to form words like BAT, MUG, TIP. 65 total words randomized each time!",
  "Practice pronunciation with speech recognition! Say CVC words out loud and get instant feedback.",
];

const levelTags = [
  ["Letter Pairs", "26 Letters", "Review"],
  ["Tap & Review", "26 Letters", "QWERTY"],
  ["VC Pattern", "65 Syllables", "Interactive"],
  ["CV Pattern", "65 Syllables", "Interactive"],
  ["CVC Pattern", "65 Words", "Challenge"],
  ["Voice Recognition", "CVC Words", "Speech Practice"],
];

export default function Levels() {
  const [userLevels] = useState(() => {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="text-gray-700 dark:text-gray-300">Home</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 rounded-2xl shadow-lg bg-gradient-to-br from-[#58CC02] to-[#46a302]">
              <Sparkles className="w-8 h-8 text-white" fill="white" />
            </div>
            <h1 className="text-4xl">
              <span className="text-[#58CC02]">Alphabet</span>{" "}
              <span className="text-[#1CB0F6]">GO!</span>
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Master the alphabet through {levels.length} fun, progressive levels!
          </p>
        </header>

        {/* Progress Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 mb-8 border-3 border-[#FFC800]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-[#FFC800]" />
              <span className="text-gray-700 dark:text-gray-200">
                Your Progress
              </span>
            </div>
            <span className="text-sm text-[#58CC02]">
              {completedCount} / {levels.length} Levels
            </span>
          </div>
          <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#58CC02] transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Level Cards */}
        <div className="space-y-6">
          {userLevels.map((level, index) => {
            const colors = levelColors[index % levelColors.length];
            const Icon = levelIcons[index % levelIcons.length];
            const tags = levelTags[index] || [];

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
                      <h3 className="text-xl text-gray-800 dark:text-gray-100 mb-1">
                        Level {level.id}: {level.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {level.subtitle}
                      </p>
                    </div>
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
                          background: colors.light,
                          color: colors.text,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Link to={`/lesson/${level.id}`}>
                    <Button
                      className={`w-full py-6 text-lg rounded-2xl text-white shadow-md hover:shadow-lg transition-all bg-gradient-to-r ${colors.bg}`}
                    >
                      Start Learning
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}