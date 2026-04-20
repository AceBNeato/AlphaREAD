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
} from "lucide-react";
import { Button } from "./ui/button";
import { CVC_WORDS, shuffle } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";

interface LevelVoiceEvaluationProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
}

export function LevelVoiceEvaluation({ levelId, accent }: LevelVoiceEvaluationProps) {
  const navigate = useNavigate();
  const words = useMemo(() => shuffle(CVC_WORDS).slice(0, 10), []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [completedWords, setCompletedWords] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [recognition, setRecognition] = useState<any>(null);

  const currentWord = words[currentIndex];
  const progress = (completedWords.size / words.length) * 100;
  const allDone = completedWords.size >= words.length;

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = "en-US";
      recognitionInstance.maxAlternatives = 3;

      recognitionInstance.onresult = (event: any) => {
        const results = event.results[0];
        let recognized = "";

        // Check all alternatives for a match
        for (let i = 0; i < results.length; i++) {
          const alternative = results[i].transcript.trim().toUpperCase();
          if (alternative === currentWord || alternative.includes(currentWord)) {
            recognized = currentWord;
            break;
          }
        }

        if (!recognized) {
          recognized = results[0].transcript.trim().toUpperCase();
        }

        setTranscript(recognized);
        setIsListening(false);

        if (recognized === currentWord) {
          setFeedback("correct");
          setScore((s) => s + 1);
          setTimeout(() => {
            const newCompleted = new Set(completedWords);
            newCompleted.add(currentIndex);
            setCompletedWords(newCompleted);
            setFeedback(null);
            setTranscript("");
          }, 1500);
        } else {
          setFeedback("wrong");
          setTimeout(() => {
            setFeedback(null);
            setTranscript("");
          }, 1500);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        setFeedback("wrong");
        setTimeout(() => {
          setFeedback(null);
          setTranscript("");
        }, 1500);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [currentIndex, currentWord, completedWords]);

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
      setCurrentIndex(currentIndex + 1);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/levels")}
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
                  className={`inline-flex flex-col items-center gap-4 px-12 py-8 rounded-3xl shadow-xl mb-6 transition-all ${
                    feedback === "correct"
                      ? "bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 ring-4 ring-green-500"
                      : feedback === "wrong"
                        ? "bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 ring-4 ring-red-500"
                        : "bg-white dark:bg-gray-800"
                  }`}
                >
                  {/* Display Word */}
                  <div>
                    <span
                      className="text-7xl tracking-wider"
                      style={{ color: accent.primary }}
                    >
                      {currentWord}
                    </span>
                  </div>

                  {/* Microphone Button */}
                  {!completedWords.has(currentIndex) && (
                    <button
                      onClick={isListening ? stopListening : startListening}
                      disabled={!!feedback}
                      className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                        isListening
                          ? "bg-gradient-to-br from-red-500 to-red-600 scale-110 animate-pulse"
                          : feedback
                            ? "bg-gray-300 dark:bg-gray-600"
                            : "bg-gradient-to-br from-[#FF4B8A] to-[#e0336e] hover:scale-105 shadow-lg"
                      }`}
                    >
                      {isListening ? (
                        <MicOff className="w-12 h-12 text-white" />
                      ) : (
                        <Mic className="w-12 h-12 text-white" />
                      )}
                    </button>
                  )}

                  {/* Status Text */}
                  <div className="min-h-[2rem]">
                    {isListening && (
                      <p className="text-gray-600 dark:text-gray-400">
                        Listening...
                      </p>
                    )}
                    {transcript && !feedback && (
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
                    {feedback === "wrong" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 text-red-600 dark:text-red-400"
                      >
                        <XCircle className="w-6 h-6" />
                        <span className="text-lg">
                          Try again! (You said: {transcript})
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Completed Badge */}
                  {completedWords.has(currentIndex) && (
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
                disabled={currentIndex === 0}
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
                disabled={currentIndex === words.length - 1}
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
                  {words.map((word, i) =>
                    completedWords.has(i) ? (
                      <span
                        key={i}
                        className="px-4 py-2 rounded-full text-white text-sm"
                        style={{
                          background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                        }}
                      >
                        {word} ✓
                      </span>
                    ) : null
                  )}
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
              You completed {score} out of {words.length} words correctly!
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
              onClick={() => {
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
                navigate("/levels");
              }}
              size="lg"
              className="rounded-xl px-8 py-6 text-lg text-white"
              style={{
                background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
              }}
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Levels
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
