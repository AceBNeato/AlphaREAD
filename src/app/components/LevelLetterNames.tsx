import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS, LETTER_NAMES, LETTER_TTS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Home, ArrowRight, ArrowLeft, SkipForward, Shuffle, FastForward, Volume2, RotateCcw, Sparkles, Mic, MicOff, CheckCircle2, XCircle, X } from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { playSound } from "../utils/soundEffects";
import { MatchButton } from "./MatchButton";
import { playTTS as playTTSUtil } from "../utils/tts";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { AudioVisualizer } from "./AudioVisualizer";
import { Confetti } from "./ui/Confetti";
import { supabase } from "../../lib/supabase";

interface LevelLetterNamesProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

// Vowels for color logic
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function LevelLetterNames({ levelId, accent }: LevelLetterNamesProps) {
  const navigate = useNavigate();

  // ALPHABET strictly ordered A-Z
  const ALPHABET = useMemo(() =>
    [...ALL_LETTERS].sort((a, b) => a.letter.localeCompare(b.letter)).map(l => l.letter)
    , []);

  // Randomized alphabet for the final set
  const [finalAlphabet] = useState(() => [...ALPHABET].sort(() => Math.random() - 0.5));
  // Randomized combined sets
  const [comboAL] = useState(() => [...ALPHABET.slice(0, 12)].sort(() => Math.random() - 0.5));
  const [comboMZ] = useState(() => [...ALPHABET.slice(12, 26)].sort(() => Math.random() - 0.5));

  const STEPS = useMemo(() => [
    // ── Batch 1: A-F ──
    { type: "review" as const, start: 0, end: 6, isFinal: false, combo: false },
    { type: "match" as const, start: 0, end: 6, isFinal: false, combo: false },
    { type: "voice" as const, start: 0, end: 6, isFinal: false, combo: false },
    { type: "type" as const, start: 0, end: 6, isFinal: false, combo: false },

    // ── Batch 2: G-L ──
    { type: "review" as const, start: 6, end: 12, isFinal: false, combo: false },
    { type: "match" as const, start: 6, end: 12, isFinal: false, combo: false },
    { type: "voice" as const, start: 6, end: 12, isFinal: false, combo: false },
    { type: "type" as const, start: 6, end: 12, isFinal: false, combo: false },

    // ── Combined A-L Review + Eval (randomized, batched by 6) ──
    { type: "review" as const, start: 0, end: 12, isFinal: false, combo: "AL" as const },
    { type: "match" as const, start: 0, end: 12, isFinal: false, combo: "AL" as const },
    { type: "type" as const, start: 0, end: 12, isFinal: false, combo: "AL" as const },

    // ── Batch 3: M-S ──
    { type: "review" as const, start: 12, end: 19, isFinal: false, combo: false },
    { type: "match" as const, start: 12, end: 19, isFinal: false, combo: false },
    { type: "voice" as const, start: 12, end: 19, isFinal: false, combo: false },
    { type: "type" as const, start: 12, end: 19, isFinal: false, combo: false },

    // ── Batch 4: T-Z ──
    { type: "review" as const, start: 19, end: 26, isFinal: false, combo: false },
    { type: "match" as const, start: 19, end: 26, isFinal: false, combo: false },
    { type: "voice" as const, start: 19, end: 26, isFinal: false, combo: false },
    { type: "type" as const, start: 19, end: 26, isFinal: false, combo: false },

    // ── Combined M-Z Review + Eval (randomized, batched by 6) ──
    { type: "review" as const, start: 12, end: 26, isFinal: false, combo: "MZ" as const },
    { type: "match" as const, start: 12, end: 26, isFinal: false, combo: "MZ" as const },
    { type: "type" as const, start: 12, end: 26, isFinal: false, combo: "MZ" as const },

    // ── Final A-Z Review + Eval (all randomized, batched by 6) ──
    { type: "review" as const, start: 0, end: 26, isFinal: true, combo: false },
    { type: "match" as const, start: 0, end: 26, isFinal: true, combo: false },
    { type: "type" as const, start: 0, end: 26, isFinal: true, combo: false },
  ], []);

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  const baseActiveLetters = useMemo(() => {
    if (step?.combo === "AL") return comboAL;
    if (step?.combo === "MZ") return comboMZ;
    if (step?.isFinal) return finalAlphabet;
    return ALPHABET.slice(step?.start || 0, step?.end || ALPHABET.length);
  }, [ALPHABET, finalAlphabet, comboAL, comboMZ, step]);

  const playNameTTS = (letter: string) => {
    setHasClickedTTS(true);
    const name = LETTER_TTS[letter] || letter;
    playTTSUtil(name);
  };

  // Global states
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Review Phase States
  const [reviewOrder, setReviewOrder] = useState<string[]>([]);
  useEffect(() => {
    if (step.type === "review") {
      setReviewOrder(baseActiveLetters);
    }
  }, [baseActiveLetters, step.type]);

  const handleShuffleReview = () => {
    setReviewOrder(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleLetterClick = (letter: string) => {
    if (!letter) return;
    playNameTTS(letter);
  };

  // Helper to partition letters into batches of 6 or 7 to avoid small trailing pages
  const getLetterBatches = (letters: string[]): string[][] => {
    const len = letters.length;
    if (len <= 7) return [letters];
    if (len === 12) return [letters.slice(0, 6), letters.slice(6, 12)];
    if (len === 14) return [letters.slice(0, 7), letters.slice(7, 14)];
    if (len === 26) {
      return [
        letters.slice(0, 6),
        letters.slice(6, 12),
        letters.slice(12, 19),
        letters.slice(19, 26)
      ];
    }
    // Fallback chunking by 6
    const chunks: string[][] = [];
    for (let i = 0; i < len; i += 6) {
      chunks.push(letters.slice(i, i + 6));
    }
    return chunks;
  };

  // Match Phase States
  const [matchBatchIndex, setMatchBatchIndex] = useState(0);
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);
  const [hasClickedTTS, setHasClickedTTS] = useState(false);

  const matchBatches = getLetterBatches(baseActiveLetters);
  const matchTotalBatches = matchBatches.length;
  const matchBatchLetters = matchBatches[matchBatchIndex] || [];
  const needsMatchBatching = matchTotalBatches > 1;

  useEffect(() => {
    if (step.type === "match") {
      setMatchBatchIndex(0);
    }
  }, [baseActiveLetters, step.type]);

  useEffect(() => {
    if (step.type === "match" && matchBatchLetters.length > 0) {
      setupMatchPhase(matchBatchLetters);
    }
  }, [matchBatchIndex, step.type, baseActiveLetters]);

  const setupMatchPhase = (letters?: string[]) => {
    const targets = [...(letters || matchBatchLetters)].sort(() => Math.random() - 0.5);
    setMatchColumns({
      left: [...targets].sort(() => Math.random() - 0.5),
      right: [...targets].sort(() => Math.random() - 0.5)
    });
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongMatchPair(null);
  };

  // Voice Evaluation Phase States
  const [evaluatingLetter, setEvaluatingLetter] = useState<string | null>(null);
  const [completedVoiceLetters, setCompletedVoiceLetters] = useState<Set<string>>(new Set());
  const [voiceFeedbackMap, setVoiceFeedbackMap] = useState<Record<string, "correct" | "wrong" | "close" | null>>({});
  const [voiceTranscriptsMap, setVoiceTranscriptsMap] = useState<Record<string, string>>({});
  const [shuffledVoiceLetters, setShuffledVoiceLetters] = useState<string[]>([]);
  const [hasClickedMic, setHasClickedMic] = useState(false);

  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [micReady, setMicReady] = useState(false);
  const micReadyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);

  const clearEvalTimeout = useCallback(() => {
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearEvalTimeout();
      if (micReadyTimerRef.current) clearTimeout(micReadyTimerRef.current);
    };
  }, [clearEvalTimeout]);

  useEffect(() => {
    if (step.type === "voice") {
      setupVoicePhase();
    }
  }, [baseActiveLetters, step.type]);

  const setupVoicePhase = () => {
    setShuffledVoiceLetters([...baseActiveLetters].sort(() => Math.random() - 0.5));
    setCompletedVoiceLetters(new Set());
    setVoiceFeedbackMap({});
    setVoiceTranscriptsMap({});
    setEvaluatingLetter(null);
    clearEvalTimeout();
  };

  const handleVoiceResult = useCallback((word: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
    setVoiceTranscriptsMap(prev => ({ ...prev, [word]: transcript }));

    const tLower = transcript.toLowerCase();
    const lName = LETTER_NAMES[word]?.toLowerCase() || "";
    const lTTS = LETTER_TTS[word]?.toLowerCase() || "";

    // Generous matching for single letters
    const isCorrect = status === "correct" || status === "close" ||
      tLower.includes(word.toLowerCase()) ||
      (lName && tLower.includes(lName)) ||
      (lTTS && tLower.includes(lTTS));

    if (status === null && !isCorrect) return;

    clearEvalTimeout();

    if (isCorrect) {
      playSound("correct", 0.4);
      setVoiceFeedbackMap(prev => ({ ...prev, [word]: "correct" }));
      evaluationTimeoutRef.current = setTimeout(() => {
        setEvaluatingLetter(null);
        setCompletedVoiceLetters(prev => {
          const newSet = new Set(prev);
          newSet.add(word);
          return newSet;
        });
      }, 1500);
    } else {
      playSound("wrong", 0.35);
      const letter = word; // capture before clearing
      setEvaluatingLetter(null); // IMMEDIATELY stop mic from restarting
      setVoiceFeedbackMap(prev => ({ ...prev, [letter]: "wrong" }));
      evaluationTimeoutRef.current = setTimeout(() => {
        setVoiceFeedbackMap(prev => ({ ...prev, [letter]: null }));
      }, 2000);
    }
  }, [clearEvalTimeout]);

  useSpeechRecognition({
    evaluatingWord: evaluatingLetter,
    enabled: !!evaluatingLetter,
    onResult: handleVoiceResult,
    onError: () => setEvaluatingLetter(null),
    onSilenceTimeout: () => {
      clearEvalTimeout();
      if (evaluatingLetter) {
        playSound("wrong", 0.35);
        const letter = evaluatingLetter; // capture before clearing
        setEvaluatingLetter(null); // IMMEDIATELY clear so hook doesn't restart
        setVoiceFeedbackMap(prev => ({ ...prev, [letter]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setVoiceFeedbackMap(prev => ({ ...prev, [letter]: null }));
        }, 1500);
      }
    }
  });


  // Listen & Type Phase States
  const [typeBatchIndex, setTypeBatchIndex] = useState(0);
  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [typeInputs, setTypeInputs] = useState<Record<string, string>>({});
  const [typeStatus, setTypeStatus] = useState<Record<string, boolean | null>>({});

  const typeBatches = getLetterBatches(baseActiveLetters);
  const typeTotalBatches = typeBatches.length;
  const typeBatchLetters = typeBatches[typeBatchIndex] || [];
  const needsTypeBatching = typeTotalBatches > 1;

  useEffect(() => {
    if (step.type === "type") {
      setTypeBatchIndex(0);
    }
  }, [baseActiveLetters, step.type]);

  useEffect(() => {
    if (step.type === "type" && typeBatchLetters.length > 0) {
      setupTypePhase(typeBatchLetters);
    }
  }, [typeBatchIndex, step.type, baseActiveLetters]);

  const setupTypePhase = (letters?: string[]) => {
    setTypeOrder([...(letters || typeBatchLetters)].sort(() => Math.random() - 0.5));
    setTypeInputs({});
    setTypeStatus({});
  };

  const handleShuffleType = () => {
    // Only shuffle the items that are not yet correct
    setTypeOrder(prev => {
      const correct = prev.filter(l => typeStatus[l] === true);
      const remaining = prev.filter(l => typeStatus[l] !== true).sort(() => Math.random() - 0.5);
      // We can keep the correct ones in place or just append them. Appending them to the end is fine.
      return [...correct, ...remaining];
    });
  };

  const playTypeSound = (letter: string) => {
    setHasClickedTTS(true);
    if (!letter) return;
    playNameTTS(letter);
  };

  const handleTypeChange = (letter: string, val: string) => {
    if (val.length > 1) return;

    setTypeInputs(prev => ({ ...prev, [letter]: val }));

    if (val.length === 1) {
      if (val.toLowerCase() === letter.toLowerCase()) {
        playSound("correct", 0.4);
        setTypeStatus(prev => ({ ...prev, [letter]: true }));
      } else {
        playSound("wrong", 0.35);
        setTypeStatus(prev => ({ ...prev, [letter]: false }));
        setTimeout(() => {
          setTypeStatus(prev => ({ ...prev, [letter]: null }));
          setTypeInputs(prev => ({ ...prev, [letter]: "" }));
        }, 800);
      }
    } else if (val.length === 0) {
      setTypeStatus(prev => ({ ...prev, [letter]: null }));
    }
  };

  const isTypePhaseComplete = typeOrder.length > 0 && typeOrder.every(l => typeStatus[l] === true);

  const handleGoBack = async () => {
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleStepNext = () => {
    if (currentStep < STEPS.length - 1) {
      if (STEPS[currentStep].type !== "review") {
        playSound("complete", 0.5);
      } else {
        playSound("click", 0.2);
      }
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    } else {
      playSound("complete", 0.5);
      setShowConfetti(true);
    }
  };

  const handleStepBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Match batch navigation
  const handleMatchNext = () => {
    if (needsMatchBatching && matchBatchIndex < matchTotalBatches - 1) {
      setMatchBatchIndex(prev => prev + 1);
    } else {
      handleStepNext();
    }
  };

  const handleMatchBack = () => {
    if (matchBatchIndex > 0) {
      setMatchBatchIndex(prev => prev - 1);
    } else {
      handleStepBack();
    }
  };

  // Type batch navigation
  const handleTypeNext = () => {
    if (needsTypeBatching && typeBatchIndex < typeTotalBatches - 1) {
      setTypeBatchIndex(prev => prev + 1);
    } else {
      handleStepNext();
    }
  };

  const handleTypeBack = () => {
    if (typeBatchIndex > 0) {
      setTypeBatchIndex(prev => prev - 1);
    } else {
      handleStepBack();
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);


    const completedLevels = JSON.parse(
      localStorage.getItem("completedLevels") || "[]"
    );
    if (!completedLevels.includes(levelId)) {
      completedLevels.push(levelId);
      localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
    }
    setIsSaving(false);
    setIsCompleted(true);
  };

  const checkMatch = (left: string, right: string) => {
    if (left === right) {
      playSound("correct", 0.4);
      setMatchedPairs(prev => new Set(prev).add(left));
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
    } else {
      playSound("wrong", 0.35);
      setWrongMatchPair([left, right]);
      setTimeout(() => {
        setWrongMatchPair(null);
        setSelectedSpeakerMatch(null);
        setSelectedLetterMatch(null);
      }, 900);
    }
  };

  const handleSpeakerMatchClick = (letter: string) => {
    setHasClickedTTS(true);
    if (matchedPairs.has(letter) || wrongMatchPair) return;
    playNameTTS(letter);
    setSelectedSpeakerMatch(letter);
    if (selectedLetterMatch) checkMatch(letter, selectedLetterMatch);
  };

  const handleLetterMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongMatchPair) return;

    setSelectedLetterMatch(letter);
    if (selectedSpeakerMatch) checkMatch(selectedSpeakerMatch, letter);
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
          {/* Mascot Section */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-48 h-48 relative flex items-center justify-center mb-6"
          >
            {/* Glowing background */}
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
            Amazing job! You have fully mastered letter names in <span className="font-bold text-blue-500">Letter Names Master</span>!
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] overflow-x-hidden flex flex-col">
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3 sm:gap-5 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="hidden sm:inline font-bold">Exit</span>
          </Button>

          <div className="flex-1 flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: accent.primary }}>
                {step?.isFinal ? 'Final Review - ' : step?.combo === 'AL' ? 'Combined A-L - ' : step?.combo === 'MZ' ? 'Combined M-Z - ' : 'Letter Names - '}
                {step?.type === 'review' ? 'Review Phase' :
                  step?.type === 'match' ? 'Listen & Match' :
                    step?.type === 'voice' ? 'Say the Name!' :
                      'Listen & Type'}
              </h2>
            </div>

            {/* Duolingo-style Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 sm:h-5 overflow-hidden relative shadow-inner">
              <div
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out flex flex-col justify-start"
                style={{
                  width: `${Math.max(5, (currentStep / STEPS.length) * 100)}%`,
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

      <div className="max-w-2xl mx-auto px-4 py-2 flex-1 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {!showConfetti && step.type === "review" && (
            <motion.div key={`review-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center">
              <div className="text-center mb-8">
                <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">Tap the letters to hear their sounds</p>
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-2 sm:gap-4 max-w-xl mx-auto mt-6">
                  <Button
                    size="sm"
                    onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                    disabled={currentStep === 0}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
                  >
                    <ArrowLeft className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleShuffleReview}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
                    <span className="hidden sm:inline">Shuffle</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleStepNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <SkipForward className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
                    <span className="hidden sm:inline">Forward</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleStepNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    <span className="hidden sm:inline">Proceed</span>
                    <ChevronRight className="w-4 h-4 sm:ml-1 mx-auto sm:mx-0" />
                  </Button>
                </div>
              </div>

              {/* Grid of all letters in the set */}
              <div className={`flex flex-wrap justify-center gap-2 sm:gap-3 ${(step.combo || step.isFinal) ? 'lg:gap-4' : 'gap-4 sm:gap-6 lg:gap-8'} mb-12 w-full max-w-4xl mx-auto`}>
                {reviewOrder.map((l: string) => {
                  const isVowel = VOWELS.has(l);
                  const bgStart = isVowel ? "#FF6B8A" : "#1CB0F6";
                  const bgEnd = isVowel ? "#FF4B8A" : "#0a8ed4";
                  const borderColor = isVowel ? "#C82A52" : "#086CA5";
                  const isSmall = !!(step.combo || step.isFinal);

                  return (
                    <motion.div key={l} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`flex flex-col items-center ${isSmall ? 'w-[70px] sm:w-[90px]' : 'w-[100px] sm:w-[130px]'}`}>
                      <div
                        onClick={() => handleLetterClick(l)}
                        className={`w-full aspect-square rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border-b-[4px] sm:border-b-[6px] hover:shadow-xl select-none`}
                        style={{ background: `linear-gradient(135deg, ${bgStart}, ${bgEnd})`, borderColor: borderColor }}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <span className={`text-white font-black drop-shadow-sm ${isSmall ? 'text-2xl sm:text-3xl' : 'text-5xl sm:text-6xl'}`}>{l}</span>
                          <span className={`text-white/90 font-bold drop-shadow-sm ${isSmall ? 'text-2xl sm:text-3xl' : 'text-5xl sm:text-6xl'}`}>{l.toLowerCase()}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {!showConfetti && step.type === "match" && (
            <motion.div key={`match-${currentStep}-${matchBatchIndex}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center w-full">
              <div className="text-center mb-6">
                <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">
                  Tap a speaker, then tap the matching letter!{needsMatchBatching ? ` (Batch ${matchBatchIndex + 1}/${matchTotalBatches})` : ''}
                </p>
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-2 sm:gap-4 max-w-xl mx-auto mt-6">
                  <Button
                    size="sm"
                    onClick={handleMatchBack}
                    disabled={matchBatchIndex === 0 && currentStep === 0}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
                  >
                    <ArrowLeft className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setMatchColumns(prev => ({
                        left: [...prev.left].sort(() => Math.random() - 0.5),
                        right: [...prev.right].sort(() => Math.random() - 0.5)
                      }));
                    }}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
                    <span className="hidden sm:inline">Shuffle</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleMatchNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <SkipForward className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
                    <span className="hidden sm:inline">Forward</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleMatchNext}
                    disabled={matchedPairs.size !== matchColumns.left.length || matchColumns.left.length === 0}
                    className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] ${matchedPairs.size === matchColumns.left.length ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'} px-2 transition-all h-9 py-2`}
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    <span className="hidden sm:inline">Proceed</span>
                    <ChevronRight className="w-4 h-4 sm:ml-1 mx-auto sm:mx-0" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
                {/* Left Column: TTS Speakers */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.left.map((letter, idx) => {
                    const isMatched = matchedPairs.has(letter);
                    const isSelected = selectedSpeakerMatch === letter;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[0] === letter);

                    return (
                      <div key={`speaker-${letter}`} className="relative w-full">
                        <MatchButton
                          gradientStart={accent.primary}
                          gradientEnd={accent.dark}
                          isMatched={isMatched}
                          isSelected={isSelected}
                          isWrong={isWrong}
                          onClick={() => handleSpeakerMatchClick(letter)}
                          disabled={!!wrongMatchPair}
                          className={`w-full ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                        >
                          <Volume2 className={`w-8 h-8 ${isMatched ? "opacity-50" : ""}`} />
                        </MatchButton>
                        {idx === 0 && !hasClickedTTS && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                          >
                            Click to listen!
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45" />
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Letters */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.right.map((letter) => {
                    const isMatched = matchedPairs.has(letter);
                    const isSelected = selectedLetterMatch === letter;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[1] === letter);

                    return (
                      <MatchButton
                        key={`letter-${letter}`}
                        isMatched={isMatched}
                        isSelected={isSelected}
                        isWrong={isWrong}
                        onClick={() => handleLetterMatchClick(letter)}
                        disabled={!!wrongMatchPair}
                        className="font-black text-2xl sm:text-3xl tracking-widest"
                      >
                        {letter}{letter.toLowerCase()}
                      </MatchButton>
                    );
                  })}
                </div>
              </div>

              {wrongMatchPair && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 font-bold text-lg mb-4 text-center">Not quite, try again!</motion.p>
              )}
            </motion.div>
          )}

          {!showConfetti && step.type === "voice" && (
            <motion.div
              key={`voice-${currentStep}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center w-full"
            >
              <div className="text-center mb-6">
                <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">Tap the microphone and say the name of the letter loud and clear.</p>
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
                  <Button
                    onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                    disabled={currentStep === 0}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#086ca5] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none px-2"
                    style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={() => {
                      setShuffledVoiceLetters(prev => [...prev].sort(() => Math.random() - 0.5));
                    }}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button
                    onClick={handleStepNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#c99c00] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <SkipForward className="w-4 h-4 mr-1" /> Forward
                  </Button>

                  <Button
                    onClick={handleStepNext}
                    disabled={completedVoiceLetters.size < shuffledVoiceLetters.length}
                    className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-4 ${completedVoiceLetters.size === shuffledVoiceLetters.length ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    Proceed <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="w-full text-center mb-8">
                <div className={`w-full bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 ${shuffledVoiceLetters.length > 5 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}`}>
                  {shuffledVoiceLetters.map((l, idx) => {
                    const isDone = completedVoiceLetters.has(l);
                    const isEval = evaluatingLetter === l;
                    const vFeedback = voiceFeedbackMap[l];
                    const vTranscript = voiceTranscriptsMap[l];

                    return (
                      <div
                        key={l}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone || vFeedback === "correct" ? 'bg-green-50 dark:bg-green-900/20' : vFeedback === "wrong" ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isEval ? 'border-pink-400 shadow-md' : isDone || vFeedback === "correct" ? 'border-green-200' : vFeedback === "wrong" ? 'border-red-200' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playNameTTS(l)}
                              className={`rounded-full w-10 h-10 flex-shrink-0 ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
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
                          <span className="text-3xl font-bold min-w-[60px] text-left tracking-widest flex items-baseline gap-1" style={{ color: isDone || vFeedback === "correct" ? '#58CC02' : accent.primary }}>
                            {l}
                            <span className="text-[0.8em] opacity-85">{l.toLowerCase()}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Removed inline audio visualizer, handled by Modal below */}

                          <div className="relative">
                            <button
                              onClick={() => {
                                setHasClickedMic(true);
                                if (isEval) {
                                  setEvaluatingLetter(null);
                                } else if (!isDone) {
                                  setEvaluatingLetter(l);
                                  setVoiceFeedbackMap(prev => ({ ...prev, [l]: null }));
                                  setVoiceTranscriptsMap(prev => ({ ...prev, [l]: "" }));
                                  setMicReady(false);
                                  if (micReadyTimerRef.current) clearTimeout(micReadyTimerRef.current);
                                  micReadyTimerRef.current = setTimeout(() => setMicReady(true), 220);
                                }
                              }}
                              disabled={(evaluatingLetter !== null && !isEval) || isDone}
                              className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${isDone || vFeedback === "correct"
                                ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default'
                                : isEval
                                  ? 'bg-red-500 text-white shadow-lg'
                                  : vFeedback === "wrong"
                                    ? 'bg-red-400 text-white'
                                    : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'
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

              {/* Listening Modal */}
              <AnimatePresence>
                {evaluatingLetter && !showConfetti && (
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
                            {micReady ? "Listening..." : "Get ready..."}
                          </h3>
                        </div>
                        {micReady && <AudioVisualizer isListening={!!evaluatingLetter} isMobile={isMobile} />}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">Please say the letter name clearly.</p>

                      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 min-h-[100px] flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target</span>
                        <span className="text-6xl font-extrabold mb-4 tracking-wider flex items-baseline justify-center" style={{ color: accent.primary }}>
                          {evaluatingLetter}
                          <span className="text-[0.6em] opacity-85 ml-1">{evaluatingLetter.toLowerCase()}</span>
                        </span>

                        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />

                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2">Heard</span>
                        <span className="text-5xl font-extrabold tracking-wider text-gray-700 dark:text-gray-300 min-h-[50px] flex items-center justify-center w-full break-words">
                          {voiceTranscriptsMap[evaluatingLetter] ? `"${voiceTranscriptsMap[evaluatingLetter]}"` : <span className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></span>}
                        </span>
                      </div>

                      <Button
                        onClick={() => {
                          setEvaluatingLetter(null);
                          setVoiceFeedbackMap(prev => ({ ...prev, [evaluatingLetter]: null }));
                          clearEvalTimeout();
                        }}
                        variant="ghost"
                        className="mt-6 text-gray-500 hover:text-red-500"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {!showConfetti && step.type === "type" && (
            <motion.div key={`type-${currentStep}-${typeBatchIndex}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center w-full">
              <div className="text-center mb-8">
                <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-bold mt-2 block">
                  Tap the speaker, then type the letter!{needsTypeBatching ? ` (Batch ${typeBatchIndex + 1}/${typeTotalBatches})` : ''}
                </p>
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-2 sm:gap-4 max-w-xl mx-auto mt-6">
                  <Button
                    size="sm"
                    onClick={handleTypeBack}
                    disabled={typeBatchIndex === 0 && currentStep === 0}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #1cb0f6 0%, #0a8ed4 100%)' }}
                  >
                    <ArrowLeft className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleShuffleType}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
                    <span className="hidden sm:inline">Shuffle</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleTypeNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <SkipForward className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
                    <span className="hidden sm:inline">Forward</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleTypeNext}
                    disabled={!isTypePhaseComplete}
                    className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] ${isTypePhaseComplete ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'} px-2 transition-all h-9 py-2`}
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    <span className="hidden sm:inline">Proceed</span>
                    <ChevronRight className="w-4 h-4 sm:ml-1 mx-auto sm:mx-0" />
                  </Button>
                </div>
              </div>

          {/* Reference letter pool for the user to see what letters are in the batch */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 max-w-xl mx-auto px-2">
            {[...typeOrder].sort().map((letter) => (
              <span
                key={`ref-${letter}`}
                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-white dark:bg-gray-800 border-2 border-b-[4px] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-black text-lg sm:text-xl shadow-sm flex items-center justify-center min-w-[3rem] sm:min-w-[4rem]"
              >
                {letter}{letter.toLowerCase()}
              </span>
            ))}
          </div>

          <div className="flex justify-center gap-3 sm:gap-6 w-full max-w-xl mx-auto mb-10 px-2 sm:px-4">
            {/* Left Column: TTS Speakers */}
            <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-w-0">
              {typeOrder.map((letter, idx) => {
                const isCorrect = typeStatus[letter] === true;
                return (
                  <div key={`speaker-${letter}`} className="relative w-full h-11 sm:h-12">
                    <MatchButton
                      gradientStart={accent.primary}
                      gradientEnd={accent.dark}
                      isMatched={isCorrect} // grays it out if correct
                      isSelected={false}
                      isWrong={false}
                      onClick={() => playTypeSound(letter)}
                      className={`w-full h-full ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                    >
                      <Volume2 className={`w-6 h-6 ${isCorrect ? "opacity-50" : ""}`} />
                    </MatchButton>
                    {idx === 0 && !hasClickedTTS && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                        className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                      >
                        Click to listen!
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45" />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Column: Inputs */}
            <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-w-0">
              {typeOrder.map((letter) => {
                const status = typeStatus[letter];
                const val = typeInputs[letter] || "";

                return (
                  <motion.div
                    key={`input-${letter}`}
                    animate={{ x: status === false ? [-5, 5, -5, 5, 0] : 0 }}
                    className="w-full h-11 sm:h-12 flex"
                  >
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleTypeChange(letter, e.target.value)}
                      disabled={status === true}
                      className={`w-full h-full text-center text-xl sm:text-2xl font-black rounded-lg sm:rounded-2xl border-2 sm:border-b-[4px] outline-none transition-all shadow-sm
                            ${status === true ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-green-600 dark:text-green-500 opacity-50 grayscale' :
                          status === false ? 'bg-red-50 border-red-400 text-red-600' :
                            'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-400'}
                          `}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
            </motion.div>
          )}

          {showConfetti && currentStep === STEPS.length - 1 && (
            <motion.div key="completion-screen" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 max-w-md mx-auto">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="inline-block mb-6">
                <Sparkles className="w-20 h-20 text-[#FFC800]" />
              </motion.div>
              <h3 className="text-3xl font-black mb-4" style={{ color: accent.primary }}>Awesome Job!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                You know all 26 letter names!
              </p>
              <Button disabled={isSaving} onClick={handleFinish} className="text-white shadow-lg hover:shadow-xl font-bold rounded-xl px-8 py-6 text-lg transition-all hover:scale-105 active:scale-95 border-b-4 border-[#3c8c01] cursor-pointer inline-flex items-center justify-center gap-2 w-full sm:w-auto" style={{ background: "linear-gradient(135deg, #58CC02 0%, #46A302 100%)" }}>
                {isSaving ? "Saving..." : "Continue"} <ArrowRight className="w-6 h-6" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
