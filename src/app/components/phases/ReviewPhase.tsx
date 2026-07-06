import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ActionToolbar } from "../ui/ActionToolbar";
import { PushableButton } from "../ui/PushableButton";

export interface ReviewPhaseProps {
  items: string[];
  accent: { primary: string; dark: string };
  onNext: () => void;
  onBack?: () => void;
  canBack?: boolean;
  onItemClick: (item: string) => void;
  isFullPreview?: boolean;
  titleOverride?: string;
  isSmallItems?: boolean;
  disableAudio?: boolean;
  allowOrganize?: boolean;
  uniformTextSize?: boolean;
  uniformMaxLen?: number;
  wordHighlights?: Record<string, number[]>;
}

export function ReviewPhase({
  items,
  accent,
  onNext,
  onBack,
  canBack,
  onItemClick,
  isFullPreview,
  titleOverride,
  isSmallItems,
  disableAudio,
  allowOrganize,
  uniformTextSize,
  uniformMaxLen,
  wordHighlights
}: ReviewPhaseProps) {
  const [reviewOrder, setReviewOrder] = useState<string[]>([]);
  useEffect(() => setReviewOrder(items), [items]);

  const handleShuffle = () => setReviewOrder([...reviewOrder].sort(() => Math.random() - 0.5));
  const handleOrganize = () => setReviewOrder([...items].sort()); // Ensure alphabetical A-Z order

  const VOWELS = new Set(["A", "E", "I", "O", "U"]);

  const maxLen = uniformMaxLen !== undefined ? uniformMaxLen : Math.max(0, ...items.map(s => s.length));
  let uniformClass = isSmallItems ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl";
  if (maxLen >= 7) uniformClass = isSmallItems ? "text-sm sm:text-base" : "text-lg sm:text-xl tracking-tight";
  else if (maxLen >= 6) uniformClass = isSmallItems ? "text-base sm:text-lg tracking-tight" : "text-xl sm:text-2xl tracking-tight";
  else if (maxLen >= 5) uniformClass = isSmallItems ? "text-base sm:text-lg" : "text-2xl sm:text-3xl tracking-tight";
  else if (maxLen >= 4) uniformClass = isSmallItems ? "text-lg sm:text-xl" : "text-2xl sm:text-4xl tracking-tight";
  else if (maxLen === 3) uniformClass = isSmallItems ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl";

  const getGridColsClass = (count: number) => {
    if (count <= 4) return "grid-cols-2 sm:grid-cols-4";
    if (count <= 6) return "grid-cols-3 sm:grid-cols-6";
    if (count <= 12) return "grid-cols-3 sm:grid-cols-6";
    return "grid-cols-4 sm:grid-cols-7";
  };

  let buttonWidthClass = "w-[95px] xs:w-[110px] sm:w-[130px]";
  if (items.length > 20) {
    buttonWidthClass = "w-[65px] xs:w-[75px] sm:w-[90px]";
    if (maxLen <= 2) uniformClass = "text-2xl sm:text-3xl";
  } else if (items.length > 12) {
    buttonWidthClass = "w-[80px] xs:w-[95px] sm:w-[110px]";
    if (maxLen <= 2) uniformClass = "text-3xl sm:text-4xl";
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col w-full h-full"
    >
      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-4xl mx-auto px-15 py-4 flex flex-col justify-center min-h-full">
          <div className="text-center mt-2 shrink-0">
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-xl font-bold block">
              {titleOverride || (isFullPreview ? `Review all items! (${items.length} items)` : `Preview items before we start! (${items.length} items)`)}
            </p>
          </div>

          <div className="flex-grow flex items-center justify-center w-full py-4">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-4xl mx-auto w-full px-2">
              {reviewOrder.map((syl) => {
                const isSingleComponent = syl.length <= 2 || (syl.length <= 3 && (syl.toLowerCase().endsWith("ng") || syl.toLowerCase().startsWith("ng"))) || syl.endsWith(")");
                const isVowelStart = isSingleComponent && VOWELS.has(syl[0]?.toUpperCase());

                const bgStart = isSingleComponent ? (isVowelStart ? "#FF6B8A" : "#1CB0F6") : accent.primary;
                const bgEnd = isSingleComponent ? (isVowelStart ? "#FF4B8A" : "#0a8ed4") : accent.dark;

                let textSizeClass = uniformClass;
                if (!uniformTextSize) {
                  textSizeClass = isSmallItems ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl";
                  if (syl.length >= 5) textSizeClass = isSmallItems ? "text-sm sm:text-base tracking-widest" : "text-lg sm:text-xl tracking-widest";
                  else if (syl.length >= 4) textSizeClass = isSmallItems ? "text-base sm:text-lg tracking-wide" : "text-xl sm:text-2xl tracking-wider";
                  else if (syl.length === 3) textSizeClass = isSmallItems ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl tracking-wide";
                }

                return (
                  <motion.div key={syl} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`flex justify-center ${buttonWidthClass}`}>
                    <PushableButton
                      as="div"
                      isTile
                      onClick={() => !disableAudio && onItemClick(syl)}
                      className="w-full aspect-square block cursor-pointer"
                      frontStyle={{ background: `linear-gradient(135deg, ${bgStart}, ${bgEnd})` }}
                      edgeStyle={{ backgroundColor: bgEnd, filter: 'brightness(0.75)' }}
                    >
                      <div className="flex items-center justify-center gap-0.5 px-1 text-center h-full w-full">
                        <span className={`text-white font-black drop-shadow-sm break-all leading-tight flex items-center justify-center ${textSizeClass}`}>
                          {wordHighlights && wordHighlights[syl] ? (
                            syl.split('').map((char, ci) => (
                              <span key={ci} className={wordHighlights[syl].includes(ci) ? 'text-yellow-300' : ''}>{char}</span>
                            ))
                          ) : (
                            syl
                          )}
                        </span>
                        {syl.length === 1 && (
                          <span className={`text-white/90 font-bold drop-shadow-sm ${textSizeClass}`}>
                            {syl.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </PushableButton>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ActionToolbar
        onBack={onBack}
        canBack={canBack}
        onShuffle={handleShuffle}
        onReset={allowOrganize ? handleOrganize : undefined}
        resetLabel="Organize"
        onNext={onNext}
      />
    </motion.div>
  );
}
