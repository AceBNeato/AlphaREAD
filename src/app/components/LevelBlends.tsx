import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Home, Volume2, Mic, MicOff, CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, AlertCircle, RotateCcw, SkipForward, FastForward, X, Shuffle as ShuffleIcon } from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { LETTER_NAMES, LETTER_TTS, shuffle } from "../data/levels";
import { BLENDS_DATA, BLENDS_SENTENCES, BlendWord } from "../data/blends";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { AudioVisualizer } from "./AudioVisualizer";
import { MatchButton } from "./MatchButton";
import { playSound, playExclusiveAudio } from "../utils/soundEffects";
import { playTTS as playTTSUtil } from "../utils/tts";

interface LevelBlendsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  categoryFilter?: string;
  onComplete?: () => void;
}

type Phase = "review" | "match" | "words" | "sentences";

const VOWELS = ["A", "E", "I", "O", "U"];

export function LevelBlends({ levelId, accent, categoryFilter, onComplete }: LevelBlendsProps) {
  const navigate = useNavigate();

  const [currentPhase, setCurrentPhase] = useState<Phase>("review");

  // Review State
  const [reviewIdx, setReviewIdx] = useState(0);

  // Tutorial State
  const [hasClickedTTS, setHasClickedTTS] = useState(false);
  const [hasClickedMic, setHasClickedMic] = useState(false);

  // Pattern Quiz State
  const filteredData = useMemo(() => {
    if (!categoryFilter) return BLENDS_DATA;
    if (categoryFilter === "2-Letter Blends") {
      return BLENDS_DATA.filter(d => d.name === "2-Letter Blends" || d.name === "Digraphs");
    }
    return BLENDS_DATA.filter(d => d.name === categoryFilter);
  }, [categoryFilter]);

  // Pattern Quiz State
  const allPatternsRaw = useMemo(() => {
    const list: { pattern: string; category: string; name: string; words: BlendWord[] }[] = [];
    filteredData.forEach((d) => {
      d.patterns.forEach((p) => {
        list.push({ pattern: p.pattern, category: d.name, name: p.name, words: p.words });
      });
    });
    return list;
  }, [filteredData]);

  const [reviewBatch, setReviewBatch] = useState<{ pattern: string; category: string; name: string; words: BlendWord[] }[]>([]);

  useEffect(() => {
    if (currentPhase === "review") {
      setReviewBatch(allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6));
    }
  }, [currentPhase, reviewIdx, allPatternsRaw]);
  const [patternIdx, setPatternIdx] = useState(0);

  // Match Phase State
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);

  const setupMatchPhase = useCallback(() => {
    const currentBatch = allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6);
    const targets = currentBatch.map(p => p.pattern);
    setMatchColumns({
      left: shuffle([...targets]),
      right: shuffle([...targets])
    });
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongMatchPair(null);
  }, [allPatternsRaw, reviewIdx]);

  useEffect(() => {
    if (currentPhase === "match") {
      setupMatchPhase();
    }
  }, [currentPhase, setupMatchPhase]);

  const checkMatch = useCallback((speaker: string, letter: string) => {
    if (speaker === letter) {
      playSound("correct", 0.4);
      setMatchedPairs(prev => {
        const next = new Set(prev).add(speaker);
        if (next.size === matchColumns.left.length && matchColumns.left.length > 0) {
          setShowConfetti(true);
          playSound("complete");
        }
        return next;
      });
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
    } else {
      playSound("wrong", 0.35);
      setWrongMatchPair([speaker, letter]);
      setTimeout(() => {
        setWrongMatchPair(null);
        setSelectedSpeakerMatch(null);
        setSelectedLetterMatch(null);
      }, 1000);
    }
  }, [matchColumns.left.length]);

  const handleSpeakerMatchClick = (pattern: string) => {
    setHasClickedTTS(true);
    if (matchedPairs.has(pattern) || wrongMatchPair) return;
    playSound("click", 0.2);
    const cat = allPatternsRaw.find(p => p.pattern === pattern)?.category || "";
    playPatternAudio(pattern, cat);
    if (selectedSpeakerMatch === pattern) {
      setSelectedSpeakerMatch(null);
    } else {
      setSelectedSpeakerMatch(pattern);
      if (selectedLetterMatch) {
        checkMatch(pattern, selectedLetterMatch);
      }
    }
  };

  const handleLetterMatchClick = (pattern: string) => {
    setHasClickedTTS(true);
    if (matchedPairs.has(pattern) || wrongMatchPair) return;
    playSound("click", 0.2);
    const cat = allPatternsRaw.find(p => p.pattern === pattern)?.category || "";
    playPatternAudio(pattern, cat);
    if (selectedLetterMatch === pattern) {
      setSelectedLetterMatch(null);
    } else {
      setSelectedLetterMatch(pattern);
      if (selectedSpeakerMatch) {
        checkMatch(selectedSpeakerMatch, pattern);
      }
    }
  };

  const playPatternAudio = useCallback((pattern: string, category: string) => {
    let folder = "";
    if (category === "3-Letter Blends" || category === "Three-Letter Blends") {
      folder = "3letterblend";
    } else {
      folder = "2letterblend";
    }
    playExclusiveAudio(`${(import.meta as any).env.BASE_URL}audio/${folder}/${folder}-${pattern}.mp3`);
  }, []);



  // Word Quiz State
  const WORDS_PER_SET = 6;
  const allWordsRaw = useMemo(() => {
    const list: { word: string; category: string }[] = [];
    filteredData.forEach((d) => {
      d.patterns.forEach((p) => {
        p.words.forEach((w) => {
          list.push({ word: w.word, category: d.name });
        });
      });
    });
    return shuffle(list);
  }, [filteredData]);
  const totalWordSets = Math.ceil(allWordsRaw.length / WORDS_PER_SET);
  const [wordSetIdx, setWordSetIdx] = useState(0);
  const [activeWords, setActiveWords] = useState<{ word: string; category: string }[]>([]);
  const [wordIdx, setWordIdx] = useState(0);

  // Sentence Quiz State
  const SENTENCES_PER_SET = 6;
  const totalSentenceSets = Math.ceil(BLENDS_SENTENCES.length / SENTENCES_PER_SET);
  const [sentenceSetIdx, setSentenceSetIdx] = useState(0);
  const [activeSentences, setActiveSentences] = useState<string[]>([]);

  useEffect(() => {
    setActiveWords(allWordsRaw.slice(wordSetIdx * WORDS_PER_SET, wordSetIdx * WORDS_PER_SET + WORDS_PER_SET));
    setCompletedWords(new Set());
    setWordFeedbackMap({});
    setWordTranscriptsMap({});
  }, [wordSetIdx, allWordsRaw]);

  useEffect(() => {
    setActiveSentences(BLENDS_SENTENCES.slice(sentenceSetIdx * SENTENCES_PER_SET, sentenceSetIdx * SENTENCES_PER_SET + SENTENCES_PER_SET));
    setCompletedSentences(new Set());
    setSentenceFeedbackMap({});
    setSentenceTranscriptsMap({});
  }, [sentenceSetIdx]);

  // Voice Eval States
  const [evaluatingPatternId, setEvaluatingPatternId] = useState<string | null>(null);
  const [completedPatterns, setCompletedPatterns] = useState<Set<string>>(new Set());
  const [patternFeedbackMap, setPatternFeedbackMap] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [patternTranscriptsMap, setPatternTranscriptsMap] = useState<Record<string, string>>({});

  const [evaluatingWordId, setEvaluatingWordId] = useState<string | null>(null);
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [wordFeedbackMap, setWordFeedbackMap] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [wordTranscriptsMap, setWordTranscriptsMap] = useState<Record<string, string>>({});

  const [evaluatingSentenceId, setEvaluatingSentenceId] = useState<string | null>(null);
  const [completedSentences, setCompletedSentences] = useState<Set<string>>(new Set());
  const [sentenceFeedbackMap, setSentenceFeedbackMap] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [sentenceTranscriptsMap, setSentenceTranscriptsMap] = useState<Record<string, string>>({});

  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [micReady, setMicReady] = useState(false);
  const micReadyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearEvalTimeout = useCallback(() => {
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearEvalTimeout();
  }, [clearEvalTimeout]);

  const evaluatingTargetForMic = useMemo(() => {
    if (currentPhase === "match" && evaluatingPatternId) {
      return allPatternsRaw.find(p => p.pattern === evaluatingPatternId)?.category || null;
    }
    if (currentPhase === "words" && evaluatingWordId) {
      return evaluatingWordId;
    }
    if (currentPhase === "sentences" && evaluatingSentenceId) {
      return evaluatingSentenceId;
    }
    return null;
  }, [currentPhase, evaluatingPatternId, evaluatingWordId, evaluatingSentenceId, allPatternsRaw]);

  const isMobile = useMemo(() => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent), []);

  const activeVowelData = useMemo(() => {
    return filteredData.find((d) => d.name === filteredData[reviewIdx]?.name) || null;
  }, [reviewIdx, filteredData]);

  const playTTS = (text: string) => {
    setHasClickedTTS(true);
    const ttsText = text.length === 1 ? (LETTER_TTS[text] || text) : text.toLowerCase();
    playTTSUtil(ttsText);
  };

  const handleNextQuiz = useCallback(() => {
    if (currentPhase === "match" || currentPhase === "words" || currentPhase === "sentences") {
      setShowConfetti(true);
      playSound("complete", 0.5);
    }
  }, [currentPhase]);

  const handleResult = useCallback(
    (target: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
      const tClean = transcript.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      const targetClean = target.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      let isCorrect = status === "correct" || status === "close" || tClean.includes(targetClean);

      clearEvalTimeout();

      if (currentPhase === "match" && evaluatingPatternId) {
        setPatternTranscriptsMap(prev => ({ ...prev, [evaluatingPatternId]: transcript }));
        const vName = LETTER_NAMES[target]?.toLowerCase() || "";
        const vTTS = LETTER_TTS[target]?.toLowerCase() || "";
        isCorrect = isCorrect || (vName && tClean.includes(vName)) || (vTTS && tClean.includes(vTTS)) || tClean.includes(targetClean);

        if (status === null && !isCorrect) return;

        if (isCorrect) {
          playSound("correct", 0.4);
          setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: "correct" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setCompletedPatterns(prev => new Set(prev).add(evaluatingPatternId));
            setEvaluatingPatternId(null);
          }, 1500);
        } else {
          playSound("wrong", 0.35);
          setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: "wrong" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: null }));
            setEvaluatingPatternId(null);
          }, 2000);
        }
      } else if (currentPhase === "words" && evaluatingWordId) {
        setWordTranscriptsMap(prev => ({ ...prev, [evaluatingWordId]: transcript }));
        if (status === null && !isCorrect) return;

        if (isCorrect) {
          playSound("correct", 0.4);
          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: "correct" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setCompletedWords(prev => new Set(prev).add(evaluatingWordId));
            setEvaluatingWordId(null);
          }, 1500);
        } else {
          playSound("wrong", 0.35);
          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: "wrong" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: null }));
            setEvaluatingWordId(null);
          }, 2000);
        }
      } else if (currentPhase === "sentences" && evaluatingSentenceId) {
        setSentenceTranscriptsMap(prev => ({ ...prev, [evaluatingSentenceId]: transcript }));
        if (status === null && !isCorrect) return;

        if (isCorrect) {
          playSound("correct", 0.4);
          setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: "correct" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setCompletedSentences(prev => new Set(prev).add(evaluatingSentenceId));
            setEvaluatingSentenceId(null);
          }, 1500);
        } else {
          playSound("wrong", 0.35);
          setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: "wrong" }));
          evaluationTimeoutRef.current = setTimeout(() => {
            setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: null }));
            setEvaluatingSentenceId(null);
          }, 2000);
        }
      }
    },
    [currentPhase, evaluatingPatternId, evaluatingWordId, evaluatingSentenceId]
  );

  useSpeechRecognition({
    evaluatingWord: evaluatingTargetForMic,
    enabled: !!evaluatingTargetForMic,
    singleShot: currentPhase === "sentences",
    onResult: handleResult,
    onError: () => {
      setEvaluatingPatternId(null);
      setEvaluatingWordId(null);
      setEvaluatingSentenceId(null);
    },
    onSilenceTimeout: () => {
      clearEvalTimeout();
      if (currentPhase === "match" && evaluatingPatternId) {
        setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setPatternFeedbackMap(prev => ({ ...prev, [evaluatingPatternId]: null }));
          setEvaluatingPatternId(null);
        }, 1500);
      } else if (currentPhase === "words" && evaluatingWordId) {
        setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: null }));
          setEvaluatingWordId(null);
        }, 1500);
      } else if (currentPhase === "sentences" && evaluatingSentenceId) {
        setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: "wrong" }));
        evaluationTimeoutRef.current = setTimeout(() => {
          setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: null }));
          setEvaluatingSentenceId(null);
        }, 1500);
      }
    }
  });

  const handleBack = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setEvaluatingPatternId(null);
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "sentences") setCurrentPhase("words");
    else if (currentPhase === "words") setCurrentPhase("match");
    else if (currentPhase === "match") setCurrentPhase("review");
    else navigate(-1);
  };

  const handleShuffle = () => {
    playSound("click", 0.2);
    clearEvalTimeout();
    setEvaluatingPatternId(null);
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "match") {
      setMatchColumns(prev => ({
        left: shuffle([...prev.left]),
        right: shuffle([...prev.right])
      }));
    } else if (currentPhase === "words") {
      setActiveWords(prev => shuffle([...prev]));
    } else if (currentPhase === "sentences") {
      setActiveSentences(prev => shuffle([...prev]));
    }
  };


  const handleReset = () => {
    clearEvalTimeout();
    setEvaluatingPatternId(null);
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "match") {
      setCompletedPatterns(new Set());
      setPatternFeedbackMap({});
      setPatternTranscriptsMap({});
    } else if (currentPhase === "words") {
      setCompletedWords(new Set());
      setWordFeedbackMap({});
      setWordTranscriptsMap({});
    } else if (currentPhase === "sentences") {
      setCompletedSentences(new Set());
      setSentenceFeedbackMap({});
      setSentenceTranscriptsMap({});
    }
  };

  const handleSkip = () => {
    clearEvalTimeout();
    setEvaluatingPatternId(null);
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "match") {
      setMatchedPairs(new Set(matchColumns.left));
      setShowConfetti(true);
      playSound("complete");
    } else if (currentPhase === "words") {
      setCompletedWords(new Set(activeWords.map(w => w.word)));
      handleNextQuiz();
    } else if (currentPhase === "sentences") {
      setCompletedSentences(new Set(activeSentences));
      handleNextQuiz();
    }
  };

  const handleGoBack = async () => {
    const confirmExit = await confirmAction("Are you sure you want to leave?", "Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const handleFinish = async () => {
    playSound("complete", 0.5);
    setIsSaving(true);


    const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
    if (!completedLevels.includes(levelId)) {
      completedLevels.push(levelId);
      localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
    }
    setIsSaving(false);
    if (onComplete) {
      onComplete();
    } else {
      navigate("/levels");
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-x-hidden">
      <style>{`
        .py-4 {
          padding-block: calc(0.20rem * 4);
        }
      `}</style>
      <Confetti active={showConfetti} />

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full">
            <X className="w-5 h-5" /> Exit
          </Button>
          <div className="flex-1 flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: accent.primary }}>
                {currentPhase === "review" && `${categoryFilter || "Blends"} Review`}
                {currentPhase === "match" && `${categoryFilter || "Blends"} - Listen & Match`}
                {currentPhase === "words" && `${categoryFilter || "Blends"} - Voice Evaluation`}
                {currentPhase === "sentences" && `${categoryFilter || "Blends"} - Read the Sentences`}
              </h2>
            </div>
            
            {/* Duolingo-style Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 sm:h-5 overflow-hidden relative shadow-inner">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out flex flex-col justify-start"
                style={{ 
                  width: `${Math.max(5, (({review:0, match:1, words:2, sentences:3}[currentPhase] || 0) / 3) * 100)}%`, 
                  backgroundColor: accent.primary 
                }}
              >
                {/* Glossy reflection highlight */}
                <div className="w-[calc(100%-12px)] h-[30%] bg-white/30 rounded-full mx-1.5 mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 py-2 flex-1 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {!showConfetti && currentPhase === "review" ? (
            <motion.div
              key={`phase-review-${reviewIdx}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full flex-1 flex flex-col"
            >
              <div className="text-center mb-8">

                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Review the patterns. Tap any word or heading to hear it spoken!
                </p>
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-sm mx-auto mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReviewBatch(prev => shuffle([...prev]))}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{
                      background: "linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)",
                    }}
                  >
                    <ShuffleIcon className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCurrentPhase("match")}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{
                      background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                    }}
                  >
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className={`grid gap-6 items-stretch mb-8 flex-1 w-full mx-auto ${reviewBatch.length === 1 ? 'grid-cols-1 max-w-sm' : reviewBatch.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {reviewBatch.map((pattern) => {
                  return (
                    <div
                      key={pattern.pattern}
                      className="bg-white dark:bg-gray-800/80 rounded-3xl p-6 border-2 border-amber-200 dark:border-gray-700 shadow-lg flex flex-col justify-start"
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          playPatternAudio(pattern.pattern, pattern.category);
                        }}
                        className="text-center border-b-2 border-dashed border-amber-100 dark:border-gray-700 pb-4 mb-6 cursor-pointer hover:bg-amber-50 dark:hover:bg-gray-700 rounded-xl transition-colors active:scale-95"
                      >

                        <span className="text-2xl font-black text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2">
                          {pattern.pattern} <Volume2 className="w-5 h-5 text-amber-400" />
                        </span>
                      </div>

                      <div className="space-y-4 flex-1">
                        {pattern.words.map((w: BlendWord) => {
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


            </motion.div>
          ) : !showConfetti && currentPhase === "match" && matchColumns.left.length > 0 ? (
            <motion.div
              key={`phase-match-${reviewIdx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center w-full"
            >
              <div className="text-center mb-6">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">Tap a speaker, then tap the matching blend!</p>

                {/* Navigation Controls */}
                <div className="flex justify-center items-center w-full gap-3 sm:gap-4 max-w-md mx-auto mt-6">
                  <Button
                    onClick={() => {
                      setMatchColumns(prev => ({
                        left: [...prev.left].sort(() => Math.random() - 0.5),
                        right: [...prev.right].sort(() => Math.random() - 0.5)
                      }));
                    }}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ce82ff 0%, #a559d6 100%)' }}
                  >
                    <ShuffleIcon className="w-4 h-4 mr-1" /> Shuffle
                  </Button>
                  <Button
                    onClick={setupMatchPhase}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#e11d48] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)' }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> Reset
                  </Button>
                  <Button
                    onClick={handleSkip}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: 'linear-gradient(135deg, #ffc800 0%, #ff9600 100%)' }}
                  >
                    <FastForward className="w-4 h-4 mr-1" /> Skip
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
                {/* Left Column: Speakers */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.left.map((pattern, idx) => {
                    const isMatched = matchedPairs.has(pattern);
                    const isSelected = selectedSpeakerMatch === pattern;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[0] === pattern);

                    return (
                      <div key={`speaker-${pattern}`} className="relative w-full">
                        <MatchButton
                          gradientStart={accent.primary}
                          gradientEnd={accent.dark}
                          isMatched={isMatched}
                          isSelected={isSelected}
                          isWrong={isWrong}
                          onClick={() => handleSpeakerMatchClick(pattern)}
                          disabled={!!wrongMatchPair}
                          className={`w-full ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse' : ''}`}
                        >
                          <Volume2 className={`w-8 h-8 ${isMatched ? "opacity-50" : ""}`} />
                        </MatchButton>
                        {idx === 0 && !hasClickedTTS && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                            className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                          >
                            Tap to listen!
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45" />
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Blends */}
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.right.map((pattern) => {
                    const isMatched = matchedPairs.has(pattern);
                    const isSelected = selectedLetterMatch === pattern;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[1] === pattern);

                    return (
                      <MatchButton
                        key={`letter-${pattern}`}
                        isMatched={isMatched}
                        isSelected={isSelected}
                        isWrong={isWrong}
                        onClick={() => handleLetterMatchClick(pattern)}
                        disabled={!!wrongMatchPair}
                        className="font-black text-2xl sm:text-3xl"
                      >
                        {pattern}
                      </MatchButton>
                    );
                  })}
                </div>
              </div>

              {wrongMatchPair && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-500 font-bold text-lg mb-4 text-center">Not quite, try again!</motion.p>
              )}
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
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Say each word out loud into the microphone.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShuffle}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(28, 176, 246) 0%, rgb(10, 142, 212) 100%)",
                  }}
                >
                  <ShuffleIcon className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Shuffle</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#b81d1d] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(255, 75, 75) 0%, rgb(216, 42, 42) 100%)",
                  }}
                >
                  <RotateCcw className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(255, 200, 0) 0%, rgb(255, 150, 0) 100%)",
                  }}
                >
                  <FastForward className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Skip</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleNextQuiz}
                  disabled={completedWords.size < activeWords.length}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                  }}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="w-4 h-4 sm:ml-1" />
                </Button>
              </div>

              <div className="w-full text-center mb-8">
                <div className={`w-full bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 ${activeWords.length > 5 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'}`}>
                  {activeWords.map((w, idx) => {
                    const isDone = completedWords.has(w.word);
                    const isEval = evaluatingWordId === w.word;
                    const vFeedback = wordFeedbackMap[w.word];
                    const vTranscript = wordTranscriptsMap[w.word];

                    return (
                      <div
                        key={w.word}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone || vFeedback === "correct" ? 'bg-green-50 dark:bg-green-900/20' : vFeedback === "wrong" ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isEval ? 'border-pink-400 shadow-md' : isDone || vFeedback === "correct" ? 'border-green-200' : vFeedback === "wrong" ? 'border-red-200' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playTTS(w.word)}
                              className={`rounded-full w-10 h-10 flex-shrink-0 ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                            {idx === 0 && !hasClickedTTS && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                              >
                                Tap to listen!
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45" />
                              </motion.div>
                            )}
                          </div>
                          <span className="text-3xl font-bold min-w-[60px] text-left tracking-widest uppercase flex items-center gap-1.5" style={{ color: isDone || vFeedback === "correct" ? '#58CC02' : accent.primary }}>
                            {w.word}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <button
                              onClick={() => {
                                setHasClickedMic(true);
                                if (isEval) {
                                  setEvaluatingWordId(null);
                                } else if (!isDone) {
                                  setEvaluatingWordId(w.word);
                                  setWordFeedbackMap(prev => ({ ...prev, [w.word]: null }));
                                  setWordTranscriptsMap(prev => ({ ...prev, [w.word]: "" }));
                                  setMicReady(false);
                                  if (micReadyTimerRef.current) clearTimeout(micReadyTimerRef.current);
                                  micReadyTimerRef.current = setTimeout(() => setMicReady(true), 220);
                                }
                              }}
                              disabled={(evaluatingWordId !== null && !isEval) || isDone}
                              className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${isDone || vFeedback === "correct"
                                ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default'
                                : isEval
                                  ? 'bg-red-500 text-white shadow-lg'
                                  : vFeedback === "wrong"
                                    ? 'bg-red-400 text-white'
                                    : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'
                                } ${idx === 0 && !hasClickedMic ? 'ring-2 ring-pink-400 ring-offset-2 animate-pulse' : ''}`}
                            >
                              {isEval && (
                                <>
                                  <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
                                  <span className="absolute -inset-1 rounded-xl bg-red-500/20 animate-pulse" />
                                </>
                              )}
                              <span className="relative z-10">
                                {isDone || vFeedback === "correct" ? <CheckCircle2 className="w-6 h-6" /> : vFeedback === "wrong" ? <XCircle className="w-6 h-6" /> : isEval ? <MicOff className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
                              </span>
                            </button>
                            {idx === 0 && !hasClickedMic && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                              >
                                Tap to speak!
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45" />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Listening Modal for Words */}
              <AnimatePresence>
                {evaluatingWordId && !showConfetti && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border-4"
                      style={{ borderColor: accent.primary }}
                    >
                      <div className="flex flex-col items-center justify-center gap-2 mb-6">
                        <div className="flex items-center justify-center gap-2">
                          <Mic className="w-6 h-6 text-pink-500 animate-pulse" />
                          <h3 className="text-2xl font-bold tracking-tight text-pink-500 animate-pulse">
                            {micReady ? "Listening..." : "Get ready..."}
                          </h3>
                        </div>
                        {micReady && <AudioVisualizer isListening={!!evaluatingWordId} isMobile={isMobile} />}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">Please read the word out loud clearly.</p>
                      
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 min-h-[100px] flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target Word</span>
                        <span className="text-4xl font-extrabold mb-4 tracking-wider flex items-baseline justify-center uppercase" style={{ color: accent.primary }}>
                          {evaluatingWordId}
                        </span>
                        
                        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />
                        
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2">Heard</span>
                        <span className="text-xl font-medium text-gray-700 dark:text-gray-300 min-h-[32px] flex items-center justify-center">
                          {wordTranscriptsMap[evaluatingWordId] ? (
                            `"${wordTranscriptsMap[evaluatingWordId]}"`
                          ) : (
                            <span className="text-gray-400 italic">Waiting for speech...</span>
                          )}
                        </span>
                      </div>

                      {wordFeedbackMap[evaluatingWordId] === "wrong" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold border border-red-200 dark:border-red-800 flex items-center justify-center gap-2">
                          <XCircle className="w-5 h-5" /> Not quite, try again!
                        </motion.div>
                      )}
                      
                      {wordFeedbackMap[evaluatingWordId] === "correct" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-bold border border-green-200 dark:border-green-800 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-5 h-5" /> Excellent!
                        </motion.div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => {
                          clearEvalTimeout();
                          setWordFeedbackMap(prev => ({ ...prev, [evaluatingWordId]: null }));
                          setEvaluatingWordId(null);
                        }}
                        className="mt-6 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : !showConfetti && currentPhase === "sentences" ? (
            <motion.div
              key={`phase-sentences-${sentenceSetIdx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-8">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Say each sentence out loud into the microphone.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShuffle}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#086ca5] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(28, 176, 246) 0%, rgb(10, 142, 212) 100%)",
                  }}
                >
                  <ShuffleIcon className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Shuffle</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#b81d1d] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(255, 75, 75) 0%, rgb(216, 42, 42) 100%)",
                  }}
                >
                  <RotateCcw className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkip}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(255, 200, 0) 0%, rgb(255, 150, 0) 100%)",
                  }}
                >
                  <FastForward className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Skip</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleNextQuiz}
                  disabled={completedSentences.size < activeSentences.length}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)",
                  }}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="w-4 h-4 sm:ml-1" />
                </Button>
              </div>

              <div className="w-full text-center mb-8">
                <div className="w-full bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 space-y-3">
                  {activeSentences.map((s, idx) => {
                    const isDone = completedSentences.has(s);
                    const isEval = evaluatingSentenceId === s;
                    const vFeedback = sentenceFeedbackMap[s];
                    const vTranscript = sentenceTranscriptsMap[s];

                    return (
                      <div
                        key={s}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone || vFeedback === "correct" ? 'bg-green-50 dark:bg-green-900/20' : vFeedback === "wrong" ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isEval ? 'border-pink-400 shadow-md' : isDone || vFeedback === "correct" ? 'border-green-200' : vFeedback === "wrong" ? 'border-red-200' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playTTS(s)}
                              className={`rounded-full w-10 h-10 flex-shrink-0 ${idx === 0 && !hasClickedTTS ? 'ring-2 ring-indigo-400 ring-offset-2 animate-pulse bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'}`}
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                            {idx === 0 && !hasClickedTTS && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                              >
                                Tap to listen!
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45" />
                              </motion.div>
                            )}
                          </div>
                          <span className="text-xl font-bold text-left leading-snug flex items-center gap-1.5" style={{ color: isDone || vFeedback === "correct" ? '#58CC02' : accent.primary }}>
                            {s}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <button
                              onClick={() => {
                                setHasClickedMic(true);
                                if (isEval) {
                                  setEvaluatingSentenceId(null);
                                } else if (!isDone) {
                                  setEvaluatingSentenceId(s);
                                  setSentenceFeedbackMap(prev => ({ ...prev, [s]: null }));
                                  setSentenceTranscriptsMap(prev => ({ ...prev, [s]: "" }));
                                  setMicReady(false);
                                  if (micReadyTimerRef.current) clearTimeout(micReadyTimerRef.current);
                                  micReadyTimerRef.current = setTimeout(() => setMicReady(true), 220);
                                }
                              }}
                              disabled={(evaluatingSentenceId !== null && !isEval) || isDone}
                              className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${isDone || vFeedback === "correct"
                                ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default'
                                : isEval
                                  ? 'bg-red-500 text-white shadow-lg'
                                  : vFeedback === "wrong"
                                    ? 'bg-red-400 text-white'
                                    : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'
                                } ${idx === 0 && !hasClickedMic ? 'ring-2 ring-pink-400 ring-offset-2 animate-pulse' : ''}`}
                            >
                              {isEval && (
                                <>
                                  <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
                                  <span className="absolute -inset-1 rounded-xl bg-red-500/20 animate-pulse" />
                                </>
                              )}
                              <span className="relative z-10">
                                {isDone || vFeedback === "correct" ? <CheckCircle2 className="w-6 h-6" /> : vFeedback === "wrong" ? <XCircle className="w-6 h-6" /> : isEval ? <MicOff className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
                              </span>
                            </button>
                            {idx === 0 && !hasClickedMic && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-10"
                              >
                                Tap to speak!
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45" />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Listening Modal for Sentences */}
              <AnimatePresence>
                {evaluatingSentenceId && !showConfetti && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border-4"
                      style={{ borderColor: accent.primary }}
                    >
                      <div className="flex flex-col items-center justify-center gap-2 mb-6">
                        <div className="flex items-center justify-center gap-2">
                          <Mic className="w-6 h-6 text-pink-500 animate-pulse" />
                          <h3 className="text-2xl font-bold tracking-tight text-pink-500 animate-pulse">
                            {micReady ? "Listening..." : "Get ready..."}
                          </h3>
                        </div>
                        {micReady && <AudioVisualizer isListening={!!evaluatingSentenceId} isMobile={isMobile} />}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">Please read the sentence out loud clearly.</p>
                      
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 min-h-[100px] flex flex-col items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Target</span>
                        <span className="text-2xl font-bold mb-4 tracking-wider flex items-baseline justify-center" style={{ color: accent.primary }}>
                          {evaluatingSentenceId}
                        </span>
                        
                        <div className="w-full h-px bg-gray-200 dark:bg-gray-700 my-2" />
                        
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 mt-2">Heard</span>
                        <span className="text-xl font-medium text-gray-700 dark:text-gray-300 min-h-[32px] flex items-center justify-center">
                          {sentenceTranscriptsMap[evaluatingSentenceId] ? (
                            `"${sentenceTranscriptsMap[evaluatingSentenceId]}"`
                          ) : (
                            <span className="text-gray-400 italic">Waiting for speech...</span>
                          )}
                        </span>
                      </div>

                      {sentenceFeedbackMap[evaluatingSentenceId] === "wrong" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-bold border border-red-200 dark:border-red-800 flex items-center justify-center gap-2">
                          <XCircle className="w-5 h-5" /> Not quite, try again!
                        </motion.div>
                      )}
                      
                      {sentenceFeedbackMap[evaluatingSentenceId] === "correct" && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl font-bold border border-green-200 dark:border-green-800 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-5 h-5" /> Excellent!
                        </motion.div>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => {
                          clearEvalTimeout();
                          setSentenceFeedbackMap(prev => ({ ...prev, [evaluatingSentenceId]: null }));
                          setEvaluatingSentenceId(null);
                        }}
                        className="mt-6 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                {currentPhase === "match" ? "Patterns Mastered!" : currentPhase === "words" ? (wordSetIdx === totalWordSets - 1 ? "Words Mastered!" : "Set Complete!") : sentenceSetIdx === totalSentenceSets - 1 ? "Lesson Mastered!" : "Set Complete!"}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                {currentPhase === "match"
                  ? "You correctly identified all the consonant blends! Ready to read some words?"
                  : currentPhase === "words"
                    ? (wordSetIdx === totalWordSets - 1
                      ? "You successfully read all the blend words out loud! Ready for sentences?"
                      : "You successfully read 6 blend words! Ready for the next set?")
                    : (sentenceSetIdx === totalSentenceSets - 1
                      ? "You successfully read all the sentences! Awesome job!"
                      : "You successfully read 6 sentences! Ready for the next set?")}
              </p>

              {currentPhase === "match" ? (
                <Button
                  onClick={() => {
                    setShowConfetti(false);
                    if (reviewIdx < Math.ceil(allPatternsRaw.length / 6) - 1) {
                      setReviewIdx(r => r + 1);

                      setCurrentPhase("review");
                    } else {
                      setCurrentPhase("words");
                    }
                  }}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                >
                  {reviewIdx < Math.ceil(allPatternsRaw.length / 6) - 1 ? "Next Batch" : "Start Reading Words"} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              ) : currentPhase === "words" ? (
                wordSetIdx === totalWordSets - 1 ? (
                  <Button
                    onClick={() => {
                      setCurrentPhase("sentences");
                      setShowConfetti(false);
                    }}
                    size="lg"
                    className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                    style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                  >
                    Start Reading Sentences <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setWordSetIdx(prev => Math.min(prev + 1, totalWordSets - 1));
                      setShowConfetti(false);
                    }}
                    size="lg"
                    className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                    style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                  >
                    Start Next 6 Words <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                )
              ) : sentenceSetIdx === totalSentenceSets - 1 ? (
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
                    setSentenceSetIdx(prev => Math.min(prev + 1, totalSentenceSets - 1));
                    setShowConfetti(false);
                  }}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                >
                  Start Next 6 Sentences <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}



