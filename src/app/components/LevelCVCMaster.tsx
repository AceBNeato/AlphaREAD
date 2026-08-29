import React, { useState, useMemo, useEffect, cloneElement } from "react";
import { useLanguage } from "../context/LanguageContext";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { LevelCVCSentences } from "./LevelCVCSentences";
import { StepRenderer } from "./StepRenderer";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router";
import { SyllableTarget } from "../data/levels";
import { TAGALOG_WORD_CHUNKS } from "../data/tagalog_levels";
import { useCurriculum } from "../hooks/useCurriculum";
import { X, ArrowLeft, Shuffle, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { confirmAction } from "../utils/alerts";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import { Confetti } from "./ui/Confetti";
import { playExclusiveAudio, playSound } from "../utils/soundEffects";
import { playTTS } from "../utils/tts";
import { PushableButton } from "./ui/PushableButton";
import { ActionToolbar } from "./ui/ActionToolbar";
import { useProgress } from "../hooks/useProgress";
import { LevelCompleteScreen } from "./ui/LevelCompleteScreen";

interface LevelCVCMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type StepPhase = "preview" | "build" | "type" | "eval" | "milestone" | "sentences" | "review";

interface GameStep {
  phase: StepPhase;
  words: string[];
  batchNumber?: number;
  totalBatches?: number;
  batchSize?: number;
}

function LevelCVCPreview({
  accent,
  words,
  onComplete,
  onSkip,
  onBack,
  canBack,
  batchNumber,
  totalBatches,
  isReview,
  onOrganize,
  onShuffle,
  isOrganized,
}: {
  accent: { primary: string; dark: string; lightBg: string };
  words: string[];
  onComplete: () => void;
  onSkip?: () => void;
  onBack: () => void;
  canBack: boolean;
  batchNumber?: number;
  totalBatches?: number;
  isReview?: boolean;
  onOrganize?: () => void;
  onShuffle?: () => void;
  isOrganized?: boolean;
}) {
  const { language } = useLanguage();
  const isTagalog = language === "tl";
  const wordLabel = isTagalog ? "words" : "CVC words";
  
  const [activeWord, setActiveWord] = useState<string | null>(words[0] || null);
  const [sideAWord, setSideAWord] = useState<string>(words[0] || "");
  const [sideBWord, setSideBWord] = useState<string>("");
  const [activeSide, setActiveSide] = useState<'A' | 'B'>('A');
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

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Reset state when words change (e.g. batch change)
  useEffect(() => {
    setActiveWord(words[0] || null);
    setSideAWord(words[0] || "");
    setSideBWord("");
    setActiveSide('A');
    setRotation(0);
  }, [words]);

  const handleShuffle = () => {
    if (onShuffle) onShuffle();
  };

  const handleOrganize = () => {
    if (onOrganize) onOrganize();
  };

  return (
    <div className="flex flex-col w-full h-full">
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
        className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col items-center"
      >
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-10 py-4 text-center flex-1 flex flex-col justify-center">
          <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 mb-8 block shrink-0">
            {isReview
              ? `Great work! Review ${wordLabel}! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
              : `Review ${wordLabel} before we start! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
            }
          </p>

          <div className="flex flex-col md:flex-row w-full max-w-6xl mx-auto gap-8 lg:gap-12 justify-center items-center">
            
            {/* Left Column: Active Card */}
            <div className="w-full md:w-1/3 flex flex-col items-center justify-center shrink-0">
              {activeWord && (() => {
                let chunks: string[] = [];
                if (isTagalog) {
                  const standardChunks = TAGALOG_WORD_CHUNKS[activeWord.toUpperCase()];
                  if (standardChunks && standardChunks.length > 0) {
                    chunks = standardChunks;
                  } else {
                    chunks = activeWord.match(/ng|Ng|NG|[A-Za-z]/g) || activeWord.split("");
                  }
                }

                return (
                  <div className="w-full" style={{ perspective: '1000px' }}>
                    <motion.div 
                      className="relative w-full max-w-[220px] md:max-w-[260px] mx-auto aspect-[3/4] cursor-pointer"
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      style={{ rotateX: smoothRotateX, rotateY: smoothRotateY, transformStyle: 'preserve-3d' }}
                      onClick={() => {
                        if (isReview && activeWord) {
                          const audioPath = isTagalog
                            ? `${import.meta.env.BASE_URL}audio/filipino/tagalog-words/fil-level3-${activeWord.toLowerCase()}.mp3`
                            : `${import.meta.env.BASE_URL}audio/english/cvc-audio/cvc-${activeWord.toLowerCase()}.mp3`;
                          playExclusiveAudio(audioPath).catch((err: any) => {
                            playTTS(activeWord.replace(/-HARD|-SOFT/i, "").toLowerCase());
                          });
                        }
                      }}
                    >
                      <motion.div 
                        className="w-full h-full relative"
                        style={{ transformStyle: 'preserve-3d' }}
                        animate={{ rotateY: rotation }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      >
                        {/* Side A */}
                        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 rounded-3xl border-4 border-blue-400 overflow-hidden shadow-lg" style={{ backfaceVisibility: 'hidden' }}>
                          {sideAWord && !imageErrors[sideAWord] ? (
                             <img 
                               src={`${import.meta.env.BASE_URL}images/cvc/${sideAWord.toLowerCase()}.jpg`} 
                               alt={sideAWord} 
                               className="w-full h-full object-cover"
                               onError={() => setImageErrors(prev => ({...prev, [sideAWord]: true}))}
                             />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/30">
                                <span className="text-3xl font-black text-gray-400 dark:text-gray-500 tracking-widest uppercase">{sideAWord}</span>
                             </div>
                           )}
                        </div>
                        
                        {/* Side B */}
                        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 rounded-3xl border-4 border-blue-400 overflow-hidden shadow-lg" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                          {sideBWord && !imageErrors[sideBWord] ? (
                             <img 
                               src={`${import.meta.env.BASE_URL}images/cvc/${sideBWord.toLowerCase()}.jpg`} 
                               alt={sideBWord} 
                               className="w-full h-full object-cover"
                               onError={() => setImageErrors(prev => ({...prev, [sideBWord]: true}))}
                             />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/30">
                                <span className="text-3xl font-black text-gray-400 dark:text-gray-500 tracking-widest uppercase">{sideBWord}</span>
                             </div>
                           )}
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                );
              })()}
            </div>

            {/* Right Column: Grid of Buttons */}
            <div className="w-full md:w-2/3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 px-2 sm:px-0 content-start">
              {words.map((word) => {
                const isActive = activeWord === word;
                let chunks: string[] = [];
                if (isTagalog) {
                  const standardChunks = TAGALOG_WORD_CHUNKS[word.toUpperCase()];
                  if (standardChunks && standardChunks.length > 0) {
                    chunks = standardChunks;
                  } else {
                    chunks = word.match(/ng|Ng|NG|[A-Za-z]/g) || word.split("");
                  }
                }

                const wordContent = (
                  <span className="text-xl sm:text-2xl font-black drop-shadow-sm flex flex-col items-center justify-center pointer-events-none">
                    <div className="flex">
                      {!isTagalog && word.length === 3 ? (
                        <>
                          <span style={{ color: isActive ? "#ffffff" : "#FF6B8A" }}>{word.slice(0, 2).toLowerCase()}</span>
                          <span style={{ color: isActive ? "#ffffff" : "#1CB0F6" }}>{word.slice(2).toLowerCase()}</span>
                        </>
                      ) : (
                        chunks.length > 0 ? (
                          chunks.map((ch, i) => (
                            <span key={i} style={{ color: isActive ? "#ffffff" : (i % 2 === 0 ? "#1CB0F6" : "#FF6B8A") }}>
                              {ch.toLowerCase()}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: isActive ? "#ffffff" : "#1CB0F6" }}>{word.toLowerCase()}</span>
                        )
                      )}
                    </div>
                  </span>
                );

                return (
                  <PushableButton
                    key={word}
                    as="button"
                    isTile
                    onClick={() => {
                      if (activeWord !== word) {
                        playSound("click", 0.1);
                        setActiveWord(word);
                        
                        if (activeSide === 'A') {
                          setSideBWord(word);
                          setActiveSide('B');
                        } else {
                          setSideAWord(word);
                          setActiveSide('A');
                        }
                        
                        setRotation(prev => prev + 180);

                        if (isReview) {
                          const audioPath = isTagalog
                            ? `${import.meta.env.BASE_URL}audio/filipino/tagalog-words/fil-level3-${word.toLowerCase()}.mp3`
                            : `${import.meta.env.BASE_URL}audio/english/cvc-audio/cvc-${word.toLowerCase()}.mp3`;
                          playExclusiveAudio(audioPath).catch((err: any) => {
                            playTTS(word.replace(/-HARD|-SOFT/i, "").toLowerCase());
                          });
                        }
                      }
                    }}
                    className={`w-full h-16 sm:h-20 flex items-center justify-center cursor-pointer transition-transform ${isActive ? 'scale-105 z-10' : 'hover:scale-105'}`}
                    frontClassName={`flex items-center justify-center border-2 ${isActive ? 'bg-blue-500 text-white border-blue-600' : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-300 text-gray-800 dark:text-white'}`}
                    edgeStyle={{ backgroundColor: isActive ? '#2563eb' : '#e5e7eb' }}
                  >
                    {wordContent}
                  </PushableButton>
                );
              })}
            </div>

          </div>
        </div>
      </motion.div>

      <ActionToolbar
        onBack={onBack}
        canBack={canBack}
        onShuffle={onShuffle ? handleShuffle : undefined}
        onReset={onOrganize ? handleOrganize : undefined}
        canReset={!isOrganized}
        resetLabel="Organize"
        onSkip={onSkip || onComplete}
        onNext={onComplete}
      />
    </div>
  );
}

