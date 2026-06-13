import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { Home, Sparkles, CheckCircle2, AlertCircle, Volume2, ChevronRight, Shuffle, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { playSound } from "../utils/soundEffects";
import { Confetti } from "./ui/Confetti";
import { MatchButton } from "./MatchButton";

// QWERTY keyboard layout
const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"]
];
const ALL_LETTERS = QWERTY_ROWS.flat();
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

interface LevelSoundsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelSounds({ levelId, accent }: LevelSoundsProps) {
  const navigate = useNavigate();

  // Logic states
  const [shuffledLetters] = useState(() => [...ALL_LETTERS].sort(() => Math.random() - 0.5));
  const [currentSetIdx, setCurrentSetIdx] = useState(0); // 0, 1, 2, 3
  const [phase, setPhase] = useState<"review" | "eval" | "complete">("review");
  const [reviewedLetters, setReviewedLetters] = useState<Set<string>>(new Set());

  // Match states
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);

  const [clickedLetter, setClickedLetter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

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

  const setSizes = [6, 7, 6, 7];

  const getLettersForCurrentSet = () => {
    const start = setSizes.slice(0, currentSetIdx).reduce((a, b) => a + b, 0);
    const end = start + setSizes[currentSetIdx];
    return shuffledLetters.slice(start, end);
  };

  const currentSetLetters = getLettersForCurrentSet();
  const matchProgress = matchColumns.left.length > 0 ? (matchedPairs.size / matchColumns.left.length) * 100 : 0;

  const handleLetterClick = (letter: string) => {
    if (phase !== "review") return;
    playSound("click", 0.2);
    setClickedLetter(letter);
    setReviewedLetters(prev => new Set(prev).add(letter));
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => { });
    setTimeout(() => setClickedLetter(null), 1000);
  };

  const startMatchPhase = () => {
    const targets = [...currentSetLetters].sort(() => Math.random() - 0.5);
    setMatchColumns({
      left: [...targets].sort(() => Math.random() - 0.5),
      right: [...targets].sort(() => Math.random() - 0.5)
    });
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongMatchPair(null);
    setPhase("eval");
  };

  const handleMatchShuffle = () => {
    clearEvalTimeout();
    setMatchColumns(prev => ({
      left: [...prev.left].sort(() => Math.random() - 0.5),
      right: [...prev.right].sort(() => Math.random() - 0.5)
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

  const playNameAudio = (letter: string) => {
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => {});
  };

  const checkMatch = (left: string, right: string) => {
    if (left === right) {
      playSound("correct", 0.4);
      const next = new Set(matchedPairs).add(left);
      setMatchedPairs(next);
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
    } else {
      playSound("wrong", 0.35);
      setWrongMatchPair([left, right]);
      evaluationTimeoutRef.current = setTimeout(() => {
        setWrongMatchPair(null);
        setSelectedSpeakerMatch(null);
        setSelectedLetterMatch(null);
      }, 900);
    }
  };

  const handleSpeakerMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongMatchPair) return;
    playSound("click", 0.2);
    playNameAudio(letter);
    setSelectedSpeakerMatch(letter);
    if (selectedLetterMatch) checkMatch(letter, selectedLetterMatch);
  };

  const handleLetterMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongMatchPair) return;
    playSound("click", 0.2);
    setSelectedLetterMatch(letter);
    if (selectedSpeakerMatch) checkMatch(selectedSpeakerMatch, letter);
  };

  const handleGoBack = () => {
    const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleSetComplete = () => {
    if (currentSetIdx < setSizes.length - 1) {
      playSound("complete", 0.5);
      setCurrentSetIdx(prev => Math.min(prev + 1, setSizes.length - 1));
      setPhase("review");
      setReviewedLetters(new Set());
    } else {
      playSound("complete", 0.5);
      setShowConfetti(true);
      setPhase("complete");
    }
  };

  const saveFinalProgress = async () => {
    setIsSaving(true);
    try {
      const profileStr = localStorage.getItem("userProfile");
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.id) {
          await supabase.from("progress").insert({
            student_id: profile.id,
            level_id: levelId,
            score: ALL_LETTERS.length
          });
        }
      }
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      navigate("/levels");
    } catch (err) {
      console.error("Error saving progress:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 dark:bg-none dark:bg-[#0d141c] pb-12">
      <Confetti active={showConfetti} />
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full"><Home className="w-5 h-5" /></Button>
          <div className="flex-1 text-center">
            <h2 className="text-xl" style={{ color: accent.primary }}>Level 1: Letter Sounds</h2>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl mb-1" style={{ color: accent.primary }}>
            {phase === "review" ? `Review Set ${currentSetIdx + 1}` : phase === "eval" ? `Listen & Match` : `Level Complete!`}
          </h2>
          {phase === "review" && (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Tap each letter to hear its sound! ({reviewedLetters.size}/{currentSetLetters.length})
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {phase === "review" ? (
            <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="space-y-3 mb-8">
                {QWERTY_ROWS.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center gap-2" style={{ paddingLeft: rowIndex === 1 ? "1.5rem" : rowIndex === 2 ? "3rem" : "0" }}>
                    {row.map((letter) => {
                      const isCurrentSet = currentSetLetters.includes(letter);
                      const isClicked = clickedLetter === letter;
                      const isVowel = VOWELS.has(letter);
                      const isReviewed = reviewedLetters.has(letter);
                      return (
                        <motion.button key={letter} initial={{ opacity: 0.3, scale: 1 }} animate={{ opacity: isCurrentSet ? 1 : 0.2, scale: isClicked ? 1.1 : 1 }} onClick={() => isCurrentSet && handleLetterClick(letter)} className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all shadow-md ${isCurrentSet ? 'cursor-pointer hover:shadow-lg active:scale-90' : 'cursor-not-allowed'}`} style={{ background: isClicked ? `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` : isVowel ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)" : "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)" } as React.CSSProperties}>
                          <span className={`text-2xl sm:text-3xl font-black ${isClicked || isVowel ? "text-white" : "text-gray-700 dark:text-gray-800"}`}>{letter}{letter.toLowerCase()}</span>
                          {isReviewed && isCurrentSet && <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-green-500 bg-white rounded-full" />}
                        </motion.button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Button disabled={reviewedLetters.size < currentSetLetters.length} onClick={startMatchPhase} size="lg" className="rounded-xl px-12 py-6 text-lg text-white shadow-xl" style={{ background: reviewedLetters.size < currentSetLetters.length ? '#cbd5e1' : `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}>
                  Start Match <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          ) : phase === "eval" ? (
            <motion.div key="eval" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="w-full">
              <div className="w-full h-3 bg-gray-200/80 dark:bg-gray-800 rounded-full overflow-hidden mb-8 shadow-inner border border-gray-100 dark:border-gray-700/30">
                <motion.div initial={{ width: 0 }} animate={{ width: `${matchProgress}%` }} transition={{ duration: 0.3, ease: "easeOut" }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${accent.primary}, ${accent.dark})` }} />
              </div>

              <div className="text-center mb-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                  Tap a speaker to hear a letter sound, then choose the matching letter.
                </p>

                <div className="flex justify-center gap-3 w-full">
                  <Button variant="outline" size="sm" onClick={handleMatchShuffle} className="rounded-full flex items-center gap-2 border-amber-300">
                    <Shuffle className="w-4 h-4 text-amber-600" /> Shuffle
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleMatchReset} className="rounded-full flex items-center gap-2 border-amber-300">
                    <RotateCcw className="w-4 h-4 text-amber-600" /> Reset
                  </Button>
                  <Button size="sm" onClick={handleSetComplete} disabled={matchedPairs.size < matchColumns.left.length} className="rounded-full flex items-center gap-2 text-white shadow-md active:scale-95 transition-all" style={{ background: matchedPairs.size >= matchColumns.left.length ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "gray" }}>
                    Next <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-2 sm:gap-4 max-w-full mx-auto mb-10 px-2 sm:px-4 overflow-x-hidden">
                {/* Left Column: TTS Speakers */}
                <div className="flex flex-col gap-2 sm:gap-4 flex-1 min-w-0">
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
                        {isSelected && <span className="absolute inset-0 bg-white/20 rounded-[1.5rem]" />}
                      </MatchButton>
                    );
                  })}
                </div>

                {/* Right Column: Letters */}
                <div className="flex flex-col gap-2 sm:gap-4 flex-1 min-w-0">
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
                        className="font-black text-2xl tracking-widest"
                      >
                        {letter}{letter.toLowerCase()}
                      </MatchButton>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <Sparkles className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
              <h3 className="text-3xl font-black mb-4" style={{ color: accent.primary }}>All Sets Complete!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8">You mastered the letter sounds!</p>
              <Button onClick={saveFinalProgress} disabled={isSaving} className="text-white shadow-lg hover:shadow-xl font-bold rounded-xl px-8 py-6 text-lg transition-all hover:scale-105 active:scale-95 border-b-4 border-[#3c8c01] cursor-pointer inline-flex items-center justify-center gap-2 w-full sm:w-auto" style={{ background: "linear-gradient(135deg, #58CC02 0%, #46A302 100%)" }}>
                {isSaving ? "Saving..." : "Continue"} <ArrowRight className="w-6 h-6" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}