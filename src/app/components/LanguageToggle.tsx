import { useLanguage } from "../context/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { playSound } from "../utils/soundEffects";
import { PushableButton } from "./ui/PushableButton";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isDark = theme === "dark";
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <PushableButton
          className="h-10 min-w-[80px]"
          onClick={() => { playSound("click", 0.2); setIsOpen(!isOpen); }}
          frontClassName="bg-gradient-to-r from-[#1cb0f6] to-[#0a8ed4] text-white px-3 py-0 flex items-center justify-center gap-2 font-bold h-full"
          edgeClassName="bg-[#0979b5]"
          aria-label="Toggle language"
        >
          <img
            src={`https://flagcdn.com/w20/${currentLang.country}.png`}
            height="14"
            width="20"
            alt={currentLang.label}
            className="rounded-xs shadow-xs"
          />
          <span className="text-sm font-black tracking-wider uppercase">{currentLang.short}</span>
      </PushableButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 top-full mt-2 w-36 rounded-2xl shadow-xl border overflow-hidden z-50 ${
              isDark ? "bg-gray-800 border-gray-700 shadow-black/40" : "bg-white border-gray-200 shadow-gray-200/80"
            }`}
          >
            <div className="py-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    playSound("click", 0.2);
                    setLanguage(lang.code as "en" | "tl");
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 font-bold transition-colors ${
                    language === lang.code 
                      ? (isDark ? "bg-gray-700/60 text-[#1CB0F6]" : "bg-sky-50 text-[#1CB0F6]")
                      : (isDark ? "text-gray-300 hover:bg-gray-700/40" : "text-gray-700 hover:bg-gray-100")
                  }`}
                >
                  <img
                    src={`https://flagcdn.com/w20/${lang.country}.png`}
                    srcSet={`https://flagcdn.com/w40/${lang.country}.png 2x`}
                    width="18"
                    height="13"
                    alt={lang.label}
                    className="rounded-xs shadow-xs"
                  />
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