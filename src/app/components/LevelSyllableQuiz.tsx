import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useCurriculum } from "../hooks/useCurriculum";
import { playExclusiveAudio } from "../utils/soundEffects";
import { LessonShell } from "./LessonShell";
import { StepRenderer } from "./StepRenderer";
import { useLessonProgress } from "../hooks/useLessonProgress";
import { useLanguage } from "../context/LanguageContext";

type Pattern = "VC" | "CV";

interface Step {
  type: "review" | "build" | "match" | "type";
  items: string[];
  setLabel: string;
  isFullPreview?: boolean;
  disableAudio?: boolean;
  batchNumber?: number;
  totalBatches?: number;
}

interface LevelSyllableQuizProps {
  pattern: Pattern;
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  onComplete: () => void;
  onExit?: () => void;
}

function getAudioPath(syllable: string, pattern: Pattern, language: string): string {
  const base = import.meta.env.BASE_URL;
  const lower = syllable.toLowerCase();
  
  if (language === "tl") {
    if (pattern === "CV") return `${base}audio/filipino/cv-audio/fil-cv-${lower}.mp3`;
    return `${base}audio/filipino/vc-audio/fil-vc-${lower}.mp3`;
  }
  
  if (pattern === "CV") return `${base}audio/english/cv-audio/eng-cv-${lower}.mp3`;
  return `${base}audio/english/vc-audio/eng-vc-${lower}.mp3`;
}

function buildSteps(allSyllables: string[], isOrganized: boolean = false): Step[] {
  const steps: Step[] = [];
  const sessionSyllables = isOrganized 
    ? [...allSyllables].sort((a, b) => a.localeCompare(b))
    : allSyllables;

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
      batchNumber: i + 1,
      totalBatches: totalReviewBatches,
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
      batchNumber: i + 1,
      totalBatches: totalReviewBatches,
    });
  }

  // Phase 4: Match and Type
  steps.push({ type: "match", items: sessionSyllables, setLabel: "Listen and Match" });
  steps.push({ type: "type", items: sessionSyllables, setLabel: "Listen and Type" });

  return steps;
}

export function LevelSyllableQuiz({ levelId, pattern, accent, onComplete, onExit }: LevelSyllableQuizProps) {
  const navigate = useNavigate();
  const { generateSyllableTargets } = useCurriculum();
  const { language } = useLanguage();
  const isTagalog = language === "tl";

  const [allSyllables] = useState<string[]>(() => {
    // Generate 60 syllables of the requested pattern (VC or CV) to provide enough variety
    const targets = generateSyllableTargets([pattern], 60);
    return targets.map(t => t.syllable);
  });

  const steps = buildSteps(allSyllables);
  
  const {
    currentStepIdx,
    currentStep: step,
    progressPercentage,
    isComplete: isProgressComplete,
    handleNextStep: handleNext,
    handleStepBack,
    handleGoBack
  } = useLessonProgress(steps, levelId, undefined, onExit);

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
    playExclusiveAudio(getAudioPath(syl, pattern, language)).catch(() => { });
  };

  const getTitleOverride = () => {
    if (!step || step.type !== "review") return undefined;
    const bNum = step.batchNumber || 1;
    const tBatches = step.totalBatches || 1;
    if (step.isFullPreview) {
      return `Review syllables! (batch ${bNum} of ${tBatches})`;
    }
    return `Preview syllables before we start! (batch ${bNum} of ${tBatches})`;
  };

  return (
    <LessonShell
      isComplete={isProgressComplete}
      progressPercentage={progressPercentage}
      onExit={handleGoBack}
      title={isTagalog ? `Antas 2: Pantig Master - ${getPhaseTitle()}` : `Syllable Master - ${getPhaseTitle()}`}
      completeSubtitle={<>You've completed all phases and mastered all {allSyllables.length} {pattern} syllables!</>}
      accentColor={accent.primary}
      showConfetti={isProgressComplete}
    >
      <StepRenderer
        step={{
          ...step,
          batchSize: 6,
          isSmallItems: true,
          titleOverride: getTitleOverride()
        }}
        levelId={levelId}
        accent={accent}
        onNext={handleNext}
        onBack={handleStepBack}
        canBack={currentStepIdx > 0}
        onItemClick={playSyllableAudio}
        onOrganize={undefined}
        onShuffle={undefined}
        syllablePattern={pattern}
      />
    </LessonShell>
  );
}
