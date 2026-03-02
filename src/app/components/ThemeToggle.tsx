import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-full bg-white/60 dark:bg-gray-700/60 hover:bg-white dark:hover:bg-gray-700 shadow-sm"
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5 text-[#CE82FF]" />
      ) : (
        <Sun className="w-5 h-5 text-[#FFC800]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
