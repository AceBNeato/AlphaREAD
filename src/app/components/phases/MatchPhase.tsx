import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { ActionToolbar } from "../ui/ActionToolbar";
import { Confetti } from "../ui/Confetti";
import { MatchButton } from "../MatchButton";
import { playSound } from "../../utils/soundEffects";
import { useBatchedItems } from "../../hooks/useBatchedItems";
import { shuffle } from "../../data/levels";

export interface MatchPhaseProps {
  items: string[];
  accent: { primary: string; dark: string };
  onNext: () => void;
  onBack?: () => void;
  canBack?: boolean;
  onItemClick: (item: string) => void;
  matchBatchSize?: number;
}

export function MatchPhase({
  items,
  accent,
  onNext,
  onBack,
  canBack,
  onItemClick,
  matchBatchSize = 6
}: MatchPhaseProps) {
  const matchBatched = useBatchedItems(items, matchBatchSize);
  const batchItems = matchBatched.currentBatch;

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

  useEffect(() => { reset(batchItems); }, [matchBatched.batchIndex]);
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
    onItemClick(syl);
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
    if (!matchBatched.isLastBatch) {
      matchBatched.nextBatch();
    } else {
      onNext();
    }
  };

  const handlePrevBatch = () => {
    if (matchBatched.batchIndex > 0) {
      matchBatched.prevBatch();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col w-full h-full"
    >
      <Confetti active={showConfetti} />

      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-2xl mx-auto px-15 flex flex-col justify-center min-h-full">
          <div className="text-center mt-2 shrink-0">
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-xl font-bold block">
              Tap a speaker, then tap the matching item! {matchBatched.totalBatches > 1 ? `(Batch ${matchBatched.batchIndex + 1}/${matchBatched.totalBatches})` : ''}
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 sm:gap-8 my-6 max-w-full">
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
                      className={`w-full h-full rounded-lg sm:rounded-2xl ${idx === 0 && !hasClickedTTS ? 'ring-4 ring-indigo-400 dark:ring-indigo-500 animate-pulse' : ''}`}
                    >
                      <Volume2 className={`w-8 h-8 ${isDone ? "opacity-50" : ""}`} />
                    </MatchButton>
                    {idx === 0 && !hasClickedTTS && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                        className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                      >
                        Tap to listen!
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45" />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 sm:gap-6 min-w-0">
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
                    className={`font-black tracking-widest flex items-center justify-center text-gray-800 dark:text-gray-200 text-xl sm:text-2xl h-14 sm:h-16`}
                  >
                    {syl.length === 1 ? `${syl.toUpperCase()}${syl.toLowerCase()}` : (syl === syl.toUpperCase() ? syl : syl.toLowerCase())}
                  </MatchButton>
                );
              })}
            </div>
          </div>

          {wrongPair && (
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 font-bold text-lg text-center mt-2">
              Not quite, try again!
            </motion.p>
          )}
        </div>
      </div>

      <ActionToolbar
        onBack={handlePrevBatch}
        canBack={!(matchBatched.batchIndex === 0 && !canBack)}
        onShuffle={() => {
          setLeftCol([...leftCol].sort(() => Math.random() - 0.5));
          setRightCol([...rightCol].sort(() => Math.random() - 0.5));
        }}
        onReset={() => reset()}
        onSkip={handleNextBatch}
        onNext={handleNextBatch}
        canNext={allDone}
        nextLabel="Next"
        nextIcon="arrow"
      />
    </motion.div>
  );
}
