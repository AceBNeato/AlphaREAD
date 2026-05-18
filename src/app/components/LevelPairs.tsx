import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { ChevronRight, Home, ArrowRight, ArrowLeft } from "lucide-react";

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
    { type: "review" as const, start: 0, end: 12 }, // A-L (12 letters)
    { type: "grid" as const, start: 0, end: 12 }, // Eval Grid 12
    { type: "review" as const, start: 12, end: 26 }, // M-Z (14 letters)
    { type: "grid" as const, start: 12, end: 26 }, // Eval Grid 14
    { type: "grid" as const, start: 0, end: 26 }, // Final Grid A-Z 26 letters
  ], []);

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  const activeLetters = useMemo(() =>
    ALPHABET.slice(step.start, step.end)
  , [ALPHABET, step]);

  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [clickedLetter, setClickedLetter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // For Grid Eval Phase
  const [gridShuffled, setGridShuffled] = useState<string[]>([]);
  const [gridCompleted, setGridCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (step.type === "grid") {
      setGridShuffled([...activeLetters].sort(() => Math.random() - 0.5));
      setGridCompleted(new Set());
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
    const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleStepNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      setCurrentPairIndex(0);
    } else {
      saveFinalProgress();
    }
  };

  const saveFinalProgress = async () => {
    setIsSaving(true);
    try {
      const profileStr = localStorage.getItem("userProfile");
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.id) {
          await supabase.from("progress").insert({ student_id: profile.id, level_id: levelId, score: 26 });
        }
      }
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      navigate("/levels");
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full"><Home className="w-5 h-5" /></Button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold" style={{ color: accent.primary }}>Alphabet Master</h2>
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
                <p className="text-gray-500">Listen to these letter sounds</p>
              </div>
              
              <div className="flex justify-center gap-6 sm:gap-10 mb-12">
                {currentPair.map((l: string, i: number) => l ? (
                  <motion.div key={l} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex-1 max-w-[160px] sm:max-w-[180px]">
                    <div 
                      onClick={() => handleLetterClick(l)} 
                      className="aspect-square rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border-b-[8px] border-[#3c8c01] hover:shadow-2xl" 
                      style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                    >
                      <div className="flex items-baseline justify-center pb-2">
                        <span className="text-white text-7xl sm:text-8xl font-black tracking-tight">{l}</span>
                        <span className="text-white/90 text-5xl sm:text-6xl font-bold tracking-tight">{l.toLowerCase()}</span>
                      </div>
                    </div>
                  </motion.div>
                ) : null)}
              </div>
              
              <div className="flex justify-between items-center max-w-sm mx-auto">
                <Button variant="outline" onClick={() => setCurrentPairIndex((prev: number) => Math.max(0, prev - 1))} disabled={currentPairIndex === 0}><ArrowLeft className="mr-2" /> Back</Button>
                {currentPairIndex < currentSetPairs.length - 1 ? (
                  <Button onClick={() => setCurrentPairIndex((prev: number) => prev + 1)}>Next <ArrowRight className="ml-2" /></Button>
                ) : (
                  <Button
                    onClick={handleStepNext}
                    className="text-white shadow-lg hover:shadow-xl font-bold rounded-xl px-6 py-5 transition-all hover:scale-105 active:scale-95 border-b-4 border-[#3c8c01] cursor-pointer flex items-center justify-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    Start Grid Eval <ChevronRight className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </motion.div>
          ) : step.type === "grid" ? (
            <motion.div key={`grid-${currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold" style={{ color: accent.primary }}>Evaluation Grid</h2>
                <p className="text-gray-500">Tap every letter to hear its sound!</p>
              </div>

              {/* Grid Layout: Responsive for desktop (6 cols) and phone (4 cols) */}
              <div className={`grid gap-3 sm:gap-4 mx-auto mb-12 ${gridShuffled.length > 15 ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-7' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'}`}>
                {gridShuffled.map(l => {
                  const isDone = gridCompleted.has(l);
                  const isClicked = clickedLetter === l;
                  
                  return (
                    <button
                      key={l}
                      onClick={() => handleLetterClick(l)}
                      className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer select-none ${isClicked ? "border-b-0 translate-y-[4px]" : "border-b-4"} ${isDone ? "opacity-90" : ""}`}
                      style={{
                        background: isClicked
                          ? "linear-gradient(135deg, #FFC800 0%, #FF9600 100%)"
                          : isDone
                            ? "linear-gradient(135deg, #58CC02 0%, #46A302 100%)" // completed gets green
                            : "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)", // default blue
                        borderColor: isClicked
                          ? "transparent"
                          : isDone
                            ? "#3c8c01"
                            : "#086CA5",
                      }}
                    >
                      <span className="text-white text-3xl sm:text-4xl lg:text-5xl font-black drop-shadow-sm uppercase">
                        {l}
                      </span>
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
                      onClick={saveFinalProgress} 
                      className="text-white shadow-lg font-bold rounded-xl px-8 py-6 text-lg inline-flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 border-b-4 border-[#086CA5]" 
                      style={{ background: '#1CB0F6' }} 
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Finish Level!"} <ChevronRight className="w-6 h-6" />
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