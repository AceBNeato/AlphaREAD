import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import {Home, Volume2, ArrowRight, Shuffle, RotateCcw, SkipForward, CheckCircle2, XCircle, Sparkles, ChevronRight, FastForward, X} from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { shuffle, SyllableTarget } from "../data/levels";
import { Confetti } from "./ui/Confetti";
import { playSound, playExclusiveAudio } from "../utils/soundEffects";
import { playTTS } from "../utils/tts";

import { LevelSyllableBuilder } from "./LevelSyllableBuilder";
import { MatchButton } from "./MatchButton";

type Pattern = "VC" | "CV";

interface Step {
  type: "review" | "build" | "match" | "type";
  items: string[];
  setLabel: string;  // e.g. "Set 1/6"
}

interface LevelSyllableQuizProps {
  pattern: Pattern;
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  onComplete: () => void;
}

const CHUNK_SIZE = 6;
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function getAudioPath(syllable: string, pattern: Pattern): string {
  const base = (import.meta as any).env.BASE_URL;
  const lower = syllable.toLowerCase();
  if (pattern === "CV") return `${base}audio/cv-audio/cv-${lower}.MP3`;
  return `${base}audio/vc-audio/vc-${lower}.MP3`;
}

function playAudio(syllable: string, pattern: Pattern) {
  playExclusiveAudio(getAudioPath(syllable, pattern)).catch(() => {
    // Fallback to browser TTS
    playTTS(syllable.toLowerCase());
  });
}

// Build step array from all syllables
function buildSteps(allSyllables: string[]): Step[] {
  const steps: Step[] = [];
  const totalChunks = Math.ceil(allSyllables.length / CHUNK_SIZE);
  for (let i = 0; i < totalChunks; i++) {
    const chunk = allSyllables.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const label = `Set ${i + 1}/${totalChunks}`;
    steps.push({ type: "review", items: chunk, setLabel: label });
    steps.push({ type: "build", items: chunk, setLabel: label });
    steps.push({ type: "match", items: chunk, setLabel: label });
    steps.push({ type: "type", items: chunk, setLabel: label });
  }
  return steps;
}

