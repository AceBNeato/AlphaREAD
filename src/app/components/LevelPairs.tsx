import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { allLetters as ALL_LETTERS, VOWELS } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { comparePhonemes } from "../utils/audio";
import { Mic, MicOff, CheckCircle2, AlertCircle, PlayCircle, ChevronRight, Home, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";

const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"]
];

interface LevelPairsProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelPairs({ levelId, accent }: LevelPairsProps) {
  const navigate = useNavigate();
  
  // Overall state
  const [view, setView] = useState<"intro" | "review" | "eval">("intro");
  const [shuffledAlphabet] = useState(() => 
    [...ALL_LETTERS]
      .sort(() => Math.random() - 0.5)
      .map(item => item.letter)
  );
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  
  // Eval state
  const [evaluatingLetter, setEvaluatingLetter] = useState<string | null>(null);
  const [completedEvalLetters, setCompletedEvalLetters] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [evalFeedback, setEvalFeedback] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [clickedLetter, setClickedLetter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const setSizes = [6, 7, 6, 7];
  
  // Helpers
  const getLettersForSet = (idx: number) => {
    const start = setSizes.slice(0, idx).reduce((a, b) => a + b, 0);
    const end = start + setSizes[idx];
    return shuffledAlphabet.slice(start, end);
  };

  const getCumulativeLetters = (idx: number) => {
    const end = setSizes.slice(0, idx + 1).reduce((a, b) => a + b, 0);
    return shuffledAlphabet.slice(0, end);
  };

  const currentSetLetters = getLettersForSet(currentSetIdx);
  const cumulativeLetters = getCumulativeLetters(currentSetIdx);
  
  // Generate pairs for the current set review
  const currentSetPairs = useMemo(() => {
    const p: [string, string][] = [];
    for (let i = 0; i < currentSetLetters.length; i += 2) {
      if (i + 1 < currentSetLetters.length) {
        p.push([currentSetLetters[i], currentSetLetters[i + 1]]);
      } else {
        // Handle odd one out for the set of 7
        p.push([currentSetLetters[i], ""]); 
      }
    }
    return p;
  }, [currentSetLetters]);

  const currentPair = currentSetPairs[currentPairIndex];

  const handleLetterClick = (letter: string) => {
    if (!letter) return;
    setClickedLetter(letter);
    const audio = new Audio(`/audio/alphasounds-${letter.toLowerCase()}.mp3`);
    audio.play().catch(() => {});
    setTimeout(() => setClickedLetter(null), 1000);
  };

  const handleGoBack = () => {
    const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
    if (!confirmExit) return;
    navigate("/levels", { replace: true });
  };

  // Recording logic
  const startRecording = async (letter: string) => {
    try {
      setEvaluatingLetter(letter);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setIsProcessing(true);
        const { isMatch } = await comparePhonemes(blob, `/audio/alphasounds-${letter.toLowerCase()}.mp3`);
        
        if (isMatch) {
          setEvalFeedback(prev => ({ ...prev, [letter]: "correct" }));
          const newCompleted = new Set(completedEvalLetters);
          newCompleted.add(letter);
          setCompletedEvalLetters(newCompleted);
          
          if (newCompleted.size === cumulativeLetters.length) {
            setTimeout(() => handleSetComplete(), 1500);
          }
        } else {
          setEvalFeedback(prev => ({ ...prev, [letter]: "wrong" }));
          setTimeout(() => setEvalFeedback(prev => ({ ...prev, [letter]: null })), 2000);
        }
        
        setIsProcessing(false);
        setEvaluatingLetter(null);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (e) { console.error(e); }
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
        try { mediaRecorder.stop(); } catch(e) {}
      }
      if (mediaRecorder?.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaRecorder]);

  const handleSetComplete = () => {
    if (currentSetIdx < setSizes.length - 1) {
      setCurrentSetIdx((prev: number) => prev + 1);
      setView("review");
      setCurrentPairIndex(0);
      setCompletedEvalLetters(new Set());
      setEvalFeedback({});
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
          await supabase.from("progress").insert({ student_id: profile.id, level_id: levelId, score: 26 });
        }
      }
      const completedLevels = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
      }
      navigate("/levels");
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleGoBack} className="rounded-full"><Home className="w-5 h-5" /></Button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold" style={{ color: accent.primary }}>Level 1: Alphabet Master</h2>
          </div>
          {view === "review" && (
             <span className="text-sm font-bold" style={{ color: accent.primary }}>Set {currentSetIdx+1}</span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === "intro" ? (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2" style={{ color: accent.primary }}>Welcome!</h2>
                <p className="text-gray-500">Here is the alphabet. Tap any letter to hear its sound, then click Start Learning!</p>
              </div>
              <div className="space-y-3 mb-10">
                {QWERTY_ROWS.map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-center gap-2">
                    {row.map(l => (
                      <button key={l} onClick={() => handleLetterClick(l)} className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white shadow-md flex items-center justify-center text-xl font-bold hover:scale-110 active:scale-95 transition-all">
                        {l}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <Button size="lg" onClick={() => setView("review")} className="rounded-2xl px-12 py-8 text-xl shadow-xl text-white font-bold" style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}>
                  Start Learning! <ArrowRight className="ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : view === "review" ? (
            <motion.div key="review" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <div className="text-center mb-8">
                 <h2 className="text-2xl font-bold" style={{ color: accent.primary }}>Reviewing Set {currentSetIdx+1}</h2>
                 <p className="text-gray-500">Listen to these letter pairs</p>
              </div>
              <div className="flex justify-center gap-6 mb-12">
                {currentPair.map((l: string, i: number) => l ? (
                  <motion.div key={l} initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex-1 max-w-[180px]">
                    <div onClick={() => handleLetterClick(l)} className="aspect-square rounded-3xl shadow-2xl flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95" style={{ background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})` }}>
                       <span className="text-white text-7xl font-bold">{l}</span>
                       <span className="text-white/80 text-4xl">{l.toLowerCase()}</span>
                    </div>
                  </motion.div>
                ) : null)}
              </div>
              <div className="flex justify-between items-center max-w-sm mx-auto">
                <Button variant="outline" onClick={() => setCurrentPairIndex((prev: number) => Math.max(0, prev - 1))} disabled={currentPairIndex === 0}><ArrowLeft className="mr-2" /> Back</Button>
                {currentPairIndex < currentSetPairs.length - 1 ? (
                  <Button onClick={() => setCurrentPairIndex((prev: number) => prev + 1)}>Next <ArrowRight className="ml-2" /></Button>
                ) : (
                  <Button onClick={() => setView("eval")} className="text-white shadow-lg" style={{ background: '#58CC02' }}>Start Evaluation <ChevronRight className="ml-2" /></Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="eval" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto">
               <div className="text-center mb-6">
                 <h3 className="text-2xl font-bold" style={{ color: accent.primary }}>Phonetic Evaluation</h3>
                 <p className="text-gray-500">Cumulative Review: Set 1 - {currentSetIdx + 1}</p>
                 <div className="mt-2 text-sm font-medium px-4 py-1 bg-gray-100 rounded-full inline-block">
                    {completedEvalLetters.size} / {cumulativeLetters.length} Completed
                 </div>
               </div>

               <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-y-auto">
                  {cumulativeLetters.map((l) => {
                    const isDone = completedEvalLetters.has(l);
                    const isCurrent = evaluatingLetter === l;
                    const feedback = evalFeedback[l];
                    
                    return (
                      <div key={l} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isCurrent ? 'border-pink-400' : isDone ? 'border-green-200' : 'border-transparent'}`}>
                        <div className="flex items-center gap-4">
                           <span className="text-3xl font-bold w-10 text-center" style={{ color: isDone ? '#58CC02' : accent.primary }}>{l}</span>
                           {feedback === 'correct' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500 flex items-center gap-1 text-sm font-bold"><CheckCircle2 className="w-4 h-4" /> Correct!</motion.div>}
                           {feedback === 'wrong' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-red-500 flex items-center gap-1 text-sm font-bold"><AlertCircle className="w-4 h-4" /> Try again!</motion.div>}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => isRecording && isCurrent ? stopRecording() : startRecording(l)}
                            disabled={(isProcessing && !isCurrent) || isDone}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default' : isCurrent ? 'bg-red-500 text-white animate-pulse' : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'}`}
                          >
                            {isProcessing && isCurrent ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" /> : isDone ? <CheckCircle2 className="w-6 h-6" /> : isCurrent ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
               </div>
               
               <div className="mt-8 text-center text-sm text-gray-400 italic">
                 Click the mic next to each letter to practice its sound
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}