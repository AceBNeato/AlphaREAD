import { cn } from "./ui/utils";
import type { ReactNode } from "react";

interface MatchButtonProps {
  gradientStart?: string; // e.g. accent.primary
  gradientEnd?: string;   // e.g. accent.dark
  isMatched: boolean;
  isSelected: boolean;
  isWrong: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function MatchButton({
  gradientStart,
  gradientEnd,
  isMatched,
  isSelected,
  isWrong,
  onClick,
  disabled = false,
  children,
  className = "",
}: MatchButtonProps) {
  const hasHeight = className.includes("h-") || className.includes("aspect-");
  const heightClass = hasHeight ? "" : "h-14 sm:h-16";

  // Front classes
  const frontClass = isMatched
    ? "bg-gray-150 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500"
    : isWrong
      ? "bg-red-500 text-white animate-shake"
      : isSelected
        ? "bg-match-selected text-white"
        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer";

  // Edge classes
  const edgeClass = isMatched
    ? "bg-gray-300 dark:bg-gray-900"
    : isWrong
      ? "bg-red-700"
      : isSelected
        ? "bg-match-selected brightness-75"
        : "bg-gray-200 dark:bg-gray-950";

  // Styles for dynamic gradients
  const useGradient = !isWrong && !isSelected && !isMatched && gradientStart && gradientEnd;
  
  const frontStyle = useGradient
    ? { background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }
    : undefined;
    
  const edgeStyle = useGradient
    ? { background: gradientEnd }
    : undefined;

  return (
    <button
      onClick={onClick}
      disabled={isMatched || disabled}
      className={cn(
        "pushable",
        hasHeight && "tile",
        heightClass,
        isSelected && "selected",
        isMatched && "opacity-50 grayscale pointer-events-none",
        className
      )}
    >
      <span className="shadow-layer" />
      <span className={cn("edge-layer", edgeClass)} style={edgeStyle} />
      <span 
        className={cn("front-layer text-lg font-bold select-none", frontClass)} 
        style={frontStyle}
      >
        {children}
      </span>
    </button>
  );
}
