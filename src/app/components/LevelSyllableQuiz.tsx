import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Home, Volume2, ArrowRight, Shuffle, RotateCcw, SkipForward,
} from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { shuffle, generateSyllableTargets, type SyllableTarget, getPhoneticPronunciation } from "../data/levels";
import { Confetti } from "./ui/Confetti";
import { playSound } from "../utils/soundEffects";

import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { MatchButton } from "./MatchButton";
import { LevelReviewGrid } from "./LevelReviewGrid";
import { LevelListenType } from "./LevelListenType";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";

type Pattern = "VC" | "CV";

interface Step {
  type: "review" | "build" | "match" | "voice" | "type";
  items: string[];
  setLabel: string;
}

interface LevelSyllableQuizProps {
  pattern: Pattern;
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  onComplete: () => void;
}

const CHUNK_SIZE = 6;

function getAudioPath(syllable: string, pattern: Pattern): string {
  const base = (import.meta as any).env.BASE_URL;
  const lower = syllable.toLowerCase();
  if (pattern === "CV") return `${base}audio/cv-audio/cv-${lower}.MP3`;
  return `${base}audio/vc-audio/vc-${lower}.MP3`;
}

function playAudio(syllable: string, pattern: Pattern) {
  const audio = new Audio(getAudioPath(syllable, pattern));
  audio.play().catch(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const phonetic = getPhoneticPronunciation(syllable.toUpperCase(), pattern);
      const textToSpeak = phonetic !== syllable.toUpperCase() ? phonetic : syllable.toLowerCase();
      const utter = new SpeechSynthesisUtterance(textToSpeak);
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
    }
  });
}

function buildSteps(allSyllables: string[]): Step[] {
  const steps: Step[] = [];
  const totalChunks = Math.ceil(allSyllables.length / CHUNK_SIZE);
  for (let i = 0; i < totalChunks; i++) {
    const chunk = allSyllables.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const label = `Set ${i + 1}/${totalChunks}`;
    steps.push({ type: "review", items: chunk, setLabel: label });
    steps.push({ type: "build", items: chunk, setLabel: label });
    steps.push({ type: "match", items: chunk, setLabel: label });
    steps.push({ type: "voice", items: chunk, setLabel: label });
    steps.push({ type: "type", items: chunk, setLabel: label });
  }
  return steps;
}

// ── Match Phase ───────────────────────────────────────────────────────────────
function MatchPhase({
  items, pattern, accent, onNext,
}: {
  items: string[];
  pattern: Pattern;
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
    if (matchedPairs.has(syl) || wrongPair) return;
    playSound("click", 0.2);
    playAudio(syl, pattern);
    setSelectedLeft(syl);
    if (selectedRight) checkMatch(syl, selectedRight);
  };

  const handleRightClick = (syl: string) => {
    if (matchedPairs.has(syl) || wrongPair) return;
    playSound("click", 0.2);
    playAudio(syl, pattern);
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
      className="w-full max-w-4xl mx-auto flex flex-col items-center"
    >
      <Confetti active={showConfetti} />

      <div className="text-center mb-6">
        <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-1">
          Listen & Match! 🎧
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Tap 🔊 to hear a syllable, then tap the matching word!
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
      <div className="w-full grid grid-cols-2 gap-3 mb-6 max-w-full">
        <div className="flex flex-col gap-3 min-w-0">
          {leftCol.map((syl) => {
            const isDone = matchedPairs.has(syl);
            const isSelected = selectedLeft === syl;
            const isWrong = isWrongLeft(syl);
            return (
              <MatchButton
                key={`left-${syl}`}
                gradientStart={accent.primary}
                gradientEnd={accent.dark}
                isMatched={isDone}
                isSelected={isSelected}
                isWrong={isWrong}
                onClick={() => handleLeftClick(syl)}
                disabled={!!wrongPair}
              >
                <Volume2 className={`w-8 h-8 ${isDone ? "opacity-50" : ""}`} />
              </MatchButton>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 min-w-0">
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
                disabled={!!wrongPair}
                className="font-black text-2xl tracking-widest"
              >
                {syl.toUpperCase()}
              </MatchButton>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Quiz Component ────────────────────────────────────────────────────────

export function LevelSyllableQuiz({
  pattern, levelId, accent, onComplete
}: LevelSyllableQuizProps) {
  const navigate = useNavigate();

  const allSyllables = useMemo(() => {
    return shuffle(generateSyllableTargets([pattern], 65).map(t => t.syllable));
  }, [pattern]);

  const steps = useMemo(() => buildSteps(allSyllables), [allSyllables]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const currentStep = steps[currentStepIdx];
  const progress = (currentStepIdx / steps.length) * 100;

  const nextStep = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      playSound("complete", 0.5);
      onComplete();
    }
  };

  if (!currentStep) return null;

  return (
    <div className="flex-1 flex flex-col w-full h-full relative">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={() => navigate("/levels")} className="rounded-full">
            <Home className="w-5 h-5" />
          </Button>

          <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
            {pattern} {currentStep.type === "review" ? "Review" : currentStep.type === "build" ? "Builder" : currentStep.type === "match" ? "Match" : currentStep.type === "voice" ? "Voice Eval" : "Type"} ({currentStep.setLabel})
          </h2>

          <div className="text-sm font-semibold text-gray-500 whitespace-nowrap">
            Phase {currentStepIdx + 1}/{steps.length}
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
          {currentStep.type === "review" && (
             <motion.div key={`review-${currentStepIdx}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
               <LevelReviewGrid
                 items={currentStep.items}
                 accent={accent}
                 onComplete={nextStep}
                 playItemSound={(syl) => playAudio(syl, pattern)}
               />
             </motion.div>
          )}

          {currentStep.type === "build" && (
            <motion.div key={`build-${currentStepIdx}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <LevelSyllableBuilder
                levelId={levelId}
                patterns={[pattern]}
                accent={accent}
                onComplete={nextStep}
                customTargets={currentStep.items.map(s => ({
                  syllable: s,
                  letters: s.split(""),
                  pattern: pattern
                }))}
                isSubPhase={true}
                embedded={true}
              />
            </motion.div>
          )}

          {currentStep.type === "match" && (
            <MatchPhase
              key={`match-${currentStepIdx}`}
              items={currentStep.items}
              pattern={pattern}
              accent={accent}
              onNext={nextStep}
            />
          )}

          {currentStep.type === "voice" && (
            <motion.div key={`voice-${currentStepIdx}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
               <LevelVoiceEvaluation
                 levelId={levelId}
                 accent={accent}
                 customWords={currentStep.items}
                 isSubPhase={true}
                 embedded={true}
                 onComplete={nextStep}
               />
            </motion.div>
          )}

          {currentStep.type === "type" && (
            <motion.div key={`type-${currentStepIdx}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <LevelListenType
                levelId={levelId}
                patterns={[pattern]}
                accent={accent}
                onComplete={nextStep}
                customTargets={currentStep.items.map(s => ({
                  syllable: s,
                  letters: s.split(""),
                  pattern: pattern
                }))}
                isSubPhase={true}
                embedded={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
