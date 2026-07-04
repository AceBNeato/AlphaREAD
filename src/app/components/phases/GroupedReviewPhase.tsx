import React, { useState } from "react";
import { motion } from "motion/react";
import { ActionToolbar } from "../ui/ActionToolbar";
import { LongVowelPattern } from "../../data/levels";
import { PushableButton } from "../ui/PushableButton";

export interface GroupedReviewPhaseProps {
  groups: LongVowelPattern[];
  accent: { primary: string; dark: string };
  onNext: () => void;
  onBack?: () => void;
  canBack?: boolean;
  onItemClick: (item: string) => void;
  titleOverride?: string;
}

export function GroupedReviewPhase({
  groups,
  accent,
  onNext,
  onBack,
  canBack,
  onItemClick,
  titleOverride
}: GroupedReviewPhaseProps) {
  const [clickedItems, setClickedItems] = useState<Set<string>>(new Set());

  const handleItemClick = (item: string) => {
    setClickedItems(prev => new Set(prev).add(item));
    onItemClick(item);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col w-full h-full"
    >
      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-6xl mx-auto px-15 py-4 flex flex-col justify-center min-h-full">
          {/* Top Section: Instructions */}
          <div className="text-center mt-2 shrink-0">
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-xl font-bold block">
              {titleOverride || "Preview Patterns & Words!"}
            </p>
          </div>

          {/* Middle Section: Centered interactive area */}
          <div className="flex-grow flex items-center justify-center w-full py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full max-w-6xl mx-auto px-2">
              {groups.map((group, gi) => {
                return (
                  <motion.div
                    key={group.pattern}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.06 }}
                    className="backdrop-blur-lg bg-white/40 dark:bg-white/[0.06] rounded-2xl shadow-lg border border-white/50 dark:border-white/10 p-3 sm:p-4 w-full flex flex-col items-center gap-3"
                  >
                    {/* Pattern Card Header / Button */}
                    <PushableButton
                      as="div"
                      isTile
                      onClick={() => handleItemClick(group.pattern)}
                      className="w-full h-[46px] sm:h-[52px] shrink-0 cursor-pointer block"
                      frontStyle={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                      edgeStyle={{ backgroundColor: accent.dark, filter: 'brightness(0.75)' }}
                    >
                      <span className="text-white font-black text-2xl sm:text-3xl drop-shadow-sm flex items-center justify-center h-full w-full">{group.pattern}</span>
                    </PushableButton>

                    {/* Words Container */}
                    <div className="w-full flex justify-center gap-2 items-center mt-1">
                      {group.words.map((w) => (
                        <PushableButton
                          as="div"
                          isTile
                          key={w.word}
                          onClick={() => handleItemClick(w.word)}
                          className="flex-1 aspect-[4/3] cursor-pointer hover:brightness-105"
                          frontClassName="bg-white dark:bg-gray-800"
                          edgeClassName="bg-gray-200 dark:bg-gray-900"
                        >
                          <span className="text-gray-800 dark:text-gray-100 font-extrabold text-sm sm:text-lg lg:text-xl tracking-tight flex items-center justify-center h-full w-full">
                            {w.word.split("").map((char, index) => {
                              const isHighlighted = w.highlights.includes(index);
                              return (
                                <span key={index} className={isHighlighted ? "text-[#8b40b8] dark:text-[#c084fc] font-black" : ""}>
                                  {char}
                                </span>
                              );
                            })}
                          </span>
                        </PushableButton>
                      ))}
                    </div>
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
        onNext={onNext}
      />
    </motion.div>
  );
}
