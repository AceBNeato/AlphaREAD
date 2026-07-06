import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Home, ArrowRight, ArrowLeft, RotateCcw, Sparkles, CheckCircle2, Volume2, FastForward, X } from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import {
  shuffle,
  type SyllablePattern,
  type SyllableTarget,
} from "../data/levels";
import { useCurriculum } from "../hooks/useCurriculum";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { playSound, playExclusiveAudio } from "../utils/soundEffects";
import { playTTS as playTTSUtil } from "../utils/tts";
import { PushableButton } from "./ui/PushableButton";
import { ActionToolbar } from "./ui/ActionToolbar";

interface LevelSyllableBuilderProps {
  levelId: number;
  patterns: SyllablePattern[];
  accent: { primary: string; dark: string; lightBg: string };
  onComplete?: () => void;
  onBack?: () => void;
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
  onBack,
  customTargets,
  isSubPhase,
  embedded,
}: LevelSyllableBuilderProps) {
  const navigate = useNavigate();

  const { VOWELS, CONSONANTS, generateSyllableTargets, getPhoneticPronunciation } = useCurriculum();

  // Sub-level selection: when Level 2 has both VC and CV, show a picker first
  const [selectedSubPattern, setSelectedSubPattern] = useState<SyllablePattern | null>(
    patterns.length === 1 ? patterns[0] : null
  );

  const [targets, setTargets] = useState<SyllableTarget[]>(() =>
    customTargets ? customTargets : patterns.length === 1 ? generateSyllableTargets(patterns, 10) : []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTarget = targets[currentIndex];

  // Build the letter pool for the CURRENT target to ensure exactly 12 buttons
  const letterPool = useMemo(() => {
    if (!currentTarget) return [];

    const letters: { id: string; letter: string; isVowel: boolean }[] = [];
    const added = new Set<string>();

    // Add letters for the current target
    currentTarget.letters.forEach((l) => {
      const upperL = l.toUpperCase();
      if (!added.has(upperL)) {
        added.add(upperL);
        letters.push({
          id: `l-${upperL}`,
          letter: upperL,
          isVowel: VOWELS.includes(upperL),
        });
      }
    });

    // Add random distractors up to exactly 12 total buttons
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
  }, [currentTarget]);

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

  const allDone = completedTargets.size >= targets.length;
  const progress = (completedTargets.size / targets.length) * 100;
  const slotCount = currentTarget ? currentTarget.letters.length : 2;

  useEffect(() => {
    if (allDone && onComplete) {
      onComplete();
    }
  }, [allDone, onComplete]);

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

  const [hasClickedTTS, setHasClickedTTS] = useState(false);

  const playTTS = async (text: string, pattern: SyllablePattern) => {
    setHasClickedTTS(true);
    const syllableLower = text.toLowerCase();

    // Use local audio files for CV and VC patterns
    if (pattern === "CV") {
      const audioPath = `${(import.meta as any).env.BASE_URL}audio/cv-audio/cv-${syllableLower}.mp3`;
      playExclusiveAudio(audioPath).catch(() => { });
      return;
    }

    if (pattern === "VC") {
      const audioPath = `${(import.meta as any).env.BASE_URL}audio/vc-audio/vc-${syllableLower}.mp3`;
      playExclusiveAudio(audioPath).catch(() => { });
      return;
    }

    // Use local audio files for CVC words
    if (pattern === "CVC") {
      const audioPath = `${(import.meta as any).env.BASE_URL}audio/cvc-audio/cvc-${syllableLower}.mp3`;
      playExclusiveAudio(audioPath).catch((err) => {
        console.warn(`[AlphabetGO] Local CVC audio not found: ${audioPath}, falling back to TTS`, err);
        const phoneticText = getPhoneticText(text, pattern);
        playTTSUtil(phoneticText);
      });
      return;
    }

    // Fallback
    const phoneticText = getPhoneticText(text, pattern);
    playTTSUtil(phoneticText);
  };

  const handleLetterClick = (letter: string) => {
    if (feedback || allDone || completedTargets.has(currentTarget.syllable)) return;

    // Play audio for the letter
    playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/alphabet/alphasounds-${letter.toLowerCase()}.mp3`);

    setSelectedLetters((prev) => {
      const newSelected = [...prev, letter];

      // Check if we just filled the last slot
      if (newSelected.length === slotCount) {
        const formed = newSelected.join("").toUpperCase();

        if (formed === currentTarget.syllable.toUpperCase()) {
          playSound("correct", 0.4);
          setFeedback("correct");
          setShowConfetti(true);

          // Add the 1-second delay for the TTS so the final letter sound finishes first
          if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
          ttsTimeoutRef.current = setTimeout(() => {
            playTTS(currentTarget.syllable, currentTarget.pattern);
          }, 1000);

          // Removed auto-advance. Word stays on screen until user clicks Next.
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

  const handleRemoveLetter = (indexToRemove: number) => {
    if (feedback || allDone || completedTargets.has(currentTarget.syllable)) return;
    if (indexToRemove >= selectedLetters.length) return;

    setSelectedLetters(prev => {
      const newLetters = [...prev];
      newLetters.splice(indexToRemove, 1);
      return newLetters;
    });
  };

  const goNext = () => {
    if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);

    if (feedback === "correct") {
      setCompletedTargets((prevSet) => {
        const newCompleted = new Set(prevSet);
        newCompleted.add(currentTarget.syllable);
        if (newCompleted.size >= targets.length) {
          playSound("complete", 0.5);
        }
        return newCompleted;
      });
      if (currentIndex < targets.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedLetters([]);
        setFeedback(null);
        setShowConfetti(false);
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
    } else if (onBack) {
      onBack();
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

  const handleGoBack = async () => {
    if (!allDone) {
      const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
      if (!confirmExit) return;
    }
    navigate("/levels", { replace: true });
  };
  const innerContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={selectedSubPattern ? `builder-${currentIndex}` : "picker"}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="flex-grow w-full flex flex-col min-h-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full">
          <div className={`w-full max-w-2xl mx-auto px-15 flex flex-col justify-center min-h-full ${embedded ? "py-2" : "py-6"}`}>
            <Confetti active={showConfetti} />
            {/* SUB-LEVEL PICKER — shown when Level 2 has both VC and CV */}
            {!selectedSubPattern && patterns.length > 1 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center my-auto w-full"
              >
                <h2 className="text-2xl mb-2 font-bold" style={{ color: accent.primary }}>
                  {levelId === 3 ? "CVC Master - Word Builder" : "Syllable Builder"}
                </h2>
                <p className="text-gray-800 dark:text-gray-200 text-base sm:text-lg font-bold mt-6 mb-8 block">
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
                      className="p-8 rounded-3xl border-3 shadow-lg hover:shadow-xl transition-all hover:scale-[1.03] active:translate-y-1 bg-white dark:bg-gray-800 cursor-pointer"
                      style={{ borderColor: patternColors[p] }}
                    >
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-4"
                        style={{ background: `linear-gradient(135deg, ${patternColors[p]}, ${accent.dark})` }}
                      >
                        <span className="text-2xl font-bold">2.{i + 1}</span>
                      </div>
                      <h3 className="text-xl mb-1 font-bold" style={{ color: patternColors[p] }}>
                        {patternLabels[p]}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {p === "VC"
                          ? "Build syllables like ab, im, ot"
                          : p === "CV"
                            ? "Build syllables like ba, mi, to"
                            : "Build words like bat, mug, tip"}
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
                  <div className="text-center mt-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedSubPattern(null);
                        setTargets([]);
                        setCurrentIndex(0);
                        setCompletedTargets(new Set());
                        setSelectedLetters([]);
                        setFeedback(null);
                      }}
                      className="text-xs px-4 py-2 rounded-full border-2 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer font-bold shadow-sm active:translate-y-1"
                    >
                      ← Switch Pattern (VC / CV)
                    </button>
                  </div>
                )}

                {!allDone && (
                  <div className="flex-grow flex flex-col justify-center w-full">
                    {/* Top Section: Title / Instructions */}
                    <div className="text-center mt-2 shrink-0">
                      <p className="text-gray-800 dark:text-gray-200 text-base sm:text-lg font-bold block">
                        Listen to the sound and tap the letters to build it.
                      </p>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Syllable {currentIndex + 1} of {targets.length}
                      </div>
                    </div>

                    {/* Middle Section: Centered Interactive builder */}
                    <div className="w-full py-4 shrink-0 flex flex-col items-center justify-center">
                      <div className="text-center w-full flex flex-col items-center">
                        <div
                          className="inline-flex flex-col items-center gap-2 px-6 py-3 rounded-2xl shadow-lg mb-4"
                          style={{
                            background: `linear-gradient(135deg, ${patternColors[currentTarget.pattern]}20, ${patternColors[currentTarget.pattern]}10)`,
                            border: `2px solid ${patternColors[currentTarget.pattern]}`,
                          }}
                        >
                          {/* Show the actual target syllable */}
                          <div className="flex items-center gap-2 relative">
                            <button
                              onClick={() => playTTS(currentTarget.syllable, currentTarget.pattern)}
                              className={`flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-md border-b-[4px] hover:scale-105 active:scale-95 transition-all ${!hasClickedTTS && currentIndex === 0 ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                              style={{ borderColor: patternColors[currentTarget.pattern] }}
                              title="Click to hear again"
                            >
                                <div className="font-black text-4xl sm:text-5xl tracking-wide flex gap-0.5">
                                  {currentTarget.letters.map((ch, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        color: VOWELS.includes(ch.toUpperCase())
                                          ? "#FF6B8A"
                                          : "#1CB0F6",
                                      }}
                                    >
                                      {ch.toLowerCase()}
                                    </span>
                                  ))}
                              </div>
                              <Volume2 className="w-6 h-6 opacity-50" style={{ color: patternColors[currentTarget.pattern] }} />
                            </button>
                            {!hasClickedTTS && currentIndex === 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                              >
                                Tap to listen!
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45" />
                              </motion.div>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Tap letters below in the correct order
                          </span>
                          <motion.div
                            animate={{
                              x: feedback === "wrong" ? [-10, 10, -10, 10, 0] : 0,
                              scale: feedback === "correct" ? [1, 1.05, 1] : 1
                            }}
                            className="flex justify-center gap-2 mt-2 mb-2"
                          >
                            {Array.from({ length: slotCount }).map((_, slot) => {
                              const isVowel = ["A", "E", "I", "O", "U"].includes(selectedLetters[slot]);
                              return (
                                <div
                                  key={slot}
                                  onClick={() => selectedLetters[slot] ? handleRemoveLetter(slot) : undefined}
                                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all ${!selectedLetters[slot]
                                    ? "border-4 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30"
                                    : "cursor-pointer hover:scale-95 active:scale-90"
                                    }`}
                                >
                                  {selectedLetters[slot] ? (
                                    <motion.div
                                      initial={{ opacity: 0, y: 40 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                      className={`w-full h-full rounded-2xl flex flex-col items-center justify-center border-b-[4px] select-none shadow-md ${feedback === "correct" ? "bg-green-100 border-green-400 text-green-700" :
                                        feedback === "wrong" ? "bg-red-50 border-red-400 text-red-600" : ""
                                        }`}
                                      style={{
                                        background: feedback ? undefined :
                                          isVowel ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)" : "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)",
                                        borderColor: feedback ? undefined :
                                          isVowel ? "#C82A52" : "#086CA5",
                                      }}
                                    >
                                      <span className={`text-4xl sm:text-5xl font-black drop-shadow-sm ${feedback ? "" : "text-white"}`}>
                                        {selectedLetters[slot]?.toLowerCase()}
                                      </span>
                                    </motion.div>
                                  ) : (
                                    <span className="text-gray-300 dark:text-gray-600 text-2xl font-bold opacity-50">
                                      {patternPlaceholder(currentTarget.pattern)[slot]}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </motion.div>
                        </div>
                      </div>

                      {/* Letter Pool */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4 w-full max-w-lg mx-auto">
                        {letterPool.map((item, i) => {
                          const timesInTarget = currentTarget.syllable
                            .toUpperCase()
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
                            <PushableButton
                              as="button"
                              isTile
                              key={item.id}
                              onClick={() =>
                                !isDisabled && handleLetterClick(item.letter)
                              }
                              disabled={!!feedback || isDisabled}
                              className={`aspect-square relative select-none w-full ${isVisuallySelected
                                ? "opacity-30 pointer-events-none"
                                : ""
                                }`}
                              frontStyle={{
                                background:
                                  playingLetter === item.letter
                                    ? "linear-gradient(135deg, #FFC800 0%, #FF9600 100%)"
                                    : item.isVowel
                                      ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)"
                                      : "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)",
                              }}
                              edgeStyle={{
                                backgroundColor:
                                  playingLetter === item.letter
                                    ? "#d97e00"
                                    : item.isVowel
                                      ? "#C82A52"
                                      : "#086CA5",
                              }}
                            >
                              <span className="text-white text-2xl sm:text-3xl font-black drop-shadow-sm flex items-center justify-center">
                                {item.letter.toUpperCase()}{item.letter.toLowerCase()}
                              </span>
                            </PushableButton>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sticky Bottom Section: Navigation Controls */}
        {selectedSubPattern && !allDone && (
          <div className="w-full shrink-0 mt-auto">
            <ActionToolbar
              onBack={goPrev}
              canBack={!(currentIndex === 0 && !onBack)}
              onSkip={() => onComplete?.()}
              onNext={goNext}
              canNext={!(currentIndex === targets.length - 1 && feedback !== "correct")}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  if (embedded) {
    if (allDone) return null;
    return innerContent;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 to-pink-50 dark:bg-none dark:bg-[#0d141c] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="shrink-0 z-10 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" /> <span className="hidden sm:inline font-bold uppercase tracking-wider text-sm">EXIT</span>
          </Button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
              {levelId === 3 ? "CVC Master - Word Builder" : "Syllable Builder"}
            </h2>
          </div>
          {targets.length > 0 && <span className="text-sm font-bold" style={{ color: accent.primary }}>Step {currentIndex + 1}/{targets.length}</span>}
        </div>
      </div>
      {innerContent}
    </div>
  );
}