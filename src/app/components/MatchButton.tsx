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
  const base = `p-2 sm:p-3 h-14 sm:h-16 rounded-lg sm:rounded-2xl flex items-center justify-center transition-all shadow-sm border-2 border-b-[4px] ${className}`;

  // Clean, premium 3D design mapping
  const finalClass = isMatched
    ? "opacity-50 grayscale cursor-default bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-400 dark:text-gray-500 translate-y-[4px] border-b-2"
    : isWrong
      ? "animate-shake bg-red-500 text-white border-red-700"
      : isSelected
        ? "bg-blue-50 border-blue-500 text-blue-600 shadow-md translate-y-[4px] border-b-2"
        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg cursor-pointer active:border-b-2 active:translate-y-[4px]";

  const style = {
    background: isWrong || isSelected || isMatched
      ? undefined
      : gradientStart && gradientEnd
        ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
        : undefined,
    borderColor: isWrong || isSelected || isMatched
      ? undefined
      : gradientEnd || undefined,
  };

  return (
    <motion.button
      whileHover={{ scale: isMatched ? 1 : 1.02 }}
      whileTap={{ scale: isMatched ? 1 : 0.98 }}
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
