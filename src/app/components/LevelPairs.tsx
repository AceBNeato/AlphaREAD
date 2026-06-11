import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Home, ArrowRight, ArrowLeft, Shuffle, RotateCcw } from "lucide-react";
import { playSound } from "../utils/soundEffects";

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
    { type: "review" as const, start: 0, end: 12 },  // A-L review
    { type: "grid" as const, start: 0, end: 12 },    // A-L eval grid
    { type: "review" as const, start: 12, end: 26 }, // M-Z review
    { type: "grid" as const, start: 12, end: 26 },   // M-Z eval grid
    { type: "grid" as const, start: 0, end: 26 },    // Full A-Z final grid
  ], []);

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  const activeLetters = useMemo(() =>
    ALPHABET.slice(step.start, step.end)
  , [ALPHABET, step]);

  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [clickedLetter, setClickedLetter] = useState<string | null>(null);

  // For Grid Eval Phase
  const [gridShuffled, setGridShuffled] = useState<string[]>([]);
  const [gridCompleted, setGridCompleted] = useState<Set<string>>(new Set());
  // Track current index for teacher Next/Reset in grid
  const [gridIndex, setGridIndex] = useState(0);

  useEffect(() => {
    if (step.type === "grid") {
      setGridShuffled([...activeLetters].sort(() => Math.random() - 0.5));
      setGridCompleted(new Set());
      setGridIndex(0);
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

    if (step.type === "grid") {
      setGridCompleted(prev => {
        const next = new Set(prev);
        next.add(letter);
        return next;
      });
    }
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

  const handleShuffle = () => {
    setGridShuffled(prev => [...prev].sort(() => Math.random() - 0.5));
    setGridCompleted(new Set());
    setGridIndex(0);
  };

  const handleGridReset = () => {
    setGridCompleted(new Set());
    setGridIndex(0);
  };

  const handleGridNext = () => {
    // Mark current as done, advance to next
    const current = gridShuffled[gridIndex];
    if (current) {
      setGridCompleted(prev => {
        const next = new Set(prev);
        next.add(current);
        return next;
      });
    }
    setGridIndex(prev => Math.min(prev + 1, gridShuffled.length - 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
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

          ) : step.type === "grid" ? (
            <motion.div key={`grid-${currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: accent.primary }}>Evaluation Grid</h2>
                <p className="text-gray-500">Tap every letter to hear its sound!</p>
              </div>

              {/* Teacher Controls Row */}
              <div className="flex justify-center gap-3 mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShuffle}
                  className="flex items-center gap-1.5 border-indigo-300 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                >
                  <Shuffle className="w-4 h-4" /> Shuffle
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGridReset}
                  className="flex items-center gap-1.5 border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleGridNext}
                  disabled={gridCompleted.size >= gridShuffled.length}
                  className="flex items-center gap-1.5 text-white"
                  style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                >
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Grid Layout */}
              <div className={`grid gap-3 sm:gap-4 mx-auto mb-12 ${gridShuffled.length > 15 ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-7' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'}`}>
                {gridShuffled.map((l, idx) => {
                  const isDone = gridCompleted.has(l);
                  const isClicked = clickedLetter === l;
                  const isCurrent = idx === gridIndex;

                  return (
                    <button
                      key={l}
                      onClick={() => handleLetterClick(l)}
                      className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer select-none ${isClicked ? "border-b-0 translate-y-[4px]" : "border-b-4"}`}
                      style={{
                        background: isClicked
                          ? "linear-gradient(135deg, #FFC800 0%, #FF9600 100%)"
                          : isDone
                            ? "linear-gradient(135deg, #58CC02 0%, #46A302 100%)"
                            : isCurrent
                              ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`
                              : "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)",
                        borderColor: isClicked ? "transparent" : isDone ? "#3c8c01" : isCurrent ? accent.dark : "#086CA5",
                        boxShadow: isCurrent && !isDone ? `0 0 0 3px ${accent.primary}60` : undefined,
                      }}
                    >
                      <span className="text-white text-3xl sm:text-4xl lg:text-5xl font-black drop-shadow-sm uppercase">
                        {l}
                      </span>
                      {isCurrent && !isDone && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="text-center min-h-[80px]">
                {gridCompleted.size === gridShuffled.length ? (
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
                  <p className="text-gray-400 font-medium">Tap {gridShuffled.length - gridCompleted.size} more letters to continue...</p>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}