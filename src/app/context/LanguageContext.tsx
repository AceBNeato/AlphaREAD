import React, { createContext, useContext, useEffect, useState } from "react";

type Language = "en" | "tl";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem("app-language") as Language;
    return (savedLanguage === "en" || savedLanguage === "tl") ? savedLanguage : "en";
  });
  const [isChanging, setIsChanging] = useState(false);
  const [loadingText, setLoadingText] = useState("Changing Language...");

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    
    setLoadingText(lang === "en" ? "Switching to English..." : "Nililipat sa Filipino...");
    setIsChanging(true);
    
    setTimeout(() => {
      setLanguageState(lang);
      localStorage.setItem("app-language", lang);
      setIsChanging(false);
    }, 1000);
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "tl" : "en");
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage }}>
      {children}
      {isChanging && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white">
          <div className="w-16 h-16 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin mb-6" />
          <h2 className="text-2xl sm:text-3xl font-black tracking-widest animate-pulse">{loadingText}</h2>
        </div>
      )}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
