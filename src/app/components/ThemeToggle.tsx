import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { motion } from "motion/react";
import { playSound } from "../utils/soundEffects";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => {
        playSound("click", 0.2);
        toggleTheme();
      }}
      className={`relative w-[72px] h-[38px] rounded-xl p-[3px] transition-colors duration-200 flex items-center select-none outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 ${
        isDark
          ? "bg-gray-800 border-b-2 border-gray-950"
          : "bg-slate-200 border-b-2 border-slate-300"
      }`}
      style={{
        boxShadow: isDark
          ? "inset 0 2px 4px rgba(0,0,0,0.4)"
          : "inset 0 2px 4px rgba(0,0,0,0.08)",
      }}
      aria-label="Toggle theme"
    >
      {/* Background Icons */}
      <div className="absolute inset-0 flex justify-between items-center px-2.5 pointer-events-none">
        <Sun className={`w-4 h-4 transition-opacity duration-200 ${isDark ? "text-gray-500 opacity-60" : "opacity-0"}`} />
        <Moon className={`w-4 h-4 transition-opacity duration-200 ${isDark ? "opacity-0" : "text-slate-400 opacity-60"}`} />
      </div>

      {/* 3D Sliding Thumb */}
      <motion.div
        layout
        initial={false}
        animate={{
          x: isDark ? 34 : 0,
        }}
        whileTap={{ scale: 0.92 }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 32,
        }}
        className={`w-[32px] h-[32px] rounded-lg flex items-center justify-center z-10 shadow-md border-b-2 transition-colors ${
          isDark
            ? "bg-gray-700 border-gray-900 text-[#CE82FF]"
            : "bg-white border-slate-300 text-amber-500"
        }`}
      >
        {isDark ? (
          <Moon className="w-4 h-4 fill-[#CE82FF]/20" />
        ) : (
          <Sun className="w-4 h-4 fill-amber-500/20" />
        )}
      </motion.div>
    </button>
  );
}