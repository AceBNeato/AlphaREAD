import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "./ui/button";
import { playSound } from "../utils/soundEffects";

interface LevelReviewGridProps {
  items: string[];
  accent: { primary: string; dark: string; lightBg: string };
  title?: string;
  subtitle?: string;
  onComplete: () => void;
  playItemSound: (item: string) => void;
  formatAsBox?: boolean;
}

export function LevelReviewGrid({
  items,
  accent,
  title = "Review Phase",
  subtitle = "Tap each item to hear its sound!",
  formatAsBox = false,
  onComplete,
  playItemSound
}: LevelReviewGridProps) {
  const [playedItems, setPlayedItems] = useState<Set<string>>(new Set());

  const handleItemClick = (item: string) => {
    playItemSound(item);
    setPlayedItems(prev => {
      const next = new Set(prev);
      next.add(item);
      return next;
    });
  };

  const allPlayed = playedItems.size === items.length;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
          {title}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full mb-8">
        {items.map((item, index) => {
          const isPlayed = playedItems.has(item);
          // If formatAsBox is true and item is a single letter, format it as "Aa"
          const displayItem = formatAsBox && item.length === 1 
            ? `${item.toUpperCase()}${item.toLowerCase()}` 
            : item;

          return (
            <motion.button
              key={`${item}-${index}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleItemClick(item)}
              className={`${formatAsBox ? 'aspect-square' : 'aspect-video'} rounded-2xl flex flex-col items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer border-b-[4px] select-none ${
                isPlayed ? "border-b-2 translate-y-[2px] opacity-80" : ""
              }`}
              style={{
                background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
                borderColor: accent.dark,
              }}
            >
              <span className="text-white text-4xl sm:text-5xl font-black drop-shadow-sm mb-1 tracking-widest">
                {displayItem}
              </span>
              <PlayCircle className="w-6 h-6 text-white/50" />
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-center w-full mt-4">
        <Button
          size="lg"
          onClick={() => {
            playSound("click", 0.2);
            onComplete();
          }}
          className="rounded-xl px-8 py-6 shadow-md transition-all active:scale-95"
          style={{
            background: allPlayed ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "#9CA3AF",
            color: "white"
          }}
        >
          Next
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
