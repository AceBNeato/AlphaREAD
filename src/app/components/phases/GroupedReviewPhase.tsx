import React, { useState } from "react";
import { motion } from "motion/react";
import { ActionToolbar } from "../ui/ActionToolbar";
import { LongVowelPattern } from "../../data/levels";

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
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center w-full h-full">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-6 block">
          {titleOverride || "Preview Patterns & Words!"}
        </p>

        <ActionToolbar
          onBack={onBack}
          canBack={canBack}
          onNext={onNext}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full max-w-6xl mx-auto mb-12 px-2">
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
              <div
                onClick={() => handleItemClick(group.pattern)}
                className="w-full h-[46px] sm:h-[52px] shrink-0 rounded-xl flex items-center justify-center select-none cursor-pointer btn-3d-effect"
                style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
              >
                <span className="text-white font-black text-2xl sm:text-3xl drop-shadow-sm">{group.pattern}</span>
              </div>

              {/* Words Container */}
              <div className="w-full flex justify-center gap-2 items-center">
                {group.words.map((w) => (
                  <div
                    key={w.word}
                    onClick={() => handleItemClick(w.word)}
                    className="flex-1 aspect-[4/3] rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 btn-3d-effect"
                  >
                    <span className="text-gray-800 dark:text-gray-100 font-extrabold text-sm sm:text-lg lg:text-xl tracking-tight">
                      {w.word.split("").map((char, index) => {
                        const isHighlighted = w.highlights.includes(index);
                        return (
                          <span key={index} className={isHighlighted ? "text-[#8b40b8] dark:text-[#c084fc] font-black" : ""}>
                            {char}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                ))}
              </div>

            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
