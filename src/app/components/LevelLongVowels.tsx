import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Home, Volume2, Mic, MicOff, CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, AlertCircle, RotateCcw, SkipForward, FastForward, Shuffle, X } from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Confetti } from "./ui/Confetti";
import { LONG_VOWELS_DATA, LONG_VOWELS_SENTENCES, LongVowelWord, LETTER_NAMES, LETTER_TTS, shuffle } from "../data/levels";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { AudioVisualizer } from "./AudioVisualizer";
import { MatchButton } from "./MatchButton";
import { playSound } from "../utils/soundEffects";
import { playTTS as playTTSUtil } from "../utils/tts";

interface LevelLongVowelsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

type Phase = "review" | "match" | "patterns" | "words" | "sentences";

const VOWELS = ["A", "E", "I", "O", "U"];

export function LevelLongVowels({ levelId, accent }: LevelLongVowelsProps) {
  const navigate = useNavigate();

  const [currentPhase, setCurrentPhase] = useState<Phase>("review");

  // Review State
  const [reviewIdx, setReviewIdx] = useState(0);

  // Pattern Quiz State
  const allPatternsRaw = useMemo(() => {
    const list: { pattern: string; vowel: string; name: string; words: LongVowelWord[] }[] = [];
    LONG_VOWELS_DATA.forEach((d) => {
      d.patterns.forEach((p) => {
        list.push({ pattern: p.pattern, vowel: d.vowel, name: p.name, words: p.words });
      });
    });
    return list;
  }, []);

  const [reviewBatch, setReviewBatch] = useState<{ pattern: string; vowel: string; name: string; words: LongVowelWord[] }[]>([]);

  useEffect(() => {
    if (currentPhase === "review" || currentPhase === "match" || currentPhase === "patterns") {
      setReviewBatch(allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6));
    }
  }, [currentPhase, reviewIdx, allPatternsRaw]);
  const [patternIdx, setPatternIdx] = useState(0);

  // Word Quiz State
  const WORDS_PER_SET = 6;
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

  // Sentence Quiz State
  const SENTENCES_PER_SET = 6;
  const totalSentenceSets = Math.ceil(LONG_VOWELS_SENTENCES.length / SENTENCES_PER_SET);
  const [sentenceSetIdx, setSentenceSetIdx] = useState(0);
  const [activeSentences, setActiveSentences] = useState<string[]>([]);

  useEffect(() => {
    setActiveWords(allWordsRaw.slice(wordSetIdx * WORDS_PER_SET, wordSetIdx * WORDS_PER_SET + WORDS_PER_SET));
    setCompletedWords(new Set());
    setWordFeedbackMap({});
    setWordTranscriptsMap({});
  }, [wordSetIdx, allWordsRaw]);

  useEffect(() => {
    setActiveSentences(LONG_VOWELS_SENTENCES.slice(sentenceSetIdx * SENTENCES_PER_SET, sentenceSetIdx * SENTENCES_PER_SET + SENTENCES_PER_SET));
    setCompletedSentences(new Set());
    setSentenceFeedbackMap({});
    setSentenceTranscriptsMap({});
  }, [sentenceSetIdx]);


  // Match Phase State
  const [matchColumns, setMatchColumns] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedSpeakerMatch, setSelectedSpeakerMatch] = useState<string | null>(null);
  const [selectedLetterMatch, setSelectedLetterMatch] = useState<string | null>(null);
  const [wrongMatchPair, setWrongMatchPair] = useState<[string, string] | null>(null);

  const setupMatchPhase = useCallback(() => {
    // Generate match pairs
    const pairs: string[] = [];
    const currentBatch = allPatternsRaw.slice(reviewIdx * 6, reviewIdx * 6 + 6);
    currentBatch.forEach(p => pairs.push(p.pattern));

    setMatchColumns({
      left: shuffle([...pairs]),
      right: shuffle([...pairs])
    });
    setMatchedPairs(new Set());
    setSelectedSpeakerMatch(null);
    setSelectedLetterMatch(null);
    setWrongMatchPair(null);
  }, [allPatternsRaw]);

  useEffect(() => {
    if (currentPhase === "match") {
      setupMatchPhase();
    }
  }, [currentPhase, setupMatchPhase]);

  const checkMatch = useCallback((speaker: string, letter: string) => {
    if (speaker === letter) {
      playSound("correct", 0.4);
      setMatchedPairs(prev => new Set(prev).add(speaker));
      setSelectedSpeakerMatch(null);
      setSelectedLetterMatch(null);
      if (matchedPairs.size + 1 === matchColumns.left.length) {
        setShowConfetti(true);
      }
    } else {
      playSound("wrong", 0.35);
      setWrongMatchPair([speaker, letter]);
      setTimeout(() => {
        setWrongMatchPair(null);
        setSelectedSpeakerMatch(null);
        setSelectedLetterMatch(null);
      }, 1000);
    }
  }, [matchColumns.left.length, matchedPairs.size]);

  const handleSpeakerMatchClick = (pattern: string) => {
    if (matchedPairs.has(pattern) || wrongMatchPair) return;
    playSound("click", 0.2);
    const vowelToPlay = allPatternsRaw.find(p => p.pattern === pattern)?.vowel || pattern;
    playTTS(vowelToPlay);
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
    if (matchedPairs.has(pattern) || wrongMatchPair) return;
    playSound("click", 0.2);
    if (selectedLetterMatch === pattern) {
      setSelectedLetterMatch(null);
    } else {
      setSelectedLetterMatch(pattern);
      if (selectedSpeakerMatch) {
        checkMatch(selectedSpeakerMatch, pattern);
      }
    }
  };

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
    if (currentPhase === "patterns" && evaluatingPatternId) {
      return allPatternsRaw.find(p => p.pattern === evaluatingPatternId)?.vowel || null;
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
    return LONG_VOWELS_DATA.find((d) => d.vowel === VOWELS[reviewIdx]) || null;
  }, [reviewIdx]);

  const playTTS = (text: string) => {
    const ttsText = text.length === 1 ? (LETTER_TTS[text] || text) : text.toLowerCase();
    playTTSUtil(ttsText);
  };

  const handleNextQuiz = useCallback(() => {
    if (currentPhase === "match" || currentPhase === "patterns" || currentPhase === "words" || currentPhase === "sentences") {
      setShowConfetti(true);
    }
  }, [currentPhase]);

  const handleResult = useCallback(
    (target: string, status: "correct" | "close" | "wrong" | null, transcript: string) => {
      const tClean = transcript.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      const targetClean = target.toLowerCase().replace(/[.,!?'"-]/g, "").trim();
      let isCorrect = status === "correct" || status === "close" || tClean.includes(targetClean);

      clearEvalTimeout();

      if (currentPhase === "patterns" && evaluatingPatternId) {
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
    onResult: handleResult,
    onError: () => {
      setEvaluatingPatternId(null);
      setEvaluatingWordId(null);
      setEvaluatingSentenceId(null);
    },
    onSilenceTimeout: () => {
      clearEvalTimeout();
      if (currentPhase === "patterns" && evaluatingPatternId) {
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
    else if (currentPhase === "words") setCurrentPhase("patterns");
    else if (currentPhase === "patterns") setCurrentPhase("match");
    else if (currentPhase === "match") setCurrentPhase("review");
    else navigate(-1);
  };

  const handleReset = () => {
    clearEvalTimeout();
    setEvaluatingPatternId(null);
    setEvaluatingWordId(null);
    setEvaluatingSentenceId(null);
    if (currentPhase === "match") {
      setupMatchPhase();
    } else if (currentPhase === "patterns") {
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
      handleNextQuiz();
    } else if (currentPhase === "patterns") {
      setCompletedPatterns(new Set(reviewBatch.map(p => p.pattern)));
      handleNextQuiz();
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
    navigate("/levels");
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 dark:bg-none dark:bg-[#0d141c] flex flex-col overflow-x-hidden">
      <Confetti active={showConfetti} />

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full">
            <X className="w-5 h-5" /> Exit
          </Button>
          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            {currentPhase === "review" && `Long Vowels Review`}
            {currentPhase === "match" && `Long Vowels - Listen & Match`}
            {currentPhase === "patterns" && `Long Vowels - Voice Evaluation`}
            {currentPhase === "words" && `Long Vowels - Voice Evaluation`}
            {currentPhase === "sentences" && `Long Vowels : Read the Sentences`}
          </h2>
          <span className="text-sm font-bold" style={{ color: accent.primary }}>
            {currentPhase === "review" && `Step 1/5`}
            {currentPhase === "match" && `Step 2/5`}
            {currentPhase === "patterns" && `Step 3/5`}
            {currentPhase === "words" && `Step 4/5`}
            {currentPhase === "sentences" && `Step 5/5`}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 flex-1 flex flex-col justify-start w-full">
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
                    <Shuffle className="w-4 h-4 mr-1" /> Shuffle
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
                        onClick={() => playTTS(pattern.vowel)}
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


            </motion.div>
          ) : !showConfetti && currentPhase === "match" ? (
            <motion.div key={`phase-match`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center w-full">
              <div className="text-center mb-6">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">Tap a speaker, then tap the matching pattern!</p>
                {/* Controls */}
                <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMatchColumns(prev => ({
                        left: [...prev.left].sort(() => Math.random() - 0.5),
                        right: [...prev.right].sort(() => Math.random() - 0.5)
                      }));
                    }}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(206, 130, 255) 0%, rgb(165, 89, 214) 100%)" }}
                  >
                    <Shuffle className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Shuffle</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#b81d1d] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(255, 75, 75) 0%, rgb(216, 42, 42) 100%)" }}
                  >
                    <RotateCcw className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#c99c00] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(255, 200, 0) 0%, rgb(255, 150, 0) 100%)" }}
                  >
                    <FastForward className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Skip</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNextQuiz}
                    disabled={matchedPairs.size !== matchColumns.left.length || matchColumns.left.length === 0}
                    className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#3c8c01] hover:scale-105 active:scale-95 px-2 transition-all disabled:opacity-50 disabled:grayscale disabled:pointer-events-none h-9 py-2"
                    style={{ background: "linear-gradient(135deg, rgb(88, 204, 2) 0%, rgb(70, 163, 2) 100%)" }}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ArrowRight className="w-4 h-4 sm:ml-1" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center gap-4 sm:gap-8 w-full max-w-2xl mx-auto mb-10 px-2 sm:px-4">
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.left.map((pattern) => {
                    const isMatched = matchedPairs.has(pattern);
                    const isSelected = selectedSpeakerMatch === pattern;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[0] === pattern);
                    return (
                      <MatchButton
                        key={`speaker-${pattern}`}
                        gradientStart={accent.primary}
                        gradientEnd={accent.dark}
                        isMatched={isMatched}
                        isSelected={isSelected}
                        isWrong={isWrong}
                        onClick={() => handleSpeakerMatchClick(pattern)}
                        disabled={!!wrongMatchPair}
                      >
                        <Volume2 className={`w-8 h-8 ${isMatched ? "opacity-50" : ""}`} />
                      </MatchButton>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-w-0">
                  {matchColumns.right.map((pattern) => {
                    const isMatched = matchedPairs.has(pattern);
                    const isSelected = selectedLetterMatch === pattern;
                    const isWrong = !!(wrongMatchPair && wrongMatchPair[1] === pattern);
                    return (
                      <MatchButton
                        key={`pattern-${pattern}`}
                        isMatched={isMatched}
                        isSelected={isSelected}
                        isWrong={isWrong}
                        onClick={() => handleLetterMatchClick(pattern)}
                        disabled={!!wrongMatchPair}
                        className="font-black text-2xl sm:text-3xl tracking-widest"
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
          ) : !showConfetti && currentPhase === "patterns" ? (
            <motion.div
              key={`phase-patterns`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-6">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Say the correct long vowel name 2 times out loud.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewBatch(prev => shuffle([...prev]))}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(206, 130, 255) 0%, rgb(165, 89, 214) 100%)",
                  }}
                >
                  <Shuffle className="w-4 h-4 sm:mr-1" />
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
                  disabled={completedPatterns.size < reviewBatch.length}
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
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
                  {reviewBatch.map((p, idx) => {
                    const isDone = completedPatterns.has(p.pattern);
                    const isEval = evaluatingPatternId === p.pattern;
                    const vFeedback = patternFeedbackMap[p.pattern];
                    const vTranscript = patternTranscriptsMap[p.pattern];

                    return (
                      <div
                        key={p.pattern}
                        className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone || vFeedback === "correct" ? 'bg-green-50 dark:bg-green-900/20' : vFeedback === "wrong" ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isEval ? 'border-pink-400 shadow-md' : isDone || vFeedback === "correct" ? 'border-green-200' : vFeedback === "wrong" ? 'border-red-200' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTTS(p.vowel)}
                            className="rounded-full w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex-shrink-0"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <span className="text-3xl font-bold min-w-[60px] text-left tracking-widest uppercase flex items-center gap-1.5" style={{ color: isDone || vFeedback === "correct" ? '#58CC02' : accent.primary }}>
                            {p.pattern}
                          </span>

                        </div>

                        <div className="flex items-center gap-3">
                          {isEval && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0 flex-wrap">
                              <span className="text-pink-500 text-sm font-bold animate-pulse">Listening...</span>
                              <AudioVisualizer isListening={!!evaluatingTargetForMic} isMobile={isMobile} />
                              {vTranscript && (
                                <span className="p-1 bg-gray-200 rounded text-[10px] font-mono text-gray-700 ml-1 truncate max-w-[120px]">
                                  [Heard: {vTranscript}]
                                </span>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (isEval) {
                                setEvaluatingPatternId(null);
                              } else if (!isDone) {
                                setEvaluatingPatternId(p.pattern);
                                setPatternFeedbackMap(prev => ({ ...prev, [p.pattern]: null }));
                                setPatternTranscriptsMap(prev => ({ ...prev, [p.pattern]: "" }));
                              }
                            }}
                            disabled={(evaluatingPatternId !== null && !isEval) || isDone}
                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${isDone || vFeedback === "correct"
                              ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default'
                              : isEval
                                ? 'bg-red-500 text-white shadow-lg'
                                : vFeedback === "wrong"
                                  ? 'bg-red-400 text-white'
                                  : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'
                              }`}
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
              <div className="text-center mb-6">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Say each long word out loud into the microphone.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveWords(prev => shuffle([...prev]))}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(206, 130, 255) 0%, rgb(165, 89, 214) 100%)",
                  }}
                >
                  <Shuffle className="w-4 h-4 sm:mr-1" />
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
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTTS(w.word)}
                            className="rounded-full w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex-shrink-0"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <span className="text-3xl font-bold min-w-[60px] text-left tracking-widest uppercase flex items-center gap-1.5" style={{ color: isDone || vFeedback === "correct" ? '#58CC02' : accent.primary }}>
                            {w.word}
                          </span>

                        </div>

                        <div className="flex items-center gap-3">
                          {isEval && vTranscript && (
                            <div className="p-1 bg-gray-200 rounded text-[10px] font-mono text-gray-700 mt-1 sm:mt-0 max-w-[150px] truncate">
                              Heard: {vTranscript}
                            </div>
                          )}
                          {isEval && !vTranscript && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0">
                              <span className="text-pink-500 text-sm font-bold animate-pulse">Listening...</span>
                              <div className="flex gap-1 items-center h-8 justify-center min-w-[50px]">
                                {isMobile ? (
                                  <>
                                    <div className="w-1.5 bg-pink-500 rounded-full animate-[wave_0.8s_ease-in-out_infinite_0ms]" style={{ height: '20px', animationName: 'wave', animationDuration: '0.8s', animationIterationCount: 'infinite', animationDelay: '0ms' }} />
                                    <div className="w-1.5 bg-pink-400 rounded-full" style={{ height: '28px', animation: 'wave 0.8s ease-in-out infinite 0.1s' }} />
                                    <div className="w-1.5 bg-pink-500 rounded-full" style={{ height: '36px', animation: 'wave 0.8s ease-in-out infinite 0.2s' }} />
                                    <div className="w-1.5 bg-pink-400 rounded-full" style={{ height: '28px', animation: 'wave 0.8s ease-in-out infinite 0.3s' }} />
                                    <div className="w-1.5 bg-pink-500 rounded-full" style={{ height: '20px', animation: 'wave 0.8s ease-in-out infinite 0.4s' }} />
                                  </>
                                ) : (
                                  <>
                                    <div id="wave-bar-1" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-2" className="w-1.5 bg-pink-400 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-3" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-4" className="w-1.5 bg-pink-400 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-5" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (isEval) {
                                setEvaluatingWordId(null);
                              } else if (!isDone) {
                                setEvaluatingWordId(w.word);
                                setWordFeedbackMap(prev => ({ ...prev, [w.word]: null }));
                                setWordTranscriptsMap(prev => ({ ...prev, [w.word]: "" }));
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
                              }`}
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : !showConfetti && currentPhase === "sentences" ? (
            <motion.div
              key={`phase-sentences-${sentenceSetIdx}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-2xl mx-auto flex flex-col items-center"
            >
              <div className="text-center mb-6">
                <p className="text-white text-base sm:text-lg font-bold mt-2 block">
                  Say each sentence out loud into the microphone.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center items-center w-full gap-2 sm:gap-3 max-w-lg mx-auto mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSentences(prev => shuffle([...prev]))}
                  className="flex-1 rounded-xl font-bold text-white shadow-md border-b-[4px] border-[#8b40b8] hover:scale-105 active:scale-95 px-2 transition-all h-9 py-2"
                  style={{
                    background: "linear-gradient(135deg, rgb(206, 130, 255) 0%, rgb(165, 89, 214) 100%)",
                  }}
                >
                  <Shuffle className="w-4 h-4 sm:mr-1" />
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
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playTTS(s)}
                            className="rounded-full w-10 h-10 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 flex-shrink-0"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <span className="text-xl font-bold text-left leading-snug flex items-center gap-1.5" style={{ color: isDone || vFeedback === "correct" ? '#58CC02' : accent.primary }}>
                            {s}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {isEval && vTranscript && (
                            <div className="p-1 bg-gray-200 rounded text-[10px] font-mono text-gray-700 mt-1 sm:mt-0 max-w-[150px] truncate">
                              Heard: {vTranscript}
                            </div>
                          )}
                          {isEval && !vTranscript && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0">
                              <span className="text-pink-500 text-sm font-bold animate-pulse">Listening...</span>
                              <div className="flex gap-1 items-center h-8 justify-center min-w-[50px]">
                                {isMobile ? (
                                  <>
                                    <div className="w-1.5 bg-pink-500 rounded-full animate-[wave_0.8s_ease-in-out_infinite_0ms]" style={{ height: '20px', animationName: 'wave', animationDuration: '0.8s', animationIterationCount: 'infinite', animationDelay: '0ms' }} />
                                    <div className="w-1.5 bg-pink-400 rounded-full" style={{ height: '28px', animation: 'wave 0.8s ease-in-out infinite 0.1s' }} />
                                    <div className="w-1.5 bg-pink-500 rounded-full" style={{ height: '36px', animation: 'wave 0.8s ease-in-out infinite 0.2s' }} />
                                    <div className="w-1.5 bg-pink-400 rounded-full" style={{ height: '28px', animation: 'wave 0.8s ease-in-out infinite 0.3s' }} />
                                    <div className="w-1.5 bg-pink-500 rounded-full" style={{ height: '20px', animation: 'wave 0.8s ease-in-out infinite 0.4s' }} />
                                  </>
                                ) : (
                                  <>
                                    <div id="wave-bar-1" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-2" className="w-1.5 bg-pink-400 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-3" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-4" className="w-1.5 bg-pink-400 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                    <div id="wave-bar-5" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (isEval) {
                                setEvaluatingSentenceId(null);
                              } else if (!isDone) {
                                setEvaluatingSentenceId(s);
                                setSentenceFeedbackMap(prev => ({ ...prev, [s]: null }));
                                setSentenceTranscriptsMap(prev => ({ ...prev, [s]: "" }));
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
                              }`}
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
                {currentPhase === "match" ? "Matching Complete!" : currentPhase === "patterns" ? "Patterns Mastered!" : currentPhase === "words" ? (wordSetIdx === totalWordSets - 1 ? "Words Mastered!" : "Set Complete!") : sentenceSetIdx === totalSentenceSets - 1 ? "Lesson Mastered!" : "Set Complete!"}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                {currentPhase === "match"
                  ? "You matched all the patterns! Ready to say them out loud?"
                  : currentPhase === "patterns"
                    ? (reviewIdx < Math.ceil(allPatternsRaw.length / 6) - 1
                      ? "You correctly identified all the long vowel patterns in this batch! Ready for the next batch?"
                      : "You correctly identified all the long vowel patterns! Ready to read some words?")
                    : currentPhase === "words"
                      ? (wordSetIdx === totalWordSets - 1
                        ? "You successfully read all the long vowel words out loud! Ready for sentences?"
                        : "You successfully read 6 long vowel words! Ready for the next set?")
                      : (sentenceSetIdx === totalSentenceSets - 1
                        ? "You successfully read all the sentences! Awesome job!"
                        : "You successfully read 6 sentences! Ready for the next set?")}
              </p>

              {currentPhase === "match" ? (
                <Button
                  onClick={() => {
                    setCurrentPhase("patterns");
                    setShowConfetti(false);
                  }}
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                  style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                >
                  Start Say the Name <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              ) : currentPhase === "patterns" ? (
                reviewIdx < Math.ceil(allPatternsRaw.length / 6) - 1 ? (
                  <Button
                    onClick={() => {
                      setReviewIdx(r => r + 1);
                      setCurrentPhase("review");
                      setShowConfetti(false);
                      setCompletedPatterns(new Set());
                      setPatternFeedbackMap({});
                      setPatternTranscriptsMap({});
                    }}
                    size="lg"
                    className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                    style={{ background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}
                  >
                    Next Batch <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                ) : (
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
                )
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
