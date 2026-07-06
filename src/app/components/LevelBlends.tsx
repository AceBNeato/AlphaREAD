import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { BlendWord } from "../data/blends";
import { useCurriculum } from "../hooks/useCurriculum";
import { playExclusiveAudio } from "../utils/soundEffects";
import { playTTS as playTTSUtil } from "../utils/tts";
import { LessonShell } from "./LessonShell";
import { StepRenderer } from "./StepRenderer";
import { useLessonProgress } from "../hooks/useLessonProgress";

interface LevelBlendsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  categoryFilter?: string;
  onComplete?: () => void;
}

type Phase = "vowels-review" | "words-preview" | "words-review" | "words-eval" | "sentences";

interface GameStep {
  phase: Phase;
  items?: string[];
  groups?: any[];
  batchNumber?: number;
  totalBatches?: number;
  batchSize?: number;
  wordHighlights?: Record<string, number[]>;
  gridColumns?: number;
  overrideBatchSize?: number;
  uniformTextSize?: boolean;
  uniformMaxLen?: number;
}

export function LevelBlends({ levelId, accent, categoryFilter, onComplete }: LevelBlendsProps) {
  const navigate = useNavigate();
  const { BLENDS_DATA, BLENDS_SENTENCES } = useCurriculum();
  // Helper to shuffle
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const filteredData = useMemo(() => {
    if (!categoryFilter) return BLENDS_DATA;
    if (categoryFilter === "2-Letter Blends") {
      return BLENDS_DATA.filter((d: any) => d.name === "2-Letter Blends" || d.name === "Digraphs");
    }
    return BLENDS_DATA.filter((d: any) => d.name === categoryFilter);
  }, [categoryFilter, BLENDS_DATA]);

  const allPatternsRaw = useMemo(() => {
    const list: string[] = [];
    filteredData.forEach((d: any) => d.patterns.forEach((p: any) => list.push(p.pattern)));
    return list;
  }, [filteredData]);

  const allWordsRaw = useMemo(() => {
    const list: string[] = [];
    filteredData.forEach((d: any) => d.patterns.forEach((p: any) => p.words.forEach((w: any) => list.push(w.word))));
    return shuffleArray(list);
  }, [filteredData]);

  const wordHighlightsMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    filteredData.forEach((d: any) => d.patterns.forEach((p: any) => p.words.forEach((w: any) => {
      map[w.word] = w.highlights;
    })));
    return map;
  }, [filteredData]);

  const STEPS: GameStep[] = useMemo(() => {
    const steps: GameStep[] = [];

    // Phase 1: Grouped Preview (Patterns + Words) - glassmorphism cards
    const allPatternsObjects: any[] = [];
    filteredData.forEach((d: any) => allPatternsObjects.push(...d.patterns));
    
    const PATTERNS_PER_BATCH = 6;
    const groupedBatches = Math.ceil(allPatternsObjects.length / PATTERNS_PER_BATCH);
    for (let i = 0; i < groupedBatches; i++) {
      steps.push({
        phase: "words-preview",
        groups: allPatternsObjects.slice(i * PATTERNS_PER_BATCH, (i + 1) * PATTERNS_PER_BATCH),
        batchNumber: i + 1,
        totalBatches: groupedBatches
      });
    }

    // Phase 2: Patterns Review - all patterns as clickable buttons
    const PATTERN_REVIEW_BATCH = 14;
    const patternBatches = Math.ceil(allPatternsRaw.length / PATTERN_REVIEW_BATCH);
    for (let i = 0; i < patternBatches; i++) {
      steps.push({
        phase: "vowels-review",
        items: allPatternsRaw.slice(i * PATTERN_REVIEW_BATCH, (i + 1) * PATTERN_REVIEW_BATCH),
        batchNumber: i + 1,
        totalBatches: patternBatches,
        uniformTextSize: true
      });
    }

    // Phase 3: Words Review - Dynamic batch sizing
    const WORDS_BATCH = categoryFilter === "Ending Blends" ? 15 : 
                        categoryFilter === "Three-Letter Blends" ? 10 : 12;
    const wordBatches = Math.ceil(allWordsRaw.length / WORDS_BATCH);
    const maxWordLen = Math.max(0, ...allWordsRaw.map(w => w.length));
    
    for (let i = 0; i < wordBatches; i++) {
      steps.push({
        phase: "words-review",
        items: allWordsRaw.slice(i * WORDS_BATCH, (i + 1) * WORDS_BATCH),
        batchNumber: i + 1,
        totalBatches: wordBatches,
        uniformTextSize: true,
        uniformMaxLen: maxWordLen,
        wordHighlights: wordHighlightsMap
      });
    }

    // Phase 4: Words Evaluation - 12 per batch, 3 cols x 4 rows
    steps.push({ phase: "words-eval", items: allWordsRaw, wordHighlights: wordHighlightsMap, overrideBatchSize: 12 });

    // Phase 5: Sentences Evaluation
    // In English, sentences appear after "Ending Blends". In Tagalog, there is only one category, so we append sentences to it.
    if (categoryFilter === "Ending Blends" || BLENDS_DATA.length === 1) {
      steps.push({ phase: "sentences", items: BLENDS_SENTENCES });
    }

    return steps;
  }, [allPatternsRaw, allWordsRaw, categoryFilter, filteredData, wordHighlightsMap]);

  const {
    currentStepIdx,
    currentStep: step,
    progressPercentage,
    isComplete,
    handleNextStep,
    handleStepBack,
    handleGoBack
  } = useLessonProgress(STEPS, levelId, onComplete);

  const safeStep = step!;

  const handleItemClick = (item: string) => {
    if (allPatternsRaw.includes(item)) {
      let folder = "2letterblend";
      const isThreeLetter = BLENDS_DATA.find((d: any) => d.name === "Three-Letter Blends")?.patterns.some((p: any) => p.pattern === item);
      if (isThreeLetter) folder = "3letterblend";

      playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/${folder}/${folder}-${item.toLowerCase()}.mp3`).catch(() => {});
    } else {
      playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/blends-audio/${item.toLowerCase()}.mp3`).catch(() => {
        playTTSUtil(item.toLowerCase());
      });
    }
  };

  const getPhaseTitle = () => {
    if (!safeStep) return "";
    switch (safeStep.phase) {
      case "words-preview": return "Preview";
      case "vowels-review": return "Review Patterns";
      case "words-review": return "Words Review";
      case "words-eval": return "Say the Words";
      case "sentences": return "Say the Sentences";
      default: return "Blends Master";
    }
  };

  return (
    <LessonShell
      isComplete={isComplete}
      progressPercentage={progressPercentage}
      onExit={handleGoBack}
      title={`Blends Master - ${getPhaseTitle()}`}
      completeSubtitle={<>You've completed all phases and mastered {categoryFilter || "Blends"}!</>}
      accentColor={accent.primary}
    >
      <StepRenderer
        key={currentStepIdx}
        step={{
          ...safeStep,
          titleOverride: safeStep.phase === "words-preview" 
            ? `Tap any pattern or word to hear it! (Batch ${safeStep.batchNumber} of ${safeStep.totalBatches})`
            : safeStep.phase === "vowels-review"
              ? `Review the patterns. Tap any pattern to hear it! (Batch ${safeStep.batchNumber} of ${safeStep.totalBatches})`
              : safeStep.phase === "words-review"
                ? `Review words! Tap any word to hear it! (Batch ${safeStep.batchNumber} of ${safeStep.totalBatches})`
                : undefined
        }}
        levelId={levelId}
        accent={accent}
        onNext={handleNextStep}
        onBack={handleStepBack}
        canBack={currentStepIdx > 0}
        onItemClick={handleItemClick}
      />
    </LessonShell>
  );
}
