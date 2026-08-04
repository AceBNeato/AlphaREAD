import React, { useState } from "react";
import { motion } from "motion/react";
import { ActionToolbar } from "../ui/ActionToolbar";
import { PushableButton } from "../ui/PushableButton";
import { KambalKatinigPreview } from "../KambalKatinigPreview";

export interface GroupedReviewPhaseProps {
  groups: any[];
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
  const [activeTab, setActiveTab] = useState<string>(groups[0]?.pattern || "");

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
          <div className="flex-grow flex flex-col items-center justify-start w-full py-4">
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 px-2">
              {/* Tabs */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {groups.map((g) => {
                  const isActive = activeTab === g.pattern;
                  return (
                    <PushableButton
                      as="button"
                      isTile
                      key={g.pattern}
                      onClick={() => {
                        setActiveTab(g.pattern);
                        handleItemClick(g.pattern);
                      }}
                      className={`min-w-[70px] sm:min-w-[80px] h-[50px] sm:h-[60px] transition-all duration-200 ${
                        isActive ? "scale-110 z-10" : "opacity-80 hover:opacity-100 hover:scale-105"
                      }`}
                      frontStyle={isActive ? { background: accent.primary } : {}}
                      edgeStyle={isActive ? { backgroundColor: accent.dark } : {}}
                      frontClassName={isActive ? "text-white shadow-lg" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"}
                      edgeClassName={isActive ? "" : "bg-gray-200 dark:bg-gray-900"}
                    >
                      <span className="font-black text-xl sm:text-2xl flex items-center justify-center w-full h-full px-4">
                        {g.pattern}
                      </span>
                    </PushableButton>
                  );
                })}
              </div>

              {/* Active Content */}
              <div className="w-full mt-4 flex justify-center">
                {groups.map((group) => {
                  if (group.pattern !== activeTab) return null;
                  
                  if (group.unahan || group.gitna || group.hulihan) {
                    return (
                      <KambalKatinigPreview key={group.pattern} group={group} accent={accent} hideHeader={true} onItemClick={handleItemClick} />
                    );
                  }

                  return (
                    <motion.div
                      key={group.pattern}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="backdrop-blur-lg bg-white/40 dark:bg-white/[0.06] rounded-2xl shadow-lg border border-white/50 dark:border-white/10 p-5 sm:p-8 w-full max-w-4xl flex flex-col items-center"
                    >
                      {/* Words Container */}
                      <div className="w-full flex flex-wrap justify-center gap-3 sm:gap-5 items-center">
                        {group.words.map((w: any) => (
                          <PushableButton
                            as="div"
                            isTile
                            key={w.word}
                            onClick={() => handleItemClick(w.word)}
                            className="flex-1 min-w-[85px] sm:min-w-[110px] max-w-[140px] h-[64px] sm:h-[72px] cursor-pointer"
                            frontClassName="bg-white dark:bg-gray-800"
                            edgeClassName="bg-gray-200 dark:bg-gray-900"
                          >
                            <span className="text-gray-800 dark:text-gray-100 font-black text-xl sm:text-2xl lg:text-3xl tracking-tight flex items-center justify-center h-full w-full">
                              {w.word.split("").map((char: string, index: number) => {
                                const isHighlighted = w.highlights?.includes(index);
                                return (
                                  <span key={index} className={isHighlighted ? "font-black" : ""} style={isHighlighted ? { color: accent.primary } : undefined}>
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
      </div>

      <ActionToolbar
        onBack={onBack}
        canBack={canBack}
        onNext={onNext}
      />
    </motion.div>
  );
}
