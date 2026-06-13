import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Home, ArrowRight, ArrowLeft, Volume2 } from "lucide-react";
import { playSound } from "../utils/soundEffects";
import { MatchButton } from "./MatchButton";

interface LevelPairsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelPairs({ levelId, accent }: LevelPairsProps) {
  const navigate = useNavigate();

  // ALPHABET strictly ordered A-Z
  const ALPHABET = useMemo(() =>
    [...ALL_LETTERS].sort((a, b) => a.letter.localeCompare(b.letter)).map(l => l.letter)
  , []);

  const STEPS = useMemo(() => [
    { type: "review" as const, start: 0, end: 6 },   // A-F review
    { type: "match" as const, start: 0, end: 6 },    // A-F match
    { type: "review" as const, start: 6, end: 12 },  // G-L review
    { type: "match" as const, start: 6, end: 12 },   // G-L match
    { type: "review" as const, start: 12, end: 19 }, // M-S review
    { type: "match" as const, start: 12, end: 19 },  // M-S match
    { type: "review" as const, start: 19, end: 26 }, // T-Z review
    { type: "match" as const, start: 19, end: 26 },  // T-Z match
    
    // Final Comprehensive Test
    { type: "match" as const, start: 0, end: 8 },    // A-H match
    { type: "match" as const, start: 8, end: 17 },   // I-Q match
    { type: "match" as const, start: 17, end: 26 },  // R-Z match
  ], []);

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  const activeLetters = useMemo(() =>
    ALPHABET.slice(step.start, step.end)
  , [ALPHABET, step]);

  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [clickedLetter, setClickedLetter] = useState<string | null>(null);

  // Match Phase States
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (step.type === "match") {
      const targets = [...activeLetters].sort(() => Math.random() - 0.5);
      setMatchColumns({
        left: [...targets].sort(() => Math.random() - 0.5),
        right: [...targets].sort(() => Math.random() - 0.5)
      });
      setMatchedPairs(new Set());
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
      setWrongMatchPair(null);
    }
  }, [currentStep, activeLetters, step.type]);

  // Generate pairs for the current set review
  const currentSetPairs = useMemo(() => {
    if (step.type !== "review") return [];
    const p: [string, string][] = [];
    for (let i = 0; i < activeLetters.length; i += 2) {
      if (i + 1 < activeLetters.length) {
        p.push([activeLetters[i], activeLetters[i + 1]]);
      } else {
        p.push([activeLetters[i], ""]);
      }
    }
    return p;
  }, [activeLetters, step]);

  const currentPair = currentSetPairs[currentPairIndex] || [];

  const handleLetterClick = (letter: string) => {
    if (!letter) return;
    playSound("click", 0.25);
    setClickedLetter(letter);
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => { });
    setTimeout(() => setClickedLetter(null), 1000);

    // grid logic removed
  };

  const handleGoBack = () => {
    const confirmExit = window.confirm("Are you sure you want to leave?");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleStepNext = () => {
    playSound("click", 0.2);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
      setCurrentPairIndex(0);
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
    playSound("click", 0.2);
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => {});
    setSelectedSpeakerMatch(letter);
    if (selectedLetterMatch) checkMatch(letter, selectedLetterMatch);
  };

  const handleLetterMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongMatchPair) return;
    playSound("click", 0.2);
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
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold" style={{ color: accent.primary }}>Review Phase</h2>
                <p className="text-gray-500">Tap the letter to hear its sound</p>
              </div>

              {/* Big letter cards — responsive */}
              <div className="flex justify-center gap-6 sm:gap-12 lg:gap-20 mb-12">
                {currentPair.map((l: string) => l ? (
                  <motion.div key={l} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex-1 max-w-[180px] sm:max-w-[240px] lg:max-w-[280px]">
                    <div
                      onClick={() => handleLetterClick(l)}
                      className="aspect-square rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border-b-[8px] hover:shadow-2xl select-none"
                      style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`, borderColor: accent.dark }}
                    >
                      <div className="flex items-baseline justify-center pb-2">
                        <span className="text-white text-7xl sm:text-9xl lg:text-[10rem] font-black tracking-tight">{l}</span>
                        <span className="text-white/90 text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight">{l.toLowerCase()}</span>
                      </div>
                    </div>
                    <p className="text-center mt-3 text-gray-400 text-sm font-medium">Tap to hear</p>
                  </motion.div>
                ) : null)}
              </div>

              <div className="flex justify-between items-center max-w-sm mx-auto gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentPairIndex((prev: number) => Math.max(0, prev - 1))}
                  disabled={currentPairIndex === 0}
                  className="flex-1 py-6 text-base"
                >
                  <ArrowLeft className="mr-2" /> Back
                </Button>
                {currentPairIndex < currentSetPairs.length - 1 ? (
                  <Button
                    size="lg"
                    onClick={() => setCurrentPairIndex((prev: number) => Math.min(prev + 1, currentSetPairs.length - 1))}
                    className="flex-1 py-6 text-base text-white"
                    style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                  >
                    Next <ArrowRight className="ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleStepNext}
                    className="flex-1 py-6 text-base text-white shadow-lg border-b-4 border-[#3c8c01]"
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    Eval Grid <ChevronRight className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </motion.div>

          ) : step.type === "match" ? (
            <motion.div key={`match-${currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: accent.primary }}>Listen & Match</h2>
                <p className="text-gray-500">Tap a speaker, then tap the matching letter!</p>
              </div>

              <div className="flex justify-center gap-4 max-w-full mx-auto mb-10 px-4 overflow-x-hidden">
                {/* Left Column: TTS Speakers */}
                <div className="flex flex-col gap-4 flex-1 min-w-0">
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
                <div className="flex flex-col gap-4 flex-1 min-w-0">
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