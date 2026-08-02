import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { allLetters as ALL_LETTERS } from "../data/levels";
import { playExclusiveAudio } from "../utils/soundEffects";
import { LessonShell } from "./LessonShell";
import { StepRenderer } from "./StepRenderer";
import { useLessonProgress } from "../hooks/useLessonProgress";

interface LevelLetterNamesProps {
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

export function LevelLetterNames({ levelId, accent }: LevelLetterNamesProps) {
  const navigate = useNavigate();

  const ALPHABET = useMemo(() =>
    [...ALL_LETTERS].sort((a, b) => a.letter.localeCompare(b.letter)).map(l => l.letter)
  , []);
  
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
  const confettiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const baseActiveLetters = useMemo(() => {
    if (!safeStep) return [];
    if (safeStep.isFullAlphabetPreview) return ALPHABET;
    if (safeStep.combo === "AL") return comboAL;
    if (safeStep.combo === "AS") return comboAS;
    if (safeStep.isFinal) return finalAlphabet;
    return ALPHABET.slice(safeStep.start || 0, safeStep.end || ALPHABET.length);
  }, [ALPHABET, finalAlphabet, comboAL, comboAS, safeStep]);

  const playNameTTS = (letter: string) => {
    if (!letter) return;
    playExclusiveAudio(`${import.meta.env.BASE_URL}audio/english/letter-names/name-${letter.toLowerCase()}.mp3`);
  };

  const title = (
    <>
      {safeStep?.isFinal ? 'Final Review - ' : safeStep?.combo === 'AL' ? 'Combined A-L - ' : safeStep?.combo === 'AS' ? 'Combined A-S - ' : 'Letter Names Master - '}
      {safeStep?.type === 'review' ? (safeStep?.combo || safeStep?.isFinal ? 'Review Phase' : 'Preview Phase') :
        safeStep?.type === 'match' ? 'Listen & Match' :
          'Listen & Type'}
    </>
  );

  return (
    <LessonShell
      isComplete={isComplete}
      progressPercentage={progressPercentage}
      onExit={handleGoBack}
      title={title}
      completeSubtitle={<>Amazing job! You have fully mastered letter names in <span className="font-bold text-blue-500">Letter Names Master</span>!</>}
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
        onItemClick={playNameTTS}
      />
    </LessonShell>
  );
}
