import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import { ActionToolbar } from "../ui/ActionToolbar";
import { Confetti } from "../ui/Confetti";
import { MatchButton } from "../MatchButton";
import { PushableButton } from "../ui/PushableButton";
import { playSound } from "../../utils/soundEffects";
import { useBatchedItems } from "../../hooks/useBatchedItems";

export interface TypePhaseProps {
  items: string[];
  accent: { primary: string; dark: string };
  onNext: () => void;
  onBack?: () => void;
  canBack?: boolean;
  onItemClick: (item: string) => void;
  typeBatchSize?: number;
}

export function TypePhase({
  items,
  accent,
  onNext,
  onBack,
  canBack,
  onItemClick,
  typeBatchSize = 6
}: TypePhaseProps) {
  const typeBatched = useBatchedItems(items, typeBatchSize);
  const batchItems = typeBatched.currentBatch;

  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [typeInputs, setTypeInputs] = useState<Record<string, string>>({});
  const [typeStatus, setTypeStatus] = useState<Record<string, boolean | null>>({});
  const [hasClickedTTS, setHasClickedTTS] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setTypeOrder([...batchItems].sort(() => Math.random() - 0.5));
    setTypeInputs({});
    setTypeStatus({});
    setHasClickedTTS(false);
    setShowConfetti(false);
  }, [typeBatched.batchIndex, batchItems]);

  const handleShuffleType = () => {
    setTypeOrder(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const playTypeSound = (item: string) => {
    setHasClickedTTS(true);
    if (!item) return;
    onItemClick(item);
  };

  const handleTypeChange = (item: string, val: string) => {
    const targetLength = item.length;
    if (val.length > targetLength) return;

    setTypeInputs(prev => ({ ...prev, [item]: val.toLowerCase() }));

    if (val.length === targetLength) {
      if (val.toLowerCase() === item.toLowerCase()) {
        playSound("correct", 0.4);
        setTypeStatus(prev => {
          const next = { ...prev, [item]: true };
          if (typeOrder.length > 0 && typeOrder.every(i => next[i] === true)) {
            setShowConfetti(true);
          }
          return next;
        });
      } else {
        playSound("wrong", 0.35);
        setTypeStatus(prev => ({ ...prev, [item]: false }));
        setTimeout(() => {
          setTypeStatus(prev => ({ ...prev, [item]: null }));
          setTypeInputs(prev => ({ ...prev, [item]: "" }));
        }, 800);
      }
    } else {
      setTypeStatus(prev => ({ ...prev, [item]: null }));
    }
  };

  const isTypePhaseComplete = typeOrder.length > 0 && typeOrder.every(item => typeStatus[item] === true);

  const handleNextBatch = () => {
    if (!typeBatched.isLastBatch) {
      typeBatched.nextBatch();
    } else {
      onNext();
    }
  };

  const handlePrevBatch = () => {
    if (typeBatched.batchIndex > 0) {
      typeBatched.prevBatch();
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
        <div className="w-full max-w-2xl mx-auto px-15 py-4 flex flex-col justify-center min-h-full">
          {/* Top Section: Instructions */}
          <div className="text-center mt-2 shrink-0">
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-xl font-bold block">
              Tap the speaker, then type what you hear! {typeBatched.totalBatches > 1 ? `(Batch ${typeBatched.batchIndex + 1}/${typeBatched.totalBatches})` : ''}
            </p>
          </div>

          {/* Middle Section: Centered Interactive Area */}
          <div className="w-full py-4 shrink-0">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 max-w-xl mx-auto px-6">
              {[...typeOrder].sort().map((item) => (
                <PushableButton
                  as="span"
                  key={`ref-${item}`}
                  className="min-w-[3rem] sm:min-w-[4rem]"
                  frontClassName="px-3.5 py-1.5 sm:px-5 sm:py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-base sm:text-lg"
                  edgeClassName="bg-gray-300 dark:bg-gray-700"
                >
                  {item === item.toUpperCase() ? item : item.toLowerCase()}
                </PushableButton>
              ))}
            </div>

            <div className="flex justify-center gap-3 sm:gap-6 w-full max-w-2xl mx-auto px-2 sm:px-4">
              <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                {typeOrder.map((item, idx) => {
                  const isCorrect = typeStatus[item] === true;
                  return (
                    <div key={`speaker-${item}`} className="relative w-full h-12 sm:h-14">
                      <MatchButton
                        gradientStart={accent.primary}
                        gradientEnd={accent.dark}
                        isMatched={isCorrect}
                        isSelected={false}
                        isWrong={false}
                        onClick={() => playTypeSound(item)}
                        className={`w-full h-full ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                      >
                        <Volume2 className={`w-6 h-6 sm:w-8 sm:h-8 ${isCorrect ? "opacity-50" : ""}`} />
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

              <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                {typeOrder.map((item) => {
                  const isCorrect = typeStatus[item] === true;
                  const isWrong = typeStatus[item] === false;
                  const value = typeInputs[item] || "";

                  return (
                    <div key={`input-${item}`} className="relative w-full h-12 sm:h-14">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleTypeChange(item, e.target.value)}
                        disabled={isCorrect}
                        className={`w-full h-full text-center font-black text-xl sm:text-2xl tracking-widest rounded-xl border-[3px] outline-none transition-all shadow-sm ${isCorrect
                          ? "bg-green-100 border-green-400 text-green-700 opacity-60"
                          : isWrong
                            ? "bg-red-50 border-red-400 text-red-600 animate-shake"
                            : "bg-white border-gray-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                          }`}
                        placeholder={value.length === 0 ? "..." : ""}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ActionToolbar
        onBack={handlePrevBatch}
        canBack={!(typeBatched.batchIndex === 0 && !canBack)}
        onShuffle={handleShuffleType}
        onReset={() => {
          setTypeOrder([...batchItems].sort(() => Math.random() - 0.5));
          setTypeInputs({});
          setTypeStatus({});
          setShowConfetti(false);
        }}
        onSkip={handleNextBatch}
        onNext={handleNextBatch}
        canNext={isTypePhaseComplete}
        nextLabel="Next"
        nextIcon="arrow"
      />
    </motion.div>
  );
}
