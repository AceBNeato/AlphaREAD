import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Home, Volume2, Mic, MicOff, CheckCircle2, Sparkles, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { LONG_VOWELS_DATA, LongVowelWord, LETTER_NAMES, LETTER_TTS, shuffle } from "../data/levels";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { applyMaleVoice } from "../utils/audio";
import { useAudioVisualizer } from "../hooks/useAudioVisualizer";

interface LevelLongVowelsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type Phase = "review" | "voice-patterns" | "voice-words";

export function LevelLongVowels({ levelId, accent }: LevelLongVowelsProps) {
  const navigate = useNavigate();

  const [selectedVowel, setSelectedVowel] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase>("review");

  // Voice Test States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluatingTarget, setEvaluatingTarget] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState<"correct" | "wrong" | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const [completedWords, setCompletedWords] = useState<Set<string>>(() => {
    return new Set(JSON.parse(localStorage.getItem("completedLongVowelWords") || "[]"));
  });

  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);
  useAudioVisualizer(isMobile, !!evaluatingTarget);

  const activeVowelData = useMemo(() => {
    return LONG_VOWELS_DATA.find((d) => d.vowel === selectedVowel) || null;
  }, [selectedVowel]);

  const patternTargets = useMemo(() => {
    if (!activeVowelData) return [];
    return activeVowelData.patterns.map(p => p.pattern);
  }, [activeVowelData]);

  const wordTargets = useMemo(() => {
    if (!activeVowelData) return [];
    const words: string[] = [];
    activeVowelData.patterns.forEach(p => p.words.forEach(w => words.push(w.word)));
    return shuffle(words);
  }, [activeVowelData]);

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

  const playTTS = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      // If it's a single letter, use LETTER_TTS
      const ttsText = text.length === 1 ? (LETTER_TTS[text] || text) : text.toLowerCase();
      const utterance = new SpeechSynthesisUtterance(ttsText);
      utterance.rate = 0.85;
      applyMaleVoice(utterance);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleResult = useCallback(
    (target: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
      setVoiceTranscript(transcript);
      
      const tLower = transcript.toLowerCase();
      let isCorrect = status === "correct" || status === "close" || tLower.includes(target.toLowerCase());

      // If we are testing patterns, the target is the pattern string, but the correct answer is the VOWEL NAME.
      if (currentPhase === "voice-patterns" && selectedVowel) {
        const vName = LETTER_NAMES[selectedVowel]?.toLowerCase() || "";
        const vTTS = LETTER_TTS[selectedVowel]?.toLowerCase() || "";
        isCorrect = tLower.includes(vName) || tLower.includes(vTTS) || tLower.includes(selectedVowel.toLowerCase());
      }

      if (isCorrect) {
        setEvalFeedback("correct");
        
        if (currentPhase === "voice-words") {
            setCompletedWords((prev) => {
                const next = new Set(prev);
                next.add(target);
                localStorage.setItem("completedLongVowelWords", JSON.stringify(Array.from(next)));
                return next;
            });
        }

        setTimeout(() => {
          setEvaluatingTarget(null);
          
          const maxIdx = currentPhase === "voice-patterns" ? patternTargets.length - 1 : wordTargets.length - 1;
          if (currentIndex < maxIdx) {
             setCurrentIndex(prev => prev + 1);
             setEvalFeedback(null);
             setVoiceTranscript("");
          } else {
             setShowConfetti(true);
          }
        }, 1500);
      } else {
        setEvalFeedback("wrong");
        setTimeout(() => {
          setEvalFeedback(null);
          setEvaluatingTarget(null);
        }, 2000);
      }
    },
    [currentPhase, selectedVowel, currentIndex, patternTargets, wordTargets]
  );

  useSpeechRecognition({
    evaluatingWord: evaluatingTarget,
    enabled: !!evaluatingTarget,
    onResult: handleResult,
    onError: () => setEvaluatingTarget(null),
    onSilenceTimeout: () => {
      setEvalFeedback("wrong");
      setTimeout(() => {
        setEvalFeedback(null);
        setEvaluatingTarget(null);
      }, 1500);
    }
  });

  const handleGoBack = () => {
    if (currentPhase === "voice-words") {
      setCurrentPhase("voice-patterns");
      setCurrentIndex(0);
      setShowConfetti(false);
      setEvaluatingTarget(null);
    } else if (currentPhase === "voice-patterns") {
      setCurrentPhase("review");
      setCurrentIndex(0);
      setShowConfetti(false);
      setEvaluatingTarget(null);
    } else if (selectedVowel) {
      setSelectedVowel(null);
      setCurrentPhase("review");
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

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full">
            {selectedVowel || currentPhase !== "review" ? <ArrowLeft className="w-5 h-5" /> : <Home className="w-5 h-5" />}
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
                  Long vowels are special—they say their own names! Choose a vowel to explore.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
                {LONG_VOWELS_DATA.map((vData) => {
                  const { completed, total } = vowelProgress[vData.vowel];
                  const isDone = completed === total && total > 0;

                  return (
                    <motion.button
                      key={vData.vowel}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                          setSelectedVowel(vData.vowel);
                          setCurrentPhase("review");
                      }}
                      className={`p-6 rounded-[2rem] border-3 shadow-md bg-white dark:bg-gray-800 cursor-pointer flex flex-col items-center justify-between min-h-[160px] transition-all hover:shadow-lg ${
                        isDone ? "border-green-500" : "border-amber-300 hover:border-amber-400"
                      }`}
                    >
                      <span className="text-5xl font-black text-amber-500 mb-2">{vData.vowel}</span>
                      <div className="text-center w-full">
                        <span className="text-xs text-gray-400 font-bold block mb-1">
                          "{LETTER_NAMES[vData.vowel]}" Sound
                        </span>
                        
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
          ) : currentPhase === "review" && activeVowelData ? (
            <motion.div
              key="phase-review"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full flex-1 flex flex-col"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Long {selectedVowel} Combinations
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Review the patterns. Tap any word or heading to hear it spoken!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch mb-8 flex-1">
                {activeVowelData.patterns.map((pattern) => {
                  return (
                    <div
                      key={pattern.pattern}
                      className="bg-white dark:bg-gray-800/80 rounded-3xl p-6 border-2 border-amber-200 dark:border-gray-700 shadow-lg flex flex-col justify-start"
                    >
                      {/* Clickable Column Header for TTS letter sound */}
                      <div 
                         onClick={() => playTTS(selectedVowel)}
                         className="text-center border-b-2 border-dashed border-amber-100 dark:border-gray-700 pb-4 mb-6 cursor-pointer hover:bg-amber-50 dark:hover:bg-gray-700 rounded-xl transition-colors active:scale-95"
                      >
                        <span className="text-xs uppercase font-bold tracking-wider text-amber-500 dark:text-amber-400 block mb-1">
                          {pattern.name}
                        </span>
                        <span className="text-2xl font-black text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2">
                          {pattern.pattern} <Volume2 className="w-5 h-5 text-amber-400" />
                        </span>
                      </div>

                      <div className="space-y-4 flex-1">
                        {pattern.words.map((w: LongVowelWord) => {
                          const isDone = completedWords.has(w.word);

                          return (
                            <div
                              key={w.word}
                              onClick={() => playTTS(w.word)}
                              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer active:scale-95 ${
                                isDone
                                  ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                                  : "bg-gray-50/30 dark:bg-gray-900/30 border-gray-100 dark:border-gray-850 hover:bg-gray-50 dark:hover:bg-gray-900"
                              }`}
                            >
                              <div className="flex items-center gap-1 select-none text-2xl font-bold tracking-wider text-gray-700 dark:text-gray-200">
                                {w.word.split("").map((char, index) => {
                                  const isHighlighted = w.highlights.includes(index);
                                  return (
                                    <span key={index} className={isHighlighted ? "text-rose-500 font-extrabold" : ""}>
                                      {isHighlighted ? `(${char})` : char}
                                    </span>
                                  );
                                })}
                              </div>
                              <Volume2 className={`w-5 h-5 ${isDone ? "text-green-500" : "text-gray-400"}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center mt-6">
                <Button
                  size="lg"
                  onClick={() => { setCurrentPhase("voice-patterns"); setCurrentIndex(0); }}
                  className="rounded-2xl px-12 py-6 font-bold text-white shadow-md text-lg animate-pulse"
                  style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                >
                  Test Combinations <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : currentPhase === "voice-patterns" ? (
            <motion.div
              key="phase-voice-patterns"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-md mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  What sound is this? 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Tap the microphone and say the vowel name loud and clear.
                </p>
              </div>

              {showConfetti ? (
                 <div className="py-12 flex flex-col items-center">
                   <CheckCircle2 className="w-24 h-24 text-green-500 mb-6" />
                   <h3 className="text-2xl font-bold mb-6">Patterns Passed!</h3>
                   <Button onClick={() => { setShowConfetti(false); setCurrentPhase("voice-words"); setCurrentIndex(0); }} size="lg" className="rounded-xl px-8" style={{ background: accent.primary }}>
                     Test Words <ArrowRight className="w-5 h-5 ml-2" />
                   </Button>
                 </div>
              ) : (
                <>
                  <motion.div 
                    className="w-64 h-40 rounded-[3rem] bg-white dark:bg-gray-800 shadow-xl border-4 flex flex-col items-center justify-center mb-10 select-none"
                    style={{ borderColor: evalFeedback === 'correct' ? '#58CC02' : evalFeedback === 'wrong' ? '#EF4444' : accent.primary }}
                  >
                    <span className="text-7xl font-black" style={{ color: accent.primary }}>
                      {patternTargets[currentIndex]}
                    </span>
                  </motion.div>

                  <button
                    onClick={() => setEvaluatingTarget(patternTargets[currentIndex])}
                    disabled={evaluatingTarget !== null || evalFeedback === "correct"}
                    className={`w-28 h-28 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all relative z-10 ${
                      evaluatingTarget ? "bg-red-500 animate-pulse" : evalFeedback === "correct" ? "bg-green-500" : "bg-amber-500 hover:bg-amber-600 hover:scale-105 active:scale-95"
                    }`}
                  >
                    {evaluatingTarget ? <Mic className="w-12 h-12 mb-1" /> : evalFeedback === "correct" ? <CheckCircle2 className="w-12 h-12" /> : <MicOff className="w-12 h-12 mb-1" />}
                    <span className="text-[10px] uppercase font-bold tracking-widest">{evaluatingTarget ? "Listening" : "Speak"}</span>
                  </button>

                  <div className="text-center min-h-[40px] mt-6">
                    {evaluatingTarget && <p className="text-rose-500 font-bold text-sm uppercase">Listening for "{selectedVowel}"...</p>}
                    {evalFeedback === "correct" && <p className="text-[#58CC02] font-bold text-lg">✨ Spot on!</p>}
                    {evalFeedback === "wrong" && <p className="text-red-500 font-bold text-lg flex items-center gap-2 justify-center"><AlertCircle className="w-5 h-5" /> Let's try again!</p>}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
             <motion.div
              key="phase-voice-words"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-md mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Read the Words! 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say each long word out loud into the microphone.
                </p>
              </div>

              {showConfetti ? (
                 <div className="py-12 flex flex-col items-center text-center">
                   <Sparkles className="w-24 h-24 text-amber-500 mb-6" />
                   <h3 className="text-3xl font-black mb-4">Vowel {selectedVowel} Mastered!</h3>
                   <Button onClick={() => { setShowConfetti(false); setSelectedVowel(null); }} size="lg" className="rounded-xl px-8 py-6 text-lg" style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}>
                     Back to Vowels
                   </Button>
                 </div>
              ) : (
                <>
                  <div className="mb-4 text-sm font-bold text-gray-500">Word {currentIndex + 1} of {wordTargets.length}</div>
                  <motion.div 
                    className="w-64 h-32 rounded-[2rem] bg-white dark:bg-gray-800 shadow-xl border-4 flex items-center justify-center mb-10 select-none tracking-widest"
                    style={{ borderColor: evalFeedback === 'correct' ? '#58CC02' : evalFeedback === 'wrong' ? '#EF4444' : accent.primary }}
                  >
                    <span className="text-5xl font-black text-gray-800 dark:text-gray-100">
                      {wordTargets[currentIndex]}
                    </span>
                  </motion.div>

                  <button
                    onClick={() => setEvaluatingTarget(wordTargets[currentIndex])}
                    disabled={evaluatingTarget !== null || evalFeedback === "correct"}
                    className={`w-28 h-28 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all relative z-10 ${
                      evaluatingTarget ? "bg-red-500 animate-pulse" : evalFeedback === "correct" ? "bg-green-500" : "bg-amber-500 hover:bg-amber-600 hover:scale-105 active:scale-95"
                    }`}
                  >
                    {evaluatingTarget ? <Mic className="w-12 h-12 mb-1" /> : evalFeedback === "correct" ? <CheckCircle2 className="w-12 h-12" /> : <MicOff className="w-12 h-12 mb-1" />}
                    <span className="text-[10px] uppercase font-bold tracking-widest">{evaluatingTarget ? "Listening" : "Speak"}</span>
                  </button>

                  <div className="text-center min-h-[40px] mt-6">
                    {evaluatingTarget && <p className="text-rose-500 font-bold text-sm uppercase">Listening for "{wordTargets[currentIndex]}"...</p>}
                    {evalFeedback === "correct" && <p className="text-[#58CC02] font-bold text-lg">✨ Perfect reading!</p>}
                    {evalFeedback === "wrong" && <p className="text-red-500 font-bold text-lg flex items-center gap-2 justify-center"><AlertCircle className="w-5 h-5" /> Let's try again!</p>}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
