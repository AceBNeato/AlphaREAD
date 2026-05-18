import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { ChevronRight, Home, ArrowRight, ArrowLeft } from "lucide-react";

const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"]
];

interface LevelPairsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelPairs({ levelId, accent }: LevelPairsProps) {
  const navigate = useNavigate();

  const STEPS = useMemo(() => [
    { type: "intro" as const, start: 0, end: 26 },
    { type: "review" as const, start: 0, end: 6 },
    { type: "review" as const, start: 6, end: 13 },
    { type: "review" as const, start: 13, end: 19 },
    { type: "review" as const, start: 19, end: 26 },
  ], []);

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  const [shuffledAlphabet] = useState(() =>
    [...ALL_LETTERS]
      .sort(() => Math.random() - 0.5)
      .map(item => item.letter)
  );

  const activeLetters = useMemo(() =>
    shuffledAlphabet.slice(step.start, step.end)
    , [shuffledAlphabet, step]);

  const [currentPairIndex, setCurrentPairIndex] = useState(0);

  const [clickedLetter, setClickedLetter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  const currentPair = currentSetPairs[currentPairIndex];

  const handleLetterClick = (letter: string) => {
    if (!letter) return;
    setClickedLetter(letter);
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => { });
    setTimeout(() => setClickedLetter(null), 1000);
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
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full"><Home className="w-5 h-5" /></Button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold" style={{ color: accent.primary }}>Alphabet Master</h2>
          </div>
          {step.type === "review" && (
            <span className="text-sm font-bold" style={{ color: accent.primary }}>Step {currentStep}</span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {step.type === "intro" ? (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2" style={{ color: accent.primary }}>Welcome!</h2>
                <p className="text-gray-500">Here is the alphabet. Tap any letter to hear its sound, then click Start Learning!</p>
              </div>
              <div className="flex flex-col gap-2 sm:gap-3 mb-10 px-2">
                {QWERTY_ROWS.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-1 sm:gap-2">
                    {row.map((l) => {
                      const isVowel = ["A", "E", "I", "O", "U"].includes(l);
                      const isClicked = clickedLetter === l;
                      return (
                        <button
                          key={l}
                          onClick={() => handleLetterClick(l)}
                          className={`relative flex-1 max-w-[3rem] sm:max-w-[4rem] aspect-[4/5] sm:aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer border-b-4 sm:border-b-6 select-none ${isClicked ? "border-b-0 translate-y-[4px] sm:translate-y-[6px]" : ""
                            }`}
                          style={{
                            background: isClicked
                              ? "linear-gradient(135deg, #FFC800 0%, #FF9600 100%)"
                              : isVowel
                                ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)"
                                : "linear-gradient(135deg, #1CB0F6 0%, #0a8ed4 100%)",
                            borderColor: isClicked
                              ? "transparent"
                              : isVowel
                                ? "#C82A52"
                                : "#086CA5",
                          }}
                        >
                          <span className="text-white text-xl sm:text-3xl font-black drop-shadow-sm uppercase">
                            {l}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Button size="lg" onClick={handleStepNext} className="rounded-2xl px-12 py-8 text-xl shadow-xl text-white font-bold" style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}>
                  Start Learning! <ArrowRight className="ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : step.type === "review" ? (
            <motion.div key={`review-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold" style={{ color: accent.primary }}>Review Phase</h2>
                <p className="text-gray-500">Listen to these letter sounds</p>
              </div>
              <div className="flex justify-center gap-6 mb-12">
                {currentPair.map((l: string, i: number) => l ? (
                  <motion.div key={l} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex-1 max-w-[180px]">
                    <div onClick={() => handleLetterClick(l)} className="aspect-square rounded-3xl shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95" style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}>
                      <span className="text-white text-7xl font-bold">{l}</span>
                      <span className="text-white/80 text-4xl">{l.toLowerCase()}</span>
                    </div>
                  </motion.div>
                ) : null)}
              </div>
              <div className="flex justify-between items-center max-w-sm mx-auto">
                <Button variant="outline" onClick={() => setCurrentPairIndex((prev: number) => Math.max(0, prev - 1))} disabled={currentPairIndex === 0}><ArrowLeft className="mr-2" /> Back</Button>
                {currentPairIndex < currentSetPairs.length - 1 ? (
                  <Button onClick={() => setCurrentPairIndex((prev: number) => prev + 1)}>Next <ArrowRight className="ml-2" /></Button>
                ) : currentStep < STEPS.length - 1 ? (
                  <Button onClick={handleStepNext} className="text-white shadow-lg font-bold rounded-xl px-6" style={{ background: '#58CC02' }}>Next Set <ChevronRight className="ml-2" /></Button>
                ) : (
                  <Button onClick={saveFinalProgress} className="text-white shadow-lg font-bold rounded-xl px-6" style={{ background: '#1CB0F6' }} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Finish Level!"} <ChevronRight className="ml-2" />
                  </Button>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}