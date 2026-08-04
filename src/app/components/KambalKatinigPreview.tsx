import { motion } from "motion/react";
import { PushableButton } from "./ui/PushableButton";
import { playExclusiveAudio } from "../utils/soundEffects";
import { playTTS } from "../utils/tts";

interface WordItem {
  word: string;
  highlights: number[];
}

interface KambalKatinigPreviewProps {
  group: {
    pattern: string;
    words: WordItem[];
    unahan?: WordItem[];
    gitna?: WordItem[];
    hulihan?: WordItem[];
  };
  accent: { primary: string; dark: string };
  hideHeader?: boolean;
  onItemClick?: (item: string) => void;
}

export function KambalKatinigPreview({ group, accent, hideHeader, onItemClick }: KambalKatinigPreviewProps) {
  const renderSection = (title: string, words: WordItem[]) => {
    if (!words || words.length === 0) return null;
    return (
      <div className="flex flex-col items-center flex-1 w-full p-4 bg-white/40 dark:bg-black/20 rounded-2xl border-2 border-white/50 dark:border-white/10 shadow-sm">
        <h3 className="text-base sm:text-lg font-black tracking-widest text-gray-500 dark:text-gray-400 mb-3 uppercase">{title}</h3>
        <div className="flex flex-wrap justify-center gap-3">
          {words.map((w, idx) => (
            <motion.div
              key={w.word}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flex-1 min-w-[110px]"
            >
              <PushableButton
                as="div"
                isTile
                onClick={() => onItemClick?.(w.word)}
                className="w-full h-[64px] sm:h-[72px] cursor-pointer"
                frontClassName="bg-white dark:bg-gray-800"
                edgeClassName="bg-gray-200 dark:bg-gray-900"
              >
                <span className="text-gray-800 dark:text-gray-100 font-black text-xl sm:text-2xl lg:text-3xl tracking-tight flex items-center justify-center h-full w-full px-2">
                  {w.word.split('').map((char, i) => (
                    <span 
                      key={i} 
                      className={w.highlights?.includes(i) ? "font-black" : ""}
                      style={w.highlights?.includes(i) ? { color: accent.primary } : undefined}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </PushableButton>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full gap-4 max-w-4xl mx-auto mb-10">
      {!hideHeader && (
        <div className="flex justify-center mb-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <PushableButton
              as="div"
              isTile
              onClick={() => onItemClick?.(group.pattern)}
              className="w-[70px] h-[70px] sm:w-[84px] sm:h-[84px] cursor-pointer hover:brightness-105"
              frontStyle={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
              edgeStyle={{ backgroundColor: accent.dark, filter: 'brightness(0.75)' }}
            >
              <span className="text-white font-black text-3xl sm:text-4xl flex items-center justify-center h-full w-full drop-shadow-md">
                {group.pattern}
              </span>
            </PushableButton>
          </motion.div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-4 w-full">
        {renderSection("Unahan", group.unahan || [])}
        {renderSection("Gitna", group.gitna || [])}
        {renderSection("Hulihan", group.hulihan || [])}
      </div>
    </div>
  );
}
