import { PushableButton } from "./PushableButton";
import { ArrowLeft, RotateCcw, Shuffle, FastForward, SkipForward, ChevronRight, ArrowRight } from "lucide-react";

interface ActionToolbarProps {
  onBack?: () => void;
  canBack?: boolean;
  onShuffle?: () => void;
  onReset?: () => void;
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
  onReset,
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

  return (
    <div className="w-full shrink-0 py-8 px-10 mt-auto border-t border-gray-200 dark:border-gray-800">
      <div className={`flex justify-center items-center w-full gap-2 sm:gap-4 ${isFullToolbar ? 'max-w-xl' : 'max-w-md'} mx-auto`}>
        {onBack && (
          <PushableButton
            onClick={onBack}
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
            onClick={onReset}
            className="w-12 sm:w-auto sm:flex-1 shrink-0 h-12"
            frontClassName="bg-gradient-to-r from-[rgb(255,75,75)] to-[rgb(216,42,42)] text-white py-2 px-0 sm:px-4 flex items-center justify-center gap-0 sm:gap-1"
            edgeClassName="bg-[rgb(180,30,30)]"
          >
            <RotateCcw className="w-5 h-5 sm:hidden" />
            <span className="hidden sm:inline font-bold font-sans">{resetLabel}</span>
          </PushableButton>
        )}

        {onShuffle && (
          <PushableButton
            onClick={onShuffle}
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
            onClick={onSkip}
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
            onClick={onNext}
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
