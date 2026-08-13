import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useCurriculum } from "../hooks/useCurriculum";
import { playExclusiveAudio } from "../utils/soundEffects";
import { LessonShell } from "./LessonShell";
import { StepRenderer } from "./StepRenderer";
import { useLessonProgress } from "../hooks/useLessonProgress";
import { useLanguage } from "../context/LanguageContext";

interface LevelPairsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type Phase = "review" | "match" | "type";

interface GameStep {
  type: Phase;
  start: number;
  end: number;
  isFinal: boolean;
  combo: false | "AL" | "AS";
  isFullAlphabetPreview?: boolean;
}

export function LevelPairs({ levelId, accent }: LevelPairsProps) {
  const navigate = useNavigate();
  const { allLetters } = useCurriculum();
  const { language } = useLanguage();
  const isTagalog = language === "tl";

  const ALPHABET = useMemo(() =>
    [...allLetters].sort((a, b) => a.letter.localeCompare(b.letter)).map(l => l.letter)
    , [allLetters]);

  const [finalAlphabet] = useState(() => [...ALPHABET].sort(() => Math.random() - 0.5));
  const [comboAL] = useState(() => [...ALPHABET.slice(0, 12)].sort(() => Math.random() - 0.5));
  const [comboAS] = useState(() => [...ALPHABET.slice(0, 19)].sort(() => Math.random() - 0.5));

  const STEPS: GameStep[] = useMemo(() => [
    { type: "review", start: 0, end: 26, isFinal: false, isFullAlphabetPreview: true, combo: false, disableAudio: true },
    // Group 1: A-F
    { type: "review", start: 0, end: 6, isFinal: false, combo: false },
    { type: "match", start: 0, end: 6, isFinal: false, combo: false },
    { type: "type", start: 0, end: 6, isFinal: false, combo: false },
    // Group 2: G-L
    { type: "review", start: 6, end: 12, isFinal: false, combo: false },
    { type: "match", start: 6, end: 12, isFinal: false, combo: false },
    { type: "type", start: 6, end: 12, isFinal: false, combo: false },
    // Cumulative A-L
    { type: "review", start: 0, end: 12, isFinal: false, combo: "AL" },
    // Group 3: M-S
    { type: "review", start: 12, end: 19, isFinal: false, combo: false },
    { type: "match", start: 12, end: 19, isFinal: false, combo: false },
    { type: "type", start: 12, end: 19, isFinal: false, combo: false },
    // Cumulative A-S
    { type: "review", start: 0, end: 19, isFinal: false, combo: "AS" },
    // Group 4: T-Z
    { type: "review", start: 19, end: 26, isFinal: false, combo: false },
    { type: "match", start: 19, end: 26, isFinal: false, combo: false },
    { type: "type", start: 19, end: 26, isFinal: false, combo: false },
    // Combined A-Z
    { type: "review", start: 0, end: 26, isFinal: true, combo: false },
    { type: "match", start: 0, end: 26, isFinal: true, combo: false },
    { type: "type", start: 0, end: 26, isFinal: true, combo: false },
  ], []);

  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    confettiTimeoutRef.current = setTimeout(() => setShowConfetti(false), 2500);
  }, []);

  const {
    currentStepIdx,
    currentStep: step,
    progressPercentage,
    isComplete,
    handleNextStep,
    handleStepBack,
    handleGoBack
  } = useLessonProgress(STEPS, levelId, triggerConfetti);

  const safeStep = step!;

  const [sortType, setSortType] = useState<"shuffled" | "alphabetical" | "default">("default");
  const [shuffleTrigger, setShuffleTrigger] = useState(0);

  // Reset sorting when moving to a new step
  useEffect(() => {
    setSortType("default");
  }, [currentStepIdx]);

  const handleOrganizeAll = () => setSortType("alphabetical");
  const handleShuffleAll = () => {
    setSortType("shuffled");
    setShuffleTrigger(prev => prev + 1);
  };

  const baseActiveLetters = useMemo(() => {
    if (!safeStep) return [];
    let letters: string[] = [];
    if (safeStep.isFullAlphabetPreview) letters = ALPHABET;
    else if (safeStep.combo === "AL") letters = comboAL;
    else if (safeStep.combo === "AS") letters = comboAS;
    else if (safeStep.isFinal) letters = finalAlphabet;
    else letters = ALPHABET.slice(safeStep.start || 0, safeStep.end || ALPHABET.length);

    if (sortType === "shuffled") {
      return [...letters].sort(() => Math.random() - 0.5);
    } else if (sortType === "alphabetical") {
      return [...letters].sort((a, b) => a.localeCompare(b));
    }
    
    return letters;
  }, [ALPHABET, finalAlphabet, comboAL, comboAS, safeStep, sortType, shuffleTrigger]);

  const playLetterTTS = (letter: string) => {
    if (!letter) return;
    const prefix = isTagalog ? "filipino/fil-alphabet/fil-" : "english/eng-alphabet/eng-";
    playExclusiveAudio(`${import.meta.env.BASE_URL}audio/${prefix}${letter.toLowerCase()}.mp3`).catch(() => { });
  };

  const titlePrefix = safeStep?.isFinal ? (isTagalog ? 'Huling Pagsusuri - ' : 'Final Review - ')
    : safeStep?.combo === 'AL' ? (isTagalog ? 'Pinagsamang A-L - ' : 'Combined A-L - ')
      : safeStep?.combo === 'AS' ? (isTagalog ? 'Pinagsamang A-S - ' : 'Combined A-S - ')
        : (isTagalog ? 'Abakada Master - ' : 'Letter Sounds Master - ');

  const titleSuffix = safeStep?.type === 'review'
    ? (safeStep?.combo || safeStep?.isFinal ? (isTagalog ? 'Pagsusuri' : 'Review Phase') : (isTagalog ? 'Panimulang Pagsusuri' : 'Preview Phase'))
    : safeStep?.type === 'match' ? (isTagalog ? 'Pakinggan at Itugma' : 'Listen & Match')
      : (isTagalog ? 'Pakinggan at I-type' : 'Listen & Type');

  const title = <>{titlePrefix}{titleSuffix}</>;

  return (
    <LessonShell
      isComplete={isComplete}
      progressPercentage={progressPercentage}
      onExit={handleGoBack}
      title={title}
      completeSubtitle={<>Amazing job! You have fully mastered letter sounds in <span className="font-bold text-blue-500">{isTagalog ? 'Abakada Master' : 'Letter Sounds Master'}</span>!</>}
      accentColor={accent.primary}
      showConfetti={showConfetti}
    >
      <StepRenderer
        key={currentStepIdx}
        step={{
          ...safeStep,
          items: baseActiveLetters,
          batchSize: baseActiveLetters.length === 7 || baseActiveLetters.length === 14 ? 7 : 6
        }}
        levelId={levelId}
        accent={accent}
        onNext={handleNextStep}
        onBack={handleStepBack}
        canBack={currentStepIdx > 0}
        onItemClick={playLetterTTS}
        onOrganize={handleOrganizeAll}
        onShuffle={handleShuffleAll}
      />
    </LessonShell>
  );
}
