import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Home, Volume2, ArrowLeft, ArrowRight, Sparkles, CheckCircle2, XCircle, Mic, MicOff, AlertCircle, Shuffle, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { shuffle, allLetters, LETTER_NAMES, LETTER_TTS } from "../data/levels";

import { useMoonshineRecognition, useModelLoadState } from "../hooks/useMoonshineRecognition";
import { toast } from "sonner";
import { AudioVisualizer } from "./AudioVisualizer";

interface LevelLetterNamesProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

interface Question {
  targetLetter: string;
  options: string[];
}

const STEPS = [
  { id: 1, type: "review" as const, letters: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"], title: "Review A-L" },
  { id: 2, type: "match" as const, letters: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"], title: "Match A-L", count: 6 },
  { id: 3, type: "voice" as const, letters: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"], title: "Speak A-L", count: 6 },
  { id: 4, type: "review" as const, letters: ["M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"], title: "Review M-Z" },
  { id: 5, type: "match" as const, letters: ["M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"], title: "Match M-Z", count: 7 },
  { id: 6, type: "voice" as const, letters: ["M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"], title: "Speak M-Z", count: 7 },
  { id: 7, type: "match" as const, letters: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"], title: "Final Match", count: 10 },
  { id: 8, type: "voice" as const, letters: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"], title: "Final Speak", count: 10 },
];

export function LevelLetterNames({ levelId, accent }: LevelLetterNamesProps) {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  // Review states
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [clickedLetter, setClickedLetter] = useState<string | null>(null);

  // Match/Voice states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const modelState = useModelLoadState();

  useEffect(() => {
    if (modelState.status === "ready") {
      toast("Moonshine AI Online", { icon: "🚀", duration: 3000, id: "moonshine-ready" });
    }
  }, [modelState.status]);

  // Voice Evaluation specific states
  const [evaluatingLetter, setEvaluatingLetter] = useState<string | null>(null);
  const [completedVoiceLetters, setCompletedVoiceLetters] = useState<Set<string>>(new Set());
  const [voiceFeedbackMap, setVoiceFeedbackMap] = useState<Record<string, "correct" | "wrong" | "close" | null>>({});
  const [voiceTranscriptsMap, setVoiceTranscriptsMap] = useState<Record<string, string>>({});
  const [shuffledVoiceLetters, setShuffledVoiceLetters] = useState<string[]>([]);

  // Global states
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);

  // TTS utility
  const playNameTTS = (letter: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const name = LETTER_TTS[letter] || letter;
      const utterance = new SpeechSynthesisUtterance(name);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const currentSetPairs = useMemo(() => {
    if (step.type !== "review") return [];
    const p: [string, string][] = [];
    for (let i = 0; i < step.letters.length; i += 2) {
      if (i + 1 < step.letters.length) {
        p.push([step.letters[i], step.letters[i + 1]]);
      } else {
        p.push([step.letters[i], ""]);
      }
    }
    return p;
  }, [step]);

  const currentPair = currentSetPairs[currentPairIndex] || [];

  const stepQuestions = useMemo<Question[]>(() => {
    if (step.type === "review") return [];
    const shuffledTargets = shuffle([...step.letters]).slice(0, step.count);

    if (step.type === "voice") {
      return shuffledTargets.map(target => ({ targetLetter: target, options: [] }));
    }

    return shuffledTargets.map((target) => {
      const distractors = allLetters
        .map((l) => l.letter)
        .filter((l) => l !== target);
      const shuffledDistractors = shuffle(distractors).slice(0, 2);
      const options = shuffle([target, ...shuffledDistractors]);
      return { targetLetter: target, options };
    });
  }, [currentStep, step.letters, step.count, step.type]);

  const currentQuestion = stepQuestions[currentIndex];
  const progress = stepQuestions.length > 0 ? (currentIndex / stepQuestions.length) * 100 : 0;

  // Update shuffled letters when step changes
  useEffect(() => {
    if (step.type === "voice") {
      setShuffledVoiceLetters([...step.letters]);
      setCompletedVoiceLetters(new Set());
      setVoiceFeedbackMap({});
      setVoiceTranscriptsMap({});
    }
  }, [currentStep, step.type, step.letters]);

  // Voice Evaluation Hook
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
      setVoiceFeedbackMap(prev => ({ ...prev, [word]: "wrong" }));
      evaluationTimeoutRef.current = setTimeout(() => {
        setVoiceFeedbackMap(prev => ({ ...prev, [word]: null }));
        setEvaluatingLetter(null);
      }, 2000);
    }
  }, [clearEvalTimeout]);

  useMoonshineRecognition({
    evaluatingWord: evaluatingLetter,
    enabled: !!evaluatingLetter,
    onResult: handleVoiceResult,
    onError: () => setEvaluatingLetter(null),
    onSilenceTimeout: () => {
      clearEvalTimeout();
      if (evaluatingLetter) {
        setVoiceFeedbackMap(prev => ({ ...prev, [evaluatingLetter]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setVoiceFeedbackMap(prev => ({ ...prev, [evaluatingLetter]: null }));
          setEvaluatingLetter(null);
        }, 1500);
      }
    }
  });

  const handleVoiceShuffle = () => {
    clearEvalTimeout();
    setShuffledVoiceLetters(shuffle([...step.letters]));
    setCompletedVoiceLetters(new Set());
    setVoiceFeedbackMap({});
    setVoiceTranscriptsMap({});
  };

  const handleVoiceReset = () => {
    clearEvalTimeout();
    setCompletedVoiceLetters(new Set());
    setVoiceFeedbackMap({});
    setVoiceTranscriptsMap({});
  };

  const handleVoiceNext = () => {
    clearEvalTimeout();
    setCompletedVoiceLetters(new Set());
    setVoiceFeedbackMap({});
    setVoiceTranscriptsMap({});
    handleStepNext();
  };
  const handleLetterClick = (letter: string) => {
    if (!letter) return;
    setClickedLetter(letter);
    playNameTTS(letter);
    setTimeout(() => setClickedLetter(null), 1000);
  };

  const handleOptionClick = (letter: string) => {
    if (!currentQuestion || feedback === "correct" || wrongAnswers.has(letter)) return;

    playNameTTS(letter);

    if (letter === currentQuestion.targetLetter) {
      setFeedback("correct");
      setSelectedAnswer(letter);

      setTimeout(() => {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav");
        audio.volume = 0.3;
        audio.play().catch(() => { });
      }, 400);

      clearEvalTimeout();
      evaluationTimeoutRef.current = setTimeout(() => {
        if (currentIndex < stepQuestions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setFeedback(null);
          setSelectedAnswer(null);
          setWrongAnswers(new Set());
        } else {
          handleStepNext();
        }
      }, 1600);
    } else {
      setFeedback("wrong");
      setWrongAnswers((prev) => {
        const next = new Set(prev);
        next.add(letter);
        return next;
      });
      evaluationTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
      }, 800);
    }
  };

  const handleStepNext = () => {
    clearEvalTimeout();
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      setCurrentPairIndex(0);
      setCurrentIndex(0);
      setFeedback(null);
      setSelectedAnswer(null);
      setWrongAnswers(new Set());
      setEvaluatingLetter(null);
    } else {
      setShowConfetti(true);
    }
  };

  const handleGoBack = () => {
    const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const profileStr = localStorage.getItem("userProfile");
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.id) {
          const totalQuestions = STEPS.reduce((sum, s) => sum + (s.count || 0), 0);
          await supabase.from("progress").insert({
            student_id: profile.id,
            level_id: levelId,
            score: totalQuestions || 23,
          });
        }
      }
    } catch (err) {
      console.error("Error saving progress:", err);
    }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:bg-none dark:bg-[#0d141c] pb-12 flex flex-col">
      <Confetti active={showConfetti} />

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full">
            <Home className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            Lesson 4: Letter Names
          </h2>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase">
            {step.title} ({currentStep + 1}/{STEPS.length})
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex-1 flex flex-col justify-center w-full">
        <AnimatePresence mode="wait">
          {!showConfetti && step.type === "review" && (
            <motion.div
              key={`review-${currentStep}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center w-full max-w-md mx-auto"
            >
              <div className="mb-6">
                <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Meet the Letter Names!
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Letters have names! Tap each letter below to hear how it's named.
                </p>
              </div>

              <div className="flex justify-center gap-6 mb-8">
                {currentPair.map((l) => l ? (
                  <motion.div
                    key={l}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => handleLetterClick(l)}
                    className="flex-1 bg-white dark:bg-gray-800 rounded-[2.5rem] border-3 shadow-xl p-6 cursor-pointer hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all select-none"
                    style={{ borderColor: clickedLetter === l ? '#FF9600' : accent.primary }}
                  >
                    <div className="text-8xl font-black tracking-tight mb-4" style={{ color: clickedLetter === l ? '#FF9600' : accent.primary }}>
                      {l}
                      <span className="text-3xl align-bottom font-medium opacity-60 ml-2">
                        {l.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-sm font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 py-2 px-4 rounded-xl w-fit mx-auto shadow-sm">
                      <Volume2 className="w-4 h-4" />
                      <span>Name: "{LETTER_NAMES[l]}"</span>
                    </div>
                  </motion.div>
                ) : null)}
              </div>

              <div className="flex justify-between items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={currentPairIndex === 0}
                  onClick={() => setCurrentPairIndex(prev => Math.max(prev - 1, 0))}
                  className="rounded-2xl flex-1 py-6 border-2 font-bold"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>

                {currentPairIndex < currentSetPairs.length - 1 ? (
                  <Button
                    size="lg"
                    onClick={() => setCurrentPairIndex(prev => Math.min(prev + 1, currentSetPairs.length - 1))}
                    className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                  >
                    Next Letters <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleStepNext}
                    className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg"
                    style={{ background: "linear-gradient(135deg, #58CC02, #46a302)" }}
                  >
                    Next Challenge! <Sparkles className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {!showConfetti && step.type === "match" && (
            <motion.div
              key={`match-${currentStep}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full"
            >
              <div className="w-full h-3 bg-gray-200/80 dark:bg-gray-800 rounded-full overflow-hidden mb-8 shadow-inner border border-gray-100 dark:border-gray-700/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${accent.primary}, ${accent.dark})`,
                  }}
                />
              </div>

              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Listen and Match!
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Tap the speaker to hear a letter name, then choose the correct letter.
                </p>
              </div>

              <div className="flex justify-center mb-10">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => currentQuestion && playNameTTS(currentQuestion.targetLetter)}
                  className="w-32 h-32 rounded-[2rem] flex flex-col items-center justify-center text-white shadow-lg border-b-6 active:translate-y-1 active:border-b-2 cursor-pointer transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                    borderColor: accent.dark,
                  }}
                >
                  <Volume2 className="w-14 h-14" />
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-80">
                    Hear Name
                  </span>
                </motion.button>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
                {currentQuestion?.options.map((letter) => {
                  const isCorrect = selectedAnswer === letter;
                  const isWrong = wrongAnswers.has(letter);

                  return (
                    <motion.button
                      key={letter}
                      whileHover={{ scale: isWrong || isCorrect ? 1 : 1.03 }}
                      whileTap={{ scale: isWrong || isCorrect ? 1 : 0.97 }}
                      onClick={() => handleOptionClick(letter)}
                      disabled={isCorrect || isWrong || feedback === "correct"}
                      className={`aspect-square rounded-3xl flex flex-col items-center justify-center transition-all shadow-md relative border-b-6 select-none font-black text-4xl sm:text-5xl uppercase cursor-pointer ${isCorrect
                        ? "bg-green-500 border-green-600 text-white border-b-2 translate-y-[4px] pointer-events-none"
                        : isWrong
                          ? "bg-red-500 border-red-600 text-white border-b-2 translate-y-[4px] pointer-events-none opacity-40 animate-shake"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 hover:shadow-lg border-gray-200 dark:border-gray-700"
                        }`}
                    >
                      {letter}
                      <span className="text-sm font-medium opacity-60 normal-case">
                        {letter.toLowerCase()}
                      </span>

                      {isCorrect && (
                        <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-white bg-green-600 rounded-full" />
                      )}
                      {isWrong && (
                        <XCircle className="absolute top-2 right-2 w-5 h-5 text-white bg-red-600 rounded-full" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="text-center min-h-[40px]">
                {feedback === "correct" && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[#58CC02] font-bold text-lg"
                  >
                    ✨ Spot on! That's the letter "{currentQuestion.targetLetter}"!
                  </motion.p>
                )}
                {feedback === "wrong" && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 font-bold text-lg"
                  >
                    Not quite, listen again!
                  </motion.p>
                )}
              </div>
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
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Say the Name! 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Tap the microphone and say the name of the letter loud and clear.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3 w-full mb-6">
                <Button variant="outline" size="sm" onClick={handleVoiceShuffle} className="rounded-full flex items-center gap-2 border-gray-300">
                  <Shuffle className="w-4 h-4 text-gray-600" /> Shuffle
                </Button>
                <Button variant="outline" size="sm" onClick={handleVoiceReset} className="rounded-full flex items-center gap-2 border-gray-300">
                  <RotateCcw className="w-4 h-4 text-gray-600" /> Reset
                </Button>
                <Button size="sm" onClick={handleVoiceNext} disabled={completedVoiceLetters.size < shuffledVoiceLetters.length} className="rounded-full flex items-center gap-2 text-white shadow-md active:scale-95 transition-all" style={{ background: completedVoiceLetters.size >= shuffledVoiceLetters.length ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "gray" }}>
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleVoiceNext} className="rounded-full flex items-center gap-2 border-gray-300">
                  Skip <SkipForward className="w-4 h-4 text-gray-600" />
                </Button>
              </div>

              <div className="w-full text-center mb-8">
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto">
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
                          <span className="text-3xl font-bold min-w-[60px] text-left tracking-widest uppercase flex items-center gap-1.5" style={{ color: isDone || vFeedback === "correct" ? '#58CC02' : accent.primary }}>
                            {l}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {isEval && vTranscript && (
                            <div className="p-1 bg-gray-200 rounded text-[10px] font-mono text-gray-700 mt-1 sm:mt-0 max-w-[150px] truncate">
                              Heard: {vTranscript}
                            </div>
                          )}
                          {isEval && !vTranscript && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0">
                              <span className="text-pink-500 text-sm font-bold animate-pulse">Listening...</span>
                              <AudioVisualizer isListening={!!evaluatingLetter} isMobile={isMobile} />
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (modelState.status !== "ready") {
                                toast("Moonshine AI is still loading...", { icon: "⏳", id: "moonshine-loading" });
                                return;
                              }
                              if (isEval) {
                                setEvaluatingLetter(null);
                              } else if (!isDone) {
                                setEvaluatingLetter(l);
                                setVoiceFeedbackMap(prev => ({ ...prev, [l]: null }));
                                setVoiceTranscriptsMap(prev => ({ ...prev, [l]: "" }));
                              }
                            }}
                            disabled={(evaluatingLetter !== null && !isEval) || isDone || modelState.status !== "ready"}
                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${isDone || vFeedback === "correct"
                              ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default'
                              : modelState.status !== "ready"
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
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

          {showConfetti && currentStep === STEPS.length - 1 && (
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
                Awesome Job!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                You know all 26 letter names! Now you are ready to learn about the <strong>Long Vowels</strong>, where vowels say their names!
              </p>
              <Button
                disabled={isSaving}
                onClick={handleFinish}
                size="lg"
                className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                style={{
                  background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
                }}
              >
                {isSaving ? "Saving..." : "Back to Levels"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
