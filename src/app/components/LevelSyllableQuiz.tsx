import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Home, Volume2, ArrowRight, Shuffle, RotateCcw, SkipForward,
  CheckCircle2, XCircle, Sparkles
} from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { shuffle } from "../data/levels";
import { Confetti } from "./ui/Confetti";

type Pattern = "VC" | "CV";

interface Step {
  type: "review" | "match";
  items: string[];
  setLabel: string;  // e.g. "Set 1/6"
}

interface LevelSyllableQuizProps {
  pattern: Pattern;
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  onComplete: () => void;
}

const CHUNK_SIZE = 10;

function getAudioPath(syllable: string, pattern: Pattern): string {
  const base = (import.meta as any).env.BASE_URL;
  const lower = syllable.toLowerCase();
  if (pattern === "CV") return `${base}audio/cv-audio/cv-${lower}.MP3`;
  return `${base}audio/vc-audio/vc-${lower}.MP3`;
}

function playAudio(syllable: string, pattern: Pattern) {
  const audio = new Audio(getAudioPath(syllable, pattern));
  audio.play().catch(() => {
    // Fallback to browser TTS
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(syllable.toLowerCase());
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
    }
  });
}

// Build step array from all syllables
function buildSteps(allSyllables: string[]): Step[] {
  const steps: Step[] = [];
  const totalChunks = Math.ceil(allSyllables.length / CHUNK_SIZE);
  for (let i = 0; i < totalChunks; i++) {
    const chunk = allSyllables.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const label = `Set ${i + 1}/${totalChunks}`;
    steps.push({ type: "review", items: chunk, setLabel: label });
    steps.push({ type: "match", items: chunk, setLabel: label });
  }
  return steps;
}

