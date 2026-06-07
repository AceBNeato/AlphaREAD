import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Home, Volume2, ArrowLeft, ArrowRight, Sparkles, CheckCircle2, XCircle, Mic, MicOff, AlertCircle, Shuffle, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { shuffle, allLetters, LETTER_NAMES, LETTER_TTS } from "../data/levels";

import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
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

  // Match states (Duolingo style)
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);



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

  const matchProgress = matchColumns.left.length > 0 ? (matchedPairs.size / matchColumns.left.length) * 100 : 0;

  // Generate Match columns when step changes
  useEffect(() => {
    if (step.type === "match") {
      const targets = shuffle([...step.letters]).slice(0, step.count || step.letters.length);
      setMatchColumns({
        left: shuffle([...targets]),
        right: shuffle([...targets])
      });
      setMatchedPairs(new Set());
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
      setWrongMatchPair(null);
    }
  }, [currentStep, step]);

  // Match controls
  const handleMatchShuffle = () => {
    clearEvalTimeout();
    setMatchColumns(prev => ({
      left: shuffle([...prev.left]),
      right: shuffle([...prev.right])
    }));
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongMatchPair(null);
  };

  const handleMatchReset = () => {
    clearEvalTimeout();
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongMatchPair(null);
  };

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
      const letter = word; // capture before clearing
      setEvaluatingLetter(null); // 🛑 IMMEDIATELY stop mic from restarting
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
        const letter = evaluatingLetter; // capture before clearing
        setEvaluatingLetter(null); // 🛑 IMMEDIATELY clear so hook doesn't restart
        setVoiceFeedbackMap(prev => ({ ...prev, [letter]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setVoiceFeedbackMap(prev => ({ ...prev, [letter]: null }));
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

  const handleSpeakerMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongMatchPair) return;
    playNameTTS(letter);
    setSelectedSpeakerMatch(letter);

    if (selectedLetterMatch) {
      checkMatch(letter, selectedLetterMatch);
    }
  };

  const handleLetterMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongMatchPair) return;
    setSelectedLetterMatch(letter);

    if (selectedSpeakerMatch) {
      checkMatch(selectedSpeakerMatch, letter);
    }
  };

  const checkMatch = (speaker: string, letter: string) => {
    if (speaker === letter) {
      // Correct Match
      setTimeout(() => {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav");
        audio.volume = 0.3;
        audio.play().catch(() => { });
      }, 200);

      setMatchedPairs(prev => new Set(prev).add(speaker));
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);

      // Next step if all matched
      if (matchedPairs.size + 1 === matchColumns.left.length) {
        clearEvalTimeout();
        evaluationTimeoutRef.current = setTimeout(() => {
          handleStepNext();
        }, 1500);
      }
    } else {
      // Wrong Match
      setWrongMatchPair([speaker, letter]);
      clearEvalTimeout();
      evaluationTimeoutRef.current = setTimeout(() => {
        setWrongMatchPair(null);
        setSelectedSpeakerMatch(null);
        setSelectedLetterMatch(null);
      }, 1000);
    }
  };

  const handleStepNext = () => {
    clearEvalTimeout();
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      setCurrentPairIndex(0);
      setMatchedPairs(new Set());
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
      setWrongMatchPair(null);
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
                  animate={{ width: `${matchProgress}%` }}
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
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Tap a speaker to hear a letter name, then choose the matching letter.
                </p>

                {/* Match Controls */}
                <div className="flex justify-center gap-3 w-full">
                  <Button variant="outline" size="sm" onClick={handleMatchShuffle} className="rounded-full flex items-center gap-2 border-amber-300">
                    <Shuffle className="w-4 h-4 text-amber-600" /> Shuffle
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleMatchReset} className="rounded-full flex items-center gap-2 border-amber-300">
                    <RotateCcw className="w-4 h-4 text-amber-600" /> Reset
                  </Button>
                  <Button size="sm" onClick={handleStepNext} disabled={matchedPairs.size < matchColumns.left.length} className="rounded-full flex items-center gap-2 text-white shadow-md active:scale-95 transition-all" style={{ background: matchedPairs.size >= matchColumns.left.length ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "gray" }}>
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleStepNext} className="rounded-full flex items-center gap-2 border-amber-300">
                    Skip <SkipForward className="w-4 h-4 text-amber-600" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-6 max-w-2xl mx-auto mb-10 px-4">
                {/* Left Column: TTS Speakers */}
                <div className="flex flex-col gap-4 flex-1">
                  {matchColumns.left.map((letter) => {
                    const isMatched = matchedPairs.has(letter);
                    const isSelected = selectedSpeakerMatch === letter;
                    const isWrong = wrongMatchPair && wrongMatchPair[0] === letter;

                    return (
                      <motion.button
                        key={`speaker-${letter}`}
                        whileHover={{ scale: isMatched ? 1 : 1.02 }}
                        whileTap={{ scale: isMatched ? 1 : 0.98 }}
                        onClick={() => handleSpeakerMatchClick(letter)}
                        disabled={isMatched || !!wrongMatchPair}
                        className={`p-4 rounded-[1.5rem] flex items-center justify-center transition-all border-b-4 border-2 shadow-sm ${isMatched
                          ? "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-400 dark:text-gray-500 translate-y-[2px] opacity-50 cursor-default"
                          : isWrong
                            ? "bg-red-50 border-red-500 text-red-500 animate-shake"
                            : isSelected
                              ? "bg-blue-50 border-blue-500 text-blue-600 shadow-md translate-y-[2px]"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:shadow-md cursor-pointer"
                          }`}
                      >
                        <Volume2 className="w-8 h-8" />
                      </motion.button>
                    );
                  })}
                </div>

                {/* Right Column: Letters */}
                <div className="flex flex-col gap-4 flex-1">
                  {matchColumns.right.map((letter) => {
                    const isMatched = matchedPairs.has(letter);
                    const isSelected = selectedLetterMatch === letter;
                    const isWrong = wrongMatchPair && wrongMatchPair[1] === letter;

                    return (
                      <motion.button
                        key={`letter-${letter}`}
                        whileHover={{ scale: isMatched ? 1 : 1.02 }}
                        whileTap={{ scale: isMatched ? 1 : 0.98 }}
                        onClick={() => handleLetterMatchClick(letter)}
                        disabled={isMatched || !!wrongMatchPair}
                        className={`p-4 rounded-[1.5rem] flex items-center justify-center transition-all border-b-4 border-2 shadow-sm font-black text-2xl uppercase ${isMatched
                          ? "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-400 dark:text-gray-500 translate-y-[2px] opacity-50 cursor-default"
                          : isWrong
                            ? "bg-red-50 border-red-500 text-red-500 animate-shake"
                            : isSelected
                              ? "bg-blue-50 border-blue-500 text-blue-600 shadow-md translate-y-[2px]"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-100 hover:border-gray-300 hover:shadow-md cursor-pointer"
                          }`}
                      >
                        {letter}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="text-center min-h-[40px]">
                {wrongMatchPair && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 font-bold text-lg"
                  >
                    Not quite, try again!
                  </motion.p>
                )}
                {matchedPairs.size > 0 && matchedPairs.size === matchColumns.left.length && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[#58CC02] font-bold text-lg"
                  >
                    ✨ All matched!
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
                          {isEval && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0 flex-wrap">
                              <span className="text-pink-500 text-sm font-bold animate-pulse">Listening...</span>
                              <AudioVisualizer isListening={!!evaluatingLetter} isMobile={isMobile} />
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
