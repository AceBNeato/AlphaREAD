import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { SIMPLE_VC_SYLLABLES, SIMPLE_CV_SYLLABLES, shuffle } from "../data/levels";
import { supabase } from "../../lib/supabase";
import { Home, Volume2, ArrowRight, CheckCircle2, SkipForward, Shuffle, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { Confetti } from "./ui/Confetti";

interface LevelSyllablesMasterProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

const SET_SIZE = 10;

// Build sets of SIZE from an array
function buildSets(syllables: string[]): string[][] {
  const sets: string[][] = [];
  for (let i = 0; i < syllables.length; i += SET_SIZE) {
    sets.push(syllables.slice(i, i + SET_SIZE));
  }
  return sets;
}

// All VC then all CV sets — fixed order so the lesson is consistent
const VC_SETS = buildSets(SIMPLE_VC_SYLLABLES);
const CV_SETS = buildSets(SIMPLE_CV_SYLLABLES);

// Flat list of all rounds: [{ type, setIndex, syllables }]
const ALL_ROUNDS = [
  ...VC_SETS.map((s, i) => ({ type: "VC" as const, setIndex: i, syllables: s })),
  ...CV_SETS.map((s, i) => ({ type: "CV" as const, setIndex: i, syllables: s })),
];

const PATTERN_COLORS = {
  VC: { primary: "#CE82FF", dark: "#a855f7", light: "#f3e8ff" },
  CV: { primary: "#FF9600", dark: "#e08000", light: "#fff2d4" },
};

function playAudio(syllable: string, type: "CV" | "VC", base: string): Promise<void> {
  return new Promise((resolve) => {
    const lower = syllable.toLowerCase();
    const path = type === "CV"
      ? `${base}audio/cv-audio/cv-${lower}.MP3`
      : `${base}audio/vc-audio/vc-${lower}.MP3`;
    const audio = new Audio(path);
    audio.onended = () => resolve();
    audio.onerror = () => resolve(); // silent fail
    audio.play().catch(() => resolve());
  });
}

export function LevelSyllablesMaster({ levelId, accent }: LevelSyllablesMasterProps) {
  const navigate = useNavigate();
  const BASE = (import.meta as any).env.BASE_URL as string;

  const [roundIndex, setRoundIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const round = ALL_ROUNDS[roundIndex];
  const isLastRound = roundIndex === ALL_ROUNDS.length - 1;
  const colors = PATTERN_COLORS[round.type];

  // Match state
  const [leftCol, setLeftCol] = useState<string[]>([]);
  const [rightCol, setRightCol] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const wrongTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Init columns when round changes
  useEffect(() => {
    const shuffledLeft = shuffle([...round.syllables]);
    const shuffledRight = shuffle([...round.syllables]);
    setLeftCol(shuffledLeft);
    setRightCol(shuffledRight);
    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongPair(null);
    setShowConfetti(false);
    setPlayingId(null);
  }, [roundIndex]);

  // Cleanup timeout on unmount
  useEffect(() => () => {
    if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
  }, []);

  const handlePlayAudio = useCallback(async (syllable: string) => {
    if (playingId) return;
    setPlayingId(syllable);
    await playAudio(syllable, round.type, BASE);
    setPlayingId(null);
  }, [playingId, round.type, BASE]);

  const checkMatch = useCallback((speaker: string, letter: string) => {
    if (speaker === letter) {
      // Correct!
      setTimeout(() => {
        try {
          const a = new Audio("https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav");
          a.volume = 0.3;
          a.play().catch(() => {});
        } catch {}
      }, 100);

      setMatchedPairs(prev => new Set(prev).add(speaker));
      setSelectedLeft(null);
      setSelectedRight(null);

      // All matched?
      setMatchedPairs(prev => {
        const next = new Set(prev).add(speaker);
        if (next.size >= round.syllables.length) {
          setShowConfetti(true);
        }
        return next;
      });
    } else {
      // Wrong
      setWrongPair([speaker, letter]);
      if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 1000);
    }
  }, [round.syllables.length]);

  const handleLeftClick = useCallback((syllable: string) => {
    if (matchedPairs.has(syllable) || wrongPair) return;
    handlePlayAudio(syllable);
    setSelectedLeft(syllable);
    if (selectedRight) checkMatch(syllable, selectedRight);
  }, [matchedPairs, wrongPair, selectedRight, handlePlayAudio, checkMatch]);

  const handleRightClick = useCallback((syllable: string) => {
    if (matchedPairs.has(syllable) || wrongPair) return;
    setSelectedRight(syllable);
    if (selectedLeft) checkMatch(selectedLeft, syllable);
  }, [matchedPairs, wrongPair, selectedLeft, checkMatch]);

  const handleShuffle = () => {
    setLeftCol(prev => shuffle([...prev]));
    setRightCol(prev => shuffle([...prev]));
    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongPair(null);
  };

  const handleReset = () => {
    setMatchedPairs(new Set());
    setSelectedLeft(null);
    setSelectedRight(null);
    setWrongPair(null);
  };

  const handleSkip = () => {
    setMatchedPairs(new Set(round.syllables));
    setShowConfetti(true);
  };

  const handleNextRound = async () => {
    if (!isLastRound) {
      setRoundIndex(prev => prev + 1);
    } else {
      // Final round done — save and go
      setIsSaving(true);
      try {
        const profileStr = localStorage.getItem("userProfile");
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          if (profile.id) {
            await supabase.from("progress").insert({ student_id: profile.id, level_id: levelId, score: ALL_ROUNDS.length * SET_SIZE });
          }
        }
      } catch {}
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      setIsSaving(false);
      navigate("/levels");
    }
  };

  const totalRounds = ALL_ROUNDS.length;
  const globalProgress = ((roundIndex) / totalRounds) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] pb-12 flex flex-col">
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/levels")} className="rounded-full">
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex flex-col items-center flex-1">
            <h2 className="text-lg font-bold tracking-tight" style={{ color: colors.primary }}>
              Lesson 2 — {round.type} Listen & Match
            </h2>
            <span className="text-xs text-gray-500">
              Set {roundIndex + 1}/{totalRounds} &nbsp;·&nbsp;
              <span style={{ color: colors.primary }}>{round.type === "VC" ? "Vowel + Consonant" : "Consonant + Vowel"}</span>
            </span>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
            {matchedPairs.size}/{round.syllables.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mt-2 px-1">
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${globalProgress}%` }}
              transition={{ duration: 0.4 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.dark})` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 flex-1 flex flex-col w-full">
        <AnimatePresence mode="wait">
          {!showConfetti ? (
            <motion.div
              key={`round-${roundIndex}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center"
            >
              {/* Instructions */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold text-white mb-3"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.dark})` }}>
                  {round.type} Pattern — Set {round.setIndex + 1}
                </div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-1">
                  Listen & Match! 👂
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Tap the 🔊 speaker to hear a syllable, then find it on the right.
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3 w-full mb-6">
                <Button variant="outline" size="sm" onClick={handleShuffle}
                  className="rounded-full flex items-center gap-2"
                  style={{ borderColor: colors.primary, color: colors.primary }}>
                  <Shuffle className="w-4 h-4" /> Shuffle
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}
                  className="rounded-full flex items-center gap-2"
                  style={{ borderColor: colors.primary, color: colors.primary }}>
                  <RotateCcw className="w-4 h-4" /> Reset
                </Button>
                <Button size="sm" onClick={handleNextRound}
                  disabled={matchedPairs.size < round.syllables.length}
                  className="rounded-full flex items-center gap-2 text-white shadow-md active:scale-95 transition-all"
                  style={{ background: matchedPairs.size >= round.syllables.length ? `linear-gradient(135deg, ${colors.primary}, ${colors.dark})` : "gray" }}>
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleSkip}
                  className="rounded-full flex items-center gap-2"
                  style={{ borderColor: colors.primary, color: colors.primary }}>
                  Skip <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              {/* Two-column match grid */}
              <div className="flex justify-center gap-4 w-full max-w-lg">
                {/* Left: Speaker buttons */}
                <div className="flex flex-col gap-3 flex-1">
                  {leftCol.map((syl) => {
                    const isMatched = matchedPairs.has(syl);
                    const isSelected = selectedLeft === syl;
                    const isWrong = wrongPair?.[0] === syl;
                    const isPlaying = playingId === syl;

                    return (
                      <motion.button
                        key={`left-${syl}`}
                        whileHover={{ scale: isMatched ? 1 : 1.02 }}
                        whileTap={{ scale: isMatched ? 1 : 0.97 }}
                        onClick={() => handleLeftClick(syl)}
                        disabled={isMatched || !!wrongPair}
                        className={`h-14 rounded-2xl flex items-center justify-center gap-2 transition-all border-b-4 border-2 shadow-sm font-bold text-base
                          ${isMatched
                            ? "bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-400 opacity-50 cursor-default translate-y-[2px]"
                            : isWrong
                              ? "bg-red-50 border-red-400 text-red-500 animate-shake"
                              : isSelected
                                ? "border-blue-500 text-blue-600 translate-y-[2px] shadow-none"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:shadow-md cursor-pointer"
                          }`}
                        style={isSelected && !isMatched && !isWrong ? { background: colors.light, borderColor: colors.primary } : {}}
                      >
                        {isMatched
                          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                          : <Volume2 className={`w-5 h-5 ${isPlaying ? "animate-pulse" : ""}`}
                              style={{ color: isSelected ? colors.primary : undefined }} />
                        }
                        <span className="text-xs text-gray-400 font-mono">{isMatched ? syl : "?"}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Right: Syllable text tiles */}
                <div className="flex flex-col gap-3 flex-1">
                  {rightCol.map((syl) => {
                    const isMatched = matchedPairs.has(syl);
                    const isSelected = selectedRight === syl;
                    const isWrong = wrongPair?.[1] === syl;

                    return (
                      <motion.button
                        key={`right-${syl}`}
                        whileHover={{ scale: isMatched ? 1 : 1.02 }}
                        whileTap={{ scale: isMatched ? 1 : 0.97 }}
                        onClick={() => handleRightClick(syl)}
                        disabled={isMatched || !!wrongPair}
                        className={`h-14 rounded-2xl flex items-center justify-center transition-all border-b-4 border-2 shadow-sm font-black text-2xl uppercase tracking-wider
                          ${isMatched
                            ? "bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-400 opacity-50 cursor-default translate-y-[2px]"
                            : isWrong
                              ? "bg-red-50 border-red-400 text-red-500 animate-shake"
                              : isSelected
                                ? "translate-y-[2px] shadow-none"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:shadow-md cursor-pointer"
                          }`}
                        style={isSelected && !isMatched && !isWrong
                          ? { background: colors.light, borderColor: colors.primary, color: colors.primary }
                          : !isMatched && !isWrong && !isSelected
                            ? { color: round.type === "VC" ? "#a855f7" : "#e08000" }
                            : {}}
                      >
                        {syl}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback row */}
              <div className="text-center min-h-[36px] mt-4">
                {wrongPair && (
                  <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 font-bold">
                    Not quite — try again!
                  </motion.p>
                )}
                {matchedPairs.size > 0 && matchedPairs.size === round.syllables.length && !showConfetti && (
                  <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="font-bold text-[#58CC02] text-lg">
                    ✨ All matched! Great job!
                  </motion.p>
                )}
              </div>
            </motion.div>

          ) : (
            /* Completion screen */
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 max-w-md mx-auto flex-1 flex flex-col items-center justify-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-block mb-6 text-7xl"
              >
                🎉
              </motion.div>
              <h3 className="text-3xl font-black mb-4" style={{ color: colors.primary }}>
                {isLastRound ? "Lesson Complete! 🏆" : "Set Complete! ⭐"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                {isLastRound
                  ? "You matched all VC and CV syllables! Amazing work!"
                  : `Set ${roundIndex + 1} done! ${totalRounds - roundIndex - 1} more set${totalRounds - roundIndex - 1 !== 1 ? "s" : ""} to go.`}
              </p>
              <Button
                disabled={isSaving}
                onClick={handleNextRound}
                size="lg"
                className="rounded-2xl px-10 py-6 text-lg text-white font-bold w-full shadow-xl animate-bounce"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.dark})` }}
              >
                {isSaving ? "Saving..." : isLastRound ? "Back to Levels" : `Start Set ${roundIndex + 2} `}
                {!isSaving && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
