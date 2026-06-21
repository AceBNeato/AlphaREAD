import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import {ChevronRight, Home, ArrowRight, Shuffle, FastForward, Volume2, RotateCcw, X} from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { playSound } from "../utils/soundEffects";
import { MatchButton } from "./MatchButton";

interface LevelPairsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

// Vowels for color logic
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function LevelPairs({ levelId, accent }: LevelPairsProps) {
  const navigate = useNavigate();

  // ALPHABET strictly ordered A-Z
  const ALPHABET = useMemo(() =>
    [...ALL_LETTERS].sort((a, b) => a.letter.localeCompare(b.letter)).map(l => l.letter)
  , []);

  // Randomized alphabet for the final set
  const [finalAlphabet] = useState(() => [...ALPHABET].sort(() => Math.random() - 0.5));

  const STEPS = useMemo(() => [
    { type: "review" as const, start: 0, end: 6, isFinal: false },
    { type: "match" as const, start: 0, end: 6, isFinal: false },
    { type: "type" as const, start: 0, end: 6, isFinal: false },

    { type: "review" as const, start: 6, end: 12, isFinal: false },
    { type: "match" as const, start: 6, end: 12, isFinal: false },
    { type: "type" as const, start: 6, end: 12, isFinal: false },

    { type: "review" as const, start: 12, end: 19, isFinal: false },
    { type: "match" as const, start: 12, end: 19, isFinal: false },
    { type: "type" as const, start: 12, end: 19, isFinal: false },

    { type: "review" as const, start: 19, end: 26, isFinal: false },
    { type: "match" as const, start: 19, end: 26, isFinal: false },
    { type: "type" as const, start: 19, end: 26, isFinal: false },

    // Final Comprehensive Test (Randomized batches of 6, 6, 7, 7)
    { type: "review" as const, start: 0, end: 6, isFinal: true },
    { type: "match" as const, start: 0, end: 6, isFinal: true },
    { type: "type" as const, start: 0, end: 6, isFinal: true },

    { type: "review" as const, start: 6, end: 12, isFinal: true },
    { type: "match" as const, start: 6, end: 12, isFinal: true },
    { type: "type" as const, start: 6, end: 12, isFinal: true },

    { type: "review" as const, start: 12, end: 19, isFinal: true },
    { type: "match" as const, start: 12, end: 19, isFinal: true },
    { type: "type" as const, start: 12, end: 19, isFinal: true },

    { type: "review" as const, start: 19, end: 26, isFinal: true },
    { type: "match" as const, start: 19, end: 26, isFinal: true },
    { type: "type" as const, start: 19, end: 26, isFinal: true },
  ], []);

  const [currentStep, setCurrentStep] = useState(0);
  const step = STEPS[currentStep];

  const baseActiveLetters = useMemo(() => {
    const source = step.isFinal ? finalAlphabet : ALPHABET;
    return source.slice(step.start, step.end);
  }, [ALPHABET, finalAlphabet, step]);

  // Review Phase States
  const [reviewOrder, setReviewOrder] = useState<string[]>([]);
  useEffect(() => {
    if (step.type === "review") {
      setReviewOrder(baseActiveLetters);
    }
  }, [baseActiveLetters, step.type]);

  const handleShuffleReview = () => {
    setReviewOrder(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleLetterClick = (letter: string) => {
    if (!letter) return;
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphabet/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => { });
  };

  // Match Phase States
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (step.type === "match") {
      setupMatchPhase();
    }
  }, [baseActiveLetters, step.type]);

  const setupMatchPhase = () => {
    const targets = [...baseActiveLetters].sort(() => Math.random() - 0.5);
    setMatchColumns({
      left: [...targets].sort(() => Math.random() - 0.5),
      right: [...targets].sort(() => Math.random() - 0.5)
    });
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongMatchPair(null);
  };

  // Listen & Type Phase States
  const [typeOrder, setTypeOrder] = useState<string[]>([]);
  const [typeInputs, setTypeInputs] = useState<Record<string, string>>({});
  const [typeStatus, setTypeStatus] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    if (step.type === "type") {
      setupTypePhase();
    }
  }, [baseActiveLetters, step.type]);

  const setupTypePhase = () => {
    const sorted = [...baseActiveLetters].sort(() => Math.random() - 0.5);
    setTypeOrder(sorted);
    setTypeInputs({});
    setTypeStatus({});
  };

  const handleShuffleType = () => {
    // Shuffle all items since they are all displayed at once
    setTypeOrder(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  const playTypeSound = (letter: string) => {
    if (!letter) return;
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphabet/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => {});
  };

  const handleTypeChange = (letter: string, val: string) => {
    if (val.length > 1) return;
    
    setTypeInputs(prev => ({ ...prev, [letter]: val }));
    
    if (val.length === 1) {
      if (val.toLowerCase() === letter.toLowerCase()) {
        playSound("correct", 0.4);
        setTypeStatus(prev => ({ ...prev, [letter]: true }));
      } else {
        playSound("wrong", 0.35);
        setTypeStatus(prev => ({ ...prev, [letter]: false }));
        setTimeout(() => {
          setTypeStatus(prev => ({ ...prev, [letter]: null }));
          setTypeInputs(prev => ({ ...prev, [letter]: "" }));
        }, 800);
      }
    } else {
      setTypeStatus(prev => ({ ...prev, [letter]: null }));
    }
  };

  const isTypePhaseComplete = typeOrder.length > 0 && typeOrder.every(letter => typeStatus[letter] === true);

  const handleGoBack = async () => {
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleStepNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
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
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphabet/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => {});
    setSelectedSpeakerMatch(letter);
    if (selectedLetterMatch) checkMatch(letter, selectedLetterMatch);
  };

  const handleLetterMatchClick = (letter: string) => {
    if (matchedPairs.has(letter) || wrongMatchPair) return;
    
    // User requested letter buttons to also have audio
    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphabet/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => {});

    setSelectedLetterMatch(letter);
    if (selectedSpeakerMatch) checkMatch(selectedSpeakerMatch, letter);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] overflow-x-hidden flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full"><X className="w-5 h-5" /> Exit</Button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold" style={{ color: accent.primary }}>
              {step.isFinal ? "Final Review" : `Alphabet Master - ${step.type === "review" ? "Review Phase" : step.type === "match" ? "Listen and Match" : "Listen and Type"}`}
            </h2>
          </div>
          <span className="text-sm font-bold" style={{ color: accent.primary }}>Step {currentStep + 1}/{STEPS.length}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        <AnimatePresence mode="wait">
          {step.type === "review" ? (
            <motion.div key={`review-${currentStep}`} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex flex-col items-center">
              <div className="text-center mb-8">
                <p className="text-gray-500 mt-2">Tap the letters to hear their sounds</p>

                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-sm mx-auto mt-6">
                  <Button 
                    onClick={handleShuffleReview} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button
                    onClick={handleStepNext}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#3c8c01] hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    Proceed <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Grid of all letters in the set */}
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8 mb-12 w-full max-w-3xl mx-auto">
                {reviewOrder.map((l: string) => {
                  const isVowel = VOWELS.has(l);
                  const bgStart = isVowel ? "#FF6B8A" : "#1CB0F6";
                  const bgEnd = isVowel ? "#FF4B8A" : "#0a8ed4";
                  const borderColor = isVowel ? "#C82A52" : "#086CA5";

                  return (
                    <motion.div key={l} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center w-[100px] sm:w-[130px]">
                      <div
                        onClick={() => handleLetterClick(l)}
                        className="w-full aspect-square rounded-[1.5rem] shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 border-b-[6px] hover:shadow-xl select-none"
                        style={{ background: `linear-gradient(135deg, ${bgStart}, ${bgEnd})`, borderColor: borderColor }}
                      >
                        <div className="flex items-baseline justify-center">
                          <span className="text-white text-5xl sm:text-6xl font-black drop-shadow-sm">{l}</span>
                          <span className="text-white/90 text-3xl sm:text-4xl font-bold drop-shadow-sm ml-1">{l.toLowerCase()}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>


            </motion.div>

          ) : step.type === "match" ? (
            <motion.div key={`match-${currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center w-full">
              <div className="text-center mb-6">
                <p className="text-gray-500 mt-2">Tap a speaker, then tap the matching letter!</p>
                
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
                  <Button 
                    onClick={() => {
                      setMatchColumns(prev => ({
                        left: [...prev.left].sort(() => Math.random() - 0.5),
                        right: [...prev.right].sort(() => Math.random() - 0.5)
                      }));
                    }} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button 
                    onClick={setupMatchPhase} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#e11d48] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                  <Button 
                    onClick={handleStepNext} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#c99c00] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <FastForward className="w-4 h-4 mr-1" /> Skip
                  </Button>
                  
                  <Button
                    onClick={handleStepNext}
                    disabled={matchedPairs.size !== matchColumns.left.length || matchColumns.left.length === 0}
                    className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-4 ${matchedPairs.size === matchColumns.left.length ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
                {/* Left Column: TTS Speakers */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
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
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
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
                        className="font-black text-2xl sm:text-3xl tracking-widest"
                      >
                        {letter}{letter.toLowerCase()}
                      </MatchButton>
                    );
                  })}
                </div>
              </div>

              {wrongMatchPair && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 font-bold text-lg mb-4 text-center">Not quite, try again!</motion.p>
              )}
            </motion.div>

          ) : step.type === "type" ? (
            <motion.div key={`type-${currentStep}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center w-full">
              <div className="text-center mb-8">
                <p className="text-gray-500 mt-2">Tap the speaker, then type the letter!</p>
                
                {/* Navigation Controls moved to top */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
                  <Button 
                    onClick={handleShuffleType} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#8b40b8] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button 
                    onClick={setupTypePhase} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#e11d48] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                  <Button 
                    onClick={handleStepNext} 
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-4 border-[#c99c00] hover:scale-105 active:scale-95 px-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <FastForward className="w-4 h-4 mr-1" /> Skip
                  </Button>
                  
                  <Button
                    onClick={handleStepNext}
                    disabled={!isTypePhaseComplete}
                    className={`flex-1 rounded-xl font-bold text-white shadow-md border-b-4 ${isTypePhaseComplete ? 'border-[#3c8c01] hover:scale-105 active:scale-95' : 'opacity-50 grayscale cursor-not-allowed'}`}
                    style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
                  >
                    {currentStep === STEPS.length - 1 ? 'Finish!' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
                {/* Left Column: TTS Speakers */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {typeOrder.map((letter) => {
                    const isCorrect = typeStatus[letter] === true;
                    return (
                      <MatchButton
                        key={`speaker-${letter}`}
                        gradientStart={accent.primary}
                        gradientEnd={accent.dark}
                        isMatched={isCorrect} // grays it out if correct
                        isSelected={false}
                        isWrong={false}
                        onClick={() => playTypeSound(letter)}
                      >
                        <Volume2 className={`w-8 h-8 ${isCorrect ? "opacity-50" : ""}`} />
                      </MatchButton>
                    );
                  })}
                </div>

                {/* Right Column: Inputs */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {typeOrder.map((letter) => {
                    const status = typeStatus[letter];
                    const val = typeInputs[letter] || "";
                    
                    return (
                      <motion.div
                        key={`input-${letter}`}
                        animate={{ x: status === false ? [-5, 5, -5, 5, 0] : 0 }}
                        className="w-full h-14 sm:h-16 flex"
                      >
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => handleTypeChange(letter, e.target.value)}
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

          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
