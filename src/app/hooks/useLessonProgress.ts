import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { playSound } from '../utils/soundEffects';
import { confirmAction } from '../utils/alerts';
import { markLevelComplete } from '../services/progress';

interface UseLessonProgressResult<T> {
  currentStepIdx: number;
  currentStep: T | undefined;
  progressPercentage: number;
  isComplete: boolean;
  handleNextStep: () => void;
  handleSkipPhase: () => void;
  handleStepBack: () => void;
  handleGoBack: () => Promise<void>;
  setIsComplete: (val: boolean) => void;
}

export function useLessonProgress<T>(
  steps: T[],
  levelId: number,
  onComplete?: () => void,
  onExit?: () => void
): UseLessonProgressResult<T> {
  const navigate = useNavigate();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const completionFiredRef = useRef(false);

  const currentStep = steps[currentStepIdx];
  
  // Calculate progress based on sequential major phases
  const progressPercentage = useMemo(() => {
    if (steps.length === 0) return 0;
    
    let totalPhases = 0;
    let currentPhaseCount = 0;
    let lastPhase = null;

    for (let i = 0; i < steps.length; i++) {
      const phase = (steps[i] as any)?.phase || (steps[i] as any)?.type;
      
      if (phase !== lastPhase) {
        totalPhases++;
        lastPhase = phase;
      }
      
      if (i === currentStepIdx) {
        currentPhaseCount = totalPhases - 1; // 0-indexed
      }
    }
    
    // Divide by totalPhases (plus 1 buffer) to leave the final chunk for completion
    return Math.max(5, (currentPhaseCount / totalPhases) * 100);
  }, [steps, currentStepIdx]);

  const handleNextStep = useCallback(() => {
    playSound("click", 0.2);
    
    // Use functional state update to guarantee we never exceed bounds
    // even if clicked multiple times before re-render
    setCurrentStepIdx(prev => {
      const isLastStep = prev >= steps.length - 1;

      if (!isLastStep) {
        window.scrollTo(0, 0);
        return prev + 1;
      }

      // Handle completion logic — guard against double-firing
      if (!completionFiredRef.current) {
        completionFiredRef.current = true;
        playSound("complete", 0.5);
        markLevelComplete(levelId);
        setIsComplete(true);
        if (onComplete) {
          onComplete();
        }
      }

      return prev; // Stay on last step
    });
  }, [steps.length, levelId, onComplete]);

  const handleSkipPhase = useCallback(() => {
    playSound("click", 0.2);
    setCurrentStepIdx(prev => {
      const currentPhase = (steps[prev] as any)?.phase || (steps[prev] as any)?.type;
      const nextPhaseIndex = steps.findIndex((s: any, idx: number) => idx > prev && (s.phase || s.type) !== currentPhase);
      
      if (nextPhaseIndex !== -1) {
        window.scrollTo(0, 0);
        return nextPhaseIndex;
      }

      if (!completionFiredRef.current) {
        completionFiredRef.current = true;
        playSound("complete", 0.5);
        markLevelComplete(levelId);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
      return prev;
    });
  }, [steps, levelId, onComplete]);

  const handleStepBack = useCallback(() => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  }, [currentStepIdx]);

  const handleGoBack = useCallback(async () => {
    playSound("click", 0.2);
    if (!isComplete) {
      const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
      if (!confirmExit) return;
    }
    if (onExit) {
      onExit();
    } else {
      navigate("/levels", { replace: true });
    }
  }, [isComplete, navigate, onExit]);

  return {
    currentStepIdx,
    currentStep,
    progressPercentage,
    isComplete,
    handleNextStep,
    handleSkipPhase,
    handleStepBack,
    handleGoBack,
    setIsComplete
  };
}
