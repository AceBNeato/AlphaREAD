import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  const [flippedWords, setFlippedWords] = useState<Record<string, boolean>>({});
  const [hasClickedTTS, setHasClickedTTS] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTypeOrder([...batchItems].sort(() => Math.random() - 0.5));
    setWordBank([...batchItems].sort(() => Math.random() - 0.5));
    setTypeInputs({});
    setTypeStatus({});
    setFlippedWords({});
    setHasClickedTTS(false);
    setShowConfetti(false);
  }, [typeBatched.batchIndex, batchItems]);

  const handleShuffleType = () => {
    setTypeOrder(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const playTypeSound = (item: string) => {
    setHasClickedTTS(true);
    setFlippedWords(prev => ({...prev, [item]: true}));
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
                    ? "grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-6 lg:gap-8 w-full max-w-6xl mx-auto justify-items-center px-4 sm:px-10"
                    : "flex flex-col gap-3 sm:gap-4 w-full max-w-[280px] sm:max-w-sm mx-auto items-center px-4"
                }
              >
                {typeOrder.map((item, idx) => {
                  const isCorrect = typeStatus[item] === true;
                  const isWrong = typeStatus[item] === false;
                  const value = typeInputs[item] || "";
                  const inputFontSize = item.length <= 1 ? "text-lg sm:text-xl" : "text-xl sm:text-2xl";

                  return (
                    <div 
                      key={`input-block-${item}`} 
                      className={
                        hasImages 
                          ? "flex flex-col items-center w-full gap-2 max-w-[140px] md:max-w-[180px]"
                          : "flex flex-row items-center justify-center w-full gap-3 sm:gap-4"
                      }
                    >
                      {/* The Card */}
                      {hasImages && (
                        <div 
                          className="relative w-full aspect-[3/4] group cursor-pointer md:cursor-default" 
                          style={{ perspective: '1000px' }}
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setFlippedWords(prev => ({...prev, [item]: true}));
                            }
                          }}
                        >
                          <motion.div 
                            className="w-full h-full relative"
                            style={{ transformStyle: 'preserve-3d' }}
                            animate={ flippedWords[item] ? { rotateY: 180, y: [0, -30, 0] } : { rotateY: 0, y: 0 } }
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                          >
                            {/* Front (Skeleton Question Mark) */}
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl border-4 border-dashed border-gray-300 dark:border-gray-600 transition-colors group-hover:border-blue-400 dark:group-hover:border-blue-500" style={{ backfaceVisibility: 'hidden' }}>
                              <span className="text-6xl sm:text-7xl font-black text-gray-300 dark:text-gray-600">?</span>
                            </div>
                            
                            {/* Back (Image) */}
                            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 rounded-2xl border-4 border-blue-400 overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                               {!imageErrors[item] ? (
                                 <img 
                                   src={`${import.meta.env.BASE_URL}images/cvc/${item.toLowerCase()}.png`} 
                                   alt="assessment image" 
                                   className="w-full h-full object-cover"
                                   onError={() => setImageErrors(prev => ({...prev, [item]: true}))}
                                 />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/30">
                                    <span className="scale-125 text-gray-400 font-bold text-4xl">?</span>
                                 </div>
                               )}
                            </div>
                          </motion.div>
                        </div>
                      )}

                      {/* Audio Button */}
                      <div className={`relative ${hasImages ? 'w-full' : 'w-14 h-14 sm:w-16 sm:h-16 shrink-0'}`}>
                        <PushableButton
                          as="button"
                          isTile
                          onClick={() => playTypeSound(item)}
                          className={`flex items-center justify-center cursor-pointer ${hasImages ? 'w-full h-10 sm:h-12' : 'w-full h-full'} ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                          frontClassName="bg-indigo-500 flex items-center justify-center text-white"
                          edgeStyle={{ backgroundColor: '#4338ca' }}
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
                      <div className={`relative ${hasImages ? 'w-full' : 'flex-1'} h-10 sm:h-12 rounded-xl ${isCorrect ? 'overflow-hidden animate-shine animate-match-success' : ''}`}>
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => handleTypeChange(item, e.target.value)}
                            disabled={isCorrect}
                            className={`w-full h-full text-center font-black ${inputFontSize} tracking-widest rounded-xl border-[3px] outline-none transition-all shadow-sm ${isCorrect
                              ? "bg-green-100 border-green-400 text-green-700"
                              : isWrong
                                ? "bg-red-50 border-red-400 text-red-600 animate-shake"
                                : "bg-white border-gray-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
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
          setFlippedWords({});
          setShowConfetti(false);
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
