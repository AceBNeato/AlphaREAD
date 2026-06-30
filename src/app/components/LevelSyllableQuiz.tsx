import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Home, Volume2, ArrowRight, ArrowLeft, Shuffle, RotateCcw, SkipForward, CheckCircle2, XCircle, Sparkles, ChevronRight, FastForward, X } from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { shuffle, SyllableTarget } from "../data/levels";
import { Confetti } from "./ui/Confetti";
import { playSound, playExclusiveAudio } from "../utils/soundEffects";
import { playTTS } from "../utils/tts";

import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { MatchButton } from "./MatchButton";

type Pattern = "VC" | "CV";

interface Step {
  type: "review" | "build" | "match" | "type";
  items: string[];
  setLabel: string;  // e.g. "Set 1/6"
  isFullPreview?: boolean;
}

interface LevelSyllableQuizProps {
  pattern: Pattern;
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  onComplete: () => void;
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function getAudioPath(syllable: string, pattern: Pattern): string {
  const base = (import.meta as any).env.BASE_URL;
  const lower = syllable.toLowerCase();
  if (pattern === "CV") return `${base}audio/cv-audio/cv-${lower}.mp3`;
  return `${base}audio/vc-audio/vc-${lower}.mp3`;
}

function playAudio(syllable: string, pattern: Pattern) {
  playExclusiveAudio(getAudioPath(syllable, pattern)).catch(() => {
    // Fallback to browser TTS
    playTTS(syllable.toLowerCase());
  });
}

// Build step array from all syllables
function buildSteps(allSyllables: string[]): Step[] {
  const steps: Step[] = [];

  // Use all syllables (58 for VC, 83 for CV)
  const sessionSyllables = allSyllables;

  // ── Phase 1: Review ALL syllables (batched into ~30 per screen, clickable audio) ──
  const REVIEW_BATCH_SIZE = 30;
  const totalReviewBatches = Math.ceil(sessionSyllables.length / REVIEW_BATCH_SIZE);
  for (let i = 0; i < totalReviewBatches; i++) {
    const batch = sessionSyllables.slice(i * REVIEW_BATCH_SIZE, (i + 1) * REVIEW_BATCH_SIZE);
    steps.push({
      type: "review",
      items: batch,
      setLabel: `Review ${i + 1}/${totalReviewBatches}`,
    });
  }

  // ── Phase 2: Assessment of ALL syllables ──
  // 1. Build Phase: ALL syllables in one single build step!
  steps.push({
    type: "build",
    items: sessionSyllables,
    setLabel: "Syllable Builder",
  });

  // 2. Match and Type Phases: ALL syllables in one single step!
  // The components MatchPhase and TypePhase will handle batching internally (by 8)
  steps.push({ type: "match", items: sessionSyllables, setLabel: "Listen and Match" });
  steps.push({ type: "type", items: sessionSyllables, setLabel: "Listen and Type" });

  // ── Phase 3: Final Review of ALL syllables (clickable audio, same UI as Phase 1) ──
  for (let i = 0; i < totalReviewBatches; i++) {
    const batch = sessionSyllables.slice(i * REVIEW_BATCH_SIZE, (i + 1) * REVIEW_BATCH_SIZE);
    steps.push({
      type: "review",
      items: batch,
      setLabel: `Final Review ${i + 1}/${totalReviewBatches}`,
      isFullPreview: true,  // marks it as the final review
    });
  }

  return steps;
}

// ── Review Phase ──────────────────────────────────────────────────────────────
function ReviewPhase({ items, pattern, accent, onNext, onBack, canBack, isFullPreview }: { items: string[]; pattern: Pattern; accent: any; onNext: () => void; onBack?: () => void; canBack?: boolean; isFullPreview?: boolean; }) {
  const [reviewOrder, setReviewOrder] = useState<string[]>([]);
  useEffect(() => setReviewOrder(items), [items]);

  const handleShuffle = () => setReviewOrder([...reviewOrder].sort(() => Math.random() - 0.5));

  const handleSyllableClick = (syl: string) => {
    if (isFullPreview) {
      playAudio(syl, pattern);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center w-full h-full">
      <div className="text-center mb-8">
        <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">
          {isFullPreview ? `🎉 Great work! Review all syllables! (${items.length} words)` : `Review syllables before we start! (${items.length} words)`}
        </p>

        {/* Navigation Controls moved to top */}
        <div className="flex justify-center items-center w-full gap-2 sm:gap-4 max-w-xl mx-auto mt-6">
          <Button
            size="sm"
            onClick={onBack}
            disabled={!canBack}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
          >
            <ArrowLeft className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <Button
            size="sm"
            onClick={handleShuffle}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
          >
            <Shuffle className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Shuffle</span>
          </Button>
          <Button
            size="sm"
            onClick={onNext}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            <span className="hidden sm:inline">Proceed</span>
            <ChevronRight className="w-4 h-4 sm:ml-1 mx-auto sm:mx-0" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-5xl mx-auto mb-12 w-full">
        {reviewOrder.map((syl) => {
          const isVowelStart = VOWELS.has(syl[0].toUpperCase());
          const bgStart = isVowelStart ? "#FF6B8A" : "#1CB0F6";
          const bgEnd = isVowelStart ? "#FF4B8A" : "#0a8ed4";
          const borderColor = isVowelStart ? "#C82A52" : "#086CA5";

          return (
            <motion.div key={syl} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center w-[70px] sm:w-[95px]">
              <div
                onClick={() => handleSyllableClick(syl)}
                className={`w-full aspect-square rounded-xl sm:rounded-2xl shadow-md flex items-center justify-center border-b-[4px] select-none ${
                  isFullPreview
                    ? "cursor-pointer transition-all hover:scale-105 active:translate-y-1 hover:shadow-xl"
                    : "cursor-default"
                }`}
                style={{ background: `linear-gradient(135deg, ${bgStart}, ${bgEnd})`, borderColor }}
              >
                <span className="text-white font-black drop-shadow-sm text-2xl sm:text-3xl">{syl.toLowerCase()}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Match Phase ───────────────────────────────────────────────────────────────
function MatchPhase({
  items, pattern, accent, onNext, onBack, canBack, isLastStep,
}: {
  items: string[];
  pattern: Pattern;
  accent: { primary: string; dark: string };
  onNext: () => void;
  onBack?: () => void;
  canBack?: boolean;
  isLastStep: boolean;
}) {
  const MATCH_BATCH = 6;
  const [batchIndex, setBatchIndex] = useState(0);
  const totalBatches = Math.ceil(items.length / MATCH_BATCH);
  const batchItems = items.slice(batchIndex * MATCH_BATCH, (batchIndex + 1) * MATCH_BATCH);

  const [leftCol, setLeftCol] = useState<string[]>([]);
  const [rightCol, setRightCol] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasClickedTTS, setHasClickedTTS] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback((newItems?: string[]) => {
    const src = newItems ?? batchItems;
    setLeftCol(shuffle([...src]));
    setRightCol(shuffle([...src]));
    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongPair(null);
    setShowConfetti(false);
  }, [batchItems]);

  useEffect(() => { reset(batchItems); }, [batchIndex]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const allDone = matchedPairs.size === leftCol.length && leftCol.length > 0;

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

  const handleLeftClick = (syl: string) => {
    setHasClickedTTS(true);
    if (matchedPairs.has(syl) || wrongPair) return;
    playAudio(syl, pattern);
    setSelectedLeft(syl);
    if (selectedRight) checkMatch(syl, selectedRight);
  };

  const handleRightClick = (syl: string) => {
    if (matchedPairs.has(syl) || wrongPair) return;
    setSelectedRight(syl);
    if (selectedLeft) checkMatch(selectedLeft, syl);
  };

  const isWrongLeft = (s: string) => wrongPair?.[0] === s;
  const isWrongRight = (s: string) => wrongPair?.[1] === s;

  const handleNextBatch = () => {
    if (batchIndex < totalBatches - 1) {
      setBatchIndex(prev => prev + 1);
    } else {
      onNext();
    }
  };

  const handlePrevBatch = () => {
    if (batchIndex > 0) {
      setBatchIndex(prev => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-4xl mx-auto flex flex-col items-center"
    >
      <Confetti active={showConfetti} />

      <div className="text-center mb-6">
        <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">
          Tap a speaker, then tap the matching word! (Batch {batchIndex + 1}/{totalBatches})
        </p>

        {/* Navigation Controls */}
        <div className="flex justify-center items-center w-full gap-2 sm:gap-4 max-w-xl mx-auto mt-6">
          <Button
            size="sm"
            onClick={handlePrevBatch}
            disabled={batchIndex === 0 && !canBack}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
          >
            <ArrowLeft className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setLeftCol([...leftCol].sort(() => Math.random() - 0.5));
              setRightCol([...rightCol].sort(() => Math.random() - 0.5));
            }}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
          >
            <Shuffle className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Shuffle</span>
          </Button>
          <Button
            size="sm"
            onClick={() => reset()}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
          >
            <RotateCcw className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            size="sm"
            onClick={handleNextBatch}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
          >
            <SkipForward className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Forward</span>
          </Button>
          <Button
            size="sm"
            onClick={handleNextBatch}
            disabled={!allDone}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none disabled:cursor-not-allowed px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>


      {/* Two-column match */}
      <div className="w-full grid grid-cols-2 gap-4 sm:gap-8 mb-6 max-w-full">
        {/* Left: speaker buttons */}
        <div className="flex flex-col gap-4 sm:gap-6 min-w-0">
          {leftCol.map((syl, idx) => {
            const isDone = matchedPairs.has(syl);
            const isSelected = selectedLeft === syl;
            const isWrong = isWrongLeft(syl);
            return (
              <div key={`left-${syl}`} className="relative w-full h-14 sm:h-16">
                <MatchButton
                  gradientStart={accent.primary}
                  gradientEnd={accent.dark}
                  isMatched={isDone}
                  isSelected={isSelected}
                  isWrong={isWrong}
                  onClick={() => handleLeftClick(syl)}
                  className={`w-full h-full ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                >
                  <Volume2 className={`w-8 h-8 ${isDone ? "opacity-50" : ""}`} />
                </MatchButton>
                {idx === 0 && !hasClickedTTS && (
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
          })}
        </div>

        {/* Right: word buttons */}
        <div className="flex flex-col gap-4 sm:gap-6 flex-1 min-w-0">
          {rightCol.map((syl) => {
            const isDone = matchedPairs.has(syl);
            const isSelected = selectedRight === syl;
            const isWrong = isWrongRight(syl);
            return (
              <MatchButton
                key={`right-${syl}`}
                isMatched={isDone}
                isSelected={isSelected}
                isWrong={isWrong}
                onClick={() => handleRightClick(syl)}
                className="font-black text-2xl sm:text-3xl tracking-widest h-14 sm:h-16 flex items-center justify-center"
              >
                {syl.toLowerCase()}
              </MatchButton>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function TypePhase({ items, pattern, accent, onNext, onBack, canBack }: { items: string[]; pattern: Pattern; accent: any; onNext: () => void; onBack?: () => void; canBack?: boolean; }) {
  const TYPE_BATCH = 6;
  const [batchIndex, setBatchIndex] = useState(0);
  const totalBatches = Math.ceil(items.length / TYPE_BATCH);
  const batchItems = items.slice(batchIndex * TYPE_BATCH, (batchIndex + 1) * TYPE_BATCH);

  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [typeInputs, setTypeInputs] = useState<Record<string, string>>({});
  const [typeStatus, setTypeStatus] = useState<Record<string, boolean | null>>({});
  const [hasClickedTTS, setHasClickedTTS] = useState(false);

  useEffect(() => {
    setTypeOrder([...batchItems].sort(() => Math.random() - 0.5));
    setTypeInputs({});
    setTypeStatus({});
    setHasClickedTTS(false);
  }, [batchIndex]);

  const handleShuffleType = () => {
    setTypeOrder(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const playTypeSound = (syllable: string) => {
    setHasClickedTTS(true);
    if (!syllable) return;
    playAudio(syllable, pattern);
  };

  const handleTypeChange = (syllable: string, val: string) => {
    if (val.length > 2) return;

    setTypeInputs(prev => ({ ...prev, [syllable]: val.toLowerCase() }));

    if (val.length === 2) {
      if (val.toLowerCase() === syllable.toLowerCase()) {
        playSound("correct", 0.4);
        setTypeStatus(prev => ({ ...prev, [syllable]: true }));
      } else {
        playSound("wrong", 0.35);
        setTypeStatus(prev => ({ ...prev, [syllable]: false }));
        setTimeout(() => {
          setTypeStatus(prev => ({ ...prev, [syllable]: null }));
          setTypeInputs(prev => ({ ...prev, [syllable]: "" }));
        }, 800);
      }
    } else {
      setTypeStatus(prev => ({ ...prev, [syllable]: null }));
    }
  };

  const isTypePhaseComplete = typeOrder.length > 0 && typeOrder.every(syllable => typeStatus[syllable] === true);

  const handleNextBatch = () => {
    if (batchIndex < totalBatches - 1) {
      setBatchIndex(prev => prev + 1);
    } else {
      onNext();
    }
  };

  const handlePrevBatch = () => {
    if (batchIndex > 0) {
      setBatchIndex(prev => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center w-full">
      <div className="text-center mb-8">
        <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">Tap the speaker, then type the syllable! (Batch {batchIndex + 1}/{totalBatches})</p>

        <div className="flex justify-center items-center w-full gap-2 sm:gap-4 max-w-xl mx-auto mt-6">
          <Button
            size="sm"
            onClick={handlePrevBatch}
            disabled={batchIndex === 0 && !canBack}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
          >
            <ArrowLeft className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <Button
            size="sm"
            onClick={handleShuffleType}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
          >
            <Shuffle className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Shuffle</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setTypeOrder([...batchItems].sort(() => Math.random() - 0.5));
              setTypeInputs({});
              setTypeStatus({});
            }}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
          >
            <RotateCcw className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button
            size="sm"
            onClick={handleNextBatch}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
          >
            <SkipForward className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
            <span className="hidden sm:inline">Forward</span>
          </Button>
          <Button
            size="sm"
            onClick={handleNextBatch}
            disabled={!isTypePhaseComplete}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-black/20 hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none disabled:cursor-not-allowed px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4 sm:ml-1 mx-auto sm:mx-0" />
          </Button>
        </div>
      </div>

      {/* Reference syllable pool for the user to see what syllables are in the batch */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 max-w-xl mx-auto px-2">
        {[...typeOrder].sort().map((syllable) => (
          <span
            key={`ref-${syllable}`}
            className="px-3.5 py-1.5 sm:px-5 sm:py-2 bg-white dark:bg-gray-800 border-2 border-b-[4px] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-black text-base sm:text-lg shadow-sm flex items-center justify-center min-w-[3rem] sm:min-w-[4rem] hover:scale-105 active:translate-y-[1px] active:border-b-[2px] transition-all select-none cursor-pointer"
          >
            {syllable.toLowerCase()}
          </span>
        ))}
      </div>

      <div className="flex justify-center gap-3 sm:gap-6 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
        {/* Left Column: TTS Speakers */}
        <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
          {typeOrder.map((syllable, idx) => {
            const isCorrect = typeStatus[syllable] === true;
            return (
              <div key={`speaker-${syllable}`} className="relative w-full h-14 sm:h-16">
                <MatchButton
                  gradientStart={accent.primary}
                  gradientEnd={accent.dark}
                  isMatched={isCorrect}
                  isSelected={false}
                  isWrong={false}
                  onClick={() => playTypeSound(syllable)}
                  className={`w-full h-full ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                >
                  <Volume2 className={`w-8 h-8 ${isCorrect ? "opacity-50" : ""}`} />
                </MatchButton>
                {idx === 0 && !hasClickedTTS && (
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
          })}
        </div>

        {/* Right Column: Inputs */}
        <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
          {typeOrder.map((syllable) => {
            const status = typeStatus[syllable];
            const val = typeInputs[syllable] || "";

            return (
              <motion.div
                key={`input-${syllable}`}
                animate={{ x: status === false ? [-5, 5, -5, 5, 0] : 0 }}
                className="w-full h-14 sm:h-16 flex"
              >
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleTypeChange(syllable, e.target.value)}
                  disabled={status === true}
                  className={`w-full h-full text-center text-2xl sm:text-3xl font-black rounded-lg sm:rounded-2xl border-2 sm:border-b-[4px] outline-none transition-all shadow-sm
                    ${status === true ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-green-600 dark:text-green-500 opacity-50 grayscale' :
                      status === false ? 'bg-red-50 border-red-400 text-red-600' :
                        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-400'}
                  `}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function LevelSyllableQuiz({ pattern, levelId, accent, onComplete }: LevelSyllableQuizProps) {
  const navigate = useNavigate();
  const [allSyllables] = useState<string[]>(() => {
    // Load from levels data
    if (pattern === "VC") {
      return shuffle([
        "AB", "AD", "AF", "AG", "AK", "AL", "AM", "AN", "AP", "AR", "AS", "AT", "AV",
        "EB", "ED", "EG", "EK", "EL", "EM", "EN", "EP", "ER", "ES", "ET",
        "IB", "ID", "IG", "IK", "IL", "IM", "IN", "IP", "IR", "IS", "IT",
        "OB", "OD", "OF", "OG", "OK", "OL", "OM", "ON", "OP", "OR", "OS", "OT",
        "UB", "UD", "UG", "UK", "UL", "UM", "UN", "UP", "UR", "US", "UT",
      ]);
    }
    // CV
    return shuffle([
      "BA", "BE", "BI", "BO", "BU",
      "CA", "CO", "CU",
      "DA", "DE", "DI", "DO", "DU",
      "FA", "FE", "FI", "FO", "FU",
      "HA", "HE", "HI", "HO", "HU",
      "JA", "JE", "JI", "JO", "JU",
      "KA", "KE", "KI", "KO", "KU",
      "LA", "LE", "LI", "LO", "LU",
      "MA", "ME", "MI", "MO", "MU",
      "NA", "NE", "NI", "NO", "NU",
      "PA", "PE", "PI", "PO", "PU",
      "RA", "RE", "RI", "RO", "RU",
      "SA", "SE", "SI", "SO", "SU",
      "TA", "TE", "TI", "TO", "TU",
      "VA", "VE", "VI", "VO", "VU",
      "WA", "WE", "WI", "WO", "WU",
      "ZA", "ZE", "ZI", "ZO", "ZU",
    ]);
  });

  const [steps] = useState<Step[]>(() => buildSteps(allSyllables));
  const [currentStep, setCurrentStep] = useState(0);
  const [showFinalConfetti, setShowFinalConfetti] = useState(false);

  const step = steps[currentStep];
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      if (steps[currentStep].type !== "review") {
        playSound("complete", 0.5);
      } else {
        playSound("click", 0.2);
      }
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    } else {
      playSound("complete", 0.5);
      setShowFinalConfetti(true);
      setTimeout(() => onComplete(), 2500);
    }
  };

  const getPhaseTitle = () => {
    if (!step) return "";
    switch (step.type) {
      case "review": return step.isFullPreview ? "Final Review" : "Review Phase";
      case "build": return "Syllable Builder";
      case "match": return "Listen and Match";
      case "type": return "Listen and Type";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-x-hidden">
      <Confetti active={showFinalConfetti} />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-5 w-full">
          <Button variant="ghost" size="sm" onClick={async () => {
            const confirmExit = await confirmAction("Leave?", "Progress won't be saved.");
            if (confirmExit) navigate("/levels");
          }} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <X className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="hidden sm:inline font-bold">Exit</span>
          </Button>

          <div className="flex-1 flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: accent.primary }}>
                Syllable Master - {getPhaseTitle()}
              </h2>
            </div>

            {/* Duolingo-style Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 sm:h-5 overflow-hidden relative shadow-inner">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out flex flex-col justify-start"
                style={{
                  width: `${Math.max(5, (currentStep / steps.length) * 100)}%`,
                  backgroundColor: accent.primary
                }}
              >
                {/* Glossy reflection highlight */}
                <div className="w-[calc(100%-12px)] h-[30%] bg-white/30 rounded-full mx-1.5 mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-2 flex-1 flex flex-col w-full">
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
              <p className="text-white text-base sm:text-lg font-bold mt-2 block">You've completed all phases and mastered all {allSyllables.length} {pattern} syllables!</p>
            </motion.div>
          ) : step?.type === "review" ? (
            <ReviewPhase
              key={`review-${currentStep}`}
              items={step.items}
              pattern={pattern}
              accent={accent}
              onNext={handleNext}
              onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              canBack={currentStep > 0}
              isFullPreview={step.isFullPreview}
            />
          ) : step?.type === "build" ? (
            <LevelSyllableBuilder
              key={`build-${currentStep}`}
              levelId={levelId}
              patterns={[pattern]}
              accent={accent}
              embedded={true}
              customTargets={step.items.map(syl => ({
                syllable: syl,
                letters: syl.split(''),
                pattern: pattern
              }))}
              onComplete={handleNext}
              onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            />
          ) : step?.type === "match" ? (
            <MatchPhase
              key={`match-${currentStep}`}
              items={step.items}
              pattern={pattern}
              accent={accent}
              onNext={handleNext}
              onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              canBack={currentStep > 0}
              isLastStep={currentStep === steps.length - 1}
            />
          ) : step?.type === "type" ? (
            <TypePhase
              key={`type-${currentStep}`}
              items={step.items}
              pattern={pattern}
              accent={accent}
              onNext={handleNext}
              onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              canBack={currentStep > 0}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
