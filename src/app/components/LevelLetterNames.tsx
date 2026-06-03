import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Home, Volume2, ArrowLeft, ArrowRight, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { shuffle, allLetters, LETTER_NAMES } from "../data/levels";

interface LevelLetterNamesProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

interface Question {
  targetLetter: string;
  options: string[];
}

export function LevelLetterNames({ levelId, accent }: LevelLetterNamesProps) {
  const navigate = useNavigate();

  // Pick 10 representative letters: Vowels + selected Consonants with distinct names
  const selectedLetters = useMemo(() => {
    const vowels = ["A", "E", "I", "O", "U"];
    const consonants = ["B", "C", "D", "G", "J", "K", "P", "T", "V", "Z"];
    const shuffledConsonants = shuffle(consonants).slice(0, 5);
    return shuffle([...vowels, ...shuffledConsonants]);
  }, []);

  const questions = useMemo<Question[]>(() => {
    return selectedLetters.map((target) => {
      // Find 2 distractors from all letters
      const distractors = allLetters
        .map((l) => l.letter)
        .filter((l) => l !== target);
      const shuffledDistractors = shuffle(distractors).slice(0, 2);
      const options = shuffle([target, ...shuffledDistractors]);
      return { targetLetter: target, options };
    });
  }, [selectedLetters]);

  const [phase, setPhase] = useState<"review" | "quiz">("review");
  
  // Review Mode states
  const [reviewIndex, setReviewIndex] = useState(0);
  const reviewVowels = ["A", "E", "I", "O", "U"];
  const currentReviewLetter = reviewVowels[reviewIndex];

  // Quiz Mode states
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = (currentIndex / questions.length) * 100;

  const playNameTTS = (letter: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      // Speak the letter name using its spelling word to force correct pronounciation
      const name = LETTER_NAMES[letter] || letter;
      const utterance = new SpeechSynthesisUtterance(name);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Play automatically on review card load or quiz question load
  useEffect(() => {
    if (phase === "review") {
      playNameTTS(currentReviewLetter);
    } else if (phase === "quiz" && currentQuestion) {
      // Delay slightly for smooth transitions
      const t = setTimeout(() => {
        playNameTTS(currentQuestion.targetLetter);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [phase, reviewIndex, currentIndex, currentQuestion, currentReviewLetter]);

  const handleOptionClick = (letter: string) => {
    if (feedback === "correct" || wrongAnswers.has(letter)) return;

    if (letter === currentQuestion.targetLetter) {
      setFeedback("correct");
      setSelectedAnswer(letter);
      
      // Play a quick success audio chime
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav");
      audio.volume = 0.3;
      audio.play().catch(() => {});

      setTimeout(() => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          setFeedback(null);
          setSelectedAnswer(null);
          setWrongAnswers(new Set());
        } else {
          setShowConfetti(true);
        }
      }, 1500);
    } else {
      setFeedback("wrong");
      setWrongAnswers((prev) => {
        const next = new Set(prev);
        next.add(letter);
        return next;
      });
      setTimeout(() => {
        setFeedback(null);
      }, 800);
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
          await supabase.from("progress").insert({
            student_id: profile.id,
            level_id: levelId,
            score: questions.length,
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

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full">
            <Home className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            Lesson 4: Letter Names
          </h2>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase">
            {phase === "review" ? "Review" : `Quiz ${currentIndex + 1}/${questions.length}`}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 flex-1 flex flex-col justify-center w-full">
        <AnimatePresence mode="wait">
          {/* Phase 1: Review Mode */}
          {phase === "review" && (
            <motion.div
              key="review-phase"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center w-full max-w-md mx-auto"
            >
              <div className="mb-6">
                <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Meet the Vowel Names!
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Let's learn that letters have names. Tap the letter below to hear its name!
                </p>
              </div>

              {/* Vowel Card */}
              <motion.div
                key={currentReviewLetter}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={() => playNameTTS(currentReviewLetter)}
                className="bg-white dark:bg-gray-800 rounded-[2.5rem] border-3 shadow-xl p-8 mb-8 cursor-pointer hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all select-none"
                style={{ borderColor: accent.primary }}
              >
                <div className="text-9xl font-black tracking-tight mb-4" style={{ color: accent.primary }}>
                  {currentReviewLetter}
                  <span className="text-4xl align-bottom font-medium opacity-60 ml-2">
                    {currentReviewLetter.toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xl font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 py-3 px-6 rounded-2xl w-fit mx-auto shadow-sm">
                  <Volume2 className="w-6 h-6 animate-pulse" />
                  <span>Name: "{LETTER_NAMES[currentReviewLetter]}"</span>
                </div>
              </motion.div>

              {/* Review Pagination Buttons */}
              <div className="flex justify-between items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={reviewIndex === 0}
                  onClick={() => setReviewIndex(prev => prev - 1)}
                  className="rounded-2xl flex-1 py-6 border-2 font-bold"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>

                {reviewIndex < reviewVowels.length - 1 ? (
                  <Button
                    size="lg"
                    onClick={() => setReviewIndex(prev => prev + 1)}
                    className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                  >
                    Next Vowel <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => setPhase("quiz")}
                    className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg"
                    style={{ background: "linear-gradient(135deg, #58CC02, #46a302)" }}
                  >
                    Start Matching! <Sparkles className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Phase 2: Quiz matching mode */}
          {phase === "quiz" && !showConfetti && (
            <motion.div
              key="quiz-phase"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full"
            >
              {/* Progress Bar */}
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
                  Click the speaker to hear the letter's name, then choose the correct letter.
                </p>
              </div>

              {/* Speaker Button */}
              <div className="flex justify-center mb-10">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => playNameTTS(currentQuestion.targetLetter)}
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

              {/* Options grid */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
                {currentQuestion.options.map((letter) => {
                  const isCorrect = selectedAnswer === letter;
                  const isWrong = wrongAnswers.has(letter);

                  return (
                    <motion.button
                      key={letter}
                      whileHover={{ scale: isWrong || isCorrect ? 1 : 1.03 }}
                      whileTap={{ scale: isWrong || isCorrect ? 1 : 0.97 }}
                      onClick={() => handleOptionClick(letter)}
                      disabled={isCorrect || isWrong || feedback === "correct"}
                      className={`aspect-square rounded-3xl flex flex-col items-center justify-center transition-all shadow-md relative border-b-6 select-none font-black text-4xl sm:text-5xl uppercase cursor-pointer ${
                        isCorrect
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

              {/* Feedback text */}
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

          {/* Celebration Screen */}
          {showConfetti && (
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
                You know the names of the letters! Now you are ready to learn about the <strong>Long Vowels</strong>, where vowels say their names!
              </p>
              <Button
                disabled={isSaving}
                onClick={handleFinish}
                size="lg"
                className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl"
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
