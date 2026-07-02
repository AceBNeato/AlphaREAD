import { motion } from "motion/react";
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
  const base = `p-1 sm:p-2 ${heightClass} rounded-lg sm:rounded-2xl flex items-center justify-center transition-all btn-3d-effect ${className}`;

  // Clean, premium 3D design mapping
  const finalClass = isMatched
    ? "opacity-50 grayscale cursor-default bg-gray-100 dark:bg-gray-800/50 translate-y-[4px] shadow-none"
    : isWrong
      ? "animate-shake bg-red-500 text-white"
      : isSelected
        ? "bg-blue-50 text-blue-600 translate-y-[4px] shadow-[0_0_0_0]"
        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 cursor-pointer";

  const style = {
    background: isWrong || isSelected || isMatched
      ? undefined
      : gradientStart && gradientEnd
      ? undefined
      : gradientStart && gradientEnd
        ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
        : undefined,
  };

  return (
    <motion.button
      whileHover={{ scale: isMatched ? 1 : 1.02 }}
      onClick={onClick}
      disabled={isMatched}
      aria-disabled={disabled}
      className={`${base} ${finalClass}`}
      style={style as any}
    >
      {children}
    </motion.button>
  );
}
