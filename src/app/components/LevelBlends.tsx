import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { BlendWord } from "../data/blends";
import { useCurriculum } from "../hooks/useCurriculum";
import { playExclusiveAudio } from "../utils/soundEffects";
import { playTTS as playTTSUtil } from "../utils/tts";
import { LessonShell } from "./LessonShell";
import { StepRenderer } from "./StepRenderer";
import { useLessonProgress } from "../hooks/useLessonProgress";
import { useLanguage } from "../context/LanguageContext";

interface LevelBlendsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  categoryFilter?: string;
  onComplete?: () => void;
  onExit?: () => void;
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

export function LevelBlends({ levelId, accent, categoryFilter, onComplete, onExit }: LevelBlendsProps) {
  const navigate = useNavigate();
  const { BLENDS_DATA, BLENDS_SENTENCES } = useCurriculum();
  const { language } = useLanguage();
  const isTagalog = language === "tl";
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
    const PATTERN_REVIEW_BATCH = 20;
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
    // In English, sentences appear after "Ending Blends". In Tagalog, we append sentences to all sub-levels (Kambal Katinig & Diptonggo).
    if (categoryFilter === "Ending Blends" || isTagalog || BLENDS_DATA.length === 1) {
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
  } = useLessonProgress(STEPS, levelId, onComplete, onExit);

  const safeStep = step!;

  const effectiveAccent = useMemo(() => {
    if (isTagalog && categoryFilter === "Diptonggo") {
      return { primary: "#f97316", dark: "#c2410c", lightBg: "#ffedd5" }; // Orange
    }
    if (isTagalog && categoryFilter === "Kambal Katinig") {
      return { primary: "#3b82f6", dark: "#1d4ed8", lightBg: "#dbeafe" }; // Blue
    }
    return accent;
  }, [isTagalog, categoryFilter, accent]);

  const handleItemClick = (item: string) => {
    if (allPatternsRaw.includes(item)) {
      if (isTagalog && categoryFilter === "Diptonggo") {
        playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/filipino/diptonggo/fil-level4-${item.toLowerCase()}.mp3`).catch(() => {});
      } else if (isTagalog && categoryFilter === "Kambal Katinig") {
        playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/filipino/kambalkatinig/fil-level4-${item.toLowerCase()}.mp3`).catch(() => {});
      } else if (isTagalog) {
        playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/filipino/diptonggo/fil-level4-${item.toLowerCase()}.mp3`)
          .catch(() => playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/filipino/kambalkatinig/fil-level4-${item.toLowerCase()}.mp3`))
          .catch(() => {});
      } else {
        let folder = "2letterblend";
        const isThreeLetter = BLENDS_DATA.find((d: any) => d.name === "Three-Letter Blends")?.patterns.some((p: any) => p.pattern === item);
        if (isThreeLetter) folder = "3letterblend";

        playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/english/${folder}/${folder}-${item.toLowerCase()}.mp3`).catch(() => {
          playTTSUtil(item.toLowerCase());
        });
      }
    } else {
      if (isTagalog) {
        playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/filipino/diptonggo/fil-level4-${item.toLowerCase()}.mp3`)
          .catch(() => playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/filipino/kambalkatinig/fil-level4-${item.toLowerCase()}.mp3`))
          .catch(() => playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/filipino/tagalog-words/fil-level4-${item.toLowerCase()}.mp3`))
          .catch(() => {});
        return;
      }
      let audioPath = `${(import.meta as any).env.BASE_URL}audio/english/blends-audio/${item.toLowerCase()}.mp3`;
      playExclusiveAudio(audioPath).catch(() => {
        playTTSUtil(item.toLowerCase());
      });
    }
  };

  const getPhaseTitle = () => {
    if (!safeStep) return "";
    switch (safeStep.phase) {
      case "words-preview": return isTagalog ? "Panimulang Pagsusuri" : "Preview";
      case "vowels-review": return isTagalog ? "Pagsusuri ng mga Pattern" : "Review Patterns";
      case "words-review": return isTagalog ? "Pagsusuri ng mga Salita" : "Words Review";
      case "words-eval": return isTagalog ? "Basahin ang mga Salita" : "Say the Words";
      case "sentences": return isTagalog ? "Basahin ang mga Pangungusap" : "Say the Sentences";
      default: return isTagalog ? "Master" : "Blends Master";
    }
  };

  return (
    <LessonShell
      isComplete={isComplete}
      progressPercentage={progressPercentage}
      onExit={handleGoBack}
      title={`${isTagalog ? (categoryFilter || "Master") : "Blends Master"} - ${getPhaseTitle()}`}
      completeSubtitle={<>{isTagalog ? "Magaling! Natapos mo na ang" : "You've completed all phases and mastered"} {categoryFilter || "Blends"}!</>}
      accentColor={effectiveAccent.primary}
    >
      <StepRenderer
        key={currentStepIdx}
        step={{
          ...safeStep,
          titleOverride: safeStep.phase === "words-preview" 
            ? (isTagalog ? `Pindutin ang pattern o salita para marinig ito! (Pangkat ${safeStep.batchNumber} ng ${safeStep.totalBatches})` : `Tap any pattern or word to hear it! (Batch ${safeStep.batchNumber} of ${safeStep.totalBatches})`)
            : safeStep.phase === "vowels-review"
              ? (isTagalog ? `Suriin ang mga pattern. Pindutin ito para marinig! (Pangkat ${safeStep.batchNumber} ng ${safeStep.totalBatches})` : `Review the patterns. Tap any pattern to hear it! (Batch ${safeStep.batchNumber} of ${safeStep.totalBatches})`)
              : safeStep.phase === "words-review"
                ? (isTagalog ? `Suriin ang mga salita! Pindutin ito para marinig! (Pangkat ${safeStep.batchNumber} ng ${safeStep.totalBatches})` : `Review words! Tap any word to hear it! (Batch ${safeStep.batchNumber} of ${safeStep.totalBatches})`)
                : undefined
        }}
        levelId={levelId}
        accent={effectiveAccent}
        onNext={handleNextStep}
        onBack={handleStepBack}
        canBack={currentStepIdx > 0}
        onItemClick={handleItemClick}
      />
    </LessonShell>
  );
}
