import { useState } from "react";
import { useNavigate } from "react-router";
import { Home, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "motion/react";
import { getLetterPhonetic } from "../data/levels";

// QWERTY keyboard layout
const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"]
];
const ALL_LETTERS = QWERTY_ROWS.flat();
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

interface LevelSoundsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelSounds({ levelId, accent }: LevelSoundsProps) {
  const navigate = useNavigate();
  const [clickedLetter, setClickedLetter] = useState<string | null>(null);

  const handleLetterClick = (letter: string) => {
    setClickedLetter(letter);

    // Play audio for the letter
    const audio = new Audio(`/audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => {
      // Ignore autoplay errors
    });

    // Reset color after 1 second
    setTimeout(() => {
      setClickedLetter(null);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/levels")}
            className="rounded-full"
          >
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <h2 className="text-xl" style={{ color: accent.primary }}>
              Level 2: Letter Sounds
            </h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h2
            className="text-2xl mb-1"
            style={{ color: accent.primary }}
          >
            Letter Sounds
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Tap each letter to review!
          </p>
        </div>

        {/* Letter Grid */}
        <div className="space-y-3 mb-8">
          {QWERTY_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="flex justify-center gap-2"
              style={{
                paddingLeft: rowIndex === 1 ? "1.5rem" : rowIndex === 2 ? "3rem" : "0"
              }}
            >
              {row.map((letter) => {
                const isClicked = clickedLetter === letter;
                const isVowel = VOWELS.has(letter);
                const letterIndex = ALL_LETTERS.indexOf(letter);

                return (
                  <motion.button
                    key={letter}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: 1,
                      scale: isClicked ? 1.1 : 1,
                    }}
                    transition={{
                      delay: letterIndex * 0.03,
                      type: "spring",
                      stiffness: 300
                    }}
                    onClick={() => handleLetterClick(letter)}
                    className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-90"
                    style={{
                      background: isClicked
                        ? `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`
                        : isVowel
                          ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)"
                          : "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
                    } as React.CSSProperties}
                  >
                    <span
                      className={`text-2xl sm:text-3xl ${
                        isClicked || isVowel
                          ? "text-white"
                          : "text-gray-700 dark:text-gray-800"
                      }`}
                    >
                      {letter}
                    </span>
                    <span
                      className={`text-[10px] ${
                        isClicked || isVowel
                          ? "text-white/70"
                          : "text-gray-500"
                      }`}
                    >
                      {getLetterPhonetic(letter)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mb-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-[#FF6B8A] to-[#FF4B8A]" />
            <span>Vowels</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-gray-300 to-gray-400" />
            <span>Consonants</span>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            onClick={() => {
              // Mark level as completed
              const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
              if (!completedLevels.includes(levelId)) {
                completedLevels.push(levelId);
                localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
              }
              navigate("/levels");
            }}
            size="lg"
            className="rounded-xl px-8 py-6 text-lg text-white"
            style={{
              background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
            }}
          >
            <Sparkles className="w-5 h-5 mr-1" />
            Complete Level!
          </Button>
        </div>
      </div>
    </div>
  );
}