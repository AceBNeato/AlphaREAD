import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
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
  hasImages?: boolean;
}

export function TypePhase({
  items,
  accent,
  onNext,
  onBack,
  canBack,
  onItemClick,
  typeBatchSize = 6,
  hasImages = true
}: TypePhaseProps) {
  const typeBatched = useBatchedItems(items, typeBatchSize);
  const batchItems = typeBatched.currentBatch;

  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [typeInputs, setTypeInputs] = useState<Record<string, string>>({});
  const [typeStatus, setTypeStatus] = useState<Record<string, boolean | null>>({});
  const [hasClickedTTS, setHasClickedTTS] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [sideAWord, setSideAWord] = useState<string | null>(null);
  const [sideBWord, setSideBWord] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');
  const [rotation, setRotation] = useState(0);

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

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  useEffect(() => {
    const newOrder = [...batchItems].sort(() => Math.random() - 0.5);
    setTypeOrder(newOrder);
    setWordBank([...batchItems].sort(() => Math.random() - 0.5));
    setTypeInputs({});
    setTypeStatus({});
    setHasClickedTTS(false);
    setShowConfetti(false);
    setActiveItem(newOrder[0] || null);
    setSideAWord(null);
    setSideBWord(null);
    setActiveSide('A');
    setRotation(0);
  }, [typeBatched.batchIndex, batchItems]);

  const handleShuffleType = () => {
    setTypeOrder(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleItemSelect = (item: string) => {
    if (activeItem !== item || (!sideAWord && !sideBWord)) {
      setActiveItem(item);
      if (activeSide === 'A') {
        setSideBWord(item);
        setActiveSide('B');
      } else {
        setSideAWord(item);
        setActiveSide('A');
      }
      setRotation(prev => prev + 180);
    }
  };

  const playTypeSound = (item: string) => {
    setHasClickedTTS(true);
    handleItemSelect(item);
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
  const hasAnswers = Object.values(typeInputs).some(val => val.length > 0) || Object.values(typeStatus).some(val => val !== null && val !== undefined);

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
    <div className="flex flex-col w-full h-full">
      <Confetti active={showConfetti} />

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col items-center"
      >
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-10 py-4 text-center flex flex-col min-h-full">
          {/* Top Section: Instructions */}
          <div className="text-center mt-2 shrink-0">
            <p className="text-gray-600 dark:text-gray-300 text-base sm:text-xl font-bold block">
              Tap the speaker, then type what you hear! {typeBatched.totalBatches > 1 ? `(Batch ${typeBatched.batchIndex + 1}/${typeBatched.totalBatches})` : ''}
            </p>
            
            {/* Word Bank */}
            <div className="flex flex-wrap justify-center gap-2 mt-4 mb-2 max-w-3xl mx-auto">
              {wordBank.map((word, i) => {
                const cleanWord = word.replace(/-HARD|-SOFT/i, '').toLowerCase();
                const isUsed = typeStatus[word] === true;
                return (
                  <span 
                    key={i} 
                    className="px-4 py-1.5 border-2 rounded-xl font-black text-lg transition-all bg-white border-indigo-200 text-indigo-500 shadow-sm dark:bg-gray-800 dark:border-indigo-900 dark:text-indigo-400"
                  >
                    {cleanWord}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Middle Section: Centered Interactive Area */}
          <div className="flex-grow flex flex-col justify-center w-full py-4 shrink-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`batch-${typeBatched.batchIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className={
                  hasImages
                    ? "flex flex-col md:flex-row w-full max-w-6xl mx-auto gap-8 lg:gap-12 justify-center items-center px-4 sm:px-10"
                    : "flex flex-col gap-3 sm:gap-4 w-full max-w-[280px] sm:max-w-sm mx-auto items-center px-4"
                }
              >
                {/* Left Column: Active Card */}
                {hasImages && activeItem && (
                  <div className="w-full md:w-1/3 flex flex-col items-center justify-center shrink-0">
                    <div className="w-full" style={{ perspective: '1000px' }}>
                      <motion.div 
                        className="relative w-full max-w-[220px] md:max-w-[260px] mx-auto aspect-[3/4] cursor-pointer md:cursor-default"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        style={{ rotateX: smoothRotateX, rotateY: smoothRotateY, transformStyle: 'preserve-3d' }}
                      >
                        <motion.div 
                          className="w-full h-full relative"
                          style={{ transformStyle: 'preserve-3d' }}
                          animate={{ rotateY: rotation }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                        >
                          {/* Side A */}
                          <div className={`absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 rounded-3xl border-[6px] ${!sideAWord ? 'border-dashed border-gray-300 dark:border-gray-600' : 'border-blue-400'} overflow-hidden shadow-lg`} style={{ backfaceVisibility: 'hidden' }}>
                            {!sideAWord ? (
                              <span className="text-7xl sm:text-8xl font-black text-gray-300 dark:text-gray-600">?</span>
                            ) : !imageErrors[sideAWord] ? (
                              <img 
                                src={`${import.meta.env.BASE_URL}images/cvc/${sideAWord.toLowerCase()}.jpg`} 
                                alt="assessment image" 
                                className="w-full h-full object-cover"
                                onError={() => setImageErrors(prev => ({...prev, [sideAWord]: true}))}
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/30">
                                <span className="text-4xl font-black text-gray-400 dark:text-gray-500 tracking-widest uppercase">{sideAWord}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Side B */}
                          <div className={`absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 rounded-3xl border-[6px] ${!sideBWord ? 'border-dashed border-gray-300 dark:border-gray-600' : 'border-blue-400'} overflow-hidden shadow-lg`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                            {!sideBWord ? (
                              <span className="text-7xl sm:text-8xl font-black text-gray-300 dark:text-gray-600">?</span>
                            ) : !imageErrors[sideBWord] ? (
                              <img 
                                src={`${import.meta.env.BASE_URL}images/cvc/${sideBWord.toLowerCase()}.jpg`} 
                                alt="assessment image" 
                                className="w-full h-full object-cover"
                                onError={() => setImageErrors(prev => ({...prev, [sideBWord]: true}))}
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/30">
                                <span className="text-4xl font-black text-gray-400 dark:text-gray-500 tracking-widest uppercase">{sideBWord}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Right Column: List of Inputs */}
                <div className={
                  hasImages
                    ? "w-full md:w-2/3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-full mx-auto md:mx-0 content-start"
                    : "w-full flex flex-col gap-3 sm:gap-4"
                }>
                  {typeOrder.map((item, idx) => {
                    const isCorrect = typeStatus[item] === true;
                    const isWrong = typeStatus[item] === false;
                    const value = typeInputs[item] || "";
                    const inputFontSize = item.length <= 1 ? "text-lg sm:text-xl" : "text-xl sm:text-2xl";
                    const isActive = activeItem === item;

                    return (
                      <div 
                        key={`input-block-${item}`} 
                        className={`flex flex-row items-center justify-center w-full gap-3 sm:gap-4 transition-all duration-300 ${isActive && hasImages ? 'scale-105' : 'opacity-90 hover:opacity-100'}`}
                      >
                        {/* Audio Button */}
                        <div className={`relative w-14 h-14 sm:w-16 sm:h-16 shrink-0`}>
                          <PushableButton
                            as="button"
                            isTile
                            onClick={() => playTypeSound(item)}
                            className={`flex items-center justify-center cursor-pointer w-full h-full ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                            frontClassName={`flex items-center justify-center text-white ${isActive ? 'bg-blue-500' : 'bg-indigo-500'}`}
                            edgeStyle={{ backgroundColor: isActive ? '#2563eb' : '#4338ca' }}
                          >
                            <Volume2 className="w-6 h-6 sm:w-8 sm:h-8" />
                          </PushableButton>
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

                        {/* Type Input */}
                        <div className={`relative flex-1 h-14 sm:h-16 rounded-xl ${isCorrect ? 'overflow-hidden animate-shine animate-match-success' : ''}`}>
                          <input
                              type="text"
                              value={value}
                              onFocus={() => handleItemSelect(item)}
                              onChange={(e) => {
                                handleItemSelect(item);
                                handleTypeChange(item, e.target.value);
                              }}
                              disabled={isCorrect}
                              className={`w-full h-full text-center font-black ${inputFontSize} tracking-widest rounded-xl border-4 outline-none transition-all shadow-sm ${isCorrect
                                ? "bg-green-100 border-green-400 text-green-700"
                                : isWrong
                                  ? "bg-red-50 border-red-400 text-red-600 animate-shake"
                                  : isActive
                                    ? "bg-white border-blue-400 ring-4 ring-blue-100 dark:bg-gray-800 dark:border-blue-500 dark:text-white"
                                    : "bg-white border-gray-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:bg-gray-800 dark:border-gray-600 dark:text-white hover:border-gray-400"
                                }`}
                              placeholder="..."
                              autoCapitalize="off"
                              autoComplete="off"
                              autoCorrect="off"
                              spellCheck="false"
                            />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <ActionToolbar
        onBack={handlePrevBatch}
        canBack={!(typeBatched.batchIndex === 0 && !canBack)}
        onShuffle={handleShuffleType}
        canShuffle={!hasAnswers}
        onReset={() => {
          setTypeOrder([...batchItems].sort(() => Math.random() - 0.5));
          setWordBank([...batchItems].sort(() => Math.random() - 0.5));
          setTypeInputs({});
          setTypeStatus({});
          setShowConfetti(false);
          setSideAWord(null);
          setSideBWord(null);
          setActiveSide('A');
          setRotation(0);
        }}
        canReset={hasAnswers}
        onSkip={handleNextBatch}
        onNext={handleNextBatch}
        canNext={isTypePhaseComplete}
        nextLabel="Next"
        nextIcon="arrow"
      />
    </div>
  );
}