export function LevelCVCMaster({ levelId, accent }: LevelCVCMasterProps) {
  const navigate = useNavigate();
  const { CVC_WORDS, ASSESSMENT_WORDS } = useCurriculum();
  const { language } = useLanguage();
  const { markLevelComplete } = useProgress();
  const isTagalog = language === "tl";

  // We need to bring our own shuffle here or export it
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const [baseWords, setBaseWords] = useState<string[]>(() => shuffleArray([...CVC_WORDS]));
  // Assessment words are static 30 concrete nouns, randomized order on mount
  const [assessmentWords, setAssessmentWords] = useState<string[]>(() => shuffleArray([...ASSESSMENT_WORDS]));

  // Sync state when language changes or curriculum updates
  useEffect(() => {
    setBaseWords(shuffleArray([...CVC_WORDS]));
    setAssessmentWords(shuffleArray([...ASSESSMENT_WORDS]));
  }, [CVC_WORDS, ASSESSMENT_WORDS]);

  const isOrganized = useMemo(() => {
    const sorted = [...CVC_WORDS].sort((a, b) => a.localeCompare(b));
    return baseWords.length === sorted.length && baseWords.every((val, i) => val === sorted[i]);
  }, [baseWords, CVC_WORDS]);

  const handleOrganizeAll = () => {
    setBaseWords([...CVC_WORDS].sort((a, b) => a.localeCompare(b)));
  };

  const handleShuffleAll = () => {
    setBaseWords(shuffleArray([...CVC_WORDS]));
  };

  const isAssessmentOrganized = useMemo(() => {
    const sorted = [...ASSESSMENT_WORDS].sort((a, b) => a.localeCompare(b));
    return assessmentWords.length === sorted.length && assessmentWords.every((val, i) => val === sorted[i]);
  }, [assessmentWords, ASSESSMENT_WORDS]);

  const handleOrganizeAssessment = () => {
    setAssessmentWords([...ASSESSMENT_WORDS].sort((a, b) => a.localeCompare(b)));
  };

  const handleShuffleAssessment = () => {
    setAssessmentWords(shuffleArray([...ASSESSMENT_WORDS]));
  };

  const STEPS: GameStep[] = useMemo(() => {
    const wordsToUse = baseWords;

    const steps: GameStep[] = [];
    const PREVIEW_BATCH_SIZE = 30;
    const previewBatches = Math.ceil(wordsToUse.length / PREVIEW_BATCH_SIZE);

    // 1. Previews
    for (let i = 0; i < previewBatches; i++) {
      steps.push({
        phase: "preview",
        words: wordsToUse.slice(i * PREVIEW_BATCH_SIZE, (i + 1) * PREVIEW_BATCH_SIZE),
        batchNumber: i + 1,
        totalBatches: previewBatches
      });
    }

    // 2. Word Builder
    steps.push({ phase: "build", words: wordsToUse });

    // 3. Clickable Review Phase
    for (let i = 0; i < previewBatches; i++) {
      steps.push({
        phase: "review",
        words: wordsToUse.slice(i * PREVIEW_BATCH_SIZE, (i + 1) * PREVIEW_BATCH_SIZE),
        batchNumber: i + 1,
        totalBatches: previewBatches
      });
    }

    // 4. Voice Evaluation
    steps.push({ phase: "eval", words: wordsToUse });

    // 5. Picture and Type Assessment
    steps.push({ 
      phase: "type", 
      words: assessmentWords,
      batchSize: 15
    });

    // 6. Final sentences quiz
    steps.push({ phase: "sentences", words: [] });

    return steps;
  }, [CVC_WORDS, baseWords, assessmentWords, isTagalog]);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const step = STEPS[currentStep];

  const handleNextStep = async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    } else {
      // Game Over, all completed!
      markLevelComplete(levelId);
      setIsCompleted(true);
    }
    // Allow transitions again after React has had time to commit
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleGoBack = async () => {
    playSound("click", 0.2);
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const getPhaseTitle = () => {
    const title = isTagalog ? "Salita Master" : "CVC Master";
    if (step.phase === "preview") {
      return `${title} - Word Preview ${step.batchNumber && step.totalBatches ? `(${step.batchNumber}/${step.totalBatches})` : ""}`;
    }
    if (step.phase === "review") {
      return `${title} - Word Review ${step.batchNumber && step.totalBatches ? `(${step.batchNumber}/${step.totalBatches})` : ""}`;
    }
    if (step.phase === "build") return `${title} - Word Builder`;
    if (step.phase === "type") return `${title} - Picture & Type Assessment`;
    if (step.phase === "eval" || step.phase === "milestone") return `${title} - Voice Evaluation`;
    if (step.phase === "sentences") return `${title} - Read Sentences`;
    return title;
  };

  let content = null;

  // Phase: CVC Preview
  if (step.phase === "preview" || step.phase === "review") {
    const handleSkipPhase = () => {
      const nextPhaseIndex = STEPS.findIndex((s, idx) => idx > currentStep && s.phase !== step.phase);
      if (nextPhaseIndex !== -1) {
        setCurrentStep(nextPhaseIndex);
      } else {
        setIsCompleted(true);
      }
    };

    content = (
      <LevelCVCPreview
        accent={accent}
        words={step.words}
        onComplete={handleNextStep}
        onSkip={handleSkipPhase}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
        canBack={currentStep > 0}
        batchNumber={step.batchNumber}
        totalBatches={step.totalBatches}
        isReview={step.phase === "review"}
        onOrganize={handleOrganizeAll}
        onShuffle={handleShuffleAll}
        isOrganized={isOrganized}
      />
    );
  }
  // Phase: CVC Builder
  else if (step.phase === "build") {
    const customTargets: SyllableTarget[] = step.words.map(w => {
      let chunks = w.split("");
      if (isTagalog) {
        const standardChunks = TAGALOG_WORD_CHUNKS[w.toUpperCase()];
        if (standardChunks && standardChunks.length > 0) {
          chunks = standardChunks;
        } else {
          // Chunk into CV combinations or single letters (e.g., 'ilong' -> 'i', 'lo', 'ng')
          chunks = w.match(/(ng[aeiou]|[b-df-hj-np-tv-z][aeiou]|ng|[a-z])/ig) || w.split("");
        }
      }
      return {
        syllable: w,
        letters: chunks,
        pattern: "CVC"
      };
    });

    content = (
      <LevelSyllableBuilder
        levelId={levelId}
        patterns={["CVC"]}
        accent={accent}
        customTargets={customTargets}
        isSubPhase={true}
        embedded={true}
        onComplete={handleNextStep}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
      />
    );
  }
  // Phase: Picture and Type Assessment
  else if (step.phase === "type") {
    content = (
      <StepRenderer
        step={step}
        levelId={levelId}
        accent={accent}
        onNext={handleNextStep}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
        canBack={currentStep > 0}
        onOrganize={handleOrganizeAssessment}
        onShuffle={handleShuffleAssessment}
        isOrganized={isAssessmentOrganized}
        onItemClick={(item) => {
          const audioPath = isTagalog
            ? `${import.meta.env.BASE_URL}audio/filipino/tagalog-words/fil-level3-${item.toLowerCase()}.mp3`
            : `${import.meta.env.BASE_URL}audio/english/cvc-audio/cvc-${item.toLowerCase()}.mp3`;
          playExclusiveAudio(audioPath).catch((err: any) => {
            console.warn(`[AlphabetGO] Local CVC audio not found: ${audioPath}, falling back to TTS`, err);
            playTTS(item.replace(/-HARD|-SOFT/i, "").toLowerCase());
          });
        }}
      />
    );
  }
  // Phase: Voice Evaluation OR Milestone Evaluation
  else if (step.phase === "eval" || step.phase === "milestone") {
    content = (
      <LevelVoiceEvaluation
        key={`eval-step-${currentStep}`} // Key forces unmount/remount between steps to reset microphone state
        levelId={levelId}
        accent={accent}
        customWords={step.words}
        isSubPhase={true}
        onComplete={handleNextStep}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
      />
    );
  }
  // Phase: Sentences Quiz
  else if (step.phase === "sentences") {
    content = (
      <LevelCVCSentences
        levelId={levelId}
        accent={accent}
        isSubPhase={true}
        onComplete={handleNextStep}
        onBack={() => setCurrentStep(prev => Math.max(0, prev - 1))}
      />
    );
  }

  if (isCompleted) {
    return (
      <LevelCompleteScreen
        title={isTagalog ? "Kumpleto na ang Antas!" : "Level Complete!"}
        subtitle={
          isTagalog ? (
            <>
              Napakagaling! Ganap mo nang natutunan ang mga salita sa{" "}
              <span className="font-bold text-blue-500">Salita Master</span>!
            </>
          ) : (
            <>
              Amazing job! You have fully mastered CVC words in{" "}
              <span className="font-bold text-blue-500">CVC Master</span>!
            </>
          )
        }
        continueText={isTagalog ? "Ipagpatuloy!" : "Keep Going!"}
        onContinue={() => navigate("/levels")}
      />
    );
  }

  const getCurrentPhaseIndex = () => {
    const phase = STEPS[currentStep]?.phase;
    if (phase === "build") return 1;
    if (phase === "review") return 2;
    if (phase === "eval") return 3;
    if (phase === "type") return 4;
    if (phase === "sentences" || phase === "milestone") return 5;
    return 0; // preview
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c]">
      <div className="shrink-0 z-50 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto flex items-center gap-3 sm:gap-5 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
            <X className="!w-8 !h-8 sm:!w-10 sm:!h-10 stroke-[3]" />
          </Button>

          <div className="flex-1 flex flex-col gap-1.5 mt-1">
            {/* Duolingo-style Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 sm:h-5 overflow-hidden relative shadow-inner">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out flex flex-col justify-start"
                style={{
                  width: `${Math.max(5, (getCurrentPhaseIndex() / 6) * 100)}%`,
                  backgroundColor: accent.primary
                }}
              >
                {/* Glossy reflection highlight */}
                <div className="w-[calc(100%-12px)] h-[30%] bg-white/30 rounded-full mx-1.5 mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden w-full flex flex-col">
        <AnimatePresence mode="wait">
          {React.cloneElement(content as React.ReactElement, { key: currentStep })}
        </AnimatePresence>
      </div>
    </div>
  );
}
