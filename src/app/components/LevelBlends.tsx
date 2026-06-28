import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Volume2, Mic, MicOff, CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, RotateCcw, FastForward, Shuffle, ChevronRight } from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Confetti } from "./ui/Confetti";
import { shuffle } from "../data/levels";
import { BLENDS_DATA, BLENDS_SENTENCES, BlendWord } from "../data/blends";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { AudioVisualizer } from "./AudioVisualizer";
import { playSound, playExclusiveAudio } from "../utils/soundEffects";
import { playTTS as playTTSUtil } from "../utils/tts";

interface LevelBlendsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  categoryFilter?: string;
  onComplete?: () => void;
}

type Phase = "full-review" | "vowels-review" | "words-preview" | "words-eval" | "words-review" | "sentences";

interface GameStep {
  phase: Phase;
  words?: string[];
  patterns?: { pattern: string; category: string; name: string; words: BlendWord[] }[];
  batchNumber?: number;
  totalBatches?: number;
}

// Sub-component for the grid of words
function LevelBlendsGrid({
  accent,
  words,
  onComplete,
  onBack,
  canBack,
  batchNumber,
  totalBatches,
  isReview,
  allWordsMap,
  categoryFilter
}: {
  accent: { primary: string; dark: string; lightBg: string };
  words: string[];
  onComplete: () => void;
  onBack: () => void;
  canBack: boolean;
  batchNumber?: number;
  totalBatches?: number;
  isReview?: boolean;
  allWordsMap: Record<string, BlendWord>;
  categoryFilter?: string;
}) {
  const [order, setOrder] = useState<string[]>(words);
  useEffect(() => {
    setOrder(words);
  }, [words]);

  const handleShuffle = () => setOrder([...order].sort(() => Math.random() - 0.5));

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-8"
    >
      <div className="text-center mb-8">
        <p className="text-white text-base sm:text-lg font-bold mt-2 block">
          {isReview 
            ? `🎉 Great work! Review ${categoryFilter || "Blends"} words! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
            : `Review ${categoryFilter || "Blends"} words before we start! ${batchNumber && totalBatches ? "(Batch " + batchNumber + " of " + totalBatches + ")" : ""}`
          }
        </p>

        <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
          <Button
            onClick={onBack}
            disabled={!canBack}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleShuffle}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
          >
            <Shuffle className="w-4 h-4 mr-1" /> Shuffle
          </Button>
          <Button
            onClick={onComplete}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            Proceed <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-12 w-full max-w-[680px] mx-auto">
        {order.map((wordStr) => {
          const w = allWordsMap[wordStr];
          return (
            <motion.div
              key={wordStr}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex flex-col items-center w-[100px] sm:w-[120px]"
            >
              <div
                onClick={() => {
                  if (isReview) {
                    playSound("click", 0.2);
                    playTTSUtil(wordStr.toLowerCase());
                  }
                }}
                className={`w-full aspect-square rounded-xl sm:rounded-2xl shadow-md flex items-center justify-center border-b-[4px] select-none transition-all ${isReview ? 'cursor-pointer hover:brightness-110 active:translate-y-1 active:border-b-0 border-amber-600' : 'cursor-default border-gray-300'}`}
                style={{
                  background: isReview ? 'linear-gradient(135deg, #FF9600 0%, #e08000 100%)' : '#ffffff',
                }}
              >
                <div className="flex items-center gap-1 select-none text-xl sm:text-2xl font-bold tracking-wider text-gray-700">
                  {wordStr.split("").map((char, index) => {
                    const isHighlighted = w?.highlights.includes(index);
                    return (
                      <span key={index} className={isHighlighted ? (isReview ? "text-yellow-200 font-extrabold" : "text-rose-500 font-extrabold") : (isReview ? "text-white" : "")}>
                        {char.toLowerCase()}
                      </span>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function LevelBlends({ levelId, accent, categoryFilter, onComplete }: LevelBlendsProps) {
  const navigate = useNavigate();

  const filteredData = useMemo(() => {
    if (!categoryFilter) return BLENDS_DATA;
    if (categoryFilter === "2-Letter Blends") {
      return BLENDS_DATA.filter(d => d.name === "2-Letter Blends" || d.name === "Digraphs");
    }
    return BLENDS_DATA.filter(d => d.name === categoryFilter);
  }, [categoryFilter]);

  const allPatternsRaw = useMemo(() => {
    const list: { pattern: string; category: string; name: string; words: BlendWord[] }[] = [];
    filteredData.forEach((d) => {
      d.patterns.forEach((p) => {
        list.push({ pattern: p.pattern, category: d.name, name: p.name, words: p.words });
      });
    });
    return list;
  }, [filteredData]);

  const allWordsRaw = useMemo(() => {
    const list: { word: string; category: string }[] = [];
    filteredData.forEach((d) => {
      d.patterns.forEach((p) => {
        p.words.forEach((w) => {
          list.push({ word: w.word, category: d.name });
        });
      });
    });
    return shuffle(list);
  }, [filteredData]);

  const allWordsMap = useMemo(() => {
    const map: Record<string, BlendWord> = {};
    filteredData.forEach((d) => {
      d.patterns.forEach((p) => {
        p.words.forEach((w) => {
          map[w.word] = w;
        });
      });
    });
    return map;
  }, [filteredData]);

  const wordsBatchSize = useMemo(() => {
    const len = allWordsRaw.length;
    return len === 0 ? 15 : Math.ceil(len / Math.ceil(len / 15));
  }, [allWordsRaw.length]);

  const sentencesBatchSize = useMemo(() => {
    const len = BLENDS_SENTENCES.length;
    return len === 0 ? 12 : Math.ceil(len / Math.ceil(len / 12));
  }, []);

  const STEPS: GameStep[] = useMemo(() => {
    const words = allWordsRaw.map(w => w.word);
    const totalBatches = Math.ceil(words.length / wordsBatchSize);
    
    const steps: GameStep[] = [];
    
    // Phase 1: Full Review
    const patternBatches = Math.ceil(allPatternsRaw.length / 6);
    for (let i = 0; i < patternBatches; i++) {
      steps.push({ phase: "full-review", batchNumber: i + 1, totalBatches: patternBatches });
    }

    // Phase 2: Patterns Review (Buttons only)
    const shuffledPatternsReview = shuffle([...allPatternsRaw]);
    const PATTERN_REVIEW_BATCH_SIZE = 14;
    const patternReviewBatches = Math.ceil(shuffledPatternsReview.length / PATTERN_REVIEW_BATCH_SIZE);
    for (let i = 0; i < patternReviewBatches; i++) {
      steps.push({ 
        phase: "vowels-review", 
        batchNumber: i + 1, 
        totalBatches: patternReviewBatches,
        patterns: shuffledPatternsReview.slice(i * PATTERN_REVIEW_BATCH_SIZE, i * PATTERN_REVIEW_BATCH_SIZE + PATTERN_REVIEW_BATCH_SIZE)
      });
    }

    for (let i = 0; i < totalBatches; i++) {
      steps.push({
        phase: "words-preview",
        words: words.slice(i * wordsBatchSize, i * wordsBatchSize + wordsBatchSize),
        batchNumber: i + 1,
        totalBatches
      });
    }

    steps.push({ phase: "words-eval" });

    for (let i = 0; i < totalBatches; i++) {
      steps.push({
        phase: "words-review",
        words: words.slice(i * wordsBatchSize, i * wordsBatchSize + wordsBatchSize),
        batchNumber: i + 1,
        totalBatches
      });
    }

    steps.push({ phase: "sentences" });

    return steps;
  }, [allWordsRaw, wordsBatchSize]);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const currentStep = STEPS[currentStepIdx];
  const currentPhase = currentStep?.phase || "vowels-review";

  const [vowelsOrder, setVowelsOrder] = useState(() => currentStep.patterns || []);
  useEffect(() => {
    if (currentStep.phase === "vowels-review" && currentStep.patterns) {
      setVowelsOrder(currentStep.patterns);
    }
  }, [currentStep]);
  const handleShuffleVowels = () => setVowelsOrder([...vowelsOrder].sort(() => Math.random() - 0.5));

  const [wordSetIdx, setWordSetIdx] = useState(0);
  const activeWords = useMemo(() => {
    return allWordsRaw.slice(wordSetIdx * wordsBatchSize, wordSetIdx * wordsBatchSize + wordsBatchSize);
  }, [allWordsRaw, wordSetIdx, wordsBatchSize]);

  const [activeWordsOrder, setActiveWordsOrder] = useState(() => activeWords);
  useEffect(() => {
    setActiveWordsOrder(activeWords);
  }, [activeWords]);
  const handleShuffleWords = () => setActiveWordsOrder([...activeWordsOrder].sort(() => Math.random() - 0.5));

  const [sentenceSetIdx, setSentenceSetIdx] = useState(0);
  const activeSentences = useMemo(() => {
    return BLENDS_SENTENCES.slice(sentenceSetIdx * sentencesBatchSize, sentenceSetIdx * sentencesBatchSize + sentencesBatchSize);
  }, [sentenceSetIdx, sentencesBatchSize]);

  const [evaluatingWordId, setEvaluatingWordId] = useState<string | null>(null);
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [wordFeedbackMap, setWordFeedbackMap] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [wordTranscriptsMap, setWordTranscriptsMap] = useState<Record<string, string>>({});

  const [evaluatingSentenceId, setEvaluatingSentenceId] = useState<string | null>(null);
  const [completedSentences, setCompletedSentences] = useState<Set<string>>(new Set());
  const [sentenceFeedbackMap, setSentenceFeedbackMap] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [sentenceTranscriptsMap, setSentenceTranscriptsMap] = useState<Record<string, string>>({});

  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [hasClickedMic, setHasClickedMic] = useState(false);
  const [hasClickedSentenceMic, setHasClickedSentenceMic] = useState(false);
  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearEvalTimeout = useCallback(() => {
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearEvalTimeout();
  }, [clearEvalTimeout]);

  useEffect(() => {
    if (currentPhase === "words-eval") {
      if (activeWords.length > 0 && completedWords.size === activeWords.length) {
        const nextIdx = wordSetIdx + 1;
        if (nextIdx * wordsBatchSize < allWordsRaw.length) {
          setTimeout(() => {
            setWordSetIdx(nextIdx);
            setCompletedWords(new Set());
            setWordFeedbackMap({});
            setWordTranscriptsMap({});
          }, 1000);
        } else {
          setTimeout(() => {
            playSound("complete", 0.5);
            setCurrentStepIdx(prev => prev + 1);
            setCompletedWords(new Set());
            setWordSetIdx(0);
          }, 1000);
        }
      }
    } else if (currentPhase === "sentences") {
      if (activeSentences.length > 0 && completedSentences.size === activeSentences.length) {
        const nextIdx = sentenceSetIdx + 1;
        if (nextIdx * sentencesBatchSize < BLENDS_SENTENCES.length) {
          setTimeout(() => {
            setSentenceSetIdx(nextIdx);
            setCompletedSentences(new Set());
            setSentenceFeedbackMap({});
            setSentenceTranscriptsMap({});
          }, 1000);
        } else {
          setTimeout(() => {
            playSound("complete", 0.5);
            setShowConfetti(true);
            setCompletedSentences(new Set());
            setSentenceSetIdx(0);
          }, 1000);
        }
      }
    }
  }, [completedWords.size, activeWords.length, currentPhase, wordSetIdx, allWordsRaw.length, completedSentences.size, activeSentences.length, sentenceSetIdx]);

  const evaluatingTargetForMic = useMemo(() => {
    if (currentPhase === "words-eval" && evaluatingWordId) return evaluatingWordId;
    if (currentPhase === "sentences" && evaluatingSentenceId) return evaluatingSentenceId;
    return null;
  }, [currentPhase, evaluatingWordId, evaluatingSentenceId]);

  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);

  const handleNextStep = useCallback(() => {
    playSound("click", 0.3);
    setCurrentStepIdx(prev => prev + 1);
  }, []);

  const handleResult = useCallback(
    (target: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
      const tClean = transcript.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      const targetClean = target.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      const tNoSpace = tClean.replace(/\s+/g, "");
      const targetNoSpace = targetClean.replace(/\s+/g, "");
      let isCorrect = status === "correct" || (status === "close" && currentPhase !== "sentences") || tClean.includes(targetClean) || tNoSpace.includes(targetNoSpace);

      clearEvalTimeout();

      if (currentPhase === "words-eval" && evaluatingWordId) {
        setWordTranscriptsMap(prev => ({ ...prev, [evaluatingWordId]: transcript }));
        if (status === null && !isCorrect) return;

        if (isCorrect) {
          playSound("correct", 0.4);
          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: "correct" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setCompletedWords(prev => new Set(prev).add(evaluatingWordId));
            setEvaluatingWordId(null);
          }, 1500);
        } else {
          playSound("wrong", 0.35);
          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: "wrong" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: null }));
            setEvaluatingWordId(null);
          }, 2000);
        }
      } else if (currentPhase === "sentences" && evaluatingSentenceId) {
        setSentenceTranscriptsMap(prev => ({ ...prev, [evaluatingSentenceId]: transcript }));
        if (status === null && !isCorrect) return;

        if (isCorrect) {
          playSound("correct", 0.4);
          setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: "correct" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setCompletedSentences(prev => new Set(prev).add(evaluatingSentenceId));
            setEvaluatingSentenceId(null);
          }, 1500);
        } else {
          playSound("wrong", 0.35);
          setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: "wrong" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: null }));
            setEvaluatingSentenceId(null);
          }, 2000);
        }
      }
    },
    [currentPhase, evaluatingWordId, evaluatingSentenceId, clearEvalTimeout]
  );

  useSpeechRecognition({
    evaluatingWord: evaluatingTargetForMic,
    enabled: !!evaluatingTargetForMic,
    singleShot: currentPhase === "sentences",
    onResult: handleResult,
    onError: () => {
      setEvaluatingWordId(null);
      setEvaluatingSentenceId(null);
    },
    onSilenceTimeout: () => {
      clearEvalTimeout();
      if (currentPhase === "words-eval" && evaluatingWordId) {
        setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: null }));
          setEvaluatingWordId(null);
        }, 1500);
      } else if (currentPhase === "sentences" && evaluatingSentenceId) {
        setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: null }));
          setEvaluatingSentenceId(null);
        }, 1500);
      }
    }
  });

  const handleReset = () => {
    clearEvalTimeout();
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "words-eval") {
      setCompletedWords(new Set());
      setWordFeedbackMap({});
      setWordTranscriptsMap({});
    } else if (currentPhase === "sentences") {
      setCompletedSentences(new Set());
      setSentenceFeedbackMap({});
      setSentenceTranscriptsMap({});
    }
  };

  const handleSkip = () => {
    clearEvalTimeout();
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "words-eval") {
      setCompletedWords(new Set(activeWords.map(w => w.word)));
    } else if (currentPhase === "sentences") {
      setCompletedSentences(new Set(activeSentences));
    }
  };

  const playPatternAudio = useCallback((pattern: string, category: string) => {
    let folder = "";
    if (category === "3-Letter Blends" || category === "Three-Letter Blends") {
      folder = "3letterblend";
    } else {
      folder = "2letterblend";
    }
    playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/${folder}/${folder}-${pattern}.mp3`);
  }, []);

  const handleGoBack = async () => {
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleFinish = async () => {
    playSound("complete", 0.5);
    setIsSaving(true);
    const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
    if (!completedLevels.includes(levelId)) {
      completedLevels.push(levelId);
      localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
    }
    setIsSaving(false);
    if (onComplete) {
      onComplete();
    } else {
      navigate("/levels");
    }
  };

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] flex flex-col items-center justify-center p-4">
        <Confetti active={true} />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12 max-w-lg w-full mx-auto flex flex-col items-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-48 h-48 relative flex items-center justify-center mb-6"
          >
            <div className="absolute inset-0 bg-yellow-400/20 dark:bg-yellow-400/10 rounded-full blur-xl animate-pulse" />
            <motion.img
              src={`${(import.meta as any).env.BASE_URL}dragon.png`}
              alt="Mascot"
              className="w-44 h-44 object-contain relative z-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 drop-shadow-sm mb-4">
            Level Complete!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium leading-relaxed max-w-sm mx-auto mb-8">
            Amazing job! You have fully mastered long vowels in <span className="font-bold text-blue-500">Long Vowels Master</span>!
          </p>
          <Button
            onClick={() => navigate("/levels")}
            className="w-full sm:w-auto px-10 py-6 rounded-2xl font-bold text-white text-lg shadow-lg border-b-[4px] border-[#3c8c01] hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            Keep Going! <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-x-hidden">
      <Confetti active={showConfetti} />

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" /> Exit
          </Button>
          <div className="flex-1 flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: accent.primary }}>
                {currentPhase === "full-review" && `${categoryFilter || "Blends"} Review`}
                {currentPhase === "vowels-review" && `Patterns Review`}
                {currentPhase === "words-preview" && `${categoryFilter || "Blends"} - Words Preview`}
                {currentPhase === "words-eval" && `${categoryFilter || "Blends"} - Voice Evaluation`}
                {currentPhase === "words-review" && `${categoryFilter || "Blends"} - Words Review`}
                {currentPhase === "sentences" && `${categoryFilter || "Blends"} - Read the Sentences`}
              </h2>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 sm:h-5 overflow-hidden relative shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out flex flex-col justify-start"
                style={{ 
                  width: `${Math.max(5, (currentStepIdx / STEPS.length) * 100)}%`, 
                  backgroundColor: accent.primary 
                }}
              >
                <div className="w-[calc(100%-12px)] h-[30%] bg-white/30 rounded-full mx-1.5 mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto px-4 py-2 flex-1 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {!showConfetti && currentPhase === "full-review" ? (
            <motion.div
              key={`full-review-${currentStep.batchNumber}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full flex-1 flex flex-col"
            >
              <div className="text-center mb-8">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Review the patterns. Tap any word or heading to hear it spoken!
                </p>
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStepIdx(p => Math.max(0, p - 1))}
                    disabled={currentStepIdx === 0}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNextStep}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)" }}
                  >
                    Proceed <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
              <div className={`grid gap-6 items-stretch mb-8 flex-1 w-full mx-auto ${(allPatternsRaw.slice(((currentStep.batchNumber || 1) - 1) * 6, (currentStep.batchNumber || 1) * 6)).length === 1 ? 'grid-cols-1 max-w-sm' : (allPatternsRaw.slice(((currentStep.batchNumber || 1) - 1) * 6, (currentStep.batchNumber || 1) * 6)).length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {allPatternsRaw.slice(((currentStep.batchNumber || 1) - 1) * 6, (currentStep.batchNumber || 1) * 6).map((pattern) => {
                  return (
                    <div
                      key={pattern.pattern}
                      className="bg-gradient-to-b from-white to-amber-50/50 dark:from-gray-800/90 dark:to-gray-900/90 rounded-3xl p-6 border-2 border-amber-200/50 dark:border-gray-700 shadow-xl flex flex-col justify-start relative overflow-hidden group hover:border-amber-300 dark:hover:border-gray-600 transition-all"
                    >
                      <div
                        onClick={() => playPatternAudio(pattern.pattern, pattern.category)}
                        className="text-center border-b-[3px] border-amber-100 dark:border-gray-700/60 pb-4 mb-6 cursor-pointer hover:bg-amber-50/80 dark:hover:bg-gray-700/50 rounded-2xl transition-all active:translate-y-[2px] active:border-b-0"
                      >
                        <span className="text-2xl font-black text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2">
                          {pattern.pattern} <Volume2 className="w-5 h-5 text-amber-400" />
                        </span>
                      </div>
                      <div className={`gap-4 flex-1 ${pattern.words.length > 5 ? 'grid grid-cols-1 sm:grid-cols-2' : 'flex flex-col'}`}>
                        {pattern.words.map((w: BlendWord) => {
                          return (
                            <div
                              key={w.word}
                              onClick={() => playTTSUtil(w.word.toLowerCase())}
                              className="flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 transition-all cursor-pointer active:translate-y-1 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 group/word"
                            >
                              <div className="flex items-center gap-1 select-none text-2xl font-bold tracking-wider text-gray-700 dark:text-gray-200">
                                {w.word.split("").map((char, index) => {
                                  const isHighlighted = w.highlights.includes(index);
                                  return (
                                    <span key={index} className={isHighlighted ? "text-rose-500 font-extrabold" : ""}>
                                      {char.toLowerCase()}
                                    </span>
                                  );
                                })}
                              </div>
                              <Volume2 className="w-5 h-5 text-gray-400 group-hover/word:text-amber-500 transition-colors" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : !showConfetti && currentPhase === "vowels-review" ? (
            <motion.div
              key="vowels-review"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full flex-1 flex flex-col items-center"
            >
              <div className="text-center mb-8">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Review the patterns. Tap any pattern to hear it spoken! {currentStep.batchNumber && currentStep.totalBatches ? `(Batch ${currentStep.batchNumber} of ${currentStep.totalBatches})` : ""}
                </p>
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStepIdx(p => Math.max(0, p - 1))}
                    disabled={currentStepIdx === 0}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShuffleVowels}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                    style={{ background: "linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)" }}
                  >
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNextStep}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)" }}
                  >
                    Proceed <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-12 w-full max-w-[680px] mx-auto">
                {vowelsOrder.map((pattern, idx) => (
                  <motion.div
                    key={pattern.pattern}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center w-[100px] sm:w-[120px]"
                  >
                    <div
                      onClick={() => {
                        playSound("click", 0.2);
                        playPatternAudio(pattern.pattern, pattern.category);
                      }}
                      className="w-full aspect-square rounded-xl sm:rounded-2xl shadow-md flex flex-col items-center justify-center border-b-[4px] select-none transition-all cursor-pointer hover:brightness-110 active:translate-y-1 active:border-b-0 border-amber-600 relative overflow-hidden"
                      style={{ background: 'linear-gradient(135deg, #FF9600 0%, #e08000 100%)' }}
                    >
                      <span className="text-white text-3xl sm:text-4xl font-black drop-shadow-sm tracking-widest">
                        {pattern.pattern}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : !showConfetti && (currentPhase === "words-preview" || currentPhase === "words-review") ? (
            <LevelBlendsGrid
              key={`${currentPhase}-${currentStep.batchNumber}`}
              accent={accent}
              words={currentStep.words || []}
              onComplete={handleNextStep}
              onBack={() => setCurrentStepIdx(p => Math.max(0, p - 1))}
              canBack={currentStepIdx > 0}
              batchNumber={currentStep.batchNumber}
              totalBatches={currentStep.totalBatches}
              isReview={currentPhase === "words-review"}
              allWordsMap={allWordsMap}
              categoryFilter={categoryFilter}
            />
          ) : !showConfetti && currentPhase === "words-eval" ? (
            <motion.div
              key="phase-words"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-4xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-6">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Say each word out loud into the microphone. ({wordSetIdx + 1}/{Math.ceil(allWordsRaw.length / wordsBatchSize)})
                </p>
              </div>

              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (wordSetIdx > 0) {
                      setWordSetIdx(p => p - 1);
                      setCompletedWords(new Set());
                      setWordFeedbackMap({});
                      setWordTranscriptsMap({});
                    } else {
                      setCurrentStepIdx(p => Math.max(0, p - 1));
                    }
                  }}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                  style={{ background: "linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)" }}
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c0392b] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                  style={{ background: "linear-gradient(135deg, rgb(255, 75, 75) 0%, rgb(216, 42, 42) 100%)" }}
                >
                  <RotateCcw className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShuffleWords}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                  style={{ background: "linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)" }}
                >
                  <Shuffle className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Shuffle</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#f39c12] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                  style={{ background: "linear-gradient(135deg, rgb(255, 200, 0) 0%, rgb(255, 150, 0) 100%)" }}
                >
                  <FastForward className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Forward</span>
                </Button>
              </div>

              <div className="w-full text-center mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
                  {activeWordsOrder.map((w, idx) => {
                    const isDone = completedWords.has(w.word);
                    const isEval = evaluatingWordId === w.word;
                    const vFeedback = wordFeedbackMap[w.word];
                    const fullWord = allWordsMap[w.word];
                    
                    return (
                      <div
                        key={w.word}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone || vFeedback === "correct" ? 'bg-green-50 dark:bg-green-900/20' : vFeedback === "wrong" ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isEval ? 'border-pink-400 shadow-md' : isDone || vFeedback === "correct" ? 'border-green-200' : vFeedback === "wrong" ? 'border-red-200' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                      >
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setHasClickedMic(true);
                                playTTSUtil(w.word.toLowerCase());
                              }}
                              className={`rounded-full w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-all`}
                            >
                              <Volume2 className="w-5 h-5" />
                            </Button>
                          </div>
                          <span className={`text-3xl font-bold min-w-[60px] text-left tracking-widest lowercase flex items-center gap-1.5 ${isDone || vFeedback === "correct" ? "text-[#58CC02]" : "text-gray-700 dark:text-gray-200"}`}>
                            {w.word.split("").map((char, charIdx) => {
                              const isHighlighted = fullWord?.highlights.includes(charIdx);
                              return (
                                <span key={charIdx} className={isHighlighted && !(isDone || vFeedback === "correct") ? "text-rose-500 font-extrabold" : ""}>
                                  {char.toLowerCase()}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <button
                              onClick={() => {
                                setHasClickedMic(true);
                                if (isEval) {
                                  setEvaluatingWordId(null);
                                } else if (!isDone) {
                                  setEvaluatingWordId(w.word);
                                  setWordFeedbackMap(prev => ({ ...prev, [w.word]: null }));
                                  setWordTranscriptsMap(prev => ({ ...prev, [w.word]: "" }));
                                }
                              }}
                              disabled={(evaluatingWordId !== null && !isEval) || isDone}
                              className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${isDone || vFeedback === "correct"
                                ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default'
                                : isEval
                                  ? 'bg-red-500 text-white shadow-lg'
                                  : vFeedback === "wrong"
                                    ? 'bg-red-400 text-white'
                                    : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:translate-y-1'
                                } ${idx === 0 && !hasClickedMic ? 'ring-2 ring-pink-400 ring-offset-2 animate-pulse' : ''}`}
                            >
                              {isEval && (
                                <>
                                  <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
                                  <span className="absolute -inset-1 rounded-xl bg-red-500/20 animate-pulse" />
                                </>
                              )}
                              <span className="relative z-10">
                                {isDone || vFeedback === "correct" ? <CheckCircle2 className="w-6 h-6" /> : vFeedback === "wrong" ? <XCircle className="w-6 h-6" /> : isEval ? <MicOff className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
                              </span>
                            </button>
                            {idx === 0 && !hasClickedMic && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                              >
                                Tap to speak!
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45" />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : !showConfetti && currentPhase === "sentences" ? (
            <motion.div
              key="phase-sentences"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-5xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-6">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Say each sentence out loud into the microphone. ({sentenceSetIdx + 1}/{Math.ceil(BLENDS_SENTENCES.length / sentencesBatchSize)})
                </p>
              </div>

              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (sentenceSetIdx > 0) {
                      setSentenceSetIdx(p => p - 1);
                      setCompletedSentences(new Set());
                      setSentenceFeedbackMap({});
                      setSentenceTranscriptsMap({});
                    } else {
                      setCurrentStepIdx(p => Math.max(0, p - 1));
                    }
                  }}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                  style={{ background: "linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)" }}
                >
                  <ArrowLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c0392b] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                  style={{ background: "linear-gradient(135deg, rgb(255, 75, 75) 0%, rgb(216, 42, 42) 100%)" }}
                >
                  <RotateCcw className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#f39c12] hover:scale-105 active:scale-95 active:translate-y-1 active:border-b-0 px-2 transition-all h-9 py-2"
                  style={{ background: "linear-gradient(135deg, rgb(255, 200, 0) 0%, rgb(255, 150, 0) 100%)" }}
                >
                  <FastForward className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Forward</span>
                </Button>
              </div>

              <div className="w-full text-center mb-8">
                <div className="w-full gap-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 grid grid-cols-1 lg:grid-cols-2">
                  {activeSentences.map((s, idx) => {
                    const isDone = completedSentences.has(s);
                    const isEval = evaluatingSentenceId === s;
                    const vFeedback = sentenceFeedbackMap[s];

                    return (
                      <div
                        key={s}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone || vFeedback === "correct" ? 'bg-green-50 dark:bg-green-900/20' : vFeedback === "wrong" ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isEval ? 'border-pink-400 shadow-md' : isDone || vFeedback === "correct" ? 'border-green-200' : vFeedback === "wrong" ? 'border-red-200' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setHasClickedSentenceMic(true);
                                playTTSUtil(s.toLowerCase());
                              }}
                              className={`rounded-full w-10 h-10 flex-shrink-0 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 ${idx === 0 && !hasClickedSentenceMic ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                            {idx === 0 && !hasClickedSentenceMic && (
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
                          <span className={`text-xl font-bold text-left leading-snug flex items-center gap-1.5 ${isDone || vFeedback === "correct" ? "text-[#58CC02]" : "text-gray-700 dark:text-gray-200"}`}>
                            {s}
                          </span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => {
                              setHasClickedSentenceMic(true);
                              if (isEval) {
                                setEvaluatingSentenceId(null);
                              } else if (!isDone) {
                                setEvaluatingSentenceId(s);
                                setSentenceFeedbackMap(prev => ({ ...prev, [s]: null }));
                                setSentenceTranscriptsMap(prev => ({ ...prev, [s]: "" }));
                              }
                            }}
                            disabled={(evaluatingSentenceId !== null && !isEval) || isDone}
                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${isDone || vFeedback === "correct"
                              ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default'
                              : isEval
                                ? 'bg-red-500 text-white shadow-lg'
                                : vFeedback === "wrong"
                                  ? 'bg-red-400 text-white'
                                  : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:translate-y-1'
                              } ${idx === 0 && !hasClickedSentenceMic ? 'ring-2 ring-pink-400 ring-offset-2 animate-pulse' : ''}`}
                          >
                            {isEval && (
                              <>
                                <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
                                <span className="absolute -inset-1 rounded-xl bg-red-500/20 animate-pulse" />
                              </>
                            )}
                            <span className="relative z-10">
                              {isDone || vFeedback === "correct" ? <CheckCircle2 className="w-6 h-6" /> : vFeedback === "wrong" ? <XCircle className="w-6 h-6" /> : isEval ? <MicOff className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
                            </span>
                          </button>
                          {idx === 0 && !hasClickedSentenceMic && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                            >
                              Tap to speak!
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : showConfetti ? (
            <motion.div
              key="completion-screen"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 max-w-md mx-auto"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-block mb-6"
              >
                <Sparkles className="w-20 h-20 text-[#FFC800]" />
              </motion.div>

              <h3 className="text-3xl font-black mb-4" style={{ color: accent.primary }}>
                Level Mastered!
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                You successfully read all the sentences! Awesome job!
              </p>

              <Button
                disabled={isSaving}
                onClick={handleFinish}
                size="lg"
                className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
              >
                {isSaving ? "Saving..." : "Continue"}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {evaluatingTargetForMic && !showConfetti && (currentPhase === "words-eval" || currentPhase === "sentences") && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border-4"
                style={{ borderColor: accent.primary }}
              >
                <div className="flex flex-col items-center justify-center gap-2 mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <Mic className="w-6 h-6 text-pink-500 animate-pulse" />
                    <h3 className="text-2xl font-bold tracking-tight text-pink-500 animate-pulse">
                      Listening...
                    </h3>
                  </div>
                  <AudioVisualizer isListening={!!evaluatingTargetForMic} isMobile={isMobile} />
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">Please say the {currentPhase === "words-eval" ? "word" : "sentence"} clearly.</p>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 min-h-[100px] flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target</span>
                  <span className="text-4xl font-extrabold mb-4 tracking-wider flex items-baseline justify-center uppercase" style={{ color: accent.primary }}>
                    {evaluatingTargetForMic}
                  </span>

                  <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />

                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2">Heard</span>
                  <span className="text-lg font-bold text-gray-700 dark:text-gray-200 min-h-[28px]">
                    {(currentPhase === "words-eval" ? wordTranscriptsMap[evaluatingTargetForMic] : sentenceTranscriptsMap[evaluatingTargetForMic]) || "..."}
                  </span>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (currentPhase === "words-eval") setEvaluatingWordId(null);
                      if (currentPhase === "sentences") setEvaluatingSentenceId(null);
                    }}
                    className="flex-1 rounded-xl font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-2"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
