import { Button } from "./button";
import { ArrowLeft, X } from "lucide-react";

interface LessonProgressHeaderProps {
  title: React.ReactNode;
  progressPercentage: number;
  accentColor: string;
  onExit: () => void;
  rightContent?: React.ReactNode;
  useXIcon?: boolean;
}

export function LessonProgressHeader({
  title,
  progressPercentage,
  accentColor,
  onExit,
  rightContent,
  useXIcon = true
}: LessonProgressHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-5 w-full">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onExit} 
          className="rounded-full flex items-center gap-1 p-2 h-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {useXIcon ? <X className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" /> : <ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" />}
          <span className="hidden sm:inline font-bold uppercase tracking-wider text-sm">EXIT</span>
        </Button>
        <div className="flex-1 flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: accentColor }}>
              {title}
            </h2>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 sm:h-5 overflow-hidden relative shadow-inner">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out flex flex-col justify-start"
              style={{
                width: `${Math.max(5, progressPercentage)}%`,
                backgroundColor: accentColor
              }}
            >
              <div className="w-[calc(100%-12px)] h-[30%] bg-white/30 rounded-full mx-1.5 mt-1"></div>
            </div>
          </div>
        </div>
        {rightContent && <div>{rightContent}</div>}
      </div>
    </div>
  );
}
