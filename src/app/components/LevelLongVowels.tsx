import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Home,
  Volume2,
  Mic,
  MicOff,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { LONG_VOWELS_DATA, LongVowelWord, LETTER_NAMES } from "../data/levels";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface LevelLongVowelsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelLongVowels({ levelId, accent }: LevelLongVowelsProps) {
  const navigate = useNavigate();

  // Vowel selector or active vowel
  const [selectedVowel, setSelectedVowel] = useState<string | null>(null);

  // States for evaluation
  const [evaluatingWord, setEvaluatingWord] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState<Record<string, "correct" | "close" | "wrong" | null>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  
  // Progress trackers
  const [completedWords, setCompletedWords] = useState<Set<string>>(() => {
    return new Set(JSON.parse(localStorage.getItem("completedLongVowelWords") || "[]"));
  });

  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Find active vowel data
  const activeVowelData = useMemo(() => {
    return LONG_VOWELS_DATA.find((d) => d.vowel === selectedVowel) || null;
  }, [selectedVowel]);

  // Compute total words and completed count for progress
  const allWordsList = useMemo(() => {
    const list: string[] = [];
    LONG_VOWELS_DATA.forEach((d) => {
      d.patterns.forEach((p) => {
        p.words.forEach((w) => {
          list.push(w.word);
        });
      });
    });
    return list;
  }, []);

  const vowelProgress = useMemo(() => {
    const stats: Record<string, { completed: number; total: number }> = {};
    LONG_VOWELS_DATA.forEach((d) => {
      let total = 0;
      let completed = 0;
      d.patterns.forEach((p) => {
        p.words.forEach((w) => {
          total++;
          if (completedWords.has(w.word)) {
            completed++;
          }
        });
      });
      stats[d.vowel] = { completed, total };
    });
    return stats;
  }, [completedWords]);

  const playTTS = (word: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.toLowerCase());
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleResult = useCallback(
    (word: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
      setTranscripts((prev) => ({ ...prev, [word]: transcript }));
      setEvalFeedback((prev) => ({ ...prev, [word]: status }));

      if (status === "correct" || status === "close") {
        setShowConfetti(true);
        setCompletedWords((prev) => {
          const next = new Set(prev);
          next.add(word);
          localStorage.setItem("completedLongVowelWords", JSON.stringify(Array.from(next)));
          return next;
        });

        setTimeout(() => {
          setEvaluatingWord(null);
          setShowConfetti(false);
        }, 1500);
      } else {
        setTimeout(() => {
          setEvalFeedback((prev) => ({ ...prev, [word]: null }));
          setEvaluatingWord(null);
        }, 2000);
      }
    },
    []
  );

  const handleError = useCallback(() => {
    setEvaluatingWord(null);
  }, []);

  const handleSilence = useCallback(() => {
    if (evaluatingWord) {
      setEvalFeedback((prev) => ({ ...prev, [evaluatingWord]: "wrong" }));
      setTimeout(() => {
        setEvalFeedback((prev) => ({ ...prev, [evaluatingWord]: null }));
        setEvaluatingWord(null);
      }, 1500);
    }
  }, [evaluatingWord]);

  useSpeechRecognition({
    evaluatingWord,
    enabled: !!evaluatingWord,
    onResult: handleResult,
    onError: handleError,
    onSilenceTimeout: handleSilence
  });

  const startListening = (word: string) => {
    if (evaluatingWord) return;
    setEvaluatingWord(word);
    setEvalFeedback((prev) => ({ ...prev, [word]: null }));
    setTranscripts((prev) => ({ ...prev, [word]: "" }));
  };

  const handleGoBack = () => {
    if (selectedVowel) {
      setSelectedVowel(null);
    } else {
      const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
      if (!confirmExit) return;
      navigate("/levels", { replace: true });
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const profileStr = localStorage.getItem("userProfile");
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.id) {
          await supabase.from("progress").insert({
            student_id: profile.id,
            level_id: levelId,
            score: completedWords.size,
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
      localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
    }
    setIsSaving(false);
    navigate("/levels");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:bg-none dark:bg-[#0d141c] pb-12 flex flex-col">
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full">
            {selectedVowel ? <ArrowLeft className="w-5 h-5" /> : <Home className="w-5 h-5" />}
          </Button>
          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            {selectedVowel ? `Long Vowel ${selectedVowel}` : "Lesson 5: Long Vowels"}
          </h2>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase">
            {completedWords.size}/{allWordsList.length} read
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col justify-start w-full">
        <AnimatePresence mode="wait">
          {/* VOWEL SELECTOR PHASE */}
          {!selectedVowel ? (
            <motion.div
              key="vowel-selector"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full text-center"
            >
              <div className="mb-8">
                <h1 className="text-4xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Say Your Name! 🗣️
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Long vowels are special—they say their own names! Choose a vowel to see its words.
                </p>
              </div>

              {/* Vowel Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
                {LONG_VOWELS_DATA.map((vData) => {
                  const { completed, total } = vowelProgress[vData.vowel];
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const isDone = completed === total && total > 0;

                  return (
                    <motion.button
                      key={vData.vowel}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedVowel(vData.vowel)}
                      className={`p-6 rounded-[2rem] border-3 shadow-md bg-white dark:bg-gray-800 cursor-pointer flex flex-col items-center justify-between min-h-[160px] transition-all hover:shadow-lg ${
                        isDone ? "border-green-500" : "border-amber-300 hover:border-amber-400"
                      }`}
                    >
                      <span className="text-5xl font-black text-amber-500 mb-2">{vData.vowel}</span>
                      <div className="text-center w-full">
                        <span className="text-xs text-gray-400 font-bold block mb-1">
                          "{LETTER_NAMES[vData.vowel]}" Sound
                        </span>
                        
                        {/* Custom visual progress bubble */}
                        <div className="mt-2 text-xs font-black inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 py-1 px-3 rounded-full">
                          {isDone ? (
                            <span className="text-green-600 flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5 inline" /> Done!</span>
                          ) : (
                            <span>{completed}/{total} Read</span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Final Completion Action */}
              <div className="max-w-xs mx-auto">
                <Button
                  onClick={handleFinish}
                  size="lg"
                  className="rounded-2xl w-full py-6 font-bold text-white shadow-lg text-lg"
                  style={{
                    background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                  }}
                >
                  Finish Lesson <Sparkles className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : (
            /* VOWEL EXPLORER PAGE (COLUMNS SIDE-BY-SIDE) */
            <motion.div
              key="vowel-explorer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full flex-1 flex flex-col"
            >
              {/* Vowel Heading */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Long {selectedVowel} Patterns
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Tap any word to hear its pronunciation. Use the microphone to practice saying it!
                </p>
              </div>

              {/* Side-by-side Columns Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch mb-8 flex-1">
                {activeVowelData?.patterns.map((pattern) => {
                  return (
                    <div
                      key={pattern.pattern}
                      className="bg-white dark:bg-gray-800/80 rounded-3xl p-6 border-2 border-amber-200 dark:border-gray-700 shadow-lg flex flex-col justify-start"
                    >
                      {/* Column Header */}
                      <div className="text-center border-b-2 border-dashed border-amber-100 dark:border-gray-700 pb-4 mb-6">
                        <span className="text-xs uppercase font-bold tracking-wider text-amber-500 dark:text-amber-400 block mb-1">
                          {pattern.name}
                        </span>
                        <span className="text-2xl font-black text-gray-700 dark:text-gray-200">
                          {pattern.pattern}
                        </span>
                      </div>

                      {/* Words Vertical Rows inside this column */}
                      <div className="space-y-4 flex-1">
                        {pattern.words.map((w: LongVowelWord) => {
                          const isDone = completedWords.has(w.word);
                          const isCurrent = evaluatingWord === w.word;
                          const feedback = evalFeedback[w.word];
                          const transcript = transcripts[w.word];

                          return (
                            <div
                              key={w.word}
                              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                isDone
                                  ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                                  : isCurrent
                                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-400 shadow-md"
                                    : "bg-gray-50/30 dark:bg-gray-900/30 border-gray-100 dark:border-gray-850 hover:bg-gray-50 dark:hover:bg-gray-900"
                              }`}
                            >
                              {/* Word letters with custom bracket highlighting */}
                              <div
                                onClick={() => playTTS(w.word)}
                                className="flex items-center gap-1 cursor-pointer select-none text-2xl font-bold tracking-wider text-gray-700 dark:text-gray-200"
                              >
                                {w.word.split("").map((char, index) => {
                                  const isHighlighted = w.highlights.includes(index);
                                  return (
                                    <span
                                      key={index}
                                      className={`transition-colors ${
                                        isHighlighted
                                          ? "text-rose-500 font-extrabold"
                                          : ""
                                      }`}
                                    >
                                      {isHighlighted ? `(${char})` : char}
                                    </span>
                                  );
                                })}
                                <Volume2 className="w-4 h-4 ml-2 text-gray-400 opacity-60 hover:text-amber-500" />
                              </div>

                              {/* Mic or Checkmark */}
                              <div className="flex items-center gap-2">
                                {isCurrent && (
                                  <div className="text-[10px] font-semibold text-rose-500 animate-pulse mr-1">
                                    {transcript ? `Heard: "${transcript}"` : "Listening..."}
                                  </div>
                                )}
                                {feedback === "wrong" && (
                                  <AlertCircle className="w-5 h-5 text-red-500 animate-shake" />
                                )}

                                <button
                                  onClick={() => (isCurrent ? setEvaluatingWord(null) : startListening(w.word))}
                                  disabled={(evaluatingWord !== null && !isCurrent) || isDone}
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                    isDone
                                      ? "bg-green-500 text-white opacity-60 cursor-default"
                                      : isCurrent
                                        ? "bg-red-500 text-white shadow-lg animate-pulse"
                                        : "bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-950 text-amber-600 dark:text-amber-400 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
                                  }`}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                  ) : isCurrent ? (
                                    <MicOff className="w-4 h-4" />
                                  ) : (
                                    <Mic className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Vowel detail navigation */}
              <div className="flex justify-between items-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedVowel(null)}
                  className="rounded-2xl py-6 font-bold"
                >
                  ← Vowel Selector
                </Button>

                <Button
                  onClick={() => {
                    const completedVowelList = Array.from(completedWords);
                    // Check if current vowel words are all read
                    const nextVowelIndex = LONG_VOWELS_DATA.findIndex((d) => d.vowel === selectedVowel) + 1;
                    if (nextVowelIndex < LONG_VOWELS_DATA.length) {
                      setSelectedVowel(LONG_VOWELS_DATA[nextVowelIndex].vowel);
                    } else {
                      setSelectedVowel(null);
                    }
                  }}
                  className="rounded-2xl py-6 font-bold text-white shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                  }}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
