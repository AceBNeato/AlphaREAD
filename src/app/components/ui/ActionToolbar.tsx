import { Button } from "./button";
import { ArrowLeft, RotateCcw, Shuffle, FastForward, SkipForward, ChevronRight, ArrowRight } from "lucide-react";
import { BUTTON_GRADIENTS, SHARED_ACTION_BUTTON_CLASSES } from "../../utils/buttonStyles";

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
    <div className={`flex justify-center items-center w-full gap-2 sm:gap-4 ${isFullToolbar ? 'max-w-xl' : 'max-w-md'} mx-auto mt-4 mb-6`}>
      {onBack && (
        <Button
          size="sm"
          onClick={onBack}
          disabled={!canBack}
          className={SHARED_ACTION_BUTTON_CLASSES}
          style={{ background: BUTTON_GRADIENTS.blue }}
        >
          <ArrowLeft className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
          <span className="hidden sm:inline">Back</span>
        </Button>
      )}
      
      {onReset && (
        <Button
          size="sm"
          onClick={onReset}
          className={SHARED_ACTION_BUTTON_CLASSES}
          style={{ background: BUTTON_GRADIENTS.red }}
        >
          <RotateCcw className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
          <span className="hidden sm:inline">{resetLabel}</span>
        </Button>
      )}

      {onShuffle && (
        <Button
          size="sm"
          onClick={onShuffle}
          className={SHARED_ACTION_BUTTON_CLASSES}
          style={{ background: BUTTON_GRADIENTS.purple }}
        >
          <Shuffle className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
          <span className="hidden sm:inline">Shuffle</span>
        </Button>
      )}

      {onSkip && (
        <Button
          size="sm"
          onClick={onSkip}
          className={SHARED_ACTION_BUTTON_CLASSES}
          style={{ background: BUTTON_GRADIENTS.yellow }}
        >
          {nextIcon === "skip" ? (
             <SkipForward className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
          ) : (
             <FastForward className="w-4 h-4 sm:mr-1 mx-auto sm:mx-0" />
          )}
          <span className="hidden sm:inline">{skipLabel}</span>
        </Button>
      )}

      {onNext && (
        <Button
          size="sm"
          onClick={onNext}
          disabled={!canNext}
          className={`${SHARED_ACTION_BUTTON_CLASSES} ${!canNext ? 'disabled:cursor-not-allowed' : ''}`}
          style={{ background: BUTTON_GRADIENTS.green }}
        >
          <span className="hidden sm:inline">{nextLabel}</span>
          {nextIcon === "chevron" ? (
             <ChevronRight className="w-4 h-4 sm:ml-1 mx-auto sm:mx-0" />
          ) : nextIcon === "arrow" ? (
             <ArrowRight className="w-4 h-4 sm:ml-1 mx-auto sm:mx-0" />
          ) : (
             <SkipForward className="w-4 h-4 sm:ml-1 mx-auto sm:mx-0" />
          )}
        </Button>
      )}
    </div>
  );
}
