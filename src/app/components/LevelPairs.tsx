import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Volume2, ArrowRight, ArrowLeft, Home, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { generateLetterPairs } from "../data/levels";
import { motion } from "motion/react";
import { playElevenLabsAudio } from "../../utils/elevenLabsTTS";

interface LevelPairsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelPairs({ levelId, accent }: LevelPairsProps) {
  const navigate = useNavigate();
  const pairs = useMemo(() => generateLetterPairs(), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playingLetter, setPlayingLetter] = useState<string | null>(null);
  const [listenedPairs, setListenedPairs] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(false);

  const currentPair = pairs[currentIndex];
  const progress = ((currentIndex + 1) / pairs.length) * 100;

  const playAudio = async (text: string) => {
    setPlayingLetter(text);
    try {
      await playElevenLabsAudio(
        text,
        undefined,
        () => setPlayingLetter(null)
      );
      setListenedPairs((prev) => new Set(prev).add(currentIndex));
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingLetter(null);
    }
  };

  const goNext = () => {
    if (currentIndex < pairs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Mark level as completed
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      setCompleted(true);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/levels")}
            className="rounded-full"
          >
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: accent.primary }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <span className="text-sm" style={{ color: accent.primary }}>
            {currentIndex + 1}/{pairs.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        {completed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block mb-6"
            >
              <Sparkles className="w-20 h-20 text-[#FFC800]" />
            </motion.div>
            <h3 className="text-3xl mb-4" style={{ color: accent.primary }}>
              Level Complete!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              You've listened to all the letter pairs!
            </p>
            <Button
              onClick={() => navigate("/levels")}
              size="lg"
              className="rounded-xl px-8 py-6 text-lg text-white"
              style={{
                background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
              }}
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Levels
            </Button>
          </motion.div>
        ) : (
        <>
        <div className="text-center mb-6">
          <h2
            className="text-2xl mb-1"
            style={{ color: accent.primary }}
          >
            Letter Pairs
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Listen to each letter in the pair
          </p>
        </div>

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex gap-6 justify-center items-stretch mb-8"
        >
          {currentPair.map((letter, i) => (
            <motion.div
              key={`${currentIndex}-${i}`}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: i * 0.15,
              }}
              className="flex-1 max-w-[200px]"
            >
              <div
                className="rounded-3xl p-6 shadow-xl text-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                style={{
                  background:
                    playingLetter === letter
                      ? `linear-gradient(135deg, #FFC800 0%, #e6b400 100%)`
                      : `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
                }}
                onClick={() => playAudio(letter)}
              >
                <div className="text-white mb-2">
                  <span className="text-7xl">{letter}</span>
                  <span className="text-5xl">{letter.toLowerCase()}</span>
                </div>
                <div className="mt-4">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all ${
                      playingLetter === letter
                        ? "bg-white/40 text-white"
                        : "bg-white/20 text-white/90 hover:bg-white/30"
                    }`}
                  >
                    <Volume2
                      className={`w-4 h-4 ${
                        playingLetter === letter ? "animate-pulse" : ""
                      }`}
                    />
                    {playingLetter === letter ? "Playing..." : "Listen"}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Listened indicator */}
        {listenedPairs.has(currentIndex) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-6 text-[#58CC02]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm">Listened!</span>
          </motion.div>
        )}

        {/* Pair dots */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap max-w-xs mx-auto">
          {pairs.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i === currentIndex ? "scale-125" : ""
              }`}
              style={{
                background:
                  i === currentIndex
                    ? accent.primary
                    : listenedPairs.has(i)
                      ? `${accent.primary}60`
                      : "#d1d5db",
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            onClick={goPrev}
            disabled={currentIndex === 0}
            variant="outline"
            size="lg"
            className="rounded-xl px-6 py-6 border-2 disabled:opacity-30"
            style={{ borderColor: accent.primary, color: accent.primary }}
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <Button
            onClick={goNext}
            size="lg"
            className="rounded-xl px-8 py-6 text-lg text-white"
            style={{
              background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
            }}
          >
            {currentIndex === pairs.length - 1 ? "Finish!" : "Next"}
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}