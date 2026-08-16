import React from "react";
import { PushableButton } from "./PushableButton";
import { ArrowLeft, RotateCcw, Shuffle, FastForward, SkipForward, ChevronRight, ArrowRight, ArrowDownAZ } from "lucide-react";
import { playSound } from "../../utils/soundEffects";

interface ActionToolbarProps {
  onBack?: () => void;
  canBack?: boolean;
  onShuffle?: () => void;
  canShuffle?: boolean;
  onReset?: () => void;
  canReset?: boolean;
  resetLabel?: string;
  onSkip?: () => void; // Fast forward
  onNext?: () => void; // Proceed/Next
  canNext?: boolean;
  nextLabel?: string;
  nextIcon?: "chevron" | "arrow" | "skip";
  skipLabel?: string;
}

export function ActionToolbar({
  onBack,
  canBack = true,
  onShuffle,
  canShuffle = true,
  onReset,
  canReset = true,
  resetLabel = "Reset",
  onSkip,
  onNext,
  canNext = true,
  nextLabel = "Proceed",
  nextIcon = "chevron",
  skipLabel = "Forward"
}: ActionToolbarProps) {
  // Determine if we are rendering a full 5-button toolbar or a smaller one
  const isFullToolbar = !!onReset || !!onSkip;

  const isLockedRef = React.useRef(false);

  const handleAction = (action?: () => void) => {
    if (action && !isLockedRef.current) {
      isLockedRef.current = true;
      playSound("click", 0.2);
      action();
      
      // Unlock after 400ms to prevent rapid clicking bugs
      setTimeout(() => {
        isLockedRef.current = false;
      }, 400);
    }
  };

  return (
    <div className="w-full shrink-0 py-8 px-10 mt-auto border-t border-gray-200 dark:border-gray-800">
      <div className={`flex justify-center items-center w-full gap-2 sm:gap-4 ${isFullToolbar ? 'max-w-xl' : 'max-w-md'} mx-auto`}>
        {onBack && (
          <PushableButton
            onClick={() => handleAction(onBack)}
            disabled={!canBack}
            className="flex-1 h-12"
            frontClassName="bg-gradient-to-r from-[#1cb0f6] to-[#0a8ed4] text-white py-2 text-xs sm:text-base flex items-center justify-center gap-0 sm:gap-1"
            edgeClassName="bg-[#0979b5]"
          >
            <span className="font-bold font-sans">Back</span>
          </PushableButton>
        )}

        {onReset && (
          <PushableButton
            onClick={() => handleAction(onReset)}
            disabled={!canReset}
            className="w-12 sm:w-auto sm:flex-1 shrink-0 h-12"
            frontClassName="bg-gradient-to-r from-[rgb(255,75,75)] to-[rgb(216,42,42)] text-white py-2 px-0 sm:px-4 flex items-center justify-center gap-0 sm:gap-1"
            edgeClassName="bg-[rgb(180,30,30)]"
          >
            {resetLabel === "Organize" ? (
              <ArrowDownAZ className="w-5 h-5 sm:hidden" />
            ) : (
              <RotateCcw className="w-5 h-5 sm:hidden" />
            )}
            <span className="hidden sm:inline font-bold font-sans">{resetLabel}</span>
          </PushableButton>
        )}

        {onShuffle && (
          <PushableButton
            onClick={() => handleAction(onShuffle)}
            disabled={!canShuffle}
            className="w-12 sm:w-auto sm:flex-1 shrink-0 h-12"
            frontClassName="bg-gradient-to-r from-[#ce82ff] to-[#a559d6] text-white py-2 px-0 sm:px-4 flex items-center justify-center gap-0 sm:gap-1"
            edgeClassName="bg-[#8f3fb8]"
          >
            <Shuffle className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline font-bold font-sans">Shuffle</span>
          </PushableButton>
        )}

        {onSkip && (
          <PushableButton
            onClick={() => handleAction(onSkip)}
            className="w-12 sm:w-auto sm:flex-1 shrink-0 h-12"
            frontClassName="bg-gradient-to-r from-[#ffc800] to-[#ff9600] text-white py-2 px-0 sm:px-4 flex items-center justify-center gap-0 sm:gap-1"
            edgeClassName="bg-[#d97e00]"
          >
            {nextIcon === "skip" ? (
              <SkipForward className="w-5 h-5 sm:hidden" />
            ) : (
              <FastForward className="w-5 h-5 sm:hidden" />
            )}
            <span className="hidden sm:inline font-bold font-sans">{skipLabel}</span>
          </PushableButton>
        )}

        {onNext && (
          <PushableButton
            onClick={() => handleAction(onNext)}
            disabled={!canNext}
            className="flex-1 h-12"
            frontClassName="bg-gradient-to-r from-[#58cc02] to-[#46a302] text-white py-2 text-xs sm:text-base flex items-center justify-center gap-0 sm:gap-1"
            edgeClassName="bg-[#3c8c01]"
          >
            <span className="font-bold font-sans">{nextLabel}</span>
          </PushableButton>
        )}
      </div>
    </div>
  );
}
