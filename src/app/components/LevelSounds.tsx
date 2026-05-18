import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Home, Sparkles, Mic, CheckCircle2, AlertCircle, PlayCircle, ChevronRight, MicOff } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { getLetterPhonetic } from "../data/levels";
import { supabase } from "../../lib/supabase";
import { comparePhonemes } from "../utils/audio";
import { voskService } from "../utils/vosk";

// QWERTY keyboard layout
const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"]
];
const ALL_LETTERS = QWERTY_ROWS.flat();
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

interface LevelSoundsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelSounds({ levelId, accent }: LevelSoundsProps) {
  const navigate = useNavigate();

  // Logic states
  const [shuffledLetters] = useState(() => [...ALL_LETTERS].sort(() => Math.random() - 0.5));
  const [currentSetIdx, setCurrentSetIdx] = useState(0); // 0, 1, 2, 3
  const [phase, setPhase] = useState<"review" | "eval">("review");
  const [reviewedLetters, setReviewedLetters] = useState<Set<string>>(new Set());

  // Eval states
  const [evalIndex, setEvalIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [evalFeedback, setEvalFeedback] = useState<"correct" | "wrong" | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [clickedLetter, setClickedLetter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [lastHeard, setLastHeard] = useState<string | null>(null);

  const setSizes = [6, 7, 6, 7];

  const getLettersForCurrentSet = () => {
    const start = setSizes.slice(0, currentSetIdx).reduce((a, b) => a + b, 0);
    const end = start + setSizes[currentSetIdx];
    return shuffledLetters.slice(start, end);
  };

  const getLettersForCurrentEval = () => {
    const end = setSizes.slice(0, currentSetIdx + 1).reduce((a, b) => a + b, 0);
    return shuffledLetters.slice(0, end);
  };

  const currentEvalLetters = getLettersForCurrentEval();
  const currentSetLetters = getLettersForCurrentSet();
  const currentEvalLetter = currentEvalLetters[evalIndex];

  const handleLetterClick = (letter: string) => {
    if (phase !== "review") return;

    setClickedLetter(letter);
    setReviewedLetters(prev => new Set(prev).add(letter));

    const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => { });

    setTimeout(() => {
      setClickedLetter(null);
    }, 1000);
  };

  const handleGoBack = () => {
    const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setIsProcessing(true);
        setLastHeard("Thinking...");

        const { isMatch, recognized } = await voskService.recognizeLetter(
          currentEvalLetter,
          blob
        );

        setLastHeard(recognized);

        if (isMatch) {
          setEvalFeedback("correct");
          setTimeout(() => {
            if (evalIndex < currentEvalLetters.length - 1) {
              setEvalIndex(prev => prev + 1);
              setEvalFeedback(null);
            } else {
              handleSetComplete();
            }
          }, 1500);
        } else {
          setEvalFeedback("wrong");
          setTimeout(() => setEvalFeedback(null), 2000);
        }
        setIsProcessing(false);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try { mediaRecorder.stop(); } catch (e) { }
      }
      // Stop the stream tracks manually to release hardware
      if (mediaRecorder?.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaRecorder]);

  const handleSetComplete = () => {
    if (currentSetIdx < setSizes.length - 1) {
      setCurrentSetIdx(prev => prev + 1);
      setPhase("review");
      setReviewedLetters(new Set());
      setEvalIndex(0);
      setEvalFeedback(null);
    } else {
      saveFinalProgress();
    }
  };

