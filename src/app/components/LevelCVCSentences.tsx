import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Home, Mic, MicOff, CheckCircle2, Sparkles, ArrowRight, AlertCircle, Shuffle, RotateCcw, Volume2, SkipForward } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { CVC_SENTENCES } from "../data/levels";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

import { AudioVisualizer } from "./AudioVisualizer";
interface LevelCVCSentencesProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelCVCSentences({ levelId, accent }: LevelCVCSentencesProps) {
  const navigate = useNavigate();

  const [currentSetIndex, setCurrentSetIndex] = useState(0); // 0, 1, 2
  const [currentIndex, setCurrentIndex] = useState(0); // 0 to 9

  const [activeSentences, setActiveSentences] = useState<string[]>([]);

  useEffect(() => {
    setActiveSentences(CVC_SENTENCES.slice(currentSetIndex * 10, currentSetIndex * 10 + 10));
    setCurrentIndex(0);
  }, [currentSetIndex]);

  const [evaluatingSentence, setEvaluatingSentence] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState<"correct" | "wrong" | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");

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

  const playTTS = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < activeSentences.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setEvalFeedback(null);
      setVoiceTranscript("");
    } else {
      setShowConfetti(true);
    }
  }, [currentIndex, activeSentences]);

  const handleResult = useCallback(
    (target: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
      setVoiceTranscript(transcript);

      const tLower = transcript.toLowerCase().replace(/[.,!?]/g, "");
      const targetLower = target.toLowerCase().replace(/[.,!?]/g, "");
      const wordsInTarget = targetLower.split(" ");
      let matchCount = 0;
      wordsInTarget.forEach(w => {
        if (tLower.includes(w)) matchCount++;
      });

      const isCorrect = status === "correct" || status === "close" || tLower.includes(targetLower) || (matchCount / wordsInTarget.length >= 0.7);

      clearEvalTimeout();

      if (isCorrect) {
        setEvalFeedback("correct");
        evaluationTimeoutRef.current = setTimeout(() => {
          setEvaluatingSentence(null);
          handleNext();
        }, 1500);
      } else {
        setEvalFeedback("wrong");
        evaluationTimeoutRef.current = setTimeout(() => {
          setEvalFeedback(null);
          setEvaluatingSentence(null);
        }, 2000);
      }
    },
    [handleNext]
  );

  useSpeechRecognition({
    evaluatingWord: evaluatingSentence,
    enabled: !!evaluatingSentence,
    onResult: handleResult,
    onError: () => setEvaluatingSentence(null),
    onSilenceTimeout: () => {
      clearEvalTimeout();
      setEvalFeedback("wrong");
      evaluationTimeoutRef.current = setTimeout(() => {
        setEvalFeedback(null);
        setEvaluatingSentence(null);
      }, 1500);
    }
  });

  const handleShuffle = () => {
    clearEvalTimeout();
    setActiveSentences(prev => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setEvalFeedback(null);
    setVoiceTranscript("");
  };

  const handleReset = () => {
    clearEvalTimeout();
    setActiveSentences(CVC_SENTENCES.slice(currentSetIndex * 10, currentSetIndex * 10 + 10));
    setCurrentIndex(0);
    setEvalFeedback(null);
    setVoiceTranscript("");
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
          await supabase.from("progress").insert({
            student_id: profile.id,
            level_id: levelId,
            score: CVC_SENTENCES.length,
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

  const isFinalSet = currentSetIndex === 2; // 3 sets total (0,1,2)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:bg-none dark:bg-[#0d141c] pb-12 flex flex-col">
      <Confetti active={showConfetti} />

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full">
            <Home className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            CVC Sentences (Set {currentSetIndex + 1}/3)
          </h2>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase">
            {currentIndex + 1}/{activeSentences.length}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex-1 flex flex-col justify-center w-full">
        <AnimatePresence mode="wait">
          {!showConfetti && activeSentences.length > 0 ? (
            <motion.div
              key={`phase-quiz-${currentSetIndex}-${currentIndex}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-6">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Sentence Quiz! 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Tap the microphone and read the sentence out loud.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3 w-full mb-6">
                <Button variant="outline" size="sm" onClick={handleShuffle} className="rounded-full flex items-center gap-2 border-gray-300">
                  <Shuffle className="w-4 h-4 text-gray-600" /> Shuffle
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset} className="rounded-full flex items-center gap-2 border-gray-300">
                  <RotateCcw className="w-4 h-4 text-gray-600" /> Reset
                </Button>
                <Button variant="outline" size="sm" onClick={() => { clearEvalTimeout(); handleNext(); }} className="rounded-full flex items-center gap-2 border-gray-300">
                  Skip <SkipForward className="w-4 h-4 text-gray-600" />
                </Button>
              </div>

              <motion.div
                className="w-full min-h-[160px] rounded-[2rem] bg-white dark:bg-gray-800 shadow-xl border-4 flex flex-col items-center justify-center p-8 mb-10 select-none text-center relative"
                style={{ borderColor: evalFeedback === 'correct' ? '#58CC02' : evalFeedback === 'wrong' ? '#EF4444' : accent.primary }}
              >
                <span className="text-3xl sm:text-4xl font-black text-gray-800 dark:text-gray-100 leading-tight mb-4">
                  "{activeSentences[currentIndex]}"
                </span>
                <Button
                  onClick={() => playTTS(activeSentences[currentIndex])}
                  variant="ghost"
                  className="rounded-full w-12 h-12 shadow-sm bg-gray-50 hover:bg-gray-100 absolute bottom-3 right-3"
                >
                  <Volume2 className="w-6 h-6 text-gray-500" />
                </Button>
              </motion.div>

              <button
                onClick={() => setEvaluatingSentence(activeSentences[currentIndex])}
                disabled={evaluatingSentence !== null || evalFeedback === "correct"}
                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all relative z-10 ${evaluatingSentence ? "bg-red-500 animate-pulse" : evalFeedback === "correct" ? "bg-green-500" : "bg-teal-500 hover:bg-teal-600 hover:scale-105 active:scale-95 cursor-pointer"
                  }`}
                style={{
                  background: !evaluatingSentence && evalFeedback !== "correct" ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : undefined,
                }}
              >
                {evaluatingSentence ? <Mic className="w-14 h-14 mb-1" /> : evalFeedback === "correct" ? <CheckCircle2 className="w-14 h-14" /> : <MicOff className="w-14 h-14 mb-1" />}
                <span className="text-[12px] uppercase font-bold tracking-widest">{evaluatingSentence ? "Listening" : "Speak"}</span>
              </button>

              <div className="text-center min-h-[40px] mt-6 w-full">
                {evaluatingSentence && (
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-rose-500 font-bold text-sm uppercase">Listening...</p>
                    <AudioVisualizer isListening={!!evaluatingSentence} isMobile={isMobile} />
                  </div>
                )}
                {voiceTranscript && evaluatingSentence && <p className="text-gray-500 italic mt-2 text-sm">"{voiceTranscript}"</p>}
                {evalFeedback === "correct" && <p className="text-[#58CC02] font-bold text-lg">✨ Great reading!</p>}
                {evalFeedback === "wrong" && <p className="text-red-500 font-bold text-lg flex items-center gap-2 justify-center"><AlertCircle className="w-5 h-5" /> Let's try again!</p>}
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
                {isFinalSet ? "Lesson Mastered!" : "Set Complete!"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                {isFinalSet
                  ? "You successfully read all 30 sentences out loud! Awesome job!"
                  : "You successfully read 10 sentences! Ready for the next set?"}
              </p>

              {isFinalSet ? (
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
              ) : (
                <Button
                  onClick={() => {
                    setCurrentSetIndex(prev => prev + 1);
                    setShowConfetti(false);
                  }}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{
                    background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
                  }}
                >
                  Start Next 10 <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
