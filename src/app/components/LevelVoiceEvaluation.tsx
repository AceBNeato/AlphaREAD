import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Mic,
  Home,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  MicOff,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { CVC_WORDS, shuffle } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";

const DIGIT_MAP: Record<string, string> = {
  "0": "ZERO", "1": "ONE", "2": "TWO", "3": "THREE", "4": "FOUR",
  "5": "FIVE", "6": "SIX", "7": "SEVEN", "8": "EIGHT", "9": "NINE", "10": "TEN"
};

// Map words that the API frequently misunderstands because they sound identical or extremely similar
// This covers true homophones, names, and vowel-elongation mistakes (like BIN -> BEAN) for all 64 words.
const HOMOPHONES: Record<string, string[]> = {
  // A Vowels
  "BAT": ["BATT"],
  "MAT": ["MATT"],
  "PAT": ["PATT"],

  // E Vowels
  "RED": ["READ"],
  "LED": ["LEAD"],
  "PEN": ["PEEN", "PENN"],
  "DEN": ["DEEN", "DENE", "THEN"],
  "MEN": ["MEAN"],

  // I Vowels
  "BIN": ["BEAN"],
  "TIN": ["TEEN"],
  "PIN": ["PEEN"],
  "FIN": ["FEEN", "PHIN"],
  "WIN": ["WYNN", "WON", "WEEN"],
  "WIG": ["WHIG", "WEG"],

  // O Vowels
  "COT": ["CAUGHT"],
  "NOT": ["KNOT"],
  "ROT": ["WROUGHT"],
  "DOG": ["DAWG", "DOOG"],

  // U Vowels
  "SUN": ["SON", "SAN"],
  "BUS": ["BUSS", "BASS"],
  "MUG": ["MOG", "MUGGS"],
  "RUG": ["RUGGS", "ROG"],

};

// Helper function to calculate Levenshtein distance (Fuzzy Matching)
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
}

// Strict vowel check to ensure CVC words aren't falsely marked "close" if the vowel changes (e.g. TIN vs TEEN)
function hasSameVowels(word1: string, word2: string): boolean {
  const getVowels = (w: string) => w.replace(/[^AEIOU]/g, "");
  return getVowels(word1) === getVowels(word2);
}

function normalizeTranscript(text: string): string {
  // Remove punctuation and map numbers to words
  return text
    .toUpperCase()
    .replace(/[.,!?]/g, "")
    .split(/\s+/)
    .map(w => DIGIT_MAP[w] || w)
    .join(" ");
}

interface LevelVoiceEvaluationProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelVoiceEvaluation({ levelId, accent }: LevelVoiceEvaluationProps) {
  const navigate = useNavigate();
  const [words, setWords] = useState<string[]>(() => shuffle(CVC_WORDS).slice(0, 10));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "close" | "wrong" | null>(null);
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [recognition, setRecognition] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentWord = words[currentIndex];
  const progress = (completedWords.size / words.length) * 100;
  const allDone = completedWords.size >= words.length;

  // Initialize speech recognition
  useEffect(() => {
    let currentRecognition: any = null;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (typeof window !== "undefined" && SpeechRecognitionAPI) {
      const SpeechRecognition = SpeechRecognitionAPI;
      currentRecognition = new SpeechRecognition();

      currentRecognition.continuous = false;
      currentRecognition.interimResults = false;
      currentRecognition.lang = "en-US";
      currentRecognition.maxAlternatives = 3;

      currentRecognition.onresult = (event: any) => {
        const results = event.results[0];
        let bestMatch = "";
        let bestSimilarity = 0;
        let isPerfectMatch = false;

        // Check all alternatives
        for (let i = 0; i < results.length; i++) {
          const raw = results[i].transcript.trim();
          const normalized = normalizeTranscript(raw);

          // Get allowed variations (the actual word + any known homophones)
          const allowedWords = [currentWord];
          if (HOMOPHONES[currentWord]) {
            allowedWords.push(...HOMOPHONES[currentWord]);
          }

          // Strict check: Exact match OR the specific word is separated by spaces
          const words = normalized.split(" ");

          let matchedTarget = false;
          for (const target of allowedWords) {
            if (normalized === target || words.includes(target)) {
              matchedTarget = true;
              break;
            }
          }

          if (matchedTarget) {
            bestMatch = currentWord; // Display the correct spelling in UI, even if they said a homophone
            bestSimilarity = 1;
            isPerfectMatch = true;
            break;
          }

          // Fuzzy match check
          for (const word of words) {
            const similarity = calculateSimilarity(word, currentWord);
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              bestMatch = word;
            }
          }
        }

        if (!bestMatch) {
          bestMatch = normalizeTranscript(results[0].transcript.trim());
        }

        setTranscript(bestMatch);
        setIsListening(false);

        if (isPerfectMatch || bestSimilarity === 1) {
          setFeedback("correct");
          setTimeout(() => {
            const newCompleted = new Set(completedWords);
            newCompleted.add(currentWord);
            setCompletedWords(newCompleted);
            setFeedback(null);
            setTranscript("");
          }, 1500);
        } else if (bestSimilarity >= 0.66 && hasSameVowels(bestMatch, currentWord)) {
          // At least 66% similar BUT MUST HAVE EXACT SAME VOWELS (rejects TEEN for TIN)
          setFeedback("close");
          setTimeout(() => {
            const newCompleted = new Set(completedWords);
            newCompleted.add(currentWord);
            setCompletedWords(newCompleted);
            setFeedback(null);
            setTranscript("");
          }, 2000);
        } else {
          setFeedback("wrong");
        }
      };

      currentRecognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setFeedback("wrong");
      };

      currentRecognition.onend = () => {
        setIsListening(false);
      };

      setRecognition(currentRecognition);
    }

