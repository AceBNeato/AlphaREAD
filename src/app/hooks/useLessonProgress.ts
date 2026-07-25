import { useState, useRef, useCallback } from 'react';
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
  handleStepBack: () => void;
  handleGoBack: () => Promise<void>;
  setIsComplete: (val: boolean) => void;
}

export function useLessonProgress<T>(
  steps: T[],
  levelId: number,
  onComplete?: () => void
): UseLessonProgressResult<T> {
  const navigate = useNavigate();
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const completionFiredRef = useRef(false);

  const currentStep = steps[currentStepIdx];
  
  // Progress is correctly calculated by dividing by length 
  // (so the final evaluation step completes the bar, or close to it)
  const progressPercentage = steps.length > 0 ? (currentStepIdx / steps.length) * 100 : 0;

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
    navigate("/levels", { replace: true });
  }, [isComplete, navigate]);

  return {
    currentStepIdx,
    currentStep,
    progressPercentage,
    isComplete,
    handleNextStep,
    handleStepBack,
    handleGoBack,
    setIsComplete
  };
}
