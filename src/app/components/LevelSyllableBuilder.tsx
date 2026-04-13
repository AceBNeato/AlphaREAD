import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Volume2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  shuffle,
  VOWELS,
  CONSONANTS,
  generateSyllableTargets,
  type SyllablePattern,
  type SyllableTarget,
} from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { playElevenLabsAudio } from "../../utils/elevenLabsTTS";

interface LevelSyllableBuilderProps {
  levelId: number;
  patterns: SyllablePattern[];
  accent: { primary: string; dark: string; lightBg: string };
}

const patternLabels: Record<SyllablePattern, string> = {
  CV: "Consonant + Vowel",
  VC: "Vowel + Consonant",
  CVC: "Consonant + Vowel + Consonant",
};

const patternColors: Record<SyllablePattern, string> = {
  CV: "#FF9600",
  VC: "#CE82FF",
  CVC: "#FF4B8A",
};

// Simple CV syllables for elementary standards
const SIMPLE_CV_SYLLABLES = [
  { pattern: "CV" as const, letters: ["B", "A"], syllable: "BA" },
  { pattern: "CV" as const, letters: ["C", "A"], syllable: "CA" },
  { pattern: "CV" as const, letters: ["D", "A"], syllable: "DA" },
  { pattern: "CV" as const, letters: ["M", "A"], syllable: "MA" },
  { pattern: "CV" as const, letters: ["P", "A"], syllable: "PA" },
  { pattern: "CV" as const, letters: ["S", "A"], syllable: "SA" },
  { pattern: "CV" as const, letters: ["T", "A"], syllable: "TA" },
  { pattern: "CV" as const, letters: ["B", "I"], syllable: "BI" },
  { pattern: "CV" as const, letters: ["C", "I"], syllable: "CI" },
  { pattern: "CV" as const, letters: ["D", "I"], syllable: "DI" },
  { pattern: "CV" as const, letters: ["M", "I"], syllable: "MI" },
  { pattern: "CV" as const, letters: ["P", "I"], syllable: "PI" },
  { pattern: "CV" as const, letters: ["S", "I"], syllable: "SI" },
  { pattern: "CV" as const, letters: ["T", "I"], syllable: "TI" },
];

// Simple VC syllables for elementary standards
const SIMPLE_VC_SYLLABLES = [
  { pattern: "VC" as const, letters: ["A", "B"], syllable: "AB" },
  { pattern: "VC" as const, letters: ["A", "D"], syllable: "AD" },
  { pattern: "VC" as const, letters: ["A", "M"], syllable: "AM" },
  { pattern: "VC" as const, letters: ["A", "P"], syllable: "AP" },
  { pattern: "VC" as const, letters: ["A", "T"], syllable: "AT" },
  { pattern: "VC" as const, letters: ["I", "B"], syllable: "IB" },
  { pattern: "VC" as const, letters: ["I", "D"], syllable: "ID" },
  { pattern: "VC" as const, letters: ["I", "M"], syllable: "IM" },
  { pattern: "VC" as const, letters: ["I", "P"], syllable: "IP" },
  { pattern: "VC" as const, letters: ["I", "T"], syllable: "IT" },
];

// Simple CVC syllables for elementary standards (using real words)
const SIMPLE_CVC_SYLLABLES = [
  { pattern: "CVC" as const, letters: ["C", "A", "T"], syllable: "CAT" },
  { pattern: "CVC" as const, letters: ["D", "O", "G"], syllable: "DOG" },
  { pattern: "CVC" as const, letters: ["P", "I", "G"], syllable: "PIG" },
  { pattern: "CVC" as const, letters: ["R", "A", "T"], syllable: "RAT" },
  { pattern: "CVC" as const, letters: ["S", "U", "N"], syllable: "SUN" },
  { pattern: "CVC" as const, letters: ["B", "I", "G"], syllable: "BIG" },
  { pattern: "CVC" as const, letters: ["R", "U", "G"], syllable: "RUG" },
  { pattern: "CVC" as const, letters: ["H", "O", "G"], syllable: "HOG" },
];

