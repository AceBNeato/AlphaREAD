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
  onOrganize?: () => void;
  onShuffle?: () => void;
  uniformTextSize?: boolean;
  uniformMaxLen?: number;
  wordHighlights?: Record<string, number[]>;
  disableDynamicColors?: boolean;
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
  onOrganize,
  onShuffle,
  uniformTextSize,
  uniformMaxLen,
  wordHighlights,
  disableDynamicColors
}: ReviewPhaseProps) {
  const handleShuffle = () => {
    if (onShuffle) onShuffle();
  };
  const handleOrganize = () => {
    if (onOrganize) onOrganize();
  };

  const VOWELS = new Set(["A", "E", "I", "O", "U"]);

  const maxLen = uniformMaxLen !== undefined ? uniformMaxLen : Math.max(0, ...items.map(s => s.length));
  let uniformClass = isSmallItems ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl";
  if (maxLen >= 7) uniformClass = isSmallItems ? "text-sm sm:text-lg tracking-tight" : "text-xl sm:text-2xl tracking-tight";
  else if (maxLen >= 6) uniformClass = isSmallItems ? "text-base sm:text-xl tracking-tight" : "text-2xl sm:text-3xl tracking-tight";
  else if (maxLen >= 5) uniformClass = isSmallItems ? "text-lg sm:text-2xl tracking-tight" : "text-3xl sm:text-4xl tracking-tight";
  else if (maxLen >= 4) uniformClass = isSmallItems ? "text-xl sm:text-3xl tracking-tight" : "text-4xl sm:text-5xl tracking-tight";
  else if (maxLen === 3) uniformClass = isSmallItems ? "text-2xl sm:text-4xl tracking-tight" : "text-4xl sm:text-6xl tracking-tight";

  const getGridColsClass = (count: number) => {
    if (count <= 4) return "grid-cols-2 sm:grid-cols-4";
    if (count <= 6) return "grid-cols-3 sm:grid-cols-6";
    if (count <= 12) return "grid-cols-3 sm:grid-cols-6";
    return "grid-cols-4 sm:grid-cols-7";
  };

  let buttonWidthClass = "w-[95px] xs:w-[110px] sm:w-[130px]";
  if (maxLen <= 3) {
    buttonWidthClass = "w-[65px] xs:w-[75px] sm:w-[90px]";
    uniformClass = "text-xl sm:text-2xl font-bold tracking-tight";
  } else if (items.length > 20) {
    buttonWidthClass = "w-[85px] xs:w-[100px] sm:w-[120px]";
  } else if (items.length > 12) {
    buttonWidthClass = "w-[90px] xs:w-[105px] sm:w-[125px]";
  }

  const highlightClass = (accent.primary.toLowerCase() === "#f97316" || accent.primary.toLowerCase() === "#ff9600")
    ? "text-yellow-300"
    : "text-yellow-300";

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col w-full h-full"
    >
      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-4 flex flex-col justify-center min-h-full">
          <div className="text-center mt-2 shrink-0">
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-xl font-bold block">
              {titleOverride || (isFullPreview ? `Review all items! (${items.length} items)` : `Preview items before we start! (${items.length} items)`)}
            </p>
          </div>

          <div className="flex-grow flex items-center justify-center w-full py-4">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-5xl mx-auto w-full px-2">
              {items.map((syl) => {
                const isSingleComponent = syl.length <= 2 || (syl.length <= 3 && (syl.toLowerCase().endsWith("ng") || syl.toLowerCase().startsWith("ng"))) || syl.endsWith(")");
                const isVowelStart = isSingleComponent && VOWELS.has(syl[0]?.toUpperCase());

                const bgStart = (!disableDynamicColors && isSingleComponent) ? (isVowelStart ? "#FF6B8A" : "#1CB0F6") : accent.primary;
                const bgEnd = (!disableDynamicColors && isSingleComponent) ? (isVowelStart ? "#FF4B8A" : "#0a8ed4") : accent.dark;

                let textSizeClass = uniformClass;
                if (!uniformTextSize) {
                  textSizeClass = isSmallItems ? "text-3xl sm:text-4xl" : "text-4xl sm:text-6xl";
                  if (syl.length >= 7) textSizeClass = isSmallItems ? "text-base sm:text-xl tracking-tight" : "text-2xl sm:text-3xl tracking-tight";
                  else if (syl.length >= 6) textSizeClass = isSmallItems ? "text-lg sm:text-2xl tracking-tight" : "text-3xl sm:text-4xl tracking-tight";
                  else if (syl.length >= 5) textSizeClass = isSmallItems ? "text-xl sm:text-3xl tracking-widest" : "text-4xl sm:text-5xl tracking-wider";
                  else if (syl.length >= 4) textSizeClass = isSmallItems ? "text-2xl sm:text-4xl tracking-wide" : "text-5xl sm:text-6xl tracking-wide";
                  else if (syl.length === 3) textSizeClass = isSmallItems ? "text-3xl sm:text-4xl" : "text-3xl sm:text-5xl";
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
                        <span className={`text-white font-black drop-shadow-sm leading-tight flex items-center justify-center ${maxLen <= 3 ? "whitespace-nowrap" : "break-all"} ${textSizeClass}`}>
                          {wordHighlights && wordHighlights[syl] ? (
                            (syl.length > 1 ? syl.toLowerCase() : syl).split('').map((char, ci) => (
                              <span key={ci} className={wordHighlights[syl].includes(ci) ? highlightClass : ''}>{char}</span>
                            ))
                          ) : (
                            syl.length > 1 ? syl.toLowerCase() : syl
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
        onShuffle={onShuffle ? handleShuffle : undefined}
        onReset={(allowOrganize && onOrganize) ? handleOrganize : undefined}
        resetLabel="Organize"
        onNext={onNext}
      />
    </motion.div>
  );
}
