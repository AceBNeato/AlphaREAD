import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Home,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Volume2,
  FastForward
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
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { getPhoneticPronunciation } from "../data/levels";
import { playSound } from "../utils/soundEffects";


interface LevelSyllableBuilderProps {
  levelId: number;
  patterns: SyllablePattern[];
  accent: { primary: string; dark: string; lightBg: string };
  onComplete?: () => void;
  customTargets?: SyllableTarget[];
  isSubPhase?: boolean;
  embedded?: boolean;
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

export function LevelSyllableBuilder({
  levelId,
  patterns,
  accent,
  onComplete,
  customTargets,
  isSubPhase,
  embedded,
}: LevelSyllableBuilderProps) {
  const navigate = useNavigate();

  // Sub-level selection: when Level 2 has both VC and CV, show a picker first
  const [selectedSubPattern, setSelectedSubPattern] = useState<SyllablePattern | null>(
    patterns.length === 1 ? patterns[0] : null
  );

  const [targets, setTargets] = useState<SyllableTarget[]>(() =>
    customTargets ? customTargets : patterns.length === 1 ? generateSyllableTargets(patterns, 10) : []
  );

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
    // Add a few extra distractors up to 12 total
    const allPool = [...CONSONANTS, ...VOWELS].filter((l) => !added.has(l));
    const distractorsNeeded = Math.max(0, 12 - letters.length);
    const extras = shuffle(allPool).slice(0, distractorsNeeded);
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
  const [isSaving, setIsSaving] = useState(false);
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

  if (allDone && embedded) return null;

  /**
   * Returns the phonetically correct TTS string for a syllable.
   * Uses the existing CV_PHONETICS / VC_PHONETICS maps from levels.ts so that:
   *   - "PI" → "Pee"  (not "pie")
   *   - "BA" → "Bah"  (not "ba")
   *   - "AB" → "Ab"   (not "ab" read as letter name "Ay-Bee")
   *   - "IT" → "It"   (correct)
   */
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
        // Fallback to Google TTS if file missing
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
        // Fallback to Google TTS if file missing
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

    // CVC: no local audio files — use Google TTS
    const phoneticText = getPhoneticText(text, pattern);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phoneticText);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleLetterClick = (letter: string) => {
    if (feedback || allDone || completedTargets.has(currentTarget.syllable)) return;

    playSound("click", 0.2);
    // Play audio for the letter
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => {
      // Ignore autoplay errors
    });

