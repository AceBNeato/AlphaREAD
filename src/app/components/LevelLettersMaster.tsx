import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Home, ArrowRight, Volume2, Shuffle, RotateCcw, SkipForward, CheckCircle2 } from "lucide-react";
import { playSound } from "../utils/soundEffects";
import { MatchButton } from "./MatchButton";
import { LevelReviewGrid } from "./LevelReviewGrid";
import { Confetti } from "./ui/Confetti";

interface LevelPairsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

// ── Match Phase ───────────────────────────────────────────────────────────────
function MatchPhase({
  items, accent, onNext,
}: {
  items: string[];
  accent: { primary: string; dark: string };
  onNext: () => void;
}) {
  const [leftCol, setLeftCol] = useState<string[]>([]);
  const [rightCol, setRightCol] = useState<string[]>([]);
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback((newItems?: string[]) => {
    const src = newItems ?? items;
    setLeftCol([...src].sort(() => Math.random() - 0.5));
    setRightCol([...src].sort(() => Math.random() - 0.5));
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongPair(null);
    setShowConfetti(false);
  }, [items]);

  useEffect(() => { reset(); }, [reset]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const allDone = matchedPairs.size === leftCol.length && leftCol.length > 0;

  const playAudio = (letter: string) => {
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => { });
  };

  const checkMatch = useCallback((left: string, right: string) => {
    if (left === right) {
      playSound("correct", 0.4);
      const next = new Set(matchedPairs);
      next.add(left);
      setMatchedPairs(next);
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
      if (next.size === leftCol.length) {
        setShowConfetti(true);
      }
    } else {
      playSound("wrong", 0.35);
      setWrongPair([left, right]);
      timeoutRef.current = setTimeout(() => {
        setWrongPair(null);
        setSelectedSpeakerMatch(null);
        setSelectedLetterMatch(null);
      }, 900);
    }
  }, [matchedPairs, leftCol.length]);

  const handleSpeakerMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongPair) return;
    playSound("click", 0.2);
    playAudio(letter);
    setSelectedSpeakerMatch(letter);
    if (selectedLetterMatch) checkMatch(letter, selectedLetterMatch);
  };

  const handleLetterMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongPair) return;
    playSound("click", 0.2);
    playAudio(letter); // Play audio when clicking the letter too!
    setSelectedLetterMatch(letter);
    if (selectedSpeakerMatch) checkMatch(selectedSpeakerMatch, letter);
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
        <h2 className="text-2xl font-bold" style={{ color: accent.primary }}>Listen & Match</h2>
        <p className="text-gray-500">Tap a speaker, then tap the matching letter!</p>
      </div>

      <div className="flex justify-center gap-3 w-full mb-6">
        <Button variant="outline" size="sm" onClick={() => reset()}
          className="rounded-full flex items-center gap-2 border-gray-300">
          <Shuffle className="w-4 h-4 text-gray-600" /> Shuffle
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => { setMatchedPairs(new Set()); setSelectedSpeakerMatch(null); setSelectedLetterMatch(null); setWrongPair(null); setShowConfetti(false); }}
          className="rounded-full flex items-center gap-2 border-gray-300">
          <RotateCcw className="w-4 h-4 text-gray-600" /> Reset
        </Button>
        <Button
          size="sm"
          onClick={onNext}
          disabled={!allDone}
          className="rounded-full flex items-center gap-2 text-white shadow-md active:scale-95 transition-all"
          style={{ background: allDone ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "gray" }}
        >
          Next <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm"
          onClick={onNext}
          className="rounded-full flex items-center gap-2 border-amber-300 text-amber-600">
          Skip <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex justify-center gap-2 sm:gap-4 w-full mx-auto mb-10 px-2 sm:px-4">
        {/* Left Column: TTS Speakers */}
        <div className="flex flex-col gap-2 sm:gap-4 flex-1 min-w-0">
          {leftCol.map((letter) => {
            const isMatched = matchedPairs.has(letter);
            const isSelected = selectedSpeakerMatch === letter;
            const isWrong = isWrongLeft(letter);

            return (
              <MatchButton
                key={`speaker-${letter}`}
                gradientStart={accent.primary}
                gradientEnd={accent.dark}
                isMatched={isMatched}
                isSelected={isSelected}
                isWrong={isWrong}
                onClick={() => handleSpeakerMatchClick(letter)}
                disabled={!!wrongPair}
              >
                <Volume2 className={`w-8 h-8 ${isMatched ? "opacity-50" : ""}`} />
              </MatchButton>
            );
          })}
        </div>

        {/* Right Column: Letters */}
        <div className="flex flex-col gap-2 sm:gap-4 flex-1 min-w-0">
          {rightCol.map((letter) => {
            const isMatched = matchedPairs.has(letter);
            const isSelected = selectedLetterMatch === letter;
            const isWrong = isWrongRight(letter);

            return (
              <MatchButton
                key={`letter-${letter}`}
                isMatched={isMatched}
                isSelected={isSelected}
                isWrong={isWrong}
                onClick={() => handleLetterMatchClick(letter)}
                disabled={!!wrongPair}
                className="font-black text-2xl tracking-widest"
              >
                {letter.toUpperCase()}{letter.toLowerCase()}
              </MatchButton>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Direct Typing Phase ───────────────────────────────────────────────────────────────
function TypePhase({
  items, accent, onNext,
}: {
  items: string[];
  accent: { primary: string; dark: string };
  onNext: () => void;
}) {
  const [letters, setLetters] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [completedLetters, setCompletedLetters] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback((newItems?: string[]) => {
    const src = newItems ?? items;
    setLetters([...src].sort(() => Math.random() - 0.5));
    setCompletedLetters(new Set());
    setCurrentIndex(0);
    setInputValue("");
    setFeedback(null);
    setShowConfetti(false);
  }, [items]);

  useEffect(() => { reset(); }, [reset]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const allDone = completedLetters.size === letters.length && letters.length > 0;
  const currentLetter = letters[currentIndex];

  const playAudio = (letter: string) => {
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => { });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (feedback || allDone) return;

    // Only accept 1 character max
    const val = e.target.value;
    if (val.length > 1) return;

    setInputValue(val);

    if (val.length === 1) {
      if (val.toLowerCase() === currentLetter.toLowerCase()) {
        playSound("correct", 0.4);
        setFeedback("correct");
        timeoutRef.current = setTimeout(() => {
          setFeedback(null);
          setInputValue("");
          const nextSet = new Set(completedLetters).add(currentLetter);
          setCompletedLetters(nextSet);

          if (nextSet.size === letters.length) {
            setShowConfetti(true);
          } else {
            setCurrentIndex(prev => prev + 1);
          }
        }, 1000);
      } else {
        playSound("wrong", 0.35);
        setFeedback("wrong");
        timeoutRef.current = setTimeout(() => {
          setFeedback(null);
          setInputValue("");
        }, 800);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-4xl mx-auto flex flex-col items-center"
    >
      <Confetti active={showConfetti} />

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: accent.primary }}>Listen & Type</h2>
        <p className="text-gray-500">Tap the speaker, then type the letter on your keyboard!</p>
      </div>

      <div className="flex justify-center gap-3 w-full mb-10">
        <Button variant="outline" size="sm" onClick={() => reset()}
          className="rounded-full flex items-center gap-2 border-gray-300">
          <Shuffle className="w-4 h-4 text-gray-600" /> Shuffle
        </Button>
        <Button variant="outline" size="sm"
          onClick={() => { setCompletedLetters(new Set()); setCurrentIndex(0); setInputValue(""); setFeedback(null); setShowConfetti(false); }}
          className="rounded-full flex items-center gap-2 border-gray-300">
          <RotateCcw className="w-4 h-4 text-gray-600" /> Reset
        </Button>
        <Button
          size="sm"
          onClick={onNext}
          disabled={!allDone}
          className="rounded-full flex items-center gap-2 text-white shadow-md active:scale-95 transition-all"
          style={{ background: allDone ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "gray" }}
        >
          Next <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm"
          onClick={onNext}
          className="rounded-full flex items-center gap-2 border-amber-300 text-amber-600">
          Skip <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {!allDone && currentLetter ? (
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-10">
          {/* Audio Button */}
          <Button
            onClick={() => {
              playSound("click", 0.2);
              playAudio(currentLetter);
            }}
            className="w-32 h-32 rounded-3xl flex items-center justify-center shadow-lg transition-transform active:scale-95 border-b-4"
            style={{
              background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
              borderColor: accent.dark
            }}
          >
            <Volume2 className="w-16 h-16 text-white" />
          </Button>

          <span className="text-3xl font-bold text-gray-300 hidden sm:block">=</span>

          {/* Input Box */}
          <div className="relative">
            <input
              type="text"
              maxLength={1}
              value={inputValue}
              onChange={handleInputChange}
              disabled={!!feedback}
              className={`w-32 h-32 text-center text-7xl font-black rounded-3xl shadow-inner border-4 outline-none transition-colors ${feedback === "correct"
                ? "bg-green-100 border-green-500 text-green-700"
                : feedback === "wrong"
                  ? "bg-red-100 border-red-500 text-red-700"
                  : "bg-gray-50 border-gray-200 text-gray-800 focus:border-blue-400"
                }`}
              placeholder="?"
              autoFocus
            />
            {feedback === "correct" && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-4 -right-4 bg-green-500 rounded-full p-2 text-white shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </motion.div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center min-h-[160px] flex items-center justify-center">
          <Button
            onClick={onNext}
            className="text-white shadow-lg hover:shadow-xl font-bold rounded-xl px-10 py-6 text-xl transition-all hover:scale-105 active:scale-95 border-b-4 cursor-pointer inline-flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
              borderColor: accent.dark
            }}
          >
            Continue <ArrowRight className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {letters.map((l, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${i < currentIndex ? "bg-green-500" : i === currentIndex ? "bg-blue-400" : "bg-gray-200"
              }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────────
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
    const letters = ALPHABET.slice(step.start, step.end);
    if (step.type === "review") {
      // Return randomly ordered array to shuffle the review grid
      return [...letters].sort(() => Math.random() - 0.5);
    }
    return letters;
  }, [ALPHABET, step]);

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
                formatAsBox={true}
                onComplete={handleStepNext}
                playItemSound={(item) => {
                  const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${item.toLowerCase()}.mp3`);
                  audio.play().catch(() => { });
                }}
              />
            </motion.div>
          ) : step.type === "match" ? (
            <motion.div key={`match-${currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <MatchPhase
                items={activeLetters}
                accent={accent}
                onNext={handleStepNext}
              />
            </motion.div>
          ) : step.type === "type" ? (
            <motion.div key={`type-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <TypePhase
                items={activeLetters}
                accent={accent}
                onNext={handleStepNext}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}