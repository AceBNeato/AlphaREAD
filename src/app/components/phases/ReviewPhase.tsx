import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ActionToolbar } from "../ui/ActionToolbar";

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

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center w-full h-full">
      <div className="text-center mb-8">
        <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-6 block">
          {titleOverride || (isFullPreview ? `Review all items! (${items.length} items)` : `Preview items before we start! (${items.length} items)`)}
        </p>

        <ActionToolbar
          onBack={onBack}
          canBack={canBack}
          onShuffle={handleShuffle}
          onReset={allowOrganize ? handleOrganize : undefined}
          resetLabel="Organize"
          onNext={onNext}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-5xl mx-auto mb-12 w-full">
        {reviewOrder.map((syl) => {
          const isSingleLetter = syl.length <= 2;
          const isVowelStart = isSingleLetter && VOWELS.has(syl[0]?.toUpperCase());

          const bgStart = isSingleLetter ? (isVowelStart ? "#FF6B8A" : "#1CB0F6") : accent.primary;
          const bgEnd = isSingleLetter ? (isVowelStart ? "#FF4B8A" : "#0a8ed4") : accent.dark;

          let textSizeClass = uniformClass;
          if (!uniformTextSize) {
            textSizeClass = isSmallItems ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl";
            if (syl.length >= 5) textSizeClass = isSmallItems ? "text-sm sm:text-base tracking-widest" : "text-lg sm:text-xl tracking-widest";
            else if (syl.length >= 4) textSizeClass = isSmallItems ? "text-base sm:text-lg tracking-wide" : "text-xl sm:text-2xl tracking-wider";
            else if (syl.length === 3) textSizeClass = isSmallItems ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl tracking-wide";
          }

          return (
            <motion.div key={syl} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`flex flex-col items-center ${isSmallItems ? "w-[65px] sm:w-[85px]" : "w-[90px] sm:w-[120px]"}`}>
              <div
                onClick={() => !disableAudio && onItemClick(syl)}
                className={`w-full aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center select-none ${disableAudio ? 'cursor-default opacity-80' : 'cursor-pointer btn-3d-effect'}`}
                style={{ background: `linear-gradient(135deg, ${bgStart}, ${bgEnd})` }}
              >
                <div className="flex items-center justify-center gap-0.5 px-1 text-center">
                  <span className={`text-white font-black drop-shadow-sm break-all leading-tight ${textSizeClass}`}>
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
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