// ── Review Phase ──────────────────────────────────────────────────────────────
function ReviewPhase({ items, pattern, accent, onNext }: { items: string[]; pattern: Pattern; accent: any; onNext: () => void; }) {
  const [reviewOrder, setReviewOrder] = useState<string[]>([]);
  useEffect(() => setReviewOrder(items), [items]);

  const handleShuffle = () => setReviewOrder([...reviewOrder].sort(() => Math.random() - 0.5));

  const handleSyllableClick = (syl: string) => {
    playAudio(syl, pattern);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center w-full h-full">
      <div className="text-center mb-8">
        <p className="text-gray-500 mt-2">Tap the syllables to hear their sounds</p>

        {/* Navigation Controls moved to top */}
        <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-sm mx-auto mt-6">
          <Button 
            onClick={handleShuffle} 
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
            style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
          >
            <Shuffle className="w-4 h-4 mr-1" /> Shuffle
          </Button>
          <Button
            onClick={onNext}
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#3c8c01] hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            Proceed <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8 mb-12 w-full max-w-3xl mx-auto">
        {reviewOrder.map((syl) => {
          // Vowel coloring (we use pink for syllables if they start with a vowel, or blue if consonant, as a stylistic choice)
          const isVowelStart = VOWELS.has(syl[0].toUpperCase());
          const bgStart = isVowelStart ? "#FF6B8A" : "#1CB0F6";
          const bgEnd = isVowelStart ? "#FF4B8A" : "#0a8ed4";
          const borderColor = isVowelStart ? "#C82A52" : "#086CA5";

          return (
            <motion.div key={syl} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center w-[110px] sm:w-[140px]">
              <div
                onClick={() => handleSyllableClick(syl)}
                className="w-full aspect-square rounded-[1.5rem] shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border-b-[6px] hover:shadow-xl select-none"
                style={{ background: `linear-gradient(135deg, ${bgStart}, ${bgEnd})`, borderColor }}
              >
                <div className="flex items-baseline justify-center">
                  <span className="text-white text-4xl sm:text-5xl font-black drop-shadow-sm">{syl}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>


    </motion.div>
  );
}

// ── Match Phase ───────────────────────────────────────────────────────────────
function MatchPhase({
  items, pattern, accent, onNext, isLastStep,
}: {
  items: string[];
  pattern: Pattern;
  accent: { primary: string; dark: string };
  onNext: () => void;
  isLastStep: boolean;
}) {
  const [leftCol, setLeftCol] = useState<string[]>([]);
  const [rightCol, setRightCol] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback((newItems?: string[]) => {
    const src = newItems ?? items;
    setLeftCol(shuffle([...src]));
    setRightCol(shuffle([...src]));
    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongPair(null);
    setShowConfetti(false);
  }, [items]);

  useEffect(() => { reset(); }, [reset]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const allDone = matchedPairs.size === leftCol.length && leftCol.length > 0;

  const checkMatch = useCallback((left: string, right: string) => {
    if (left === right) {
      playSound("correct", 0.4);
      const next = new Set(matchedPairs);
      next.add(left);
      setMatchedPairs(next);
      setSelectedLeft(null);
      setSelectedRight(null);
      if (next.size === leftCol.length) {
        setShowConfetti(true);
      }
    } else {
      playSound("wrong", 0.35);
      setWrongPair([left, right]);
      timeoutRef.current = setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 900);
    }
  }, [matchedPairs, leftCol.length]);

  const handleLeftClick = (syl: string) => {
    if (matchedPairs.has(syl) || wrongPair) return;
    playAudio(syl, pattern);
    setSelectedLeft(syl);
    if (selectedRight) checkMatch(syl, selectedRight);
  };

  const handleRightClick = (syl: string) => {
    if (matchedPairs.has(syl) || wrongPair) return;
    playAudio(syl, pattern); // word button also plays audio
    setSelectedRight(syl);
    if (selectedLeft) checkMatch(selectedLeft, syl);
  };

  const isWrongLeft = (s: string) => wrongPair?.[0] === s;
  const isWrongRight = (s: string) => wrongPair?.[1] === s;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-4xl mx-auto flex flex-col items-center"
    >
      <Confetti active={showConfetti} />

      <div className="text-center mb-6">
        <p className="text-gray-500 mt-2">
          Tap a speaker, then tap the matching word!
        </p>
        
        {/* Navigation Controls moved to top */}
        <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
          <Button 
            onClick={() => {
              setLeftCol([...leftCol].sort(() => Math.random() - 0.5));
              setRightCol([...rightCol].sort(() => Math.random() - 0.5));
            }} 
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
            style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
          >
            <Shuffle className="w-4 h-4 mr-1" /> Shuffle
          </Button>
          <Button 
            onClick={() => reset()} 
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#e11d48] hover:scale-105 active:scale-95 px-2"
            style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
          <Button 
            onClick={onNext} 
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#c99c00] hover:scale-105 active:scale-95 px-2"
            style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
          >
            <FastForward className="w-4 h-4 mr-1" /> Skip
          </Button>
          
          <Button
            onClick={onNext}
            disabled={!allDone}
            className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-4 ${allDone ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Two-column match */}
      <div className="w-full grid grid-cols-2 gap-3 mb-6 max-w-full">
        {/* Left: speaker buttons */}
        <div className="flex flex-col gap-3 min-w-0">
          {leftCol.map((syl) => {
            const isDone = matchedPairs.has(syl);
            const isSelected = selectedLeft === syl;
            const isWrong = isWrongLeft(syl);
            return (
              <MatchButton
                key={`left-${syl}`}
                gradientStart={accent.primary}
                gradientEnd={accent.dark}
                isMatched={isDone}
                isSelected={isSelected}
                isWrong={isWrong}
                onClick={() => handleLeftClick(syl)}
              >
                <Volume2 className={`w-8 h-8 ${isDone ? "opacity-50" : ""}`} />
              </MatchButton>
            );
          })}
        </div>

        {/* Right: word buttons */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {rightCol.map((syl) => {
            const isDone = matchedPairs.has(syl);
            const isSelected = selectedRight === syl;
            const isWrong = isWrongRight(syl);
            return (
              <MatchButton
                key={`right-${syl}`}
                isMatched={isDone}
                isSelected={isSelected}
                isWrong={isWrong}
                onClick={() => handleRightClick(syl)}
                className="font-black text-2xl tracking-widest"
              >
                {syl.toLowerCase()}
              </MatchButton>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Type Phase ──────────────────────────────────────────────────────────────
function TypePhase({ items, pattern, accent, onNext }: { items: string[]; pattern: Pattern; accent: any; onNext: () => void; }) {
  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [typeInputs, setTypeInputs] = useState<Record<string, string>>({});
  const [typeStatus, setTypeStatus] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    setTypeOrder([...items].sort(() => Math.random() - 0.5));
    setTypeInputs({});
    setTypeStatus({});
  }, [items]);

  const handleShuffleType = () => {
    setTypeOrder(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const playTypeSound = (syllable: string) => {
    if (!syllable) return;
    playAudio(syllable, pattern);
  };

  const handleTypeChange = (syllable: string, val: string) => {
    if (val.length > 2) return;
    
    setTypeInputs(prev => ({ ...prev, [syllable]: val }));
    
    if (val.length === 2) {
      if (val.toLowerCase() === syllable.toLowerCase()) {
        playSound("correct", 0.4);
        setTypeStatus(prev => ({ ...prev, [syllable]: true }));
      } else {
        playSound("wrong", 0.35);
        setTypeStatus(prev => ({ ...prev, [syllable]: false }));
        setTimeout(() => {
          setTypeStatus(prev => ({ ...prev, [syllable]: null }));
          setTypeInputs(prev => ({ ...prev, [syllable]: "" }));
        }, 800);
      }
    } else {
      setTypeStatus(prev => ({ ...prev, [syllable]: null }));
    }
  };

  const isTypePhaseComplete = typeOrder.length > 0 && typeOrder.every(syllable => typeStatus[syllable] === true);

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center w-full">
      <div className="text-center mb-8">
        <p className="text-gray-500 mt-2">Tap the speaker, then type the syllable!</p>
        
        <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
          <Button 
            onClick={handleShuffleType} 
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
            style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
          >
            <Shuffle className="w-4 h-4 mr-1" /> Shuffle
          </Button>
          <Button 
            onClick={() => {
              setTypeOrder([...items].sort(() => Math.random() - 0.5));
              setTypeInputs({});
              setTypeStatus({});
            }} 
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#e11d48] hover:scale-105 active:scale-95 px-2"
            style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
          <Button 
            onClick={onNext} 
            className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#c99c00] hover:scale-105 active:scale-95 px-2"
            style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
          >
            <FastForward className="w-4 h-4 mr-1" /> Skip
          </Button>
          
          <Button
            onClick={onNext}
            disabled={!isTypePhaseComplete}
            className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-4 ${isTypePhaseComplete ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
            style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
        {/* Left Column: TTS Speakers */}
        <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
          {typeOrder.map((syllable) => {
            const isCorrect = typeStatus[syllable] === true;
            return (
              <MatchButton
                key={`speaker-${syllable}`}
                gradientStart={accent.primary}
                gradientEnd={accent.dark}
                isMatched={isCorrect}
                isSelected={false}
                isWrong={false}
                onClick={() => playTypeSound(syllable)}
              >
                <Volume2 className={`w-8 h-8 ${isCorrect ? "opacity-50" : ""}`} />
              </MatchButton>
            );
          })}
        </div>

        {/* Right Column: Inputs */}
        <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
          {typeOrder.map((syllable) => {
            const status = typeStatus[syllable];
            const val = typeInputs[syllable] || "";
            
            return (
              <motion.div
                key={`input-${syllable}`}
                animate={{ x: status === false ? [-5, 5, -5, 5, 0] : 0 }}
                className="w-full h-14 sm:h-16 flex"
              >
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleTypeChange(syllable, e.target.value)}
                  disabled={status === true}
                  className={`w-full h-full text-center text-2xl sm:text-3xl font-black rounded-lg sm:rounded-2xl border-2 sm:border-b-[4px] outline-none transition-all shadow-sm
                    ${status === true ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-green-600 dark:text-green-500 opacity-50 grayscale' : 
                      status === false ? 'bg-red-50 border-red-400 text-red-600' : 
                      'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:border-blue-400'}
                  `}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function LevelSyllableQuiz({ pattern, levelId, accent, onComplete }: LevelSyllableQuizProps) {
  const navigate = useNavigate();
  const [allSyllables] = useState<string[]>(() => {
    // Load from levels data
    if (pattern === "VC") {
      return shuffle([
        "AB", "AD", "AF", "AG", "AK", "AL", "AM", "AN", "AP", "AR", "AS", "AT", "AV",
        "EB", "ED", "EG", "EK", "EL", "EM", "EN", "EP", "ER", "ES", "ET",
        "IB", "ID", "IG", "IK", "IL", "IM", "IN", "IP", "IR", "IS", "IT",
        "OB", "OD", "OF", "OG", "OK", "OL", "OM", "ON", "OP", "OR", "OS", "OT",
        "UB", "UD", "UG", "UK", "UL", "UM", "UN", "UP", "UR", "US", "UT",
      ]);
    }
    // CV
    return shuffle([
      "BA", "BE", "BI", "BO", "BU",
      "CA", "CO", "CU",
      "DA", "DE", "DI", "DO", "DU",
      "FA", "FE", "FI", "FO", "FU",
      "HA", "HE", "HI", "HO", "HU",
      "JA", "JE", "JI", "JO", "JU",
      "KA", "KE", "KI", "KO", "KU",
      "LA", "LE", "LI", "LO", "LU",
      "MA", "ME", "MI", "MO", "MU",
      "NA", "NE", "NI", "NO", "NU",
      "PA", "PE", "PI", "PO", "PU",
      "RA", "RE", "RI", "RO", "RU",
      "SA", "SE", "SI", "SO", "SU",
      "TA", "TE", "TI", "TO", "TU",
      "VA", "VE", "VI", "VO", "VU",
      "WA", "WE", "WI", "WO", "WU",
      "ZA", "ZE", "ZI", "ZO", "ZU",
    ]);
  });

  const [steps] = useState<Step[]>(() => buildSteps(allSyllables));
  const [currentStep, setCurrentStep] = useState(0);
  const [showFinalConfetti, setShowFinalConfetti] = useState(false);

  const step = steps[currentStep];
  const totalReviewSets = Math.ceil(allSyllables.length / CHUNK_SIZE);
  const progressPct = (currentStep / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      playSound("complete", 0.5);
      setShowFinalConfetti(true);
      setTimeout(() => onComplete(), 2500);
    }
  };

  const getPhaseTitle = (type: string) => {
    switch (type) {
      case "review": return "Review Phase";
      case "build": return "Syllable Builder";
      case "match": return "Listen and Match";
      case "type": return "Listen and Type";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-x-hidden">
      <Confetti active={showFinalConfetti} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm"
            onClick={async () => {
              const confirmExit = await confirmAction("Leave?", "Progress won't be saved.");
              if (confirmExit) navigate("/levels");
            }}
            className="rounded-full">
            <X className="w-5 h-5" /> Exit
          </Button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              Syllable Master - {getPhaseTitle(step?.type)}
            </h2>
          </div>
          <span className="text-sm font-bold" style={{ color: accent.primary }}>
            Step {currentStep + 1}/{steps.length}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        <AnimatePresence mode="wait">
          {showFinalConfetti ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="inline-block mb-6">
                <Sparkles className="w-20 h-20 text-[#FFC800]" />
              </motion.div>
              <h3 className="text-3xl font-black mb-4" style={{ color: accent.primary }}>
                {pattern} Complete! 🎉
              </h3>
              <p className="text-gray-500 mt-2">You've completed all phases and mastered all {allSyllables.length} {pattern} syllables!</p>
            </motion.div>
          ) : step?.type === "review" ? (
            <ReviewPhase
              key={`review-${currentStep}`}
              items={step.items}
              pattern={pattern}
              accent={accent}
              onNext={handleNext}
            />
          ) : step?.type === "build" ? (
            <LevelSyllableBuilder
              key={`build-${currentStep}`}
              levelId={levelId}
              patterns={[pattern]}
              accent={accent}
              embedded={true}
              customTargets={step.items.map(syl => ({
                syllable: syl,
                letters: syl.split(''),
                pattern: pattern
              }))}
              onComplete={handleNext}
            />
          ) : step?.type === "match" ? (
            <MatchPhase
              key={`match-${currentStep}`}
              items={step.items}
              pattern={pattern}
              accent={accent}
              onNext={handleNext}
              isLastStep={currentStep === steps.length - 1}
            />
          ) : (
            <TypePhase
              key={`type-${currentStep}`}
              items={step.items}
              pattern={pattern}
              accent={accent}
              onNext={handleNext}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
