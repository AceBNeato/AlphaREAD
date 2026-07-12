import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { LONG_VOWELS_DATA, LONG_VOWELS_SENTENCES, shuffle } from "../data/levels";
import { playExclusiveAudio } from "../utils/soundEffects";
import { playTTS as playTTSUtil } from "../utils/tts";
import { LessonShell } from "./LessonShell";
import { StepRenderer } from "./StepRenderer";
import { useLessonProgress } from "../hooks/useLessonProgress";

interface LevelLongVowelsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
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

export function LevelLongVowels({ levelId, accent }: LevelLongVowelsProps) {
  const navigate = useNavigate();

  const allPatternsRaw = useMemo(() => {
    const list: string[] = [];
    LONG_VOWELS_DATA.forEach((d) => d.patterns.forEach((p) => list.push(p.pattern)));
    return list;
  }, []);

  const allWordsRaw = useMemo(() => {
    const list: string[] = [];
    LONG_VOWELS_DATA.forEach((d) => d.patterns.forEach((p) => p.words.forEach(w => list.push(w.word))));
    return shuffle(list);
  }, []);

  // Build highlight map: word -> array of character indices to highlight
  const wordHighlightsMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    LONG_VOWELS_DATA.forEach((d) => d.patterns.forEach((p) => p.words.forEach(w => {
      map[w.word] = w.highlights;
    })));
    return map;
  }, []);

  const STEPS: GameStep[] = useMemo(() => {
    const steps: GameStep[] = [];

    // Phase 1: Grouped Preview (Patterns + Words) - glassmorphism cards
    // Batch 1: A and E (6 patterns)
    const aData = LONG_VOWELS_DATA.find(d => d.vowel === "A")!;
    const eData = LONG_VOWELS_DATA.find(d => d.vowel === "E")!;
    steps.push({ phase: "words-preview", groups: [...aData.patterns, ...eData.patterns], batchNumber: 1, totalBatches: 2 });

    // Batch 2: I, O, and U (6 patterns)
    const iData = LONG_VOWELS_DATA.find(d => d.vowel === "I")!;
    const oData = LONG_VOWELS_DATA.find(d => d.vowel === "O")!;
    const uData = LONG_VOWELS_DATA.find(d => d.vowel === "U")!;
    steps.push({ phase: "words-preview", groups: [...iData.patterns, ...oData.patterns, ...uData.patterns], batchNumber: 2, totalBatches: 2 });

    // Phase 2: Vowels Review - all patterns as clickable buttons
    steps.push({ phase: "vowels-review", items: allPatternsRaw, uniformTextSize: true });

    // Phase 3: Words Review - 12 per batch, 3 batches
    const WORDS_BATCH = 12;
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

    // Phase 4: Words Evaluation - 12 per batch, 3 cols x 4 rows, white text with yellow highlights
    steps.push({ phase: "words-eval", items: allWordsRaw, wordHighlights: wordHighlightsMap, overrideBatchSize: 12 });

    // Phase 5: Sentences Evaluation - 10 per batch, 2 cols x 5 rows, white text
    steps.push({ phase: "sentences", items: LONG_VOWELS_SENTENCES, gridColumns: 2, overrideBatchSize: 10 });

    return steps;
  }, [allPatternsRaw, allWordsRaw]);

  const {
    currentStepIdx,
    currentStep: step,
    progressPercentage,
    isComplete,
    handleNextStep,
    handleStepBack,
    handleGoBack
  } = useLessonProgress(STEPS, levelId);

  const safeStep = step!;

  const handleItemClick = (item: string) => {
    // Check if the clicked item is a long vowel pattern
    const patternData = LONG_VOWELS_DATA.find(d => d.patterns.some(p => p.pattern === item));

    if (patternData) {
      // It's a pattern! Play the specific name-{vowel}.mp3 file
      const vowel = patternData.vowel.toLowerCase();
      playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/english/long-vowels-audio/name-${vowel}.mp3`).catch(() => {});
    } else {
      // It's a word or something else, try specific audio, then fallback to TTS
      playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/english/long-vowels-audio/${item.toLowerCase()}.mp3`).catch(() => {
        playTTSUtil(item.toLowerCase());
      });
    }
  };

  const getPhaseTitle = () => {
    if (!safeStep) return "";
    switch (safeStep.phase) {
      case "words-preview": return "Preview";
      case "vowels-review": return "Vowels Review";
      case "words-review": return "Words Review";
      case "words-eval": return "Say the Words";
      case "sentences": return "Say the Sentences";
      default: return "Long Vowels Master";
    }
  };

  return (
    <LessonShell
      isComplete={isComplete}
      progressPercentage={progressPercentage}
      onExit={handleGoBack}
      title={`Long Vowels Master - ${getPhaseTitle()}`}
      completeSubtitle={<>You've completed all phases and mastered Long Vowels!</>}
      accentColor={accent.primary}
    >
      <StepRenderer
        key={currentStepIdx}
        step={{
          ...safeStep,
          titleOverride: safeStep.phase === "words-preview" 
            ? `Tap any pattern or word to hear it! (Batch ${safeStep.batchNumber} of ${safeStep.totalBatches})`
            : safeStep.phase === "vowels-review"
              ? `Review all patterns. Tap any to hear it spoken! (${allPatternsRaw.length} patterns)`
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
