import React, { ReactNode } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence } from "motion/react";
import { LessonProgressHeader } from "./ui/LessonProgressHeader";
import { LevelCompleteScreen } from "./ui/LevelCompleteScreen";
import { Confetti } from "./ui/Confetti";
import { stopExclusiveAudio } from "../utils/soundEffects";
import { stopTTS } from "../utils/tts";
import { useEffect } from "react";

interface LessonShellProps {
  isComplete: boolean;
  progressPercentage: number;
  onExit: () => void;
  title: ReactNode;
  completeSubtitle: ReactNode;
  accentColor: string;
  showConfetti?: boolean;
  children: ReactNode;
}

export function LessonShell({
  isComplete,
  progressPercentage,
  onExit,
  title,
  completeSubtitle,
  accentColor,
  showConfetti = false,
  children
}: LessonShellProps) {
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      stopExclusiveAudio();
      stopTTS();
    };
  }, []);

  const handleExit = () => {
    stopExclusiveAudio();
    stopTTS();
    onExit();
  };

  if (isComplete) {
    return (
      <LevelCompleteScreen 
        subtitle={completeSubtitle}
        onContinue={() => navigate("/levels")}
      />
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] overflow-hidden flex flex-col">
      <LessonProgressHeader
        onExit={handleExit}
        title={title}
        progressPercentage={progressPercentage}
        accentColor={accentColor}
      />

      <Confetti active={showConfetti} />

      <div className="flex-1 min-h-0 flex flex-col w-full">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </div>
    </div>
  );
}
