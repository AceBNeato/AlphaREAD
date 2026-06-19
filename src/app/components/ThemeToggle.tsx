import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { motion } from "motion/react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none backdrop-blur-md shadow-sm border ${isDark ? "bg-gray-800/80 border-gray-700/50 hover:bg-gray-700/80" : "bg-white/80 border-gray-200/50 hover:bg-white"
        }`}
      aria-label="Toggle theme"
    >
      <span className="sr-only">Toggle theme</span>
      <motion.div
        className={`flex h-6 w-6 items-center justify-center rounded-full shadow-md border ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-100"
          }`}
        animate={{ x: isDark ? 20 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-[#CE82FF]" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-[#FFC800]" />
        )}
      </motion.div>
    </button>
  );
}
