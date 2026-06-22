import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS, LETTER_NAMES, LETTER_TTS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Home, ArrowRight, Shuffle, FastForward, Volume2, RotateCcw, Sparkles, Mic, MicOff, CheckCircle2, XCircle, X } from "lucide-react";
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

  const STEPS = useMemo(() => [
    { type: "review" as const, start: 0, end: 6, isFinal: false },
    { type: "match" as const, start: 0, end: 6, isFinal: false },
    { type: "voice" as const, start: 0, end: 6, isFinal: false },
    { type: "type" as const, start: 0, end: 6, isFinal: false },

    { type: "review" as const, start: 6, end: 12, isFinal: false },
    { type: "match" as const, start: 6, end: 12, isFinal: false },
    { type: "voice" as const, start: 6, end: 12, isFinal: false },
    { type: "type" as const, start: 6, end: 12, isFinal: false },

    { type: "review" as const, start: 12, end: 19, isFinal: false },
    { type: "match" as const, start: 12, end: 19, isFinal: false },
    { type: "voice" as const, start: 12, end: 19, isFinal: false },
    { type: "type" as const, start: 12, end: 19, isFinal: false },

    { type: "review" as const, start: 19, end: 26, isFinal: false },
    { type: "match" as const, start: 19, end: 26, isFinal: false },
    { type: "voice" as const, start: 19, end: 26, isFinal: false },
    { type: "type" as const, start: 19, end: 26, isFinal: false },

    // Final Comprehensive Test (Randomized batches of 6, 6, 7, 7)
    { type: "review" as const, start: 0, end: 6, isFinal: true },
    { type: "match" as const, start: 0, end: 6, isFinal: true },
    { type: "voice" as const, start: 0, end: 6, isFinal: true },
    { type: "type" as const, start: 0, end: 6, isFinal: true },

    { type: "review" as const, start: 6, end: 12, isFinal: true },
    { type: "match" as const, start: 6, end: 12, isFinal: true },
    { type: "voice" as const, start: 6, end: 12, isFinal: true },
    { type: "type" as const, start: 6, end: 12, isFinal: true },

    { type: "review" as const, start: 12, end: 19, isFinal: true },
    { type: "match" as const, start: 12, end: 19, isFinal: true },
    { type: "voice" as const, start: 12, end: 19, isFinal: true },
    { type: "type" as const, start: 12, end: 19, isFinal: true },

    { type: "review" as const, start: 19, end: 26, isFinal: true },
    { type: "match" as const, start: 19, end: 26, isFinal: true },
    { type: "voice" as const, start: 19, end: 26, isFinal: true },
    { type: "type" as const, start: 19, end: 26, isFinal: true },
  ], []);

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  const baseActiveLetters = useMemo(() => {
    const source = step.isFinal ? finalAlphabet : ALPHABET;
    return source.slice(step.start, step.end);
  }, [ALPHABET, finalAlphabet, step]);

  const playNameTTS = (letter: string) => {
    const name = LETTER_TTS[letter] || letter;
    playTTSUtil(name);
  };

  // Global states
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  // Match Phase States
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (step.type === "match") {
      setupMatchPhase();
    }
  }, [baseActiveLetters, step.type]);

  const setupMatchPhase = () => {
    const targets = [...baseActiveLetters].sort(() => Math.random() - 0.5);
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
  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [typeInputs, setTypeInputs] = useState<Record<string, string>>({});
  const [typeStatus, setTypeStatus] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    if (step.type === "type") {
      setupTypePhase();
    }
  }, [baseActiveLetters, step.type]);

  const setupTypePhase = () => {
    setTypeOrder([...baseActiveLetters].sort(() => Math.random() - 0.5));
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
      setCurrentStep(prev => prev + 1);
    } else {
      playSound("complete", 0.5);
      setShowConfetti(true);
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
    navigate("/levels");
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
    if (matchedPairs.has(letter) || wrongMatchPair) return;
    playNameTTS(letter);
    setSelectedSpeakerMatch(letter);
    if (selectedLetterMatch) checkMatch(letter, selectedLetterMatch);
  };

  const handleLetterMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongMatchPair) return;

    // User requested letter buttons to also have audio
    playNameTTS(letter);

    setSelectedLetterMatch(letter);
    if (selectedSpeakerMatch) checkMatch(selectedSpeakerMatch, letter);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] overflow-x-hidden flex flex-col">
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full"><X className="w-5 h-5" /> Exit</Button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              {step.type === 'review' ? 'Letter Names - Review Phase' :
                step.type === 'match' ? 'Letter Names - Listen & Match' :
                  step.type === 'voice' ? 'Letter Names - Say the Name!' :
                    'Letter Names - Listen & Type'}
            </h2>
          </div>
          <span className="text-sm font-bold" style={{ color: accent.primary }}>Step {currentStep + 1}/{STEPS.length}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        <AnimatePresence mode="wait">
          {!showConfetti && step.type === "review" && (
            <motion.div key={`review-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center">
              <div className="text-center mb-8">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">Tap the letters to hear their sounds</p>
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-sm mx-auto mt-6">
                  <Button
                    onClick={handleShuffleReview}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button
                    onClick={handleStepNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#3c8c01] hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    Proceed <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Grid of all letters in the set */}
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8 mb-12 w-full max-w-3xl mx-auto">
                {reviewOrder.map((l: string) => {
                  const isVowel = VOWELS.has(l);
                  const bgStart = isVowel ? "#FF6B8A" : "#1CB0F6";
                  const bgEnd = isVowel ? "#FF4B8A" : "#0a8ed4";
                  const borderColor = isVowel ? "#C82A52" : "#086CA5";

                  return (
                    <motion.div key={l} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center w-[100px] sm:w-[130px]">
                      <div
                        onClick={() => handleLetterClick(l)}
                        className="w-full aspect-square rounded-[1.5rem] shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border-b-[6px] hover:shadow-xl select-none"
                        style={{ background: `linear-gradient(135deg, ${bgStart}, ${bgEnd})`, borderColor: borderColor }}
                      >
                        <div className="flex items-baseline justify-center">
                          <span className="text-white text-5xl sm:text-6xl font-black drop-shadow-sm">{l}</span>
                          <span className="text-white/90 text-3xl sm:text-4xl font-bold drop-shadow-sm ml-1">{l.toLowerCase()}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {!showConfetti && step.type === "match" && (
            <motion.div key={`match-${currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center w-full">
              <div className="text-center mb-6">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">Tap a speaker, then tap the matching letter!</p>
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
                  <Button
                    onClick={() => {
                      setMatchColumns(prev => ({
                        left: [...prev.left].sort(() => Math.random() - 0.5),
                        right: [...prev.right].sort(() => Math.random() - 0.5)
                      }));
                    }}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button
                    onClick={setupMatchPhase}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#e11d48] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                  <Button
                    onClick={handleStepNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#c99c00] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <FastForward className="w-4 h-4 mr-1" /> Skip
                  </Button>

                  <Button
                    onClick={handleStepNext}
                    disabled={matchedPairs.size !== matchColumns.left.length || matchColumns.left.length === 0}
                    className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-4 ${matchedPairs.size === matchColumns.left.length ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
                {/* Left Column: TTS Speakers */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.left.map((letter) => {
                    const isMatched = matchedPairs.has(letter);
                    const isSelected = selectedSpeakerMatch === letter;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[0] === letter);

                    return (
                      <MatchButton
                        key={`speaker-${letter}`}
                        gradientStart={accent.primary}
                        gradientEnd={accent.dark}
                        isMatched={isMatched}
                        isSelected={isSelected}
                        isWrong={isWrong}
                        onClick={() => handleSpeakerMatchClick(letter)}
                        disabled={!!wrongMatchPair}
                      >
                        <Volume2 className={`w-8 h-8 ${isMatched ? "opacity-50" : ""}`} />
                      </MatchButton>
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
              className="w-full max-w-2xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-6">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">Tap the microphone and say the name of the letter loud and clear.</p>
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
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
                    onClick={setupVoicePhase}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#e11d48] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                  <Button
                    onClick={handleStepNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#c99c00] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <FastForward className="w-4 h-4 mr-1" /> Skip
                  </Button>

                  <Button
                    onClick={handleStepNext}
                    disabled={completedVoiceLetters.size < shuffledVoiceLetters.length}
                    className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-4 ${completedVoiceLetters.size === shuffledVoiceLetters.length ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="w-full text-center mb-8">
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playNameTTS(l)}
                            className="rounded-full w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex-shrink-0"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <span className="text-3xl font-bold min-w-[60px] text-left tracking-widest flex items-baseline gap-1" style={{ color: isDone || vFeedback === "correct" ? '#58CC02' : accent.primary }}>
                            {l}
                            <span className="text-[0.8em] opacity-85">{l.toLowerCase()}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {isEval && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0 flex-wrap">
                              {micReady ? (
                                <span className="text-pink-500 text-sm font-bold animate-pulse">Listening...</span>
                              ) : (
                                <span className="text-amber-500 text-sm font-bold animate-pulse">Get ready...</span>
                              )}
                              {micReady && <AudioVisualizer isListening={!!evaluatingLetter} isMobile={isMobile} />}
                              {vTranscript && (
                                <span className="p-1 bg-gray-200 rounded text-[10px] font-mono text-gray-700 ml-1 truncate max-w-[120px]">
                                  [Heard: {vTranscript}]
                                </span>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => {
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
                              }`}
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {!showConfetti && step.type === "type" && (
            <motion.div key={`type-${currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center w-full">
              <div className="text-center mb-8">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">Tap the speaker, then type the letter!</p>
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
                  <Button
                    onClick={handleShuffleType}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button
                    onClick={setupTypePhase}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#e11d48] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                  <Button
                    onClick={handleStepNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#c99c00] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <FastForward className="w-4 h-4 mr-1" /> Skip
                  </Button>

                  <Button
                    onClick={handleStepNext}
                    disabled={!isTypePhaseComplete}
                    className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-4 ${isTypePhaseComplete ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
                {/* Left Column: TTS Speakers */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {typeOrder.map((letter) => {
                    const isCorrect = typeStatus[letter] === true;
                    return (
                      <MatchButton
                        key={`speaker-${letter}`}
                        gradientStart={accent.primary}
                        gradientEnd={accent.dark}
                        isMatched={isCorrect} // grays it out if correct
                        isSelected={false}
                        isWrong={false}
                        onClick={() => playTypeSound(letter)}
                      >
                        <Volume2 className={`w-8 h-8 ${isCorrect ? "opacity-50" : ""}`} />
                      </MatchButton>
                    );
                  })}
                </div>

                {/* Right Column: Inputs */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {typeOrder.map((letter) => {
                    const status = typeStatus[letter];
                    const val = typeInputs[letter] || "";

                    return (
                      <motion.div
                        key={`input-${letter}`}
                        animate={{ x: status === false ? [-5, 5, -5, 5, 0] : 0 }}
                        className="w-full h-14 sm:h-16 flex"
                      >
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleTypeChange(letter, e.target.value)}
                          disabled={status === true}
                          className={`w-full h-full text-center text-2xl sm:text-3xl font-black rounded-lg sm:rounded-2xl border-2 sm:border-b-[4px] outline-none transition-all shadow-sm
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
