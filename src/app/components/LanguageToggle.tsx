import { useLanguage } from "../context/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isDark = theme === "dark";
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages = [
    { code: "en", label: "English", short: "ENG", country: "us" },
    { code: "tl", label: "Filipino", short: "FIL", country: "ph" }
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center gap-2 h-8 w-auto px-3 rounded-full transition-colors duration-300 focus:outline-none backdrop-blur-md shadow-inner border ${isDark ? "bg-gray-800/80 border-gray-700/50 hover:bg-gray-700/80 text-gray-200" : "bg-gray-200 border-gray-300 hover:bg-gray-300 text-gray-800"}`}
        aria-label="Toggle language"
      >
        <img src={`https://flagcdn.com/w20/${currentLang.country}.png`} srcSet={`https://flagcdn.com/w40/${currentLang.country}.png 2x`} width="20" height="15" alt={currentLang.label} className="rounded-sm shadow-sm" />
        <span className="text-xs font-extrabold tracking-wider">{currentLang.short}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute right-0 mt-2 w-36 rounded-2xl shadow-xl border overflow-hidden z-50 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <div className="py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as "en" | "tl");
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors ${
                    language === lang.code 
                      ? (isDark ? "bg-gray-700/50 text-[#1CB0F6] font-bold" : "bg-blue-50 text-[#1CB0F6] font-bold")
                      : (isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100")
                  }`}
                >
                  <img src={`https://flagcdn.com/w20/${lang.country}.png`} srcSet={`https://flagcdn.com/w40/${lang.country}.png 2x`} width="20" height="15" alt={lang.label} className="rounded-sm" />
                  {lang.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
