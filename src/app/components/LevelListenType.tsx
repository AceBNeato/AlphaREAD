import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Home,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Volume2,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  shuffle,
  VOWELS,
  CONSONANTS,
  type SyllablePattern,
  type SyllableTarget,
} from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { Confetti } from "./ui/Confetti";
import { getPhoneticPronunciation } from "../data/levels";
import { playSound } from "../utils/soundEffects";

interface LevelListenTypeProps {
  levelId: number;
  patterns: SyllablePattern[];
  accent: { primary: string; dark: string; lightBg: string };
  onComplete?: () => void;
  customTargets: SyllableTarget[];
  isSubPhase?: boolean;
  embedded?: boolean;
}

export function LevelListenType({
  levelId,
  patterns,
  accent,
  onComplete,
  customTargets,
  isSubPhase,
  embedded,
}: LevelListenTypeProps) {
  const navigate = useNavigate();

  const [targets, setTargets] = useState<SyllableTarget[]>(customTargets);

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
  const [completedTargets, setCompletedTargets] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [playingLetter, setPlayingLetter] = useState<string | null>(null);

  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrongTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
    };
  }, []);

  const currentTarget = targets[currentIndex];
  const allDone = completedTargets.size >= targets.length;
  const progress = (completedTargets.size / targets.length) * 100;
  const slotCount = currentTarget ? currentTarget.letters.length : 2;

  useEffect(() => {
    if (allDone && onComplete) {
      onComplete();
    }
  }, [allDone, onComplete]);

  const getPhoneticText = (text: string, pattern: SyllablePattern): string => {
    const upper = text.toUpperCase();
    const phonetic = getPhoneticPronunciation(upper, pattern);
    return phonetic !== upper ? phonetic : text.toLowerCase();
  };

  const playTTS = async (text: string, pattern: SyllablePattern) => {
    const syllableLower = text.toLowerCase();

    // Use local audio files for CV and VC patterns
    if (pattern === "CV") {
      const audioPath = `${(import.meta as any).env.BASE_URL}audio/cv-audio/cv-${syllableLower}.MP3`;
      const audio = new Audio(audioPath);
      audio.play().catch(() => {
        const phoneticText = getPhoneticText(text, pattern);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(phoneticText);
          utterance.rate = 0.85;
          window.speechSynthesis.speak(utterance);
        }
      });
      return;
    }

    if (pattern === "VC") {
      const audioPath = `${(import.meta as any).env.BASE_URL}audio/vc-audio/vc-${syllableLower}.MP3`;
      const audio = new Audio(audioPath);
      audio.play().catch(() => {
        const phoneticText = getPhoneticText(text, pattern);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(phoneticText);
          utterance.rate = 0.85;
          window.speechSynthesis.speak(utterance);
        }
      });
      return;
    }

    if ((pattern as string) === "LETTER") {
      const audioPath = `${(import.meta as any).env.BASE_URL}audio/alphasounds-${syllableLower}.mp3`;
      const audio = new Audio(audioPath);
      audio.play().catch(() => {
        const phoneticText = getPhoneticText(text, pattern);
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(phoneticText);
          utterance.rate = 0.85;
          window.speechSynthesis.speak(utterance);
        }
      });
      return;
    }

    // CVC / Others:
    const phoneticText = getPhoneticText(text, pattern);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phoneticText);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Autoplay TTS when moving to a new target
  useEffect(() => {
    if (currentTarget && !completedTargets.has(currentTarget.syllable) && !allDone && !feedback) {
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = setTimeout(() => {
        playTTS(currentTarget.syllable, currentTarget.pattern);
      }, 500);
    }
  }, [currentIndex, currentTarget, allDone, feedback, completedTargets]);

  const handleLetterClick = (letter: string) => {
    if (feedback || allDone || completedTargets.has(currentTarget.syllable)) return;

    playSound("click", 0.2);
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => { });

    setSelectedLetters((prev) => {
      const newSelected = [...prev, letter];

      if (newSelected.length === slotCount) {
        const formed = newSelected.join("");

        if (formed === currentTarget.syllable) {
          playSound("correct", 0.4);
          setFeedback("correct");
          setShowConfetti(true);

          if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
          ttsTimeoutRef.current = setTimeout(() => {
            playTTS(formed, currentTarget.pattern);
          }, 1000);

          if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
          successTimeoutRef.current = setTimeout(() => {
            setCompletedTargets((prevSet) => {
              const newCompleted = new Set(prevSet);
              newCompleted.add(currentTarget.syllable);
              return newCompleted;
            });
            setFeedback(null);
            setSelectedLetters([]);
            setShowConfetti(false);
          }, 2500);
        } else {
          playSound("wrong", 0.35);
          setFeedback("wrong");
          if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
          wrongTimeoutRef.current = setTimeout(() => {
            setFeedback(null);
            setSelectedLetters([]);
          }, 1000);
        }
      }

      return newSelected;
    });
  };

  const goNext = () => {
    if (feedback === "correct") {
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      setCompletedTargets((prevSet) => {
        const newCompleted = new Set(prevSet);
        newCompleted.add(currentTarget.syllable);
        return newCompleted;
      });
      setFeedback(null);
      setSelectedLetters([]);
      setShowConfetti(false);

      if (currentIndex < targets.length - 1) {
        setCurrentIndex(prev => Math.min(prev + 1, targets.length - 1));
      }
      return;
    }

    if (currentIndex < targets.length - 1) {
      if (!completedTargets.has(currentTarget.syllable)) {
        setTargets((prev) => {
          const newTargets = [...prev];
          const skipped = newTargets.splice(currentIndex, 1)[0];
          newTargets.push(skipped);
          return newTargets;
        });
      } else {
        setCurrentIndex(prev => Math.min(prev + 1, targets.length - 1));
      }
      setSelectedLetters([]);
      setFeedback(null);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
      setSelectedLetters([]);
      setFeedback(null);
    }
  };

  const resetSelection = () => {
    setSelectedLetters([]);
    setFeedback(null);
  };

  const handleGoBack = () => {
    if (!allDone) {
      const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
      if (!confirmExit) return;
    }
    navigate("/levels", { replace: true });
  };

  const innerContent = (
    <div className={`max-w-2xl mx-auto px-4 w-full overflow-x-hidden ${embedded ? "py-2" : "py-6"}`}>
      {!allDone && currentTarget && (
        <>
          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-200/80 dark:bg-gray-800 rounded-full overflow-hidden mb-4 shadow-inner border border-gray-100 dark:border-gray-700/30">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${accent.primary}, ${accent.dark})`,
              }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="text-center mb-4"
            >
              <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Word {currentIndex + 1} of {targets.length}
              </div>

              <div
                className="inline-flex flex-col items-center gap-2 px-8 py-6 rounded-3xl shadow-lg mb-2"
                style={{
                  background: `linear-gradient(135deg, ${accent.primary}20, ${accent.primary}10)`,
                  border: `2px solid ${accent.primary}`,
                }}
              >
                <span className="text-sm px-4 py-1.5 rounded-full text-white mb-2" style={{ background: accent.primary }}>
                  Listen & Type
                </span>

                {/* Big Speaker Button instead of showing the word */}
                <button
                  onClick={() => playTTS(currentTarget.syllable, currentTarget.pattern)}
                  className="p-6 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all mb-4 group border-4"
                  style={{ borderColor: accent.lightBg }}
                >
                  <Volume2 className="w-12 h-12" style={{ color: accent.primary }} />
                </button>

                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Tap the speaker to hear the word,<br />then spell it below!
                </span>
              </div>

              {completedTargets.has(currentTarget.syllable) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center justify-center gap-2 mb-4 text-[#58CC02]"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="text-xl font-bold">
                      Completed!
                    </span>
                  </div>
                  <span className="text-3xl font-black mt-2 text-gray-800 dark:text-white tracking-widest uppercase">
                    "{currentTarget.syllable}"
                  </span>
                </motion.div>
              )}

              {/* Selected letters display */}
              {!completedTargets.has(currentTarget.syllable) && (
                <div className="flex justify-center gap-2 mt-4 mb-4">
                  {Array.from({ length: slotCount }).map((_, slot) => {
                    const isVowel = ["A", "E", "I", "O", "U"].includes(selectedLetters[slot]);
                    return (
                      <div
                        key={slot}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all ${!selectedLetters[slot]
                          ? "border-3 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30"
                          : feedback === "correct"
                            ? "scale-105"
                            : feedback === "wrong"
                              ? "animate-shake"
                              : ""
                          }`}
                      >
                        {selectedLetters[slot] ? (
                          <motion.div
                            initial={{ scale: 0, y: -10 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full h-full rounded-2xl flex flex-col items-center justify-center border-b-[4px] select-none shadow-md"
                            style={{
                              background: feedback === "correct"
                                ? "linear-gradient(135deg, #58CC02 0%, #46a302 100%)"
                                : feedback === "wrong"
                                  ? "linear-gradient(135deg, #FF4B4B 0%, #D82A2A 100%)"
                                  : isVowel
                                    ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)"
                                    : "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)",
                              borderColor: feedback === "correct"
                                ? "#3e8e01"
                                : feedback === "wrong"
                                  ? "#b81d1d"
                                  : isVowel
                                    ? "#C82A52"
                                    : "#086CA5",
                            }}
                          >
                            <span className="text-white text-3xl sm:text-4xl font-black drop-shadow-sm">
                              {selectedLetters[slot]?.toLowerCase()}
                            </span>
                            {/* Empty placeholder removed as per requirements */}
                          </motion.div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {feedback === "correct" && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-[#58CC02] text-lg font-bold"
                >
                  ✨ Great job!
                </motion.p>
              )}
              {feedback === "wrong" && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-[#FF4B4B] text-lg font-bold"
                >
                  Listen closely and try again!
                </motion.p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Reset button */}
          {selectedLetters.length > 0 &&
            !feedback &&
            !completedTargets.has(currentTarget.syllable) && (
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
          {!completedTargets.has(currentTarget.syllable) && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4">
              {letterPool.map((item, i) => {
                const timesInTarget = currentTarget.syllable
                  .split("")
                  .filter((ch) => ch === item.letter).length;
                const timesSelected = selectedLetters.filter(
                  (l) => l === item.letter
                ).length;

                const isVisuallySelected = timesInTarget > 0
                  ? timesSelected >= timesInTarget
                  : timesSelected > 0;

                const isDisabled =
                  timesInTarget > 0 &&
                  timesSelected >= timesInTarget &&
                  selectedLetters.length < slotCount &&
                  !feedback;

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
                    disabled={!!feedback || isDisabled}
                    className={`aspect-square rounded-[1rem] flex flex-col items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer relative border-b-[4px] select-none ${isVisuallySelected
                      ? "opacity-30 border-b-2 translate-y-[2px] pointer-events-none"
                      : "active:border-b-0 active:translate-y-[4px]"
                      }`}
                    style={{
                      background:
                        playingLetter === item.letter
                          ? "linear-gradient(135deg, #FFC800 0%, #FF9600 100%)"
                          : item.isVowel
                            ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)"
                            : "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)",
                      borderColor: isVisuallySelected
                        ? "transparent"
                        : playingLetter === item.letter
                          ? "#C99C00"
                          : item.isVowel
                            ? "#C82A52"
                            : "#086CA5",
                    } as React.CSSProperties}
                  >
                    <span className="text-white text-3xl sm:text-4xl font-black drop-shadow-sm">
                      {item.letter}{item.letter.toLowerCase()}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Navigation Arrows */}
          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={goPrev}
              disabled={currentIndex === 0}
              variant="outline"
              size="lg"
              className="rounded-xl px-6 py-5 border-2 disabled:opacity-30"
              style={{ borderColor: accent.primary, color: accent.primary }}
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={currentIndex === targets.length - 1}
              variant="outline"
              size="lg"
              className="rounded-xl px-6 py-5 border-2 disabled:opacity-30"
              style={{ borderColor: accent.primary, color: accent.primary }}
            >
              Next
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );

  if (embedded) {
    if (allDone) return null;
    return innerContent;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 dark:bg-none dark:bg-[#0d141c] overflow-x-hidden">
      <Confetti active={showConfetti} />
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="rounded-full"
          >
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              Listen and Type
            </h2>
          </div>
        </div>
      </div>
      {innerContent}
    </div>
  );
}