    // Cleanup function to prevent zombie microphone instances when skipping words
    return () => {
      if (currentRecognition) {
        try {
          currentRecognition.stop();
          currentRecognition.onresult = null;
          currentRecognition.onerror = null;
          currentRecognition.onend = null;
        } catch (e) { }
      }
    };
  }, [currentIndex, currentWord, completedWords, feedback === null]);

  const handleTryAgain = () => {
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    setFeedback(null);
    setTranscript("");
    setIsListening(false);
  };

  const startListening = () => {
    if (recognition && !isListening && !feedback) {
      setTranscript("");
      setIsListening(true);
      try {
        recognition.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const goNext = () => {
    if (currentIndex < words.length - 1) {
      if (!completedWords.has(currentWord)) {
        // Move uncompleted word to the end of the array
        setWords((prev) => {
          const newWords = [...prev];
          const skipped = newWords.splice(currentIndex, 1)[0];
          newWords.push(skipped);
          return newWords;
        });
        // Index stays the same to show the next word in the newly shifted array
      } else {
        setCurrentIndex(currentIndex + 1);
      }
      setTranscript("");
      setFeedback(null);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setTranscript("");
      setFeedback(null);
    }
  };

  const handleGoBack = () => {
    if (!allDone) {
      const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
      if (!confirmExit) return;
    }
    navigate("/levels", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="rounded-full"
          >
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: accent.primary }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <span className="text-sm" style={{ color: accent.primary }}>
            {completedWords.size}/{words.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl mb-1" style={{ color: accent.primary }}>
            Voice Evaluation
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Practice pronunciation with speech recognition! Say CVC words out loud and get instant feedback.
          </p>
        </div>

        {/* Tags */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {["Voice Recognition", "CVC Words", "Speech Practice"].map((tag) => (
            <span
              key={tag}
              className="text-xs px-3 py-1 rounded-full text-white"
              style={{ background: accent.primary }}
            >
              {tag}
            </span>
          ))}
        </div>

        {!(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>Your browser doesn't support the Voice Recognition API. Please use Chrome or a modern mobile browser.</p>
          </div>
        )}

        {!allDone ? (
          <>
            {/* Current Word Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-8"
              >
                <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Word {currentIndex + 1} of {words.length}
                </div>

                <div
                  className={`inline-flex flex-col items-center gap-4 px-12 py-8 rounded-3xl shadow-xl mb-6 transition-all ${feedback === "correct" || feedback === "close"
                    ? "bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 ring-4 ring-green-500"
                    : feedback === "wrong"
                      ? "bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 ring-4 ring-red-500"
                      : "bg-white dark:bg-gray-800"
                    }`}
                >
                  {/* Display Word (Clickable Letters) */}
                  <div className="flex gap-2">
                    {currentWord.split("").map((letter, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const audio = new Audio(`/audio/alphasounds-${letter.toLowerCase()}.mp3`);
                          audio.play().catch(() => { });
                        }}
                        className="text-7xl tracking-wider hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        style={{ color: accent.primary }}
                        disabled={!!feedback || isListening}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>

                  {/* Microphone Button */}
                  {!completedWords.has(currentWord) && feedback !== "wrong" && (
                    <button
                      onClick={isListening ? stopListening : startListening}
                      disabled={!!feedback}
                      className={`px-8 py-4 rounded-3xl flex items-center gap-3 transition-all ${isListening
                        ? "bg-gradient-to-br from-red-500 to-red-600 scale-105 animate-pulse"
                        : feedback
                          ? "bg-gray-300 dark:bg-gray-600"
                          : "bg-gradient-to-br from-[#FF4B8A] to-[#e0336e] hover:scale-105 shadow-lg"
                        }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-8 h-8 text-white" />
                          <span className="text-white font-bold text-lg">Listening...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-8 h-8 text-white" />
                          <span className="text-white font-bold text-lg">Tap to Start</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Status Text */}
                  <div className="min-h-[2rem] flex flex-col items-center">
                    {transcript && !feedback && !isListening && (
                      <p className="text-gray-600 dark:text-gray-400">
                        You said: {transcript}
                      </p>
                    )}
                    {feedback === "correct" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 text-green-600 dark:text-green-400"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="text-lg">Perfect! "{currentWord}"</span>
                      </motion.div>
                    )}
                    {feedback === "close" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 text-green-500 dark:text-green-400"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="text-lg">Close enough! (Heard: {transcript})</span>
                      </motion.div>
                    )}
                    {feedback === "wrong" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center gap-4 text-red-600 dark:text-red-400"
                      >
                        <div className="flex items-center gap-2">
                          <XCircle className="w-6 h-6" />
                          <span className="text-lg text-center">
                            Oops! You said: <br />
                            <b className="text-2xl mt-1 block">"{transcript || "nothing"}"</b>
                          </span>
                        </div>
                        <Button
                          onClick={handleTryAgain}
                          variant="outline"
                          size="lg"
                          className="mt-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full px-8"
                        >
                          <RotateCcw className="w-5 h-5 mr-2" />
                          Try Again
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  {/* Completed Badge */}
                  {completedWords.has(currentWord) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 text-[#58CC02]"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Completed!</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between items-center mb-6">
              <Button
                onClick={goPrev}
                disabled={currentIndex === 0 || isListening || feedback === "correct" || feedback === "close"}
                variant="outline"
                size="lg"
                className="rounded-xl px-6 py-5 border-2 disabled:opacity-30"
                style={{ borderColor: accent.primary, color: accent.primary }}
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back
              </Button>
              <Button
                onClick={goNext}
                disabled={currentIndex === words.length - 1 || isListening || feedback === "correct" || feedback === "close"}
                variant="outline"
                size="lg"
                className="rounded-xl px-6 py-5 border-2 disabled:opacity-30"
                style={{ borderColor: accent.primary, color: accent.primary }}
              >
                Next
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </div>

            {/* Completed Words */}
            {completedWords.size > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
                  Completed words:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {Array.from(completedWords).map((word, i) => (
                    <span
                      key={i}
                      className="px-4 py-2 rounded-full text-white text-sm"
                      style={{
                        background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                      }}
                    >
                      {word} ✓
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* All Done */
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block mb-6"
            >
              <Sparkles className="w-20 h-20 text-[#FFC800]" />
            </motion.div>
            <h3 className="text-3xl mb-4" style={{ color: accent.primary }}>
              Excellent Work!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You completed {words.length} out of {words.length} words correctly!
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {words.map((word, i) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-full text-white text-lg"
                  style={{
                    background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
            <Button
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true);
                try {
                  const profileStr = localStorage.getItem("userProfile");
                  if (profileStr) {
                    const profile = JSON.parse(profileStr);
                    if (profile.id) {
                      await supabase.from("progress").insert({
                        student_id: profile.id,
                        level_id: levelId,
                        score: words.length
                      });
                    }
                  }
                } catch (err) {
                  console.error("Error saving progress:", err);
                }

                const completedLevels = JSON.parse(
                  localStorage.getItem("completedLevels") || "[]"
                );
                if (!completedLevels.includes(levelId)) {
                  completedLevels.push(levelId);
                  localStorage.setItem(
                    "completedLevels",
                    JSON.stringify(completedLevels)
                  );
                }
                setIsSaving(false);
                navigate("/levels");
              }}
              size="lg"
              className="rounded-xl px-8 py-6 text-lg text-white"
              style={{
                background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
              }}
            >
              <Home className="w-5 h-5 mr-2" />
              {isSaving ? "Saving..." : "Back to Levels"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