    setSelectedLetters((prev) => {
      const newSelected = [...prev, letter];

      // Check if we just filled the last slot
      if (newSelected.length === slotCount) {
        const formed = newSelected.join("");

        if (formed === currentTarget.syllable) {
          playSound("correct", 0.4);
          setFeedback("correct");
          setShowConfetti(true);

          Swal.fire({
            icon: 'success',
            title: 'Great match!',
            text: `"${currentTarget.syllable.toLowerCase()}"`,
            timer: 2000,
            showConfirmButton: false,
            backdrop: `
              rgba(0,0,123,0.1)
            `
          });

          // Add the 1-second delay for the TTS so the final letter sound finishes first
          if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
          ttsTimeoutRef.current = setTimeout(() => {
            playTTS(formed, currentTarget.pattern);
          }, 1000);

          // Give the child 2.5 seconds total to hear the TTS and celebrate before moving on
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

          Swal.fire({
            icon: 'error',
            title: 'Try again!',
            timer: 1000,
            showConfirmButton: false,
          });

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
    // If they click next while the success animation is playing, skip the wait!
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

      // Auto advance to next if possible
      if (currentIndex < targets.length - 1) {
        setCurrentIndex(prev => Math.min(prev + 1, targets.length - 1));
      }
      return;
    }

    if (currentIndex < targets.length - 1) {
      if (!completedTargets.has(currentTarget.syllable)) {
        // Move uncompleted target to the end of the array
        setTargets((prev) => {
          const newTargets = [...prev];
          const skipped = newTargets.splice(currentIndex, 1)[0];
          newTargets.push(skipped);
          return newTargets;
        });
        // Index stays the same to show the next target in the newly shifted array
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

  const patternPlaceholder = (pattern: SyllablePattern): string[] => {
    switch (pattern) {
      case "CV":
        return ["", ""];
      case "VC":
        return ["", ""];
      case "CVC":
        return ["", "", ""];
    }
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
      {/* SUB-LEVEL PICKER — shown when Level 2 has both VC and CV */}
      {!selectedSubPattern && patterns.length > 1 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h2 className="text-2xl mb-2" style={{ color: accent.primary }}>
            {levelId === 3 ? "CVC Word Builder" : "Syllable Builder"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            Choose which pattern to practice!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {patterns.map((p, i) => (
              <motion.button
                key={p}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => {
                  setSelectedSubPattern(p);
                  setTargets(generateSyllableTargets([p], 10));
                  setCurrentIndex(0);
                  setCompletedTargets(new Set());
                  setSelectedLetters([]);
                }}
                className="p-8 rounded-3xl border-3 shadow-lg hover:shadow-xl transition-all hover:scale-[1.03] active:scale-95 bg-white dark:bg-gray-800 cursor-pointer"
                style={{ borderColor: patternColors[p] }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4"
                  style={{ background: `linear-gradient(135deg, ${patternColors[p]}, ${accent.dark})` }}
                >
                  <span className="text-2xl font-bold">2.{i + 1}</span>
                </div>
                <h3 className="text-xl mb-1" style={{ color: patternColors[p] }}>
                  {patternLabels[p]}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {p === "VC"
                    ? "Build syllables like AB, IM, OT"
                    : p === "CV"
                      ? "Build syllables like BA, MI, TO"
                      : "Build words like BAT, MUG, TIP"}
                </p>
                <div className="mt-4">
                  <span
                    className="text-xs px-4 py-1.5 rounded-full text-white"
                    style={{ background: patternColors[p] }}
                  >
                    65 Syllables
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        <>
          {patterns.length > 1 && (
            <div className="text-center mb-6 mt-2">
              <button
                onClick={() => {
                  setSelectedSubPattern(null);
                  setTargets([]);
                  setCurrentIndex(0);
                  setCompletedTargets(new Set());
                  setSelectedLetters([]);
                  setFeedback(null);
                }}
                className="text-xs px-4 py-2 rounded-full border-2 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer font-bold shadow-sm active:scale-95"
              >
                ← Switch Pattern (VC / CV)
              </button>
            </div>
          )}

          {!allDone && (
            <>

              {/* Current Target Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.25 }}
                  className="text-center mb-4"
                >
                  {/* Navigation Controls */}
                  <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                    <Button
                      onClick={goPrev}
                      disabled={currentIndex === 0}
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl font-bold border-2 disabled:opacity-30 px-2"
                      style={{ borderColor: accent.primary, color: accent.primary }}
                    >
                      <ArrowLeft className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Back</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetSelection} className="flex-1 rounded-xl font-bold border-2 text-gray-600 px-2" style={{ borderColor: '#d1d5db' }}>
                      <RotateCcw className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Reset</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onComplete?.()} className="flex-1 rounded-xl font-bold border-2 text-amber-600 bg-amber-50 hover:bg-amber-100 px-2" style={{ borderColor: '#fcd34d' }}>
                      <FastForward className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Skip</span>
                    </Button>
                    <Button
                      onClick={goNext}
                      disabled={currentIndex === targets.length - 1}
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl font-bold border-2 disabled:opacity-30 px-2"
                      style={{ borderColor: accent.primary, color: accent.primary }}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ArrowRight className="w-4 h-4 sm:ml-1" />
                    </Button>
                  </div>

                  {/* Target info */}
                  <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    Syllable {currentIndex + 1} of {targets.length}
                  </div>

                  <div
                    className="inline-flex flex-col items-center gap-2 px-6 py-3 rounded-2xl shadow-lg mb-2"
                    style={{
                      background: `linear-gradient(135deg, ${patternColors[currentTarget.pattern]}20, ${patternColors[currentTarget.pattern]}10)`,
                      border: `2px solid ${patternColors[currentTarget.pattern]}`,
                    }}
                  >


                    {/* Show the actual target syllable */}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-4xl sm:text-5xl tracking-widest"
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
                            {ch.toLowerCase()}
                          </span>
                        ))}
                      </span>
                      {(completedTargets.has(currentTarget.syllable) || feedback === "correct") && (
                        <button
                          onClick={() => playTTS(currentTarget.syllable, currentTarget.pattern)}
                          className="ml-4 p-3 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors active:scale-95 flex-shrink-0 cursor-pointer"
                        >
                          <Volume2 className="w-6 h-6" />
                        </button>
                      )}
                    </div>

                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Tap letters below in the correct order
                    </span>
                  </div>



                  {/* Selected letters display */}
                  {!completedTargets.has(currentTarget.syllable) && (
                    <div className="flex justify-center gap-2 mt-2 mb-4">
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
                                <span className="text-white/80 text-[9px] uppercase font-bold tracking-wider mt-0.5">
                                  {isVowel ? "vowel" : "cons."}
                                </span>
                              </motion.div>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600 text-xl font-bold opacity-50">
                                {patternPlaceholder(currentTarget.pattern)[slot]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}


                </motion.div>
              </AnimatePresence>

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

                    // A letter is "selected" visually only if it's used up its count in the target
                    // Or if it's a distractor that's been clicked at least once
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
                        <span className="text-white/80 text-[9px] uppercase font-bold tracking-wider mt-0.5">
                          {item.isVowel ? "vowel" : "cons."}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}


            </>
          )}
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
      {/* Header */}
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
              {levelId === 3 ? "CVC Word Builder" : "Syllable Builder"}
            </h2>
          </div>
        </div>
      </div>
      {innerContent}
    </div>
  );
}