// ── Review Phase ─────────────────────────────────────────────────────────────
function ReviewPhase({
  items, pattern, accent, onNext,
}: {
  items: string[]; pattern: Pattern; accent: { primary: string; dark: string }; onNext: () => void;
}) {
  const [clicked, setClicked] = useState<string | null>(null);

  const handlePlay = (syl: string) => {
    playAudio(syl, pattern);
    setClicked(syl);
    setTimeout(() => setClicked(null), 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-xl mx-auto flex flex-col items-center"
    >
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-1">
          Review {pattern} Syllables 📖
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Tap a syllable or the 🔊 button to hear how it sounds.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mb-8">
        {items.map((syl) => (
          <motion.div
            key={syl}
            whileTap={{ scale: 0.93 }}
            onClick={() => handlePlay(syl)}
            className="flex items-center justify-between rounded-2xl p-4 cursor-pointer select-none shadow-md border-2 transition-all"
            style={{
              background: clicked === syl
                ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`
                : "white",
              borderColor: clicked === syl ? accent.dark : accent.primary + "50",
              color: clicked === syl ? "white" : accent.primary,
            }}
          >
            <span className="text-3xl font-black tracking-widest">{syl}</span>
            <Volume2 className="w-5 h-5 opacity-60 flex-shrink-0" />
          </motion.div>
        ))}
      </div>

      <Button
        onClick={onNext}
        size="lg"
        className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl"
        style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
      >
        Start Matching <ArrowRight className="ml-2 w-5 h-5" />
      </Button>
    </motion.div>
  );
}

// ── Match Phase ───────────────────────────────────────────────────────────────
function MatchPhase({
  items, pattern, accent, onNext, isLastStep,
}: {
  items: string[];
  pattern: Pattern;
  accent: { primary: string; dark: string };
  onNext: () => void;
  isLastStep: boolean;
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

  const checkMatch = useCallback((left: string, right: string) => {
    if (left === right) {
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav");
      audio.volume = 0.3;
      audio.play().catch(() => {});
      const next = new Set(matchedPairs);
      next.add(left);
      setMatchedPairs(next);
      setSelectedLeft(null);
      setSelectedRight(null);
      if (next.size === leftCol.length) setShowConfetti(true);
    } else {
      setWrongPair([left, right]);
      timeoutRef.current = setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 900);
    }
  }, [matchedPairs, leftCol.length]);

  const handleLeftClick = (syl: string) => {
    if (matchedPairs.has(syl) || wrongPair) return;
    playAudio(syl, pattern);
    setSelectedLeft(syl);
    if (selectedRight) checkMatch(syl, selectedRight);
  };

  const handleRightClick = (syl: string) => {
    if (matchedPairs.has(syl) || wrongPair) return;
    playAudio(syl, pattern); // word button also plays audio
    setSelectedRight(syl);
    if (selectedLeft) checkMatch(selectedLeft, syl);
  };

  const isWrongLeft = (s: string) => wrongPair?.[0] === s;
  const isWrongRight = (s: string) => wrongPair?.[1] === s;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-xl mx-auto flex flex-col items-center"
    >
      <Confetti active={showConfetti} />

      <div className="text-center mb-6">
        <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-1">
          Listen & Match! 🎧
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Tap 🔊 to hear a syllable, then tap the matching word — or tap the word to hear it too!
        </p>
      </div>

      {/* Controls */}
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

      {/* Two-column match */}
      <div className="w-full grid grid-cols-2 gap-3 mb-6">
        {/* Left: speaker buttons */}
        <div className="flex flex-col gap-2">
          {leftCol.map((syl) => {
            const isDone = matchedPairs.has(syl);
            const isSelected = selectedLeft === syl;
            const isWrong = isWrongLeft(syl);
            return (
              <button
                key={syl}
                onClick={() => !isDone && handleLeftClick(syl)}
                disabled={isDone}
                className={`relative h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-white text-sm transition-all shadow-md
                  ${isDone ? "opacity-50 cursor-default bg-green-500"
                    : isWrong ? "bg-red-500 animate-shake"
                    : isSelected ? "scale-105 ring-4 ring-offset-2"
                    : "hover:scale-105 active:scale-95 cursor-pointer"}`}
                style={{
                  background: isDone ? "#22c55e"
                    : isWrong ? "#ef4444"
                    : isSelected ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`
                    : `linear-gradient(135deg, #ec4899, #be185d)`,
                }}
              >
                {isSelected && !isDone && (
                  <span className="absolute inset-0 rounded-xl bg-white/20 animate-pulse" />
                )}
                <span className="relative">
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : isWrong ? <XCircle className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </span>
                <span className="relative text-base">{isDone ? syl : "▶"}</span>
              </button>
            );
          })}
        </div>

        {/* Right: word buttons (clicking also plays audio) */}
        <div className="flex flex-col gap-2">
          {rightCol.map((syl) => {
            const isDone = matchedPairs.has(syl);
            const isSelected = selectedRight === syl;
            const isWrong = isWrongRight(syl);
            return (
              <button
                key={syl}
                onClick={() => !isDone && handleRightClick(syl)}
                disabled={isDone}
                className={`h-14 rounded-xl flex items-center justify-center font-black text-2xl tracking-widest transition-all shadow-md border-2
                  ${isDone ? "opacity-50 cursor-default border-green-400 bg-green-50 text-green-600"
                    : isWrong ? "border-red-400 bg-red-50 text-red-600 animate-shake"
                    : isSelected ? "border-4 bg-white dark:bg-gray-800 scale-105"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-pink-400 hover:scale-105 active:scale-95 cursor-pointer"}`}
                style={{
                  borderColor: isSelected ? accent.primary : undefined,
                  color: isSelected ? accent.primary : undefined,
                }}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : syl}
              </button>
            );
          })}
        </div>
      </div>

      {allDone && (
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[#58CC02] font-black text-xl">
          ✨ All matched! Great job!
        </motion.p>
      )}
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function LevelSyllableQuiz({ pattern, levelId: _levelId, accent, onComplete }: LevelSyllableQuizProps) {
  const navigate = useNavigate();
  const [allSyllables] = useState<string[]>(() => {
    // Load from levels data
    if (pattern === "VC") {
      return [
        "AB","AD","AF","AG","AK","AL","AM","AN","AP","AR","AS","AT","AV",
        "EB","ED","EG","EK","EL","EM","EN","EP","ER","ES","ET",
        "IB","ID","IG","IK","IL","IM","IN","IP","IR","IS","IT",
        "OB","OD","OF","OG","OK","OL","OM","ON","OP","OR","OS","OT",
        "UB","UD","UG","UK","UL","UM","UN","UP","UR","US","UT",
      ];
    }
    // CV
    return [
      "BA","BE","BI","BO","BU",
      "CA","CO","CU",
      "DA","DE","DI","DO","DU",
      "FA","FE","FI","FO","FU",
      "HA","HE","HI","HO","HU",
      "JA","JE","JI","JO","JU",
      "KA","KE","KI","KO","KU",
      "LA","LE","LI","LO","LU",
      "MA","ME","MI","MO","MU",
      "NA","NE","NI","NO","NU",
      "PA","PE","PI","PO","PU",
      "RA","RE","RI","RO","RU",
      "SA","SE","SI","SO","SU",
      "TA","TE","TI","TO","TU",
      "VA","VE","VI","VO","VU",
      "WA","WE","WI","WO","WU",
      "ZA","ZE","ZI","ZO","ZU",
    ];
  });

  const [steps] = useState<Step[]>(() => buildSteps(allSyllables));
  const [currentStep, setCurrentStep] = useState(0);
  const [showFinalConfetti, setShowFinalConfetti] = useState(false);

  const step = steps[currentStep];
  const totalReviewSets = Math.ceil(allSyllables.length / CHUNK_SIZE);
  const progressPct = (currentStep / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowFinalConfetti(true);
      setTimeout(() => onComplete(), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 dark:bg-none dark:bg-[#0d141c] pb-12 flex flex-col">
      <Confetti active={showFinalConfetti} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm"
            onClick={() => {
              if (window.confirm("Leave? Progress won't be saved.")) navigate("/levels");
            }}
            className="rounded-full">
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              {pattern === "VC" ? "Vowel + Consonant (VC)" : "Consonant + Vowel (CV)"}
            </h2>
            <p className="text-xs text-gray-500">
              {step?.type === "review" ? `Review — ${step.setLabel}` : `Listen & Match — ${step.setLabel}`} ({totalReviewSets} sets)
            </p>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {currentStep + 1}/{steps.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="max-w-xl mx-auto mt-2">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent.primary}, ${accent.dark})` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 flex-1 flex flex-col justify-center w-full">
        <AnimatePresence mode="wait">
          {showFinalConfetti ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="inline-block mb-6">
                <Sparkles className="w-20 h-20 text-[#FFC800]" />
              </motion.div>
              <h3 className="text-3xl font-black mb-4" style={{ color: accent.primary }}>
                {pattern} Complete! 🎉
              </h3>
              <p className="text-gray-600 dark:text-gray-400">You've reviewed and matched all {allSyllables.length} {pattern} syllables!</p>
            </motion.div>
          ) : step?.type === "review" ? (
            <ReviewPhase
              key={`review-${currentStep}`}
              items={step.items}
              pattern={pattern}
              accent={accent}
              onNext={handleNext}
            />
          ) : (
            <MatchPhase
              key={`match-${currentStep}`}
              items={step.items}
              pattern={pattern}
              accent={accent}
              onNext={handleNext}
              isLastStep={currentStep === steps.length - 1}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
