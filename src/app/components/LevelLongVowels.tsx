import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { Home, Volume2, Mic, MicOff, CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, AlertCircle, Shuffle, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { LONG_VOWELS_DATA, LongVowelWord, LETTER_NAMES, LETTER_TTS, shuffle } from "../data/levels";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

import { useAudioVisualizer } from "../hooks/useAudioVisualizer";

interface LevelLongVowelsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type Phase = "review" | "patterns" | "words";

const VOWELS = ["A", "E", "I", "O", "U"];

export function LevelLongVowels({ levelId, accent }: LevelLongVowelsProps) {
  const navigate = useNavigate();

  const [currentPhase, setCurrentPhase] = useState<Phase>("review");

  // Review State
  const [reviewIdx, setReviewIdx] = useState(0);

  // Pattern Quiz State
  const allPatternsRaw = useMemo(() => {
    const list: { pattern: string; vowel: string; name: string }[] = [];
    LONG_VOWELS_DATA.forEach((d) => {
      d.patterns.forEach((p) => {
        list.push({ pattern: p.pattern, vowel: d.vowel, name: p.name });
      });
    });
    return list;
  }, []);
  const [activePatterns, setActivePatterns] = useState(() => shuffle([...allPatternsRaw]));
  const [patternIdx, setPatternIdx] = useState(0);

  // Word Quiz State
  const WORDS_PER_SET = 10;
  const allWordsRaw = useMemo(() => {
    const list: { word: string; vowel: string }[] = [];
    LONG_VOWELS_DATA.forEach((d) => {
      d.patterns.forEach((p) => {
        p.words.forEach((w) => {
          list.push({ word: w.word, vowel: d.vowel });
        });
      });
    });
    return shuffle(list);
  }, []);
  const totalWordSets = Math.ceil(allWordsRaw.length / WORDS_PER_SET);
  const [wordSetIdx, setWordSetIdx] = useState(0);
  const [activeWords, setActiveWords] = useState<{ word: string; vowel: string }[]>([]);
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    setActiveWords(allWordsRaw.slice(wordSetIdx * WORDS_PER_SET, wordSetIdx * WORDS_PER_SET + WORDS_PER_SET));
    setCompletedWords(new Set());
    setWordFeedbackMap({});
    setWordTranscriptsMap({});
  }, [wordSetIdx, allWordsRaw]);

  // Voice Eval States
  const [evaluatingPatternId, setEvaluatingPatternId] = useState<string | null>(null);
  const [completedPatterns, setCompletedPatterns] = useState<Set<string>>(new Set());
  const [patternFeedbackMap, setPatternFeedbackMap] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [patternTranscriptsMap, setPatternTranscriptsMap] = useState<Record<string, string>>({});

  const [evaluatingWordId, setEvaluatingWordId] = useState<string | null>(null);
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [wordFeedbackMap, setWordFeedbackMap] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [wordTranscriptsMap, setWordTranscriptsMap] = useState<Record<string, string>>({});
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const evaluatingTargetForMic = useMemo(() => {
    if (currentPhase === "patterns" && evaluatingPatternId) {
       return allPatternsRaw.find(p => p.pattern === evaluatingPatternId)?.vowel || null;
    }
    if (currentPhase === "words" && evaluatingWordId) {
       return evaluatingWordId;
    }
    return null;
  }, [currentPhase, evaluatingPatternId, evaluatingWordId, allPatternsRaw]);

  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);
  useAudioVisualizer(isMobile, !!evaluatingTargetForMic);

  const activeVowelData = useMemo(() => {
    return LONG_VOWELS_DATA.find((d) => d.vowel === VOWELS[reviewIdx]) || null;
  }, [reviewIdx]);

  const playTTS = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const ttsText = text.length === 1 ? (LETTER_TTS[text] || text) : text.toLowerCase();
      const utterance = new SpeechSynthesisUtterance(ttsText);
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNextQuiz = useCallback(() => {
    if (currentPhase === "patterns") {
      setShowConfetti(true);
    } else if (currentPhase === "words") {
      setShowConfetti(true);
    }
  }, [currentPhase]);

  const handleResult = useCallback(
    (target: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
      const tLower = transcript.toLowerCase();
      let isCorrect = status === "correct" || status === "close" || tLower.includes(target.toLowerCase());

      if (currentPhase === "patterns" && evaluatingPatternId) {
        setPatternTranscriptsMap(prev => ({ ...prev, [evaluatingPatternId]: transcript }));
        const vName = LETTER_NAMES[target]?.toLowerCase() || "";
        const vTTS = LETTER_TTS[target]?.toLowerCase() || "";
        isCorrect = tLower.includes(vName) || tLower.includes(vTTS) || tLower.includes(target.toLowerCase());
        
        if (isCorrect) {
          setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: "correct" }));
          setTimeout(() => {
            setCompletedPatterns(prev => new Set(prev).add(evaluatingPatternId));
            setEvaluatingPatternId(null);
          }, 1500);
        } else {
          setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: "wrong" }));
          setTimeout(() => {
            setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: null }));
            setEvaluatingPatternId(null);
          }, 2000);
        }
      } else if (currentPhase === "words" && evaluatingWordId) {
        setWordTranscriptsMap(prev => ({ ...prev, [evaluatingWordId]: transcript }));
        if (isCorrect) {
          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: "correct" }));
          setTimeout(() => {
            setCompletedWords(prev => new Set(prev).add(evaluatingWordId));
            setEvaluatingWordId(null);
          }, 1500);
        } else {
          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: "wrong" }));
          setTimeout(() => {
            setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: null }));
            setEvaluatingWordId(null);
          }, 2000);
        }
      }
    },
    [currentPhase, evaluatingPatternId, evaluatingWordId]
  );

  useSpeechRecognition({
    evaluatingWord: evaluatingTargetForMic,
    enabled: !!evaluatingTargetForMic,
    onResult: handleResult,
    onError: () => {
       setEvaluatingPatternId(null);
       setEvaluatingWordId(null);
    },
    onSilenceTimeout: () => {
      if (currentPhase === "patterns" && evaluatingPatternId) {
        setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: "wrong" }));
        setTimeout(() => {
          setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: null }));
          setEvaluatingPatternId(null);
        }, 1500);
      } else if (currentPhase === "words" && evaluatingWordId) {
        setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: "wrong" }));
        setTimeout(() => {
          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: null }));
          setEvaluatingWordId(null);
        }, 1500);
      }
    }
  });

  const handleShuffle = () => {
    if (currentPhase === "patterns") {
      setActivePatterns(shuffle([...allPatternsRaw]));
      setCompletedPatterns(new Set());
      setPatternFeedbackMap({});
      setPatternTranscriptsMap({});
    } else {
      setActiveWords(shuffle([...activeWords]));
      setCompletedWords(new Set());
      setWordFeedbackMap({});
      setWordTranscriptsMap({});
    }
  };

  const handleReset = () => {
    if (currentPhase === "patterns") {
      setCompletedPatterns(new Set());
      setPatternFeedbackMap({});
      setPatternTranscriptsMap({});
    } else {
      setCompletedWords(new Set());
      setWordFeedbackMap({});
      setWordTranscriptsMap({});
    }
  };

  const handleSkip = () => {
    if (currentPhase === "patterns") {
      setCompletedPatterns(new Set(activePatterns.map(p => p.pattern)));
      handleNextQuiz();
    } else {
      setCompletedWords(new Set(activeWords.map(w => w.word)));
      handleNextQuiz();
    }
  };

  const handleGoBack = () => {
    const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
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
            score: allWordsRaw.length,
          });
        }
      }
    } catch (err) {
      console.error("Error saving progress:", err);
    }

    const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
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
            <Home className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            {currentPhase === "review" && `Long ${VOWELS[reviewIdx]} Review`}
            {currentPhase === "patterns" && `All Vowel Patterns Quiz`}
            {currentPhase === "words" && `Words Quiz (Set ${wordSetIdx + 1}/${totalWordSets})`}
          </h2>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase">
            {currentPhase === "review" && `Vowel ${reviewIdx + 1}/5`}
            {currentPhase === "patterns" && `${patternIdx + 1}/${activePatterns.length}`}
            {currentPhase === "words" && `${wordIdx + 1}/${activeWords.length}`}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col justify-start w-full">
        <AnimatePresence mode="wait">
          {!showConfetti && currentPhase === "review" && activeVowelData ? (
            <motion.div
              key={`phase-review-${reviewIdx}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full flex-1 flex flex-col"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Long {VOWELS[reviewIdx]} Combinations
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
                      <div 
                         onClick={() => playTTS(VOWELS[reviewIdx])}
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
                          return (
                            <div
                              key={w.word}
                              onClick={() => playTTS(w.word)}
                              className="flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer active:scale-95 bg-gray-50/30 dark:bg-gray-900/30 border-gray-100 dark:border-gray-850 hover:bg-gray-50 dark:hover:bg-gray-900"
                            >
                              <div className="flex items-center gap-1 select-none text-2xl font-bold tracking-wider text-gray-700 dark:text-gray-200">
                                {w.word.split("").map((char, index) => {
                                  const isHighlighted = w.highlights.includes(index);
                                  return (
                                    <span key={index} className={isHighlighted ? "text-rose-500 font-extrabold" : ""}>
                                      {char}
                                    </span>
                                  );
                                })}
                              </div>
                              <Volume2 className="w-5 h-5 text-gray-400" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={reviewIdx === 0}
                  onClick={() => setReviewIdx((prev) => prev - 1)}
                  className="rounded-2xl flex-1 py-6 border-2 font-bold max-w-[200px]"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" /> Back
                </Button>
                
                {reviewIdx < 4 ? (
                  <Button
                    size="lg"
                    onClick={() => setReviewIdx((prev) => prev + 1)}
                    className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                  >
                    Next Vowel <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => setCurrentPhase("patterns")}
                    className="rounded-2xl flex-1 py-6 font-bold text-white shadow-lg animate-pulse"
                    style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}
                  >
                    Start Pattern Quiz! <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </motion.div>
          ) : !showConfetti && currentPhase === "patterns" ? (
            <motion.div
              key={`phase-patterns`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  What Sound is this? 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say the correct long vowel name out loud.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3 w-full mb-6">
                <Button variant="outline" size="sm" onClick={handleShuffle} className="rounded-full flex items-center gap-2 border-amber-300">
                  <Shuffle className="w-4 h-4 text-amber-600" /> Shuffle
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset} className="rounded-full flex items-center gap-2 border-amber-300">
                  <RotateCcw className="w-4 h-4 text-amber-600" /> Reset
                </Button>
                <Button size="sm" onClick={handleSkip} disabled={completedPatterns.size < activePatterns.length} className="rounded-full flex items-center gap-2 text-white shadow-md active:scale-95 transition-all" style={{ background: completedPatterns.size >= activePatterns.length ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "gray" }}>
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleSkip} className="rounded-full flex items-center gap-2 border-amber-300">
                  Skip <SkipForward className="w-4 h-4 text-amber-600" />
                </Button>
              </div>

              <div className="w-full text-center mb-8">
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto">
                  {activePatterns.map((p, idx) => {
                    const isDone = completedPatterns.has(p.pattern);
                    const isEval = evaluatingPatternId === p.pattern;
                    const vFeedback = patternFeedbackMap[p.pattern];
                    const vTranscript = patternTranscriptsMap[p.pattern];

                    return (
                      <div
                        key={p.pattern}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          isEval
                            ? "bg-white dark:bg-gray-800 border-red-400 shadow-lg shadow-red-100 dark:shadow-red-900/20 scale-[1.02]"
                            : vFeedback === "correct" || isDone
                            ? "bg-[#58CC02]/10 border-[#58CC02]/30"
                            : vFeedback === "wrong"
                            ? "bg-red-50 border-red-200"
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTTS(p.vowel)}
                            className="rounded-full w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex-shrink-0"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <div className="flex flex-col items-start min-w-[60px]">
                            <span className="text-3xl font-black text-gray-800 dark:text-gray-100 leading-none" style={{ color: isEval || isDone ? accent.primary : undefined }}>
                              {p.pattern}
                            </span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                              {p.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isEval && vTranscript && (
                            <span className="text-xs font-medium text-gray-500 italic max-w-[100px] truncate hidden sm:block">
                              "{vTranscript}"
                            </span>
                          )}

                          <button
                            onClick={() => {
                              if (!evaluatingPatternId && !isDone) {
                                setEvaluatingPatternId(p.pattern);
                                setPatternFeedbackMap(prev => ({ ...prev, [p.pattern]: null }));
                                setPatternTranscriptsMap(prev => ({ ...prev, [p.pattern]: "" }));
                              }
                            }}
                            disabled={evaluatingPatternId !== null || isDone}
                            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-white shadow-md transition-all flex-shrink-0 ${
                              isEval
                                ? "bg-red-500 animate-pulse"
                                : vFeedback === "correct" || isDone
                                ? "bg-[#58CC02]"
                                : vFeedback === "wrong"
                                ? "bg-red-400"
                                : "bg-amber-500 hover:bg-amber-600 hover:scale-105 active:scale-95 cursor-pointer"
                            }`}
                            style={{
                              background: !isEval && vFeedback !== "correct" && !isDone && vFeedback !== "wrong" ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : undefined,
                            }}
                          >
                            {isEval ? (
                              <Mic className="w-6 h-6 mb-0.5" />
                            ) : vFeedback === "correct" || isDone ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : vFeedback === "wrong" ? (
                              <XCircle className="w-6 h-6" />
                            ) : (
                              <MicOff className="w-6 h-6 mb-0.5" />
                            )}
                            <span className="text-[9px] uppercase font-bold tracking-widest">
                              {isEval ? "..." : isDone ? "Done" : "Speak"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : !showConfetti && currentPhase === "words" ? (
             <motion.div
              key={`phase-words-${wordSetIdx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">
                  Read the Words! 🗣️
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Say each long word out loud into the microphone.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3 w-full mb-6">
                <Button variant="outline" size="sm" onClick={handleShuffle} className="rounded-full flex items-center gap-2 border-amber-300">
                  <Shuffle className="w-4 h-4 text-amber-600" /> Shuffle
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset} className="rounded-full flex items-center gap-2 border-amber-300">
                  <RotateCcw className="w-4 h-4 text-amber-600" /> Reset
                </Button>
                <Button size="sm" onClick={handleSkip} disabled={completedWords.size < activeWords.length} className="rounded-full flex items-center gap-2 text-white shadow-md active:scale-95 transition-all" style={{ background: completedWords.size >= activeWords.length ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : "gray" }}>
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleSkip} className="rounded-full flex items-center gap-2 border-amber-300">
                  Skip <SkipForward className="w-4 h-4 text-amber-600" />
                </Button>
              </div>

              <div className="w-full text-center mb-8">
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto">
                  {activeWords.map((w, idx) => {
                    const isDone = completedWords.has(w.word);
                    const isEval = evaluatingWordId === w.word;
                    const vFeedback = wordFeedbackMap[w.word];
                    const vTranscript = wordTranscriptsMap[w.word];

                    return (
                      <div
                        key={w.word}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          isEval
                            ? "bg-white dark:bg-gray-800 border-red-400 shadow-lg shadow-red-100 dark:shadow-red-900/20 scale-[1.02]"
                            : vFeedback === "correct" || isDone
                            ? "bg-[#58CC02]/10 border-[#58CC02]/30"
                            : vFeedback === "wrong"
                            ? "bg-red-50 border-red-200"
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTTS(w.word)}
                            className="rounded-full w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex-shrink-0"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <div className="flex flex-col items-start min-w-[60px]">
                            <span className="text-3xl font-black text-gray-800 dark:text-gray-100 leading-none" style={{ color: isEval || isDone ? accent.primary : undefined }}>
                              {w.word}
                            </span>
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">
                              Long {w.vowel}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isEval && vTranscript && (
                            <span className="text-xs font-medium text-gray-500 italic max-w-[100px] truncate hidden sm:block">
                              "{vTranscript}"
                            </span>
                          )}

                          <button
                            onClick={() => {
                              if (!evaluatingWordId && !isDone) {
                                setEvaluatingWordId(w.word);
                                setWordFeedbackMap(prev => ({ ...prev, [w.word]: null }));
                                setWordTranscriptsMap(prev => ({ ...prev, [w.word]: "" }));
                              }
                            }}
                            disabled={evaluatingWordId !== null || isDone}
                            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-white shadow-md transition-all flex-shrink-0 ${
                              isEval
                                ? "bg-red-500 animate-pulse"
                                : vFeedback === "correct" || isDone
                                ? "bg-[#58CC02]"
                                : vFeedback === "wrong"
                                ? "bg-red-400"
                                : "bg-amber-500 hover:bg-amber-600 hover:scale-105 active:scale-95 cursor-pointer"
                            }`}
                            style={{
                              background: !isEval && vFeedback !== "correct" && !isDone && vFeedback !== "wrong" ? `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` : undefined,
                            }}
                          >
                            {isEval ? (
                              <Mic className="w-6 h-6 mb-0.5" />
                            ) : vFeedback === "correct" || isDone ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : vFeedback === "wrong" ? (
                              <XCircle className="w-6 h-6" />
                            ) : (
                              <MicOff className="w-6 h-6 mb-0.5" />
                            )}
                            <span className="text-[9px] uppercase font-bold tracking-widest">
                              {isEval ? "..." : isDone ? "Done" : "Speak"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : showConfetti ? (
            <motion.div
              key="completion-screen"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 max-w-md mx-auto"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-block mb-6"
              >
                <Sparkles className="w-20 h-20 text-[#FFC800]" />
              </motion.div>

              <h3 className="text-3xl font-black mb-4" style={{ color: accent.primary }}>
                {currentPhase === "patterns" ? "Patterns Mastered!" : wordSetIdx === totalWordSets - 1 ? "Lesson Mastered!" : "Set Complete!"}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                {currentPhase === "patterns" 
                  ? "You correctly identified all the long vowel patterns! Ready to read some words?" 
                  : wordSetIdx === totalWordSets - 1 
                    ? "You successfully read all the long vowel words out loud! Awesome job!" 
                    : "You successfully read 10 long vowel words! Ready for the next set?"}
              </p>
              
              {currentPhase === "patterns" ? (
                 <Button
                  onClick={() => {
                    setCurrentPhase("words");
                    setShowConfetti(false);
                  }}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                >
                  Start Reading Words <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              ) : wordSetIdx === totalWordSets - 1 ? (
                <Button
                  disabled={isSaving}
                  onClick={handleFinish}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                >
                  {isSaving ? "Saving..." : "Back to Levels"}
                </Button>
              ) : (
                 <Button
                  onClick={() => {
                    setWordSetIdx(prev => prev + 1);
                    setShowConfetti(false);
                  }}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                >
                  Start Next 10 Words <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
