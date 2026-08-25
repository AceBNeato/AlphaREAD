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
import { useLanguage } from "../context/LanguageContext";
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
  onExit?: () => void;
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
  onExit,
  customTargets,
  isSubPhase,
  embedded,
}: LevelSyllableBuilderProps) {
  const navigate = useNavigate();

  const { VOWELS, CONSONANTS, generateSyllableTargets, getPhoneticPronunciation } = useCurriculum();
  const { language } = useLanguage();
  const isTagalog = language === "tl";

  // Sub-level selection: when Level 2 has both VC and CV, show a picker first
  const [selectedSubPattern, setSelectedSubPattern] = useState<SyllablePattern | null>(
    patterns.length === 1 ? patterns[0] : null
  );

  const [targets, setTargets] = useState<SyllableTarget[]>(() =>
    customTargets ? customTargets : patterns.length === 1 ? generateSyllableTargets(patterns, 10) : []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTarget = targets[currentIndex];
  const hasChunks = currentTarget?.letters.some(l => l.length > 1) ?? false;

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
    let allPool: string[] = [];

    if (language === "tl" && levelId === 3) {
      // For Level 3 Tagalog, use 2-letter combos (CV) as distractors, and some single vowels/ng
      const randomChunks = [];
      for (let i = 0; i < 15; i++) {
        const c = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
        const v = VOWELS[Math.floor(Math.random() * VOWELS.length)];
        randomChunks.push(c + v);
      }
      allPool = [...randomChunks, ...VOWELS, "NG"];
    } else {
      allPool = [...CONSONANTS, ...VOWELS];
      // If target has chunks, inject some random chunk distractors
      if (hasChunks) {
        const randomChunks = [];
        for (let i = 0; i < 6; i++) {
          const c = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
          const v = VOWELS[Math.floor(Math.random() * VOWELS.length)];
          randomChunks.push(Math.random() > 0.5 ? c + v : v + c);
        }
        allPool = [...allPool, ...randomChunks];
      }
    }

    allPool = allPool.filter((l) => !added.has(l));
    const maxPoolSize = (levelId === 2 || levelId === 3) ? 6 : 12;
    const distractorsNeeded = Math.max(0, maxPoolSize - letters.length);
    const extras = shuffle(allPool).slice(0, distractorsNeeded);

    extras.forEach((l) => {
      letters.push({
        id: `x-${l}-${Math.random()}`,
        letter: l,
        isVowel: VOWELS.includes(l[0].toUpperCase()),
      });
    });

    return shuffle(letters);
  }, [currentTarget]);

  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [completedTargets, setCompletedTargets] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [mobileFlipped, setMobileFlipped] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [playingLetter, setPlayingLetter] = useState<string | null>(null);

  const ttsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMobileFlipped(false);
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
    };
  }, []);

  const allDone = completedTargets.size >= targets.length;
  const isOrganized = useMemo(() => {
    for (let i = 0; i < targets.length - 1; i++) {
      if (targets[i].syllable.localeCompare(targets[i + 1].syllable) > 0) {
        return false;
      }
    }
    return true;
  }, [targets]);

  const progress = (completedTargets.size / targets.length) * 100;
  const slotCount = currentTarget ? (hasChunks ? currentTarget.letters.join("").length : currentTarget.letters.length) : 2;

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
      const audioPath = language === "tl"
        ? `${import.meta.env.BASE_URL}audio/filipino/cv-audio/fil-cv-${syllableLower}.mp3`
        : `${import.meta.env.BASE_URL}audio/english/cv-audio/eng-cv-${syllableLower}.mp3`;
      playExclusiveAudio(audioPath).catch(() => { });
      return;
    }

    if (pattern === "VC") {
      const audioPath = language === "tl"
        ? `${import.meta.env.BASE_URL}audio/filipino/vc-audio/fil-vc-${syllableLower}.mp3`
        : `${import.meta.env.BASE_URL}audio/english/vc-audio/eng-vc-${syllableLower}.mp3`;
      playExclusiveAudio(audioPath).catch(() => { });
      return;
    }

    // Use local audio files for CVC words
    if (pattern === "CVC") {
      const audioPath = language === "tl"
        ? `${import.meta.env.BASE_URL}audio/filipino/tagalog-words/fil-level3-${syllableLower}.mp3`
        : `${import.meta.env.BASE_URL}audio/english/cvc-audio/cvc-${syllableLower}.mp3`;
      playExclusiveAudio(audioPath).catch((err) => {
        console.warn(`[AlphabetGO] Local CVC audio not found: ${audioPath}, falling back to TTS`, err);
        const cleanText = text.replace(/-HARD|-SOFT/i, "");
        const phoneticText = getPhoneticText(cleanText, pattern);
        playTTSUtil(phoneticText);
      });
      return;
    }

    // Fallback
    const cleanText = text.replace(/-HARD|-SOFT/i, "");
    const phoneticText = getPhoneticText(cleanText, pattern);
    playTTSUtil(phoneticText);
  };

  const handleLetterClick = (letter: string) => {
    if (feedback || allDone || completedTargets.has(currentTarget.syllable)) return;

    // Play audio for the letter or chunk
    if (language === "tl") {
      if (letter.length === 1) {
        playExclusiveAudio(`${import.meta.env.BASE_URL}audio/filipino/fil-alphabet/fil-${letter.toLowerCase()}.mp3`).catch(() => { });
      } else {
        const isVowelFirst = VOWELS.includes(letter[0].toUpperCase());
        if (isVowelFirst) {
          playExclusiveAudio(`${import.meta.env.BASE_URL}audio/filipino/vc-audio/fil-vc-${letter.toLowerCase()}.mp3`).catch(() => { });
        } else {
          playExclusiveAudio(`${import.meta.env.BASE_URL}audio/filipino/cv-audio/fil-cv-${letter.toLowerCase()}.mp3`).catch(() => { });
        }
      }
    } else {
      const prefix = "english/eng-alphabet/eng-";
      playExclusiveAudio(`${import.meta.env.BASE_URL}audio/${prefix}${letter.toLowerCase()}.mp3`).catch(() => { });
    }

    setSelectedLetters((prev) => {
      const newSelected = [...prev, letter];
      const formed = newSelected.join("").toUpperCase();

      // Check if we just filled all required character slots
      const expectedSyllable = currentTarget.letters.join("").toUpperCase();
      if (formed.length === expectedSyllable.length) {
        if (formed === expectedSyllable) {
          playSound("correct", 0.4);
          setFeedback("correct");
          setShowConfetti(true);

          if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
          ttsTimeoutRef.current = setTimeout(() => {
            playTTS(currentTarget.syllable, currentTarget.pattern);
          }, 1000);
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

  const handleOrganize = () => {
    playSound("click", 0.2);
    const newTargets = [...targets].sort((a, b) => a.syllable.localeCompare(b.syllable));
    setTargets(newTargets);
    
    const firstUnanswered = newTargets.findIndex(t => !completedTargets.has(t.syllable));
    setCurrentIndex(firstUnanswered !== -1 ? firstUnanswered : 0);
    
    setSelectedLetters([]);
    setFeedback(null);
  };

  const handleShuffle = () => {
    playSound("click", 0.2);
    const newTargets = shuffle([...targets]);
    setTargets(newTargets);
    
    const firstUnanswered = newTargets.findIndex(t => !completedTargets.has(t.syllable));
    setCurrentIndex(firstUnanswered !== -1 ? firstUnanswered : 0);
    
    setSelectedLetters([]);
    setFeedback(null);
  };

  const handleReset = () => {
    playSound("click", 0.2);
    setSelectedLetters([]);
    setFeedback(null);
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
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);

        if (completedTargets.has(targets[nextIdx].syllable)) {
          setSelectedLetters([...targets[nextIdx].letters]);
          setFeedback("correct");
        } else {
          setSelectedLetters([]);
          setFeedback(null);
        }
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
        setSelectedLetters([]);
        setFeedback(null);
      } else {
        const nextIdx = Math.min(currentIndex + 1, targets.length - 1);
        setCurrentIndex(nextIdx);
        if (completedTargets.has(targets[nextIdx].syllable)) {
          setSelectedLetters([...targets[nextIdx].letters]);
          setFeedback("correct");
        } else {
          setSelectedLetters([]);
          setFeedback(null);
        }
      }
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      const prevIdx = Math.max(currentIndex - 1, 0);
      setCurrentIndex(prevIdx);
      if (completedTargets.has(targets[prevIdx].syllable)) {
        setSelectedLetters([...targets[prevIdx].letters]);
        setFeedback("correct");
      } else {
        setSelectedLetters([]);
        setFeedback(null);
      }
      setShowConfetti(false);
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
    playSound("click", 0.2);
    if (!allDone) {
      const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
      if (!confirmExit) return;
    }
    if (onExit) {
      onExit();
    } else {
      navigate("/levels", { replace: true });
    }
  };
  const targetButtonNode = (
    <div className="flex items-center gap-2 relative justify-center w-full">
      <PushableButton
        as="button"
        onClick={() => playTTS(currentTarget?.syllable || "", currentTarget?.pattern || "CV")}
        className={`transition-all w-full flex justify-center ${!hasClickedTTS && currentIndex === 0 ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
        frontClassName="flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-800"
        edgeStyle={{ backgroundColor: patternColors[currentTarget?.pattern || "CV"] }}
        title="Click to hear again"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="font-black text-4xl sm:text-5xl tracking-wide flex gap-0.5">
            {currentTarget?.letters.map((ch, i) => (
              <span
                key={i}
                style={{
                  color: hasChunks
                    ? (i % 2 === 0 ? "#1CB0F6" : "#FF6B8A")
                    : (language === "en" && levelId === 3
                      ? (i < 2 ? "#FF6B8A" : "#1CB0F6")
                      : (VOWELS.includes(ch.toUpperCase()) ? "#FF6B8A" : "#1CB0F6")),
                }}
              >
                {ch.toLowerCase()}
              </span>
            ))}
          </div>
          {currentTarget?.syllable.toUpperCase().includes('-HARD') && <span className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider pt-1">HARD</span>}
          {currentTarget?.syllable.toUpperCase().includes('-SOFT') && <span className="text-[10px] sm:text-xs text-gray-400 font-bold tracking-wider pt-1">SOFT</span>}
        </div>
      </PushableButton>
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
  );

  const slotsNode = (
    <div className="flex flex-col items-center w-full">
      <span className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Tap letters below in the correct order
      </span>
      <motion.div
        animate={{
          x: feedback === "wrong" ? [-10, 10, -10, 10, 0] : 0,
          scale: feedback === "correct" ? [1, 1.05, 1] : 1
        }}
        className="flex justify-center gap-2 mb-2"
      >
        {Array.from({ length: slotCount }).map((_, slot) => {
          const joinedSelected = selectedLetters.join("");
          const displayedChar = joinedSelected[slot];

          const charToSelectedChunk: number[] = [];
          selectedLetters.forEach((chunk, idx) => {
            for (let i = 0; i < chunk.length; i++) charToSelectedChunk.push(idx);
          });
          const chunkIdxToRemove = charToSelectedChunk[slot];

          let slotBackground = "";
          let slotBorderColor = "";

          if (hasChunks && currentTarget) {
            const slotToTargetChunk: number[] = [];
            currentTarget.letters.forEach((chunk, idx) => {
              for (let i = 0; i < chunk.length; i++) slotToTargetChunk.push(idx);
            });
            const targetChunkIdx = slotToTargetChunk[slot] ?? 0;
            const isBlue = targetChunkIdx % 2 === 0;
            slotBackground = isBlue ? "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)" : "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)";
            slotBorderColor = isBlue ? "#086CA5" : "#C82A52";
          } else {
            let isRose = false;
            if (language === "en" && levelId === 3) {
              isRose = slot < 2;
            } else {
              isRose = !!displayedChar && VOWELS.includes(displayedChar.toUpperCase());
            }
            slotBackground = isRose ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)" : "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)";
            slotBorderColor = isRose ? "#C82A52" : "#086CA5";
          }

          return (
            <div
              key={slot}
              onClick={() => chunkIdxToRemove !== undefined ? handleRemoveLetter(chunkIdxToRemove) : undefined}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-all ${!displayedChar
                ? "border-4 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30"
                : "cursor-pointer hover:scale-95 active:scale-90"
                }`}
            >
              {displayedChar ? (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`w-full h-full rounded-2xl flex flex-col items-center justify-center border-b-[4px] select-none shadow-md ${feedback === "correct" ? "bg-green-100 border-green-400 text-green-700 animate-shine animate-match-success overflow-hidden" :
                    feedback === "wrong" ? "bg-red-50 border-red-400 text-red-600" : ""
                    }`}
                  style={{
                    background: feedback ? undefined : slotBackground,
                    borderColor: feedback ? undefined : slotBorderColor,
                  }}
                >
                  <span className={`text-4xl sm:text-5xl font-black drop-shadow-sm ${feedback ? "" : "text-white"}`}>
                    {displayedChar.toLowerCase()}
                  </span>
                </motion.div>
              ) : (
                <span className="text-gray-300 dark:text-gray-600 text-2xl font-bold opacity-50">
                  {hasChunks ? "_" : patternPlaceholder(currentTarget?.pattern || "CV")[slot]}
                </span>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );

  const letterPoolNode = (
    <div className={`grid gap-2.5 mb-4 mx-auto mt-4 ${(levelId === 2 || levelId === 3) ? "grid-cols-3 w-full max-w-[200px] sm:max-w-[240px]" : "grid-cols-4 sm:grid-cols-6 w-full max-w-lg"}`}>
      {letterPool.map((item, i) => {
        const timesInTarget = currentTarget?.letters
          .filter((chunk) => chunk.toUpperCase() === item.letter.toUpperCase()).length || 0;
        const timesSelected = selectedLetters.filter(
          (l) => l === item.letter
        ).length;

        const isVisuallySelected = timesInTarget > 0
          ? timesSelected >= timesInTarget
          : timesSelected > 0;

        const currentLength = selectedLetters.join("").length;
        const isDisabled =
          (timesInTarget > 0 && timesSelected >= timesInTarget) ||
          (currentLength + item.letter.length > (currentTarget?.syllable.length || 0)) ||
          !!feedback;

        const isOrangeButton = language === "tl" && levelId === 3;
        let btnBackground = "";
        let btnEdgeColor = "";

        if (playingLetter === item.letter) {
          btnBackground = "linear-gradient(135deg, #FFC800 0%, #FF9600 100%)";
          btnEdgeColor = "#d97e00";
        } else if (isOrangeButton) {
          btnBackground = "linear-gradient(135deg, #FFC800 0%, #FF9600 100%)";
          btnEdgeColor = "#d97e00";
        } else if (item.isVowel) {
          btnBackground = "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)";
          btnEdgeColor = "#C82A52";
        } else {
          btnBackground = "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)";
          btnEdgeColor = "#086CA5";
        }

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
            frontStyle={{ background: btnBackground }}
            edgeStyle={{ backgroundColor: btnEdgeColor }}
          >
            <span className="text-white text-2xl sm:text-3xl font-black drop-shadow-sm flex items-center justify-center">
              {item.letter.length > 1 ? (
                item.letter.toLowerCase()
              ) : (
                (language === "tl" && levelId === 3)
                  ? item.letter.toLowerCase()
                  : <>{item.letter.toUpperCase()}{item.letter.toLowerCase()}</>
              )}
            </span>
          </PushableButton>
        );
      })}
    </div>
  );

  const innerContent = (
    <div className="flex-grow w-full flex flex-col min-h-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedSubPattern ? `builder-${currentIndex}` : "picker"}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full"
        >
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
                  {levelId === 3 ? "CVC Master - Word Builder" : (isTagalog ? "Antas 2: Pagbuo ng Pantig" : "Level 2: Syllable Builder")}
                </h2>
                <p className="text-gray-800 dark:text-gray-200 text-base sm:text-lg font-bold mt-6 mb-8 block">
                  {isTagalog ? "Pumili ng pattern na gusto mong pag-aralan!" : "Choose which pattern to practice!"}
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
                      <div className="mt-1 text-lg text-rose-500 dark:text-rose-400">
                        Syllable {currentIndex + 1} of {targets.length}
                      </div>
                    </div>

                    {/* Middle Section: Centered Interactive builder */}
                    {/* Middle Section: Interactive builder */}
                    {currentTarget.pattern === "CVC" && levelId === 3 ? (
                      <div className="w-full py-6 shrink-0 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
                        {/* Left Side: Card + Target Button */}
                        <div className="flex flex-col items-center w-full gap-4 max-w-[180px] md:max-w-[200px]">
                          {/* The Card */}
                          <div 
                            className="relative w-full aspect-[3/4] group cursor-pointer md:cursor-default" 
                            style={{ perspective: '1000px' }}
                            onClick={() => {
                              if (window.innerWidth < 768) {
                                setMobileFlipped(true);
                              }
                            }}
                          >
                            <motion.div 
                              className="w-full h-full relative"
                              style={{ transformStyle: 'preserve-3d' }}
                              animate={(feedback === "correct" || completedTargets.has(currentTarget.syllable) || mobileFlipped) ? { rotateY: 180, y: [0, -30, 0] } : { rotateY: 0, y: 0 }}
                              transition={{ duration: 0.8, ease: "easeInOut" }}
                            >
                              {/* Front (Skeleton) */}
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl border-4 border-dashed border-gray-300 dark:border-gray-600" style={{ backfaceVisibility: 'hidden' }}>
                                <span className="text-6xl sm:text-7xl font-black text-gray-300 dark:text-gray-600">?</span>
                              </div>
                              {/* Back (Image) */}
                              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 rounded-2xl border-4 border-blue-400 overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                {!imageErrors[currentTarget.syllable] ? (
                                  <img 
                                    src={`${import.meta.env.BASE_URL}images/cvc/${currentTarget.syllable.toLowerCase()}.jpg`} 
                                    alt={currentTarget.syllable} 
                                    className="w-full h-full object-cover"
                                    onError={() => setImageErrors(prev => ({...prev, [currentTarget.syllable]: true}))}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/30">
                                    <span className="text-4xl font-black text-blue-500">{currentTarget.syllable.toLowerCase()}</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </div>
                          
                          {/* Target Button */}
                          <div className="w-full">
                            {targetButtonNode}
                          </div>
                        </div>

                        {/* Right Side: Slots & Pool */}
                        <div className="flex flex-col items-center w-full max-w-sm">
                          {slotsNode}
                          {letterPoolNode}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full py-4 shrink-0 flex flex-col items-center justify-center">
                        <div className="text-center w-full flex flex-col items-center">
                          <div className="inline-flex flex-col items-center gap-2 px-6 py-3 rounded-2xl mb-4">
                            {targetButtonNode}
                            {slotsNode}
                          </div>
                        </div>
                        {letterPoolNode}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Sticky Bottom Section: Navigation Controls */}
      {selectedSubPattern && !allDone && (
        <div className="w-full shrink-0 mt-auto">
          <ActionToolbar
            onBack={goPrev}
            canBack={!(currentIndex === 0 && !onBack)}
            onShuffle={handleShuffle}
            canShuffle={!feedback} // don't shuffle while evaluating
            onReset={selectedLetters.length > 0 ? handleReset : handleOrganize}
            canReset={!feedback && (selectedLetters.length > 0 || !isOrganized)}
            resetLabel={selectedLetters.length > 0 ? "Reset" : "Organize"}
            onSkip={() => onComplete?.()}
            canSkip={selectedLetters.length === 0 || feedback === "correct" || completedTargets.has(targets[currentIndex].syllable)}
            onNext={goNext}
            canNext={!(currentIndex === targets.length - 1 && feedback !== "correct") && (selectedLetters.length === 0 || feedback === "correct" || completedTargets.has(targets[currentIndex].syllable))}
          />
        </div>
      )}
    </div>
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
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <X className="!w-8 !h-8 sm:!w-10 sm:!h-10 stroke-[3]" />
          </Button>
          <div className="flex-1"></div>
        </div>
      </div>
      {innerContent}
    </div>
  );
}