  const saveFinalProgress = async () => {
    setIsSaving(true);
    try {
      const profileStr = localStorage.getItem("userProfile");
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.id) {
          await supabase.from("progress").insert({
            student_id: profile.id,
            level_id: levelId,
            score: ALL_LETTERS.length
          });
        }
      }

      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      navigate("/levels");
    } catch (err) {
      console.error("Error saving progress:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 dark:bg-none dark:bg-[#0d141c] pb-12">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full"><Home className="w-5 h-5" /></Button>
          <div className="flex-1 text-center">
            <h2 className="text-xl" style={{ color: accent.primary }}>Level 2: Letter Sounds</h2>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl mb-1" style={{ color: accent.primary }}>
            {phase === "review" ? `Review Set ${currentSetIdx + 1}` : `Voice Evaluation`}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {phase === "review" ? `Tap each letter to hear its sound! (${reviewedLetters.size}/${currentSetLetters.length})` : `Say the sound for letter "${currentEvalLetter}"`}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {phase === "review" ? (
            <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="space-y-3 mb-8">
                {QWERTY_ROWS.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex justify-center gap-2" style={{ paddingLeft: rowIndex === 1 ? "1.5rem" : rowIndex === 2 ? "3rem" : "0" }}>
                    {row.map((letter) => {
                      const isCurrentSet = currentSetLetters.includes(letter);
                      const isClicked = clickedLetter === letter;
                      const isVowel = VOWELS.has(letter);
                      const isReviewed = reviewedLetters.has(letter);
                      return (
                        <motion.button key={letter} initial={{ opacity: 0.3, scale: 1 }} animate={{ opacity: isCurrentSet ? 1 : 0.2, scale: isClicked ? 1.1 : 1 }} onClick={() => isCurrentSet && handleLetterClick(letter)} className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all shadow-md ${isCurrentSet ? 'cursor-pointer hover:shadow-lg active:scale-90' : 'cursor-not-allowed'}`} style={{ background: isClicked ? `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` : isVowel ? "linear-gradient(135deg, #FF6B8A 0%, #FF4B8A 100%)" : "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)" } as React.CSSProperties}>
                          <span className={`text-2xl sm:text-3xl ${isClicked || isVowel ? "text-white" : "text-gray-700 dark:text-gray-800"}`}>{letter}</span>
                          {isReviewed && isCurrentSet && <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-green-500 bg-white rounded-full" />}
                        </motion.button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Button disabled={reviewedLetters.size < currentSetLetters.length} onClick={() => setPhase("eval")} size="lg" className="rounded-xl px-12 py-6 text-lg text-white shadow-xl" style={{ background: reviewedLetters.size < currentSetLetters.length ? '#cbd5e1' : `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)` }}>
                  Start Evaluation <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="eval" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border-4" style={{ borderColor: accent.primary }}>
              <div className="text-center">
                <div className="text-8xl font-bold mb-4" style={{ color: accent.primary }}>{currentEvalLetter}</div>
                <div className="flex justify-center gap-4 mb-8">
                  <Button variant="outline" onClick={() => { const audio = new Audio(`${(import.meta as any).env.BASE_URL}audio/alphasounds-${currentEvalLetter.toLowerCase()}.mp3`); audio.play(); }} className="rounded-full h-12 w-12 p-0"><PlayCircle className="w-6 h-6 text-blue-500" /></Button>
                </div>
                <div className="flex justify-center mb-8">
                  <button
                    onClick={() => isRecording ? stopRecording() : startRecording()}
                    disabled={isProcessing}
                    className={`px-8 py-4 rounded-3xl flex items-center gap-3 transition-all ${isRecording
                      ? "bg-gradient-to-br from-red-500 to-red-600 scale-105 animate-pulse"
                      : isProcessing
                        ? "bg-gray-300 dark:bg-gray-600"
                        : "bg-gradient-to-br from-[#FF4B8A] to-[#e0336e] hover:scale-105 shadow-lg"
                      }`}
                  >
                    {isProcessing ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                    ) : isRecording ? (
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
                </div>
                {evalFeedback && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center justify-center gap-2 font-bold text-lg mb-4 ${evalFeedback === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                    {evalFeedback === 'correct' ? <><CheckCircle2 /> Correct!</> : <><AlertCircle /> Try again!</>}
                  </motion.div>
                )}
                {lastHeard && (
                  <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-mono text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-xs uppercase tracking-wider block mb-1">Heard:</span>
                    {lastHeard}
                  </div>
                )}
                <div className="text-gray-400 text-sm">Letter {evalIndex + 1} of {currentEvalLetters.length}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}