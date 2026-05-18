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
  Volume2,
} from "lucide-react";
import { Button } from "./ui/button";
import { CVC_WORDS, shuffle } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Confetti } from "./ui/Confetti";

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
    .trim()
    .split(/\s+/)
    .map(w => DIGIT_MAP[w] || w)
    .join(" ");
}

// Check if consonants (start and end) match, even if the middle vowel is different
function matchConsonants(word1: string, word2: string): boolean {
  const getConsonants = (w: string) => w.replace(/[AEIOU]/g, "");
  return getConsonants(word1) === getConsonants(word2);
}

interface LevelVoiceEvaluationProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  customWords?: string[];
  isSubPhase?: boolean;
  onComplete?: () => void;
}

export function LevelVoiceEvaluation({ levelId, accent, customWords, isSubPhase, onComplete }: LevelVoiceEvaluationProps) {
  const navigate = useNavigate();
  const [words] = useState<string[]>(() => customWords ? customWords : shuffle(CVC_WORDS).slice(0, 10));

  const [evaluatingWord, setEvaluatingWord] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState<Record<string, "correct" | "close" | "wrong" | null>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const playTTS = async (text: string) => {
    const speakText = text.toLowerCase();
    try {
      await TextToSpeech.speak({
        text: speakText,
        lang: 'en-US',
        rate: 0.85,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });
    } catch (e) {
      console.warn('[TTS] Capacitor failed, falling back to Web Speech API:', e);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speakText);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const progress = (completedWords.size / words.length) * 100;
  const allDone = completedWords.size >= words.length;

  // Initialize speech recognition dynamically when a word is selected
  useEffect(() => {
    let currentRecognition: any = null;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (evaluatingWord && typeof window !== "undefined" && SpeechRecognitionAPI) {
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

          // Get allowed variations
          const allowedWords = [evaluatingWord];
          if (HOMOPHONES[evaluatingWord]) {
            allowedWords.push(...HOMOPHONES[evaluatingWord]);
          }

          const phraseWords = normalized.split(" ");
          let matchedTarget = false;
          for (const target of allowedWords) {
            if (normalized === target || phraseWords.includes(target)) {
              matchedTarget = true;
              break;
            }
          }

          if (matchedTarget) {
            bestMatch = evaluatingWord;
            bestSimilarity = 1;
            isPerfectMatch = true;
            break;
          }

          for (const word of phraseWords) {
            const similarity = calculateSimilarity(word, evaluatingWord);
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              bestMatch = word;
            }
          }
        }

        if (!bestMatch) {
          bestMatch = normalizeTranscript(results[0].transcript.trim());
        }

        setTranscripts(prev => ({ ...prev, [evaluatingWord]: bestMatch }));

        if (isPerfectMatch || bestSimilarity === 1) {
          setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: "correct" }));
          setShowConfetti(true);
          const newCompleted = new Set(completedWords);
          newCompleted.add(evaluatingWord);
          setCompletedWords(newCompleted);
          setTimeout(() => {
            setEvaluatingWord(null);
            setShowConfetti(false);
          }, 1500);
        } else if (bestSimilarity >= 0.5 || matchConsonants(bestMatch, evaluatingWord)) {
          setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: "close" }));
          setShowConfetti(true);
          const newCompleted = new Set(completedWords);
          newCompleted.add(evaluatingWord);
          setCompletedWords(newCompleted);
          setTimeout(() => {
            setEvaluatingWord(null);
            setShowConfetti(false);
          }, 2000);
        } else {
          setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: "wrong" }));
          setTimeout(() => {
            setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: null }));
            setEvaluatingWord(null);
          }, 2500);
        }
      };

      currentRecognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "network") {
          setSpeechError("Connection interrupted! Google speech servers might be blocked by Brave Shields or a local network firewall. If you are using Brave, please turn OFF Shields for this site!");
        } else if (event.error === "not-allowed") {
          setSpeechError("Microphone access blocked! Please click the lock icon 🔒 next to the web address and choose 'Allow' for Microphone.");
        } else if (event.error === "no-speech") {
          // Normal timeout, no alert needed
        } else {
          setSpeechError(`Voice recognition stopped: ${event.error}. Please tap the mic to try again.`);
        }

        setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: "wrong" }));
        setTimeout(() => {
          setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: null }));
          setEvaluatingWord(null);
        }, event.error === "no-speech" ? 1000 : 4000);
      };

      try {
        currentRecognition.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        setEvaluatingWord(null);
      }
    }

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
  }, [evaluatingWord, completedWords]);

  const startRecording = (word: string) => {
    if (evaluatingWord || completedWords.has(word)) return;
    setSpeechError(null);
    setEvaluatingWord(word);
    setEvalFeedback(prev => ({ ...prev, [word]: null }));
    setTranscripts(prev => ({ ...prev, [word]: "" }));
  };

  const handleGoBack = () => {
    if (!allDone) {
      const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
      if (!confirmExit) return;
    }
    navigate("/levels", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:bg-none dark:bg-[#0d141c]">
      <Confetti active={showConfetti} />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="rounded-full"
          >
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center pr-8">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: accent.primary }}>
              Voice Evaluation
            </h2>
          </div>
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

        {!(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>Your browser doesn't support the Voice Recognition API. Please use Chrome or a modern mobile browser.</p>
          </div>
        )}

        {speechError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/30 rounded-3xl p-4 mb-6 text-red-600 dark:text-red-400 text-sm flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold mb-1">Voice Recognition Error</h4>
              <p>{speechError}</p>
            </div>
            <button
              onClick={() => setSpeechError(null)}
              className="text-xs font-bold px-3 py-1 rounded-full border border-red-300 dark:border-red-800 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/50 cursor-pointer"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {!allDone ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="list-phase"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-8"
            >
              <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto">
                {words.map((w) => {
                  const isDone = completedWords.has(w);
                  const isCurrent = evaluatingWord === w;
                  const feedback = evalFeedback[w];
                  const transcript = transcripts[w];

                  return (
                    <div key={w} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isCurrent ? 'border-pink-400' : isDone ? 'border-green-200' : 'border-transparent'}`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                        <span className="text-3xl font-bold w-20 text-left tracking-widest uppercase" style={{ color: isDone ? '#58CC02' : accent.primary }}>{w}</span>
                        {feedback === 'correct' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500 flex items-center gap-1 text-sm font-bold"><CheckCircle2 className="w-4 h-4" /> Correct!</motion.div>}
                        {feedback === 'close' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-blue-500 flex items-center gap-1 text-sm font-bold"><Sparkles className="w-4 h-4" /> Close enough!</motion.div>}
                        {feedback === 'wrong' && (
                          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`flex items-center justify-center gap-1 font-bold text-sm text-red-500`}>
                            <AlertCircle className="w-4 h-4" /> Try again!
                          </motion.div>
                        )}
                        {isCurrent && transcript && (
                          <div className="p-1 bg-gray-200 rounded text-[10px] font-mono text-gray-700 mt-1 sm:mt-0">
                            Heard: {transcript}
                          </div>
                        )}
                        {isCurrent && !transcript && <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className="text-pink-500 text-xs font-bold italic mt-1 sm:mt-0">Listening...</motion.div>}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (isCurrent) {
                              setEvaluatingWord(null);
                            } else {
                              startRecording(w);
                            }
                          }}
                          disabled={(evaluatingWord !== null && !isCurrent) || isDone}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default' : isCurrent ? 'bg-red-500 text-white animate-pulse' : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'}`}
                        >
                          {isDone ? <CheckCircle2 className="w-6 h-6" /> : isCurrent ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                Click the mic next to each word to practice its pronunciation
              </div>
            </motion.div>
          </AnimatePresence>
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
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {words.map((word, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => playTTS(word)}
                  className="px-4 py-2.5 rounded-full text-white text-lg font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all hover:brightness-105 active:brightness-95 border-b-4 border-black/20"
                  style={{
                    background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                  }}
                >
                  <Volume2 className="w-5 h-5 text-white/90" />
                  <span>{word}</span>
                </motion.button>
              ))}
            </div>
            <Button
              disabled={isSaving}
              onClick={async () => {
                if (isSubPhase) {
                  if (onComplete) onComplete();
                  return;
                }

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
                if (onComplete) {
                   onComplete();
                } else {
                   navigate("/levels");
                }
              }}
              size="lg"
              className="rounded-xl px-8 py-6 text-lg text-white"
              style={{
                background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
              }}
            >
              {onComplete ? <ArrowRight className="w-5 h-5 mr-2" /> : <Home className="w-5 h-5 mr-2" />}
              {isSaving ? "Saving..." : onComplete ? (isSubPhase ? "Next Challenge" : "Next Phase") : "Back to Levels"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
