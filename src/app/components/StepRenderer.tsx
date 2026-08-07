import React from "react";
import { ReviewPhase } from "./phases/ReviewPhase";
import { GroupedReviewPhase } from "./phases/GroupedReviewPhase";
import { MatchPhase } from "./phases/MatchPhase";
import { TypePhase } from "./phases/TypePhase";
import { LevelVoiceEvaluation } from "./LevelVoiceEvaluation";
import { LevelSyllableBuilder } from "./LevelSyllableBuilder";

export interface StepRendererProps {
  step: any;
  levelId: number;
  accent: { primary: string; dark: string; lightBg?: string };
  onNext: () => void;
  onBack?: () => void;
  canBack?: boolean;
  onItemClick?: (item: string) => void;
  onOrganize?: () => void;
  onShuffle?: () => void;

  // Specific prop overrides for special phases
  syllablePattern?: string; // for LevelSyllableBuilder
}

export function StepRenderer({
  step,
  levelId,
  accent,
  onNext,
  onBack,
  canBack,
  onItemClick = () => { },
  onOrganize,
  onShuffle,
  syllablePattern
}: StepRendererProps) {
  if (!step) return null;

  const type = step.phase || step.type;
  const items = step.items || step.words || [];

  switch (type) {
    case "review":
    case "full-review":
    case "vowels-review":
    case "words-preview":
    case "words-review":
      if (step.groups) {
        return (
          <GroupedReviewPhase
            key={`grouped-${step.batchNumber || type}`}
            groups={step.groups}
            accent={accent}
            onNext={onNext}
            onBack={onBack}
            canBack={canBack}
            onItemClick={onItemClick}
            titleOverride={step.titleOverride}
          />
        );
      }
      return (
        <ReviewPhase
          key={`review-${step.batchNumber || type}`}
          items={items}
          accent={accent}
          onNext={onNext}
          onBack={onBack}
          canBack={canBack}
          onItemClick={onItemClick}
          onOrganize={onOrganize}
          onShuffle={onShuffle}
          isFullPreview={step.isFullAlphabetPreview || step.isFullPreview}
          titleOverride={step.titleOverride}
          isSmallItems={!!(step.combo || step.isFinal || step.isFullAlphabetPreview || step.isSmallItems)}
          disableAudio={step.disableAudio}
          allowOrganize={type === "review" || type === "full-review" || type === "vowels-review" || type === "words-preview" || type === "words-review"}
          uniformTextSize={step.uniformTextSize}
          uniformMaxLen={step.uniformMaxLen}
          wordHighlights={step.wordHighlights}
          disableDynamicColors={levelId >= 3}
        />
      );

    case "match":
      return (
        <MatchPhase
          key={`match-${step.batchNumber || type}`}
          items={items}
          accent={accent}
          onNext={onNext}
          onBack={onBack}
          canBack={canBack}
          onItemClick={onItemClick}
          matchBatchSize={step.batchSize || 6}
        />
      );

    case "type":
      return (
        <TypePhase
          key={`type-${step.batchNumber || type}`}
          items={items}
          accent={accent}
          onNext={onNext}
          onBack={onBack}
          canBack={canBack}
          onItemClick={onItemClick}
          typeBatchSize={step.batchSize || 6}
        />
      );

    case "words-eval":
    case "sentences":
      return (
        <LevelVoiceEvaluation
          levelId={levelId}
          accent={accent as any}
          customWords={items}
          isSubPhase={true}
          onComplete={onNext}
          onBack={onBack}
          wordHighlights={step.wordHighlights}
          gridColumns={step.gridColumns}
          overrideBatchSize={step.overrideBatchSize}
        />
      );

    case "build":
      return (
        <LevelSyllableBuilder
          levelId={levelId}
          patterns={syllablePattern ? [syllablePattern as any] : []}
          accent={accent as any}
          embedded={true}
          customTargets={items.map((syl: string) => ({
            syllable: syl,
            letters: syl.split(''),
            pattern: syllablePattern || ""
          }))}
          onComplete={onNext}
          onBack={onBack}
        />
      );

    default:
      console.warn(`StepRenderer: Unknown step type/phase '${type}'`, step);
      return (
        <div className="p-8 text-center bg-red-50 text-red-500 rounded-xl">
          <p className="font-bold">Unknown Step Type: {type}</p>
          <button onClick={onNext} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg">Skip Error</button>
        </div>
      );
  }
}
