import { useState } from "react";
import { Link } from "react-router";
import {
  LayoutDashboard,
  Sparkles,
  Layers,
  Puzzle,
  Brain,
  BookOpen,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { levels } from "../data/levels";
import { ThemeToggle } from "../components/ThemeToggle";

const levelColors = [
  {
    bg: "from-[#58CC02] to-[#46a302]",
    border: "border-[#58CC02]",
    borderDark: "border-[#3c8c01]",
    light: "#e8f9d4",
    text: "#58CC02",
  },
  {
    bg: "from-[#1CB0F6] to-[#0a8ed4]",
    border: "border-[#1CB0F6]",
    borderDark: "border-[#0979b5]",
    light: "#d4f1ff",
    text: "#1CB0F6",
  },
  {
    bg: "from-[#FF9600] to-[#e08000]",
    border: "border-[#FF9600]",
    borderDark: "border-[#b86800]",
    light: "#fff2d4",
    text: "#FF9600",
  },
  {
    bg: "from-[#CE82FF] to-[#a855f7]",
    border: "border-[#CE82FF]",
    borderDark: "border-[#883fba]",
    light: "#f3e8ff",
    text: "#a855f7",
  },
  {
    bg: "from-[#FF4B8A] to-[#e0336e]",
    border: "border-[#FF4B8A]",
    borderDark: "border-[#b51e4f]",
    light: "#ffe4ef",
    text: "#e0336e",
  },
  {
    bg: "from-[#7C3AED] to-[#6d28d9]",
    border: "border-[#7C3AED]",
    borderDark: "border-[#5b21b6]",
    light: "#f3e8ff",
    text: "#7C3AED",
  },
];

const levelIcons = [Layers, Puzzle, Brain, Sparkles, BookOpen];

const levelDescriptions = [
  "Learn all 26 letters in shuffled pairs. Review each letter's uppercase and lowercase form, then practice saying them!",
  "Build syllables! VC (Vowel + Consonant) like AB, IM, OT. CV (Consonant + Vowel) like BA, MI, TO.",
  "The ultimate challenge! Build CVC words (like BAT, SUN, DOG) and then use the AI to practice your pronunciation.",
  "Transition from letter sounds to letter names! Match the spoken name of a letter (like 'Ay', 'Bee', 'Cee') to its written form.",
  "Vowels say their names! Learn the key spelling patterns for long vowels: Magic E (a_e) and Vowel Teams (ai).",
  "Master consonant combinations! Practice 2-Letter Blends, 3-Letter Blends, and Ending Blends to improve your reading fluency."
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



  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:bg-none dark:bg-[#0d141c] overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-4 py-8 w-full">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-gray-700 dark:text-gray-300">Dashboard</span>
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
            Master the alphabet through {levels.length} fun, progressive lessons!
          </p>
        </header>

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
                      <h3 className="text-xl text-gray-800 dark:text-gray-100 mb-1">
                        Lesson {level.id}: {level.title}
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

                  {/* Action Button */}
                  <Link to={`/lesson/${level.id}`}>
                    <Button
                      className={`w-full py-6 text-lg rounded-2xl font-bold text-white shadow-md border-b-4 ${colors.borderDark} hover:brightness-110 hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all bg-gradient-to-r ${colors.bg}`}
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