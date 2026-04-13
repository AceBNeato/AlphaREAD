import { useState } from "react";
import { useNavigate } from "react-router";
import { Volume2, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "motion/react";
import { getLetterPhonetic } from "../data/levels";
import { playElevenLabsAudio } from "../../utils/elevenLabsTTS";

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
  const [playingLetter, setPlayingLetter] = useState<string | null>(null);
  const [tappedLetters, setTappedLetters] = useState<Set<string>>(new Set());

  const progress = (tappedLetters.size / ALL_LETTERS.length) * 100;

  const playAudio = async (letter: string) => {
    setPlayingLetter(letter);
    try {
      await playElevenLabsAudio(
        getLetterPhonetic(letter),
        undefined,
        () => setPlayingLetter(null)
      );
      setTappedLetters((prev) => new Set(prev).add(letter));
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingLetter(null);
    }
  };

  const allTapped = tappedLetters.size >= 0; // Allow continue without tapping all letters

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate("/levels")}
            className="rounded-full gap-2 h-14 px-6 text-lg touch-manipulation"
          >
            <ArrowLeft className="w-6 h-6" />
            Back
          </Button>
          <div className="flex-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: accent.primary }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <span className="text-sm" style={{ color: accent.primary }}>
            {tappedLetters.size}/{ALL_LETTERS.length}
          </span>
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
            Tap each letter to hear how it sounds!
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
                const isPlaying = playingLetter === letter;
                const isTapped = tappedLetters.has(letter);
                const isVowel = VOWELS.has(letter);
                const letterIndex = ALL_LETTERS.indexOf(letter);

                return (
                  <motion.button
                    key={letter}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: letterIndex * 0.03, type: "spring", stiffness: 300 }}
                    onClick={() => playAudio(letter)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-90 ${
                      isPlaying ? "scale-110 ring-4 ring-[#FFC800]" : ""
                    }`}
                    style={{
                      background: isPlaying
                        ? "linear-gradient(135deg, #FFC800 0%, #FF9600 100%)"
                        : isTapped
                          ? `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`
                          : isVowel
                            ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)"
                            : "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
                    }}
                  >
                    <span
                      className={`text-2xl sm:text-3xl ${
                        isPlaying || isTapped || isVowel
                          ? "text-white"
                          : "text-gray-700 dark:text-gray-800"
                      }`}
                    >
                      {letter}
                    </span>
                    <span
                      className={`text-[10px] ${
                        isPlaying || isTapped || isVowel
                          ? "text-white/70"
                          : "text-gray-500"
                      }`}
                    >
                      {getLetterPhonetic(letter)}
                    </span>

                    {isPlaying && (
                      <motion.div
                        className="absolute -top-1 -right-1"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                      >
                        <Volume2 className="w-4 h-4 text-white" />
                      </motion.div>
                    )}

                    {isTapped && !isPlaying && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#58CC02] flex items-center justify-center">
                        <span className="text-white text-[8px]">✓</span>
                      </div>
                    )}
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
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ background: accent.primary }}
            />
            <span>Listened</span>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            type="button"
            onClick={() => {
              // Mark level as completed
              const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
              if (!completedLevels.includes(levelId)) {
                completedLevels.push(levelId);
                localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
              }
              navigate("/levels");
            }}
            disabled={!allTapped}
            className="rounded-xl px-8 py-6 text-lg text-white disabled:opacity-40 h-16 touch-manipulation"
            style={{
              background: allTapped
                ? `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`
                : undefined,
            }}
          >
            {allTapped ? (
              <>
                <Sparkles className="w-5 h-5 mr-1" />
                Complete Level!
              </>
            ) : (
              `Tap all letters to continue (${ALL_LETTERS.length - tappedLetters.size} left)`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}