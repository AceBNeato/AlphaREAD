import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { playSound } from '../utils/soundEffects';
import { confirmAction } from '../utils/alerts';

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

  const currentStep = steps[currentStepIdx];
  
  // Progress is correctly calculated by dividing by length 
  // (so the final evaluation step completes the bar, or close to it)
  const progressPercentage = steps.length > 0 ? (currentStepIdx / steps.length) * 100 : 0;

  const handleNextStep = () => {
    playSound("click", 0.2);
    
    // Use functional state update to guarantee we never exceed bounds
    // even if clicked multiple times before re-render
    setCurrentStepIdx(prev => {
      if (prev < steps.length - 1) {
        window.scrollTo(0, 0);
        return prev + 1;
      }
      return prev;
    });

    // Handle completion logic if we are currently on the last step
    if (currentStepIdx === steps.length - 1 && !isComplete) {
      playSound("complete", 0.5);
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleStepBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleGoBack = async () => {
    playSound("click", 0.2);
    if (!isComplete) {
      const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
      if (!confirmExit) return;
    }
    navigate("/levels", { replace: true });
  };

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
