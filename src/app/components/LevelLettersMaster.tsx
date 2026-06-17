import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Home, ArrowRight, Volume2 } from "lucide-react";
import { playSound } from "../utils/soundEffects";
import { MatchButton } from "./MatchButton";
import { LevelReviewGrid } from "./LevelReviewGrid";
import { LevelListenType } from "./LevelListenType";

interface LevelPairsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelLettersMaster({ levelId, accent }: LevelPairsProps) {
  const navigate = useNavigate();

  // ALPHABET strictly ordered A-Z
  const ALPHABET = useMemo(() =>
    [...ALL_LETTERS].sort((a, b) => a.letter.localeCompare(b.letter)).map(l => l.letter)
  , []);

  const STEPS = useMemo(() => [
    { type: "review" as const, start: 0, end: 6 },
    { type: "match" as const, start: 0, end: 6 },
    { type: "type" as const, start: 0, end: 6 },

    { type: "review" as const, start: 6, end: 12 },
    { type: "match" as const, start: 6, end: 12 },
    { type: "type" as const, start: 6, end: 12 },

    { type: "review" as const, start: 12, end: 18 },
    { type: "match" as const, start: 12, end: 18 },
    { type: "type" as const, start: 12, end: 18 },

    { type: "review" as const, start: 18, end: 26 },
    { type: "match" as const, start: 18, end: 26 },
    { type: "type" as const, start: 18, end: 26 },
    
    // Final Comprehensive Test
    { type: "review" as const, start: 0, end: 26 },
    { type: "match" as const, start: 0, end: 26 },
    { type: "type" as const, start: 0, end: 26 },
  ], []);

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  const activeLetters = useMemo(() => {
    // Review and Match should present the items. Wait, the user said "shuffle review phase".
    // We will shuffle active letters specifically for the phases that need it.
    const letters = ALPHABET.slice(step.start, step.end);
    if (step.type === "review") {
      // Return randomly ordered array to shuffle the review grid
      return [...letters].sort(() => Math.random() - 0.5);
    }
    return letters;
  }, [ALPHABET, step]);

  // Match Phase States
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (step.type === "match") {
      const targets = [...ALPHABET.slice(step.start, step.end)].sort(() => Math.random() - 0.5);
      setMatchColumns({
        left: [...targets].sort(() => Math.random() - 0.5),
        right: [...targets].sort(() => Math.random() - 0.5)
      });
      setMatchedPairs(new Set());
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
      setWrongMatchPair(null);
    }
  }, [currentStep, ALPHABET, step.type, step.start, step.end]);

  const handleGoBack = () => {
    const confirmExit = window.confirm("Are you sure you want to leave?");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleStepNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    } else {
      playSound("complete", 0.5);
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      navigate("/levels");
    }
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
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => {});
    setSelectedSpeakerMatch(letter);
    if (selectedLetterMatch) checkMatch(letter, selectedLetterMatch);
  };

  const handleLetterMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongMatchPair) return;
    setSelectedLetterMatch(letter);
    if (selectedSpeakerMatch) checkMatch(selectedSpeakerMatch, letter);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] pb-12 overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full"><Home className="w-5 h-5" /></Button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold" style={{ color: accent.primary }}>Lesson 1 — Alphabet Master</h2>
          </div>
          <span className="text-sm font-bold" style={{ color: accent.primary }}>Step {currentStep + 1}/{STEPS.length}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {step.type === "review" ? (
            <motion.div key={`review-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <LevelReviewGrid
                items={activeLetters}
                accent={accent}
                title="Review Grid"
                subtitle="Tap each letter to hear its sound!"
                onComplete={handleStepNext}
                playItemSound={(item) => {
                  const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${item.toLowerCase()}.mp3`);
                  audio.play().catch(() => {});
                }}
              />
            </motion.div>
          ) : step.type === "type" ? (
            <motion.div key={`type-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
               <LevelListenType
                  levelId={levelId}
                  patterns={["LETTER" as any]}
                  accent={accent}
                  onComplete={handleStepNext}
                  customTargets={ALPHABET.slice(step.start, step.end).map(l => ({
                    syllable: l,
                    letters: [l],
                    pattern: "LETTER" as any
                  }))}
                  isSubPhase={true}
                  embedded={true}
               />
            </motion.div>
          ) : step.type === "match" ? (
            <motion.div key={`match-${currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: accent.primary }}>Listen & Match</h2>
                <p className="text-gray-500">Tap a speaker, then tap the matching letter!</p>
              </div>

              <div className="flex justify-center gap-2 sm:gap-4 max-w-full mx-auto mb-10 px-2 sm:px-4">
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

              <div className="text-center min-h-[80px]">
                {matchedPairs.size === matchColumns.left.length && matchColumns.left.length > 0 ? (
                  currentStep < STEPS.length - 1 ? (
                    <Button
                      onClick={handleStepNext}
                      className="text-white shadow-lg hover:shadow-xl font-bold rounded-xl px-8 py-6 text-lg transition-all hover:scale-105 active:scale-95 border-b-4 border-[#3c8c01] cursor-pointer inline-flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                    >
                      Continue <ArrowRight className="w-6 h-6" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleStepNext}
                      className="text-white shadow-lg font-bold rounded-xl px-8 py-6 text-lg inline-flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 border-b-4 border-[#086CA5]"
                      style={{ background: '#1CB0F6' }}
                    >
                      Finish Lesson! <ChevronRight className="w-6 h-6" />
                    </Button>
                  )
                ) : (
                  <>
                    {wrongMatchPair && (
                      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 font-bold text-lg mb-2">Not quite, try again!</motion.p>
                    )}
                    <p className="text-gray-400 font-medium">Match {matchColumns.left.length - matchedPairs.size} more pairs to continue...</p>
                  </>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}