import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useCurriculum } from "../hooks/useCurriculum";
import { playExclusiveAudio } from "../utils/soundEffects";
import { LessonShell } from "./LessonShell";
import { StepRenderer } from "./StepRenderer";
import { useLessonProgress } from "../hooks/useLessonProgress";

type Pattern = "VC" | "CV";

interface Step {
  type: "review" | "build" | "match" | "type";
  items: string[];
  setLabel: string;
  isFullPreview?: boolean;
  disableAudio?: boolean;
}

interface LevelSyllableQuizProps {
  pattern: Pattern;
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  onComplete: () => void;
}

function getAudioPath(syllable: string, pattern: Pattern): string {
  const base = (import.meta as any).env.BASE_URL;
  const lower = syllable.toLowerCase();
  if (pattern === "CV") return `${base}audio/english/cv-audio/cv-${lower}.mp3`;
  return `${base}audio/english/vc-audio/vc-${lower}.mp3`;
}

function buildSteps(allSyllables: string[]): Step[] {
  const steps: Step[] = [];
  const sessionSyllables = allSyllables;

  // Phase 1: Preview
  const REVIEW_BATCH_SIZE = 30;
  const totalReviewBatches = Math.ceil(sessionSyllables.length / REVIEW_BATCH_SIZE);
  for (let i = 0; i < totalReviewBatches; i++) {
    const batch = sessionSyllables.slice(i * REVIEW_BATCH_SIZE, (i + 1) * REVIEW_BATCH_SIZE);
    steps.push({
      type: "review",
      items: batch,
      setLabel: `Preview ${i + 1}/${totalReviewBatches}`,
      disableAudio: true,
    });
  }

  // Phase 2: Syllable Builder
  steps.push({
    type: "build",
    items: sessionSyllables,
    setLabel: "Syllable Builder",
  });

  // Phase 3: Review ALL
  for (let i = 0; i < totalReviewBatches; i++) {
    const batch = sessionSyllables.slice(i * REVIEW_BATCH_SIZE, (i + 1) * REVIEW_BATCH_SIZE);
    steps.push({
      type: "review",
      items: batch,
      setLabel: `Review ${i + 1}/${totalReviewBatches}`,
      isFullPreview: true,
    });
  }

  // Phase 4: Match and Type
  steps.push({ type: "match", items: sessionSyllables, setLabel: "Listen and Match" });
  steps.push({ type: "type", items: sessionSyllables, setLabel: "Listen and Type" });

  return steps;
}

export function LevelSyllableQuiz({ pattern, levelId, accent, onComplete }: LevelSyllableQuizProps) {
  const navigate = useNavigate();
  const { generateSyllableTargets } = useCurriculum();
  const [allSyllables] = useState<string[]>(() => {
    // Generate 60 syllables of the requested pattern (VC or CV) to provide enough variety
    const targets = generateSyllableTargets([pattern], 60);
    return targets.map(t => t.syllable);
  });

  const [steps] = useState<Step[]>(() => buildSteps(allSyllables));
  
  const {
    currentStepIdx,
    currentStep: step,
    progressPercentage,
    isComplete: isProgressComplete,
    handleNextStep: handleNext,
    handleStepBack,
    handleGoBack
  } = useLessonProgress(steps, levelId);

  useEffect(() => {
    if (isProgressComplete) {
      const timer = setTimeout(() => onComplete(), 2500);
      return () => clearTimeout(timer);
    }
  }, [isProgressComplete, onComplete]);

  const getPhaseTitle = () => {
    if (!step) return "";
    switch (step.type) {
      case "review": return step.isFullPreview ? "Review Phase" : "Preview Phase";
      case "build": return "Syllable Builder";
      case "match": return "Listen and Match";
      case "type": return "Listen and Type";
      default: return "";
    }
  };

  const playSyllableAudio = (syl: string) => {
    playExclusiveAudio(getAudioPath(syl, pattern)).catch(() => { });
  };

  return (
    <LessonShell
      isComplete={isProgressComplete}
      progressPercentage={progressPercentage}
      onExit={handleGoBack}
      title={`Syllable Master - ${getPhaseTitle()}`}
      completeSubtitle={<>You've completed all phases and mastered all {allSyllables.length} {pattern} syllables!</>}
      accentColor={accent.primary}
      showConfetti={isProgressComplete}
    >
      <StepRenderer
        step={{
          ...step,
          batchSize: 6,
          isSmallItems: true,
          titleOverride: step?.type === "review" ? (step.isFullPreview ? `Review all syllables! (${step.items.length} words)` : `Preview syllables before we start! (${step.items.length} words)`) : undefined
        }}
        levelId={levelId}
        accent={accent}
        onNext={handleNext}
        onBack={handleStepBack}
        canBack={currentStepIdx > 0}
        onItemClick={playSyllableAudio}
        syllablePattern={pattern}
      />
    </LessonShell>
  );
}
