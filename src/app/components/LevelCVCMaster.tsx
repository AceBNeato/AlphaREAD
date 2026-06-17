import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { LevelCVCSentences } from "./LevelCVCSentences";
import { LevelReviewGrid } from "./LevelReviewGrid";
import { LevelListenType } from "./LevelListenType";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import { SyllableTarget, CVC_WORDS, shuffle, getPhoneticPronunciation } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Home, ArrowRight, Volume2, Shuffle, RotateCcw, SkipForward } from "lucide-react";
import { playSound } from "../utils/soundEffects";
import { MatchButton } from "./MatchButton";
import { Confetti } from "./ui/Confetti";

interface LevelCVCMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type StepPhase = "review" | "build" | "match" | "eval" | "type" | "sentences";

interface GameStep {
  phase: StepPhase;
  words: string[];
  setLabel?: string;
}

// ── Match Phase ───────────────────────────────────────────────────────────────
function MatchPhase({
  items, accent, onNext,
}: {
  items: string[];
  accent: { primary: string; dark: string };
  onNext: () => void;
}) {
  const [leftCol, setLeftCol] = useState<string[]>([]);
  const [rightCol, setRightCol] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback((newItems?: string[]) => {
    const src = newItems ?? items;
    setLeftCol(shuffle([...src]));
    setRightCol(shuffle([...src]));
    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongPair(null);
    setShowConfetti(false);
  }, [items]);

  useEffect(() => { reset(); }, [reset]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const allDone = matchedPairs.size === leftCol.length && leftCol.length > 0;

  const playAudio = (word: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const phonetic = getPhoneticPronunciation(word.toUpperCase(), "CVC");
      const textToSpeak = phonetic !== word.toUpperCase() ? phonetic : word.toLowerCase();
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
    }
  };

  const checkMatch = useCallback((left: string, right: string) => {
    if (left === right) {
      playSound("correct", 0.4);
      const next = new Set(matchedPairs);
      next.add(left);
      setMatchedPairs(next);
      setSelectedLeft(null);
      setSelectedRight(null);
      if (next.size === leftCol.length) {
        setShowConfetti(true);
      }
    } else {
      playSound("wrong", 0.35);
      setWrongPair([left, right]);
      timeoutRef.current = setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 900);
    }
  }, [matchedPairs, leftCol.length]);

  const handleLeftClick = (word: string) => {
    if (matchedPairs.has(word) || wrongPair) return;
    playSound("click", 0.2);
    playAudio(word);
    setSelectedLeft(word);
    if (selectedRight) checkMatch(word, selectedRight);
  };

  const handleRightClick = (word: string) => {
    if (matchedPairs.has(word) || wrongPair) return;
    playSound("click", 0.2);
    playAudio(word);
    setSelectedRight(word);
    if (selectedLeft) checkMatch(selectedLeft, word);
  };

  const isWrongLeft = (s: string) => wrongPair?.[0] === s;
  const isWrongRight = (s: string) => wrongPair?.[1] === s;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-4xl mx-auto flex flex-col items-center"
    >
      <Confetti active={showConfetti} />

      <div className="text-center mb-6">
        <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-1">
          Listen & Match! 🎧
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Tap 🔊 to hear a word, then tap the matching word!
        </p>
      </div>

      <div className="flex justify-center gap-3 w-full mb-6">
        <Button variant="outline" size="sm" onClick={() => reset()}
          className="rounded-full flex items-center gap-2 border-gray-300">
          <Shuffle className="w-4 h-4 text-gray-600" /> Shuffle
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => { setMatchedPairs(new Set()); setSelectedLeft(null); setSelectedRight(null); setWrongPair(null); setShowConfetti(false); }}
          className="rounded-full flex items-center gap-2 border-gray-300">
          <RotateCcw className="w-4 h-4 text-gray-600" /> Reset
        </Button>
        <Button
          size="sm"
          onClick={onNext}
          disabled={!allDone}
          className="rounded-full flex items-center gap-2 text-white shadow-md active:scale-95 transition-all"
          style={{ background: allDone ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "gray" }}
        >
          Next <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm"
          onClick={onNext}
          className="rounded-full flex items-center gap-2 border-amber-300 text-amber-600">
          Skip <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-full grid grid-cols-2 gap-3 mb-6 max-w-full">
        <div className="flex flex-col gap-3 min-w-0">
          {leftCol.map((word) => {
            const isDone = matchedPairs.has(word);
            const isSelected = selectedLeft === word;
            const isWrong = isWrongLeft(word);
            return (
              <MatchButton
                key={`left-${word}`}
                gradientStart={accent.primary}
                gradientEnd={accent.dark}
                isMatched={isDone}
                isSelected={isSelected}
                isWrong={isWrong}
                onClick={() => handleLeftClick(word)}
                disabled={!!wrongPair}
              >
                <Volume2 className={`w-8 h-8 ${isDone ? "opacity-50" : ""}`} />
              </MatchButton>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          {rightCol.map((word) => {
            const isDone = matchedPairs.has(word);
            const isSelected = selectedRight === word;
            const isWrong = isWrongRight(word);
            return (
              <MatchButton
                key={`right-${word}`}
                isMatched={isDone}
                isSelected={isSelected}
                isWrong={isWrong}
                onClick={() => handleRightClick(word)}
                disabled={!!wrongPair}
                className="font-black text-2xl tracking-widest"
              >
                {word.toUpperCase()}
              </MatchButton>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export function LevelCVCMaster({ levelId, accent }: LevelCVCMasterProps) {
  const navigate = useNavigate();

  // Dynamically generate a single random pool of 10 CVC words each time the level starts!
  const STEPS: GameStep[] = useMemo(() => {
    const randomWords = shuffle([...CVC_WORDS]).slice(0, 10);

    // Break into chunks of 5 words
    const chunk1 = randomWords.slice(0, 5);
    const chunk2 = randomWords.slice(5, 10);

    return [
      // 5 first
      { phase: "review", words: chunk1, setLabel: "Set 1/2" },
      { phase: "build", words: chunk1, setLabel: "Set 1/2" },
      { phase: "match", words: chunk1, setLabel: "Set 1/2" },
      { phase: "eval", words: chunk1, setLabel: "Set 1/2" },
      { phase: "type", words: chunk1, setLabel: "Set 1/2" },

      // 5 next
      { phase: "review", words: chunk2, setLabel: "Set 2/2" },
      { phase: "build", words: chunk2, setLabel: "Set 2/2" },
      { phase: "match", words: chunk2, setLabel: "Set 2/2" },
      { phase: "eval", words: chunk2, setLabel: "Set 2/2" },
      { phase: "type", words: chunk2, setLabel: "Set 2/2" },

      // Final sentences quiz
      { phase: "sentences", words: [] }
    ];
  }, []);

  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];
  const progress = (currentStep / STEPS.length) * 100;

  const handleNextStep = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    } else {
      playSound("complete", 0.5);
      // Game Over, all completed!
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      navigate("/levels");
    }
  };

  const playWordTTS = (word: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const phonetic = getPhoneticPronunciation(word.toUpperCase(), "CVC");
      const textToSpeak = phonetic !== word.toUpperCase() ? phonetic : word.toLowerCase();
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
    }
  };

  const renderInnerPhase = () => {
    if (step.phase === "review") {
      return (
        <motion.div key={`review-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
          <LevelReviewGrid
            items={step.words}
            accent={accent}
            onComplete={handleNextStep}
            playItemSound={playWordTTS}
          />
        </motion.div>
      );
    }

    if (step.phase === "build") {
      const customTargets: SyllableTarget[] = step.words.map(w => ({
        syllable: w,
        letters: w.split(""),
        pattern: "CVC"
      }));

      return (
        <motion.div key={`build-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
          <LevelSyllableBuilder
            levelId={levelId}
            patterns={["CVC"]}
            accent={accent}
            customTargets={customTargets}
            isSubPhase={true}
            embedded={true}
            onComplete={handleNextStep}
          />
        </motion.div>
      );
    }

    if (step.phase === "match") {
      return (
        <MatchPhase
          key={`match-${currentStep}`}
          items={step.words}
          accent={accent}
          onNext={handleNextStep}
        />
      );
    }

    if (step.phase === "eval") {
      return (
        <motion.div key={`eval-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
          <LevelVoiceEvaluation
            key={`eval-step-${currentStep}`}
            levelId={levelId}
            accent={accent}
            customWords={step.words}
            isSubPhase={true}
            embedded={true}
            onComplete={handleNextStep}
          />
        </motion.div>
      );
    }

    if (step.phase === "type") {
      const customTargets: SyllableTarget[] = step.words.map(w => ({
        syllable: w,
        letters: w.split(""),
        pattern: "CVC"
      }));

      return (
        <motion.div key={`type-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
          <LevelListenType
            levelId={levelId}
            patterns={["CVC"]}
            accent={accent}
            customTargets={customTargets}
            isSubPhase={true}
            embedded={true}
            onComplete={handleNextStep}
          />
        </motion.div>
      );
    }

    return null;
  };

  // Phase: Sentences Quiz is special, it handles its own full screen right now
  if (step.phase === "sentences") {
    return (
      <LevelCVCSentences
        levelId={levelId}
        accent={accent}
        isSubPhase={true}
        onComplete={handleNextStep}
      />
    );
  }

  // Common wrapper for other phases
  return (
    <div className="flex-1 flex flex-col w-full h-full relative">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={() => navigate("/levels")} className="rounded-full">
            <Home className="w-5 h-5" />
          </Button>

          <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
            CVC Words {step.phase === "review" ? "Review" : step.phase === "build" ? "Builder" : step.phase === "match" ? "Match" : step.phase === "eval" ? "Voice Eval" : "Type"} {step.setLabel ? `(${step.setLabel})` : ""}
          </h2>

          <div className="text-sm font-semibold text-gray-500 whitespace-nowrap">
            Phase {currentStep + 1}/{STEPS.length}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 bg-gray-200 w-full">
          <motion.div
            className="h-full"
            style={{ background: accent.primary }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {renderInnerPhase()}
        </AnimatePresence>
      </div>
    </div>
  );
}