export function LevelSyllableBuilder({
  levelId,
  patterns,
  accent,
}: LevelSyllableBuilderProps) {
  const navigate = useNavigate();

  let targets = useMemo(() => {
    const allTargets: SyllableTarget[] = [];

    if (patterns.includes("CV")) {
      allTargets.push(...SIMPLE_CV_SYLLABLES);
    }
    if (patterns.includes("VC")) {
      allTargets.push(...SIMPLE_VC_SYLLABLES);
    }
    if (patterns.includes("CVC")) {
      allTargets.push(...SIMPLE_CVC_SYLLABLES);
    }

    if (allTargets.length > 0) {
      // Weighted randomization based on level
      if (levelId === 4) {
        // Level 4: Focus more on VC (70% VC, 30% CV)
        const vcTargets = allTargets.filter(t => t.pattern === "VC");
        const cvTargets = allTargets.filter(t => t.pattern === "CV");
        const vcCount = Math.min(7, vcTargets.length);
        const cvCount = Math.min(3, cvTargets.length);
        const selected = [
          ...shuffle(vcTargets).slice(0, vcCount),
          ...shuffle(cvTargets).slice(0, cvCount)
        ];
        return shuffle(selected);
      } else if (levelId === 5) {
        // Level 5: Focus on CVC (60% CVC, 20% VC, 20% CV)
        const cvcTargets = allTargets.filter(t => t.pattern === "CVC");
        const vcTargets = allTargets.filter(t => t.pattern === "VC");
        const cvTargets = allTargets.filter(t => t.pattern === "CV");
        const cvcCount = Math.min(6, cvcTargets.length);
        const vcCount = Math.min(2, vcTargets.length);
        const cvCount = Math.min(2, cvTargets.length);
        const selected = [
          ...shuffle(cvcTargets).slice(0, cvcCount),
          ...shuffle(vcTargets).slice(0, vcCount),
          ...shuffle(cvTargets).slice(0, cvCount)
        ];
        return shuffle(selected);
      } else {
        // Level 3: Just CV, 5-10 syllables
        return shuffle(allTargets).slice(0, Math.min(10, allTargets.length));
      }
    } else {
      return generateSyllableTargets(patterns, 8);
    }
  }, [patterns, levelId]);

  // Build the letter pool from all targets
  const letterPool = useMemo(() => {
    const letters: { id: string; letter: string; isVowel: boolean }[] = [];
    const added = new Set<string>();
    targets.forEach((t) => {
      t.letters.forEach((l) => {
        if (!added.has(l)) {
          added.add(l);
          letters.push({
            id: `l-${l}`,
            letter: l,
            isVowel: VOWELS.includes(l),
          });
        }
      });
    });
    // Add a few extra distractors
    const allPool = [...CONSONANTS, ...VOWELS].filter((l) => !added.has(l));
    const extras = shuffle(allPool).slice(0, 4);
    extras.forEach((l) => {
      letters.push({
        id: `x-${l}`,
        letter: l,
        isVowel: VOWELS.includes(l),
      });
    });
    return shuffle(letters);
  }, [targets]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [completedTargets, setCompletedTargets] = useState<Set<number>>(
    new Set()
  );
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [playingLetter, setPlayingLetter] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const currentTarget = targets[currentIndex];
  const allDone = completedTargets.size >= targets.length;
  const progress = (completedTargets.size / targets.length) * 100;
  const slotCount = currentTarget ? currentTarget.letters.length : 2;

  const playAudio = useCallback(async (text: string) => {
    setPlayingLetter(text);
    try {
      await playElevenLabsAudio(
        text,
        undefined,
        () => setPlayingLetter(null)
      );
    } catch (error) {
      console.error("Error playing audio:", error);
      setPlayingLetter(null);
    }
  }, []);

  // Helper to play syllable audio by playing each letter sound in sequence
  const playSyllableAudio = useCallback(async (target: SyllableTarget) => {
    // Play each letter sound in sequence with a delay
    for (let i = 0; i < target.letters.length; i++) {
      const letter = target.letters[i];
      setPlayingLetter(letter);
      try {
        await playElevenLabsAudio(letter);
      } catch (error) {
        console.error("Error playing audio:", error);
      }
      
      // Wait 1 second between letters
      if (i < target.letters.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 900));
      }
    }
    setPlayingLetter(null);
  }, [playAudio]);

  const handleLetterClick = (letter: string) => {
    if (feedback || allDone || completedTargets.has(currentIndex)) return;

    playAudio(letter);

    const newSelected = [...selectedLetters, letter];
    setSelectedLetters(newSelected);

    if (newSelected.length === slotCount) {
      const formed = newSelected.join("");

      if (formed === currentTarget.syllable) {
        setFeedback("correct");
        setScore((s) => s + 1);

        setTimeout(() => {
          const newCompleted = new Set(completedTargets);
          newCompleted.add(currentIndex);
          setCompletedTargets(newCompleted);
          setFeedback(null);
          setSelectedLetters([]);

          // Removed auto-advance - stay on completed syllable
        }, 1500);
      } else {
        setFeedback("wrong");
        setTimeout(() => {
          setFeedback(null);
          setSelectedLetters([]);
        }, 1000);
      }
    }
  };

  const goNext = () => {
    if (currentIndex < targets.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedLetters([]);
      setFeedback(null);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedLetters([]);
      setFeedback(null);
    }
  };

  const resetSelection = () => {
    setSelectedLetters([]);
    setFeedback(null);
  };

  const patternPlaceholder = (pattern: SyllablePattern): string[] => {
    switch (pattern) {
      case "CV":
        return ["C", "V"];
      case "VC":
        return ["V", "C"];
      case "CVC":
        return ["C", "V", "C"];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => currentIndex === 0 ? navigate("/levels") : goPrev()}
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
            {completedTargets.size}/{targets.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl mb-1" style={{ color: accent.primary }}>
            {patterns.length === 1
              ? `${patterns[0]} Builder`
              : patterns.length === 2
                ? `${patterns.join(" & ")} Builder`
                : "Syllable Master"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Tap the listen button, then click letters in order to spell it!
          </p>
          {/* Pattern legend */}
          <div className="flex justify-center gap-2 mt-2 flex-wrap">
            {patterns.map((p) => (
              <span
                key={p}
                className="text-xs px-3 py-1 rounded-full text-white"
                style={{ background: patternColors[p] }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        {!allDone ? (
          <>
            {/* Current Target Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="text-center mb-6"
              >
                {/* Target info */}
                <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  Syllable {currentIndex + 1} of {targets.length}
                </div>

                <div
                  className="inline-flex flex-col items-center gap-3 px-8 py-5 rounded-2xl shadow-lg mb-4"
                  style={{
                    background: `linear-gradient(135deg, ${patternColors[currentTarget.pattern]}20, ${patternColors[currentTarget.pattern]}10)`,
                    border: `2px solid ${patternColors[currentTarget.pattern]}`,
                  }}
                >
                  <span
                    className="text-xs px-3 py-1 rounded-full text-white"
                    style={{ background: patternColors[currentTarget.pattern] }}
                  >
                    {patternLabels[currentTarget.pattern]}
                  </span>

                  {/* Show the actual target syllable */}
                  <div className="flex items-center gap-3">
                    <span
                      className="text-5xl tracking-widest"
                      style={{ color: patternColors[currentTarget.pattern] }}
                    >
                      {currentTarget.syllable.split("").map((ch, i) => (
                        <span
                          key={i}
                          style={{
                            color: VOWELS.includes(ch)
                              ? "#FF6B8A"
                              : "#1CB0F6",
                          }}
                        >
                          {ch}
                        </span>
                      ))}
                    </span>
                    <button
                      onClick={() => playSyllableAudio(currentTarget)}
                      className="p-3 rounded-full text-white shadow-md hover:scale-110 active:scale-95 transition-transform"
                      style={{
                        background: `linear-gradient(135deg, ${patternColors[currentTarget.pattern]}, ${accent.dark})`,
                      }}
                    >
                      <Volume2 className="w-6 h-6" />
                    </button>
                  </div>

                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Tap letters below in the correct order
                  </span>
                </div>

                {/* Completed badge */}
                {completedTargets.has(currentIndex) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center gap-2 mb-4 text-[#58CC02]"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      Completed! — "{currentTarget.syllable}"
                    </span>
                    <button
                      onClick={() => playSyllableAudio(currentTarget)}
                      className="ml-1 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {/* Selected letters display */}
                {!completedTargets.has(currentIndex) && (
                  <div className="flex justify-center gap-3 mt-2">
                    {Array.from({ length: slotCount }).map((_, slot) => (
                      <div
                        key={slot}
                        className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl border-3 flex items-center justify-center text-3xl sm:text-4xl transition-all shadow-md hover:shadow-lg active:scale-90 cursor-pointer ${
                          feedback === "correct"
                            ? "border-[#58CC02] bg-[#d7ffb8] dark:bg-green-900/30"
                            : feedback === "wrong"
                              ? "border-[#FF4B4B] bg-[#ffdfe0] dark:bg-red-900/30"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        }`}
                        style={
                          !feedback && selectedLetters[slot]
                            ? {
                                borderColor: accent.primary,
                                background: accent.lightBg,
                              }
                            : undefined
                        }
                      >
                        {selectedLetters[slot] ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={
                              feedback === "correct"
                                ? "text-[#58CC02]"
                                : feedback === "wrong"
                                  ? "text-[#FF4B4B]"
                                  : ""
                            }
                            style={
                              !feedback ? { color: accent.primary } : undefined
                            }
                          >
                            {selectedLetters[slot]}
                          </motion.span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-2xl">
                            {patternPlaceholder(currentTarget.pattern)[slot]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {feedback === "correct" && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-[#58CC02] text-lg"
                  >
                    ✨ "{currentTarget.syllable}" — Great match!
                  </motion.p>
                )}
                {feedback === "wrong" && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-[#FF4B4B] text-lg"
                  >
                    Try again!
                  </motion.p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Reset button */}
            {selectedLetters.length > 0 &&
              !feedback &&
              !completedTargets.has(currentIndex) && (
                <div className="text-center mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetSelection}
                    className="text-gray-500"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}

            {/* Letter Pool */}
            {!completedTargets.has(currentIndex) && (
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-3 mb-6">
                {letterPool.map((item, i) => {
                  const isSelected = selectedLetters.includes(item.letter);
                  const isDisabled =
                    isSelected && selectedLetters.length < slotCount && !feedback;

                  return (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: i * 0.02,
                        type: "spring",
                        stiffness: 300,
                      }}
                      onClick={() =>
                        !isDisabled && handleLetterClick(item.letter)
                      }
                      disabled={!!feedback}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all shadow-md hover:shadow-lg active:scale-90 cursor-pointer ${
                        isSelected ? "ring-3 ring-offset-2" : ""
                      }`}
                      style={{
                        background:
                          playingLetter === item.letter
                            ? "linear-gradient(135deg, #FFC800 0%, #FF9600 100%)"
                            : item.isVowel
                              ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)"
                              : "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)",
                        boxShadow: isSelected ? `0 0 0 2px ${accent.primary}` : undefined,
                      }}
                    >
                      <span className="text-white text-2xl sm:text-3xl">
                        {item.letter}
                      </span>
                      <span className="text-white/60 text-xs">
                        {item.isVowel ? "vowel" : "cons."}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Navigation Arrows */}
            <div className="flex justify-between items-center mt-4">
              <Button
                type="button"
                onClick={() => currentIndex === 0 ? navigate("/levels") : goPrev()}
                variant="outline"
                size="lg"
                className="rounded-xl px-6 py-5 border-2 touch-manipulation"
                style={{ borderColor: accent.primary, color: accent.primary }}
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back
              </Button>
              <Button
                type="button"
                onClick={goNext}
                disabled={currentIndex === targets.length - 1}
                variant="outline"
                size="lg"
                className="rounded-xl px-6 py-5 border-2 disabled:opacity-30 touch-manipulation"
                style={{ borderColor: accent.primary, color: accent.primary }}
              >
                Next
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </div>

            {/* Completed syllables */}
            {completedTargets.size > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
                  Completed syllables:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {targets.map(
                    (t, i) =>
                      completedTargets.has(i) && (
                        <motion.span
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="px-4 py-2 rounded-full text-white text-sm cursor-pointer hover:scale-105 transition-transform"
                          style={{
                            background: `linear-gradient(135deg, ${patternColors[t.pattern]}, ${accent.dark})`,
                          }}
                          onClick={() => playSyllableAudio(t)}
                        >
                          <Volume2 className="w-3 h-3 inline mr-1" />
                          {t.syllable}
                          <span className="ml-1 opacity-60 text-xs">
                            ({t.pattern})
                          </span>
                        </motion.span>
                      )
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* All Done */
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
              All Syllables Built!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You matched {score} out of {targets.length} syllables!
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {targets.map((t, i) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-full text-white text-lg cursor-pointer hover:scale-105 transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${patternColors[t.pattern]}, ${accent.dark})`,
                  }}
                  onClick={() => playSyllableAudio(t)}
                >
                  <Volume2 className="w-3 h-3 inline mr-1" />
                  {t.syllable}
                  <span className="ml-1 opacity-60 text-xs">({t.pattern})</span>
                </span>
              ))}
            </div>
            <Button
              type="button"
              onClick={() => {
                const completedLevels = JSON.parse(
                  localStorage.getItem("completedLevels") || "[]"
                );
                if (!completedLevels.includes(levelId)) {
                  completedLevels.push(levelId);
                  localStorage.setItem(
                    "completedLevels",
                    JSON.stringify(completedLevels)
                  );
                }
                navigate("/levels");
              }}
              className="rounded-xl px-8 py-6 text-lg text-white h-16 touch-manipulation"
              style={{
                background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
              }}
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              Back to Levels
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
