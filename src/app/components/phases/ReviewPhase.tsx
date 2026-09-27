import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ActionToolbar } from "../ui/ActionToolbar";
import { PushableButton } from "../ui/PushableButton";

export interface ReviewPhaseProps {
  items: string[];
  accent: { primary: string; dark: string };
  onNext: () => void;
  onSkip?: () => void;
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
  /** Base path for word images (e.g. "images/eng/level 5"). If set, shows a flip card preview. */
  imageBasePath?: string;
}

export function ReviewPhase({
  items,
  accent,
  onNext,
  onSkip,
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
  disableDynamicColors,
  imageBasePath
}: ReviewPhaseProps) {
  const handleShuffle = () => {
    if (onShuffle) onShuffle();
  };
  const handleOrganize = () => {
    if (onOrganize) onOrganize();
  };

  const VOWELS = new Set(["A", "E", "I", "O", "U"]);

  // ── Image preview state ──
  const [activeWord, setActiveWord] = useState<string | null>(items[0] || null);
  const [sideAWord, setSideAWord] = useState<string>(items[0] || "");
  const [sideBWord, setSideBWord] = useState<string>("");
  const [rotation, setRotation] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-150, 150], [15, -15]);
  const rotateY = useTransform(x, [-150, 150], [-15, 15]);
  const smoothRotateX = useSpring(rotateX, { damping: 20, stiffness: 300 });
  const smoothRotateY = useSpring(rotateY, { damping: 20, stiffness: 300 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  useEffect(() => {
    setActiveWord(items[0] || null);
    setSideAWord(items[0] || "");
    setSideBWord("");
    setRotation(0);
  }, [items]);

  const handleWordTap = (word: string) => {
    if (!imageBasePath) return;
    if (activeWord === word) return;

    const currentSide = rotation % 360 === 0 ? "A" : "B";
    if (currentSide === "A") {
      setSideBWord(word);
    } else {
      setSideAWord(word);
    }
    setRotation(prev => prev + 180);
    setActiveWord(word);
  };

  const showImagePreview = !!imageBasePath;

  const maxLen = uniformMaxLen !== undefined ? uniformMaxLen : Math.max(0, ...items.map(s => s.length));
  let uniformClass = isSmallItems ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl";
  if (maxLen >= 7) uniformClass = isSmallItems ? "text-sm sm:text-lg tracking-tight" : "text-xl sm:text-2xl tracking-tight";
  else if (maxLen >= 6) uniformClass = isSmallItems ? "text-base sm:text-xl tracking-tight" : "text-2xl sm:text-3xl tracking-tight";
  else if (maxLen >= 5) uniformClass = isSmallItems ? "text-lg sm:text-2xl tracking-tight" : "text-3xl sm:text-4xl tracking-tight";
  else if (maxLen >= 4) uniformClass = isSmallItems ? "text-xl sm:text-3xl tracking-tight" : "text-4xl sm:text-5xl tracking-tight";
  else if (maxLen === 3) uniformClass = isSmallItems ? "text-2xl sm:text-4xl tracking-tight" : "text-4xl sm:text-6xl tracking-tight";

  let buttonWidthClass = "w-[95px] xs:w-[110px] sm:w-[130px]";
  if (maxLen <= 3) {
    buttonWidthClass = "w-[65px] xs:w-[75px] sm:w-[90px]";
    uniformClass = "text-xl sm:text-2xl font-bold tracking-tight";
  } else if (items.length > 20) {
    buttonWidthClass = "w-[85px] xs:w-[100px] sm:w-[120px]";
  } else if (items.length > 12) {
    buttonWidthClass = "w-[90px] xs:w-[105px] sm:w-[125px]";
  }

  const highlightClass = "text-yellow-300";

  const renderImageCard = (word: string) => {
    const imgSrc = `${import.meta.env.BASE_URL}${imageBasePath}/${word.toLowerCase()}.jpg`;
    if (!imageErrors[word]) {
      return (
        <img
          src={imgSrc}
          alt={word}
          className="w-full h-full object-cover"
          onError={() => setImageErrors(prev => ({ ...prev, [word]: true }))}
        />
      );
    }
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/30">
        <span className="text-3xl font-black text-gray-400 dark:text-gray-500 tracking-widest uppercase">{word}</span>
      </div>
    );
  };

  const renderWordButtons = () =>
    items.map((syl) => {
      const isSingleComponent = syl.length <= 2 || (syl.length <= 3 && (syl.toLowerCase().endsWith("ng") || syl.toLowerCase().startsWith("ng"))) || syl.endsWith(")");
      const isVowelStart = isSingleComponent && VOWELS.has(syl[0]?.toUpperCase());
      const isActive = showImagePreview && activeWord === syl;

      const bgStart = isActive ? accent.primary : (!disableDynamicColors && isSingleComponent) ? (isVowelStart ? "#FF6B8A" : "#1CB0F6") : accent.primary;
      const bgEnd = isActive ? accent.dark : (!disableDynamicColors && isSingleComponent) ? (isVowelStart ? "#FF4B8A" : "#0a8ed4") : accent.dark;

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
            onClick={() => {
              if (!disableAudio) onItemClick(syl);
              if (showImagePreview) handleWordTap(syl);
            }}
            className={`w-full aspect-square block cursor-pointer ${isActive ? "ring-4 ring-white ring-offset-2 ring-offset-transparent" : ""}`}
            frontStyle={{ background: isActive ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : `linear-gradient(135deg, ${bgStart}, ${bgEnd})` }}
            edgeStyle={{ backgroundColor: isActive ? accent.dark : bgEnd, filter: 'brightness(0.75)' }}
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
    });

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col w-full h-full"
    >
      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className={`w-full mx-auto px-4 sm:px-8 py-4 flex flex-col justify-center min-h-full ${showImagePreview ? "max-w-6xl" : "max-w-5xl"}`}>
          <div className="text-center mt-2 shrink-0">
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-xl font-bold block">
              {titleOverride || (isFullPreview ? `Review all items! (${items.length} items)` : `Preview items before we start! (${items.length} items)`)}
            </p>
          </div>

          {showImagePreview ? (
            <div className="flex flex-col md:flex-row w-full max-w-6xl mx-auto gap-6 md:gap-12 justify-center items-stretch flex-1 min-h-0 py-4">
              {/* Left Column: Flip Card */}
              <div className="w-full md:w-1/3 flex flex-col items-center justify-center shrink-0 py-1 sm:py-2 md:py-0 relative z-10">
                {activeWord && (
                  <div className="w-full" style={{ perspective: '1000px' }}>
                    <motion.div
                      className="relative w-full max-w-[140px] sm:max-w-[180px] md:max-w-[260px] mx-auto aspect-[3/4] cursor-pointer md:cursor-default"
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      style={{ rotateX: smoothRotateX, rotateY: smoothRotateY, transformStyle: 'preserve-3d' }}
                      onClick={() => { if (activeWord) onItemClick(activeWord); }}
                    >
                      <motion.div
                        className="w-full h-full relative"
                        style={{ transformStyle: 'preserve-3d' }}
                        animate={{ rotateY: rotation }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 rounded-3xl border-4 border-blue-400 overflow-hidden shadow-lg" style={{ backfaceVisibility: 'hidden' }}>
                          {sideAWord && renderImageCard(sideAWord)}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 rounded-3xl border-4 border-blue-400 overflow-hidden shadow-lg" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                          {sideBWord && renderImageCard(sideBWord)}
                        </div>
                      </motion.div>
                    </motion.div>
                    <motion.p
                      key={activeWord}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center mt-3 text-xl sm:text-2xl font-black tracking-wide"
                      style={{ color: accent.primary }}
                    >
                      {activeWord.toLowerCase()}
                    </motion.p>
                  </div>
                )}
              </div>

              {/* Right Column: Grid of Buttons */}
              <div className="w-full md:w-2/3 flex-1 min-h-0 overflow-y-auto px-1 pt-4 pb-4 flex flex-col md:justify-center relative z-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 content-start">
                  {renderWordButtons()}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center w-full py-4">
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-5xl mx-auto w-full px-2">
                {renderWordButtons()}
              </div>
            </div>
          )}
        </div>
      </div>

      <ActionToolbar
        onBack={onBack}
        canBack={canBack}
        onShuffle={onShuffle ? handleShuffle : undefined}
        onReset={(allowOrganize && onOrganize) ? handleOrganize : undefined}
        resetLabel="Organize"
        onSkip={onSkip}
        onNext={onNext}
      />
    </motion.div>
  );
}
