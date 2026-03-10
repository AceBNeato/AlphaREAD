import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Volume2,
  Home,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Mic,
  MicOff,
  Check,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  shuffle,
  VOWELS,
  CONSONANTS,
  generateSyllableTargets,
  type SyllablePattern,
  type SyllableTarget,
} from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { playElevenLabsAudio } from "../../utils/elevenLabsTTS";

interface LevelSyllableReaderProps {
  levelId: number;
  patterns: SyllablePattern[];
}

const patternLabels: Record<SyllablePattern, string> = {
  CV: "Consonant + Vowel",
  VC: "Vowel + Consonant",
  CVC: "Consonant + Vowel + Consonant",
};

const patternColors: Record<SyllablePattern, string> = {
  CV: "#FF9600",
  VC: "#CE82FF",
  CVC: "#FF4B8A",
};

export function LevelSyllableReader({
  levelId,
  patterns,
}: LevelSyllableReaderProps) {
  const navigate = useNavigate();

  const targets = useMemo(() => {
    const allTargets: SyllableTarget[] = [];

    if (patterns.includes("CV")) {
      allTargets.push(...SIMPLE_CV_SYLLABLES);
    }
    if (patterns.includes("VC")) {
      allTargets.push(...SIMPLE_VC_SYLLABLES);
    }
    if (patterns.includes("CVC")) {
      allTargets.push(...SIMPLE_CVC_SYLLABLES);
    }

    if (allTargets.length > 0) {
      // Mix all patterns for reading practice
      return shuffle(allTargets).slice(0, Math.min(12, allTargets.length));
    } else {
      return generateSyllableTargets(patterns, 12);
    }
  }, [patterns]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedTargets, setCompletedTargets] = useState<Set<number>>(
    new Set()
  );
  const [playingLetter, setPlayingLetter] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFeedback, setRecordingFeedback] = useState<"correct" | "incorrect" | "listening" | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const currentTarget = targets[currentIndex];
  const allDone = completedTargets.size >= targets.length;
  const progress = (completedTargets.size / targets.length) * 100;

  // Initialize speech recognition
  useMemo(() => {
    if (typeof window !== 'undefined') {
      // Check if HTTPS is required (most browsers require it for speech recognition)
      const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      
      if (!isHttps) {
        console.warn('Speech recognition requires HTTPS. Running on localhost should work.');
        setSpeechSupported(false);
        return;
      }

      // Check for speech recognition support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn('Speech recognition not supported in this browser');
        setSpeechSupported(false);
        return;
      }

      try {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
          setIsRecording(true);
          setRecordingFeedback("listening");
        };

        recognitionRef.current.onresult = (event: any) => {
          console.log('Speech recognition result:', event);
          const transcript = event.results[0][0].transcript.toLowerCase().trim();
          const expected = currentTarget.syllable.toLowerCase();
          
          console.log('Transcript:', transcript, 'Expected:', expected);
          
          // More flexible validation
          const transcriptClean = transcript.replace(/[^a-z]/g, '');
          const expectedClean = expected.replace(/[^a-z]/g, '');
          
          const isCorrect = transcriptClean.includes(expectedClean) || 
                           expectedClean.includes(transcriptClean) || 
                           transcriptClean === expectedClean ||
                           // Check if individual letters match
                           transcriptClean.split('').some((letter: string) => expectedClean.includes(letter));
          
          console.log('Validation result:', isCorrect);
          
          setRecordingFeedback(isCorrect ? "correct" : "incorrect");
          setIsRecording(false);
          
          if (isCorrect) {
            setScore((s) => s + 1);
            setTimeout(() => {
              handleComplete();
            }, 1500);
          } else {
            setTimeout(() => {
              setRecordingFeedback(null);
            }, 3000);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error, event);
          console.log('Environment info:', {
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            userAgent: navigator.userAgent,
            speechSupported: !!recognitionRef.current
          });
          
          setIsRecording(false);
          setRecordingFeedback(null);
          
          // Enhanced error handling for deployed environments
          if (event.error === 'not-allowed') {
            alert('🎤 Microphone access denied. Please:\n1. Click the lock icon in your browser address bar\n2. Allow microphone access for this site\n3. Refresh and try again');
          } else if (event.error === 'no-speech') {
            alert('🎤 No speech was detected. Please speak clearly into your microphone and try again.');
          } else if (event.error === 'network') {
            const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
            if (isProduction) {
              alert('🎤 Speech recognition may not be available in your region or browser.\n\n💡 Try using Chrome or Edge browser.\n\nAlternatively, use the "I Sounded It Out!" button below.');
            } else {
              alert('🎤 Network error - speech recognition requires internet connection.\n\n💡 Please check your connection and try again.');
            }
          } else if (event.error === 'service-not-allowed') {
            alert('🎤 Speech recognition service is not available.\n\n💡 This might be due to:\n• Browser restrictions\n• Network blocking\n• Regional limitations\n\nUse the "I Sounded It Out!" button instead.');
          } else if (event.error === 'aborted') {
            // User cancelled or another error - don't show alert
            return;
          } else {
            console.warn('Unknown speech recognition error:', event.error);
            alert(`🎤 Speech recognition error: ${event.error}\n\n💡 Try using the "I Sounded It Out!" button instead.`);
          }
        };

        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          setIsRecording(false);
        };

      } catch (error) {
        console.error('Error initializing speech recognition:', error);
        setSpeechSupported(false);
      }
    } else {
      setSpeechSupported(false);
    }
  }, [currentTarget]);

  const startRecording = useCallback(() => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  // Helper to play syllable audio by playing each letter sound in sequence
  const playSyllableAudio = useCallback(async (target: SyllableTarget) => {
    // Play each letter sound in sequence with a delay
    for (let i = 0; i < target.letters.length; i++) {
      const letter = target.letters[i];
      setPlayingLetter(letter);
      try {
        await playElevenLabsAudio(letter);
      } catch (error) {
        console.error("Error playing audio:", error);
      }

      // Wait 1 second between letters
      if (i < target.letters.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 900));
      }
    }
    setPlayingLetter(null);
  }, []);

  const handleNext = () => {
    if (currentIndex < targets.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setScore((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleComplete = () => {
    const newCompleted = new Set(completedTargets);
    newCompleted.add(currentIndex);
    setCompletedTargets(newCompleted);

    if (currentIndex < targets.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goNext = () => {
    if (currentIndex < targets.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <Home className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-purple-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <span className="text-sm text-purple-600">
            {completedTargets.size}/{targets.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl mb-2 text-purple-700 dark:text-purple-300">
            Syllable Reader
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Look at the syllable and sound it out by clicking the listen button!
          </p>
          {/* Pattern legend */}
          <div className="flex justify-center gap-2 mt-3 flex-wrap">
            {patterns.map((p) => (
              <span
                key={p}
                className="text-xs px-3 py-1 rounded-full text-white"
                style={{ background: patternColors[p] }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!allDone ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="text-center"
            >
              {/* Syllable Display */}
              <div className="mb-8">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Syllable {currentIndex + 1} of {targets.length}
                </div>
                <div className="flex justify-center items-center gap-2 mb-4">
                  {currentTarget.letters.map((letter, idx) => (
                    <motion.div
                      key={`${letter}-${idx}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold border-2 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                    >
                      {letter}
                    </motion.div>
                  ))}
                </div>

                {/* Syllable Text */}
                <div className="text-6xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                  {currentTarget.syllable}
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                  <p className="text-blue-800 dark:text-blue-200 font-medium text-center">
                    👄 Say this syllable out loud, then click "I Sounded It Out!"
                  </p>
                </div>

                {/* Pattern Indicator */}
                <div
                  className="inline-block px-4 py-2 rounded-full text-white text-sm font-medium mb-6"
                  style={{ background: patternColors[currentTarget.pattern] }}
                >
                  {patternLabels[currentTarget.pattern]}
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-4 mb-8">
                {speechSupported ? (
                  <>
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={!!recordingFeedback}
                      className={`px-8 py-4 text-lg font-semibold transition-all ${
                        isRecording
                          ? "bg-red-500 hover:bg-red-600 animate-pulse"
                          : recordingFeedback === "correct"
                          ? "bg-green-500 hover:bg-green-600"
                          : recordingFeedback === "incorrect"
                          ? "bg-orange-500 hover:bg-orange-600"
                          : "bg-blue-500 hover:bg-blue-600"
                      } text-white`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-6 h-6 mr-2" />
                          Listening... Tap to Stop
                        </>
                      ) : recordingFeedback === "listening" ? (
                        <>
                          <Mic className="w-6 h-6 mr-2" />
                          Listening...
                        </>
                      ) : recordingFeedback === "correct" ? (
                        <>
                          <Check className="w-6 h-6 mr-2" />
                          Great Pronunciation!
                        </>
                      ) : recordingFeedback === "incorrect" ? (
                        <>
                          <X className="w-6 h-6 mr-2" />
                          Try Again!
                        </>
                      ) : (
                        <>
                          <Mic className="w-6 h-6 mr-2" />
                          Tap to Speak
                        </>
                      )}
                    </Button>

                    {recordingFeedback && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-center p-3 rounded-lg ${
                          recordingFeedback === "correct"
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                            : recordingFeedback === "incorrect"
                            ? "bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200"
                            : "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
                        }`}
                      >
                        {recordingFeedback === "correct" && "🎉 Perfect! Moving to next syllable..."}
                        {recordingFeedback === "incorrect" && "💪 Keep practicing! Try saying it again."}
                        {recordingFeedback === "listening" && "🎤 Listening to your pronunciation..."}
                      </motion.div>
                    )}
                  </>
                ) : (
                  <div className="text-center p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-yellow-800 dark:text-yellow-200 mb-2">
                      🎤 Speech recognition not supported
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                      This feature works best in Chrome/Edge with HTTPS. 
                      {!window.location.protocol.includes('https') && window.location.hostname !== 'localhost' && 
                        ' Please use HTTPS or localhost for speech recognition.'}
                    </p>
                    <Button
                      onClick={handleComplete}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      I Sounded It Out!
                    </Button>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-center gap-4">
                <Button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  variant="outline"
                  className="px-6"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <Button
                  onClick={handleComplete}
                  className="bg-green-600 hover:bg-green-700 text-white px-8"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  I Sounded It Out!
                </Button>

                <Button
                  onClick={goNext}
                  disabled={currentIndex === targets.length - 1}
                  variant="outline"
                  className="px-6"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          ) : (
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
                <BookOpen className="w-20 h-20 text-purple-500" />
              </motion.div>
              <h3 className="text-3xl mb-4 text-purple-700 dark:text-purple-300">
                Reading Complete!
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                You sounded out {score} syllables!
              </p>
              <Button
                onClick={() => navigate("/")}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Simple CV syllables for elementary standards
const SIMPLE_CV_SYLLABLES = [
  { pattern: "CV" as const, letters: ["B", "A"], syllable: "BA" },
  { pattern: "CV" as const, letters: ["C", "A"], syllable: "CA" },
  { pattern: "CV" as const, letters: ["D", "A"], syllable: "DA" },
  { pattern: "CV" as const, letters: ["M", "A"], syllable: "MA" },
  { pattern: "CV" as const, letters: ["P", "A"], syllable: "PA" },
  { pattern: "CV" as const, letters: ["S", "A"], syllable: "SA" },
  { pattern: "CV" as const, letters: ["T", "A"], syllable: "TA" },
  { pattern: "CV" as const, letters: ["B", "I"], syllable: "BI" },
  { pattern: "CV" as const, letters: ["C", "I"], syllable: "CI" },
  { pattern: "CV" as const, letters: ["D", "I"], syllable: "DI" },
  { pattern: "CV" as const, letters: ["M", "I"], syllable: "MI" },
  { pattern: "CV" as const, letters: ["P", "I"], syllable: "PI" },
  { pattern: "CV" as const, letters: ["S", "I"], syllable: "SI" },
  { pattern: "CV" as const, letters: ["T", "I"], syllable: "TI" },
];

// Simple VC syllables for elementary standards
const SIMPLE_VC_SYLLABLES = [
  { pattern: "VC" as const, letters: ["A", "B"], syllable: "AB" },
  { pattern: "VC" as const, letters: ["A", "D"], syllable: "AD" },
  { pattern: "VC" as const, letters: ["A", "M"], syllable: "AM" },
  { pattern: "VC" as const, letters: ["A", "P"], syllable: "AP" },
  { pattern: "VC" as const, letters: ["A", "T"], syllable: "AT" },
  { pattern: "VC" as const, letters: ["I", "B"], syllable: "IB" },
  { pattern: "VC" as const, letters: ["I", "D"], syllable: "ID" },
  { pattern: "VC" as const, letters: ["I", "M"], syllable: "IM" },
  { pattern: "VC" as const, letters: ["I", "P"], syllable: "IP" },
  { pattern: "VC" as const, letters: ["I", "T"], syllable: "IT" },
];

// Simple CVC syllables for elementary standards (using real words)
const SIMPLE_CVC_SYLLABLES = [
  { pattern: "CVC" as const, letters: ["C", "A", "T"], syllable: "CAT" },
  { pattern: "CVC" as const, letters: ["D", "O", "G"], syllable: "DOG" },
  { pattern: "CVC" as const, letters: ["P", "I", "G"], syllable: "PIG" },
  { pattern: "CVC" as const, letters: ["R", "A", "T"], syllable: "RAT" },
  { pattern: "CVC" as const, letters: ["S", "U", "N"], syllable: "SUN" },
  { pattern: "CVC" as const, letters: ["B", "I", "G"], syllable: "BIG" },
  { pattern: "CVC" as const, letters: ["R", "U", "G"], syllable: "RUG" },
  { pattern: "CVC" as const, letters: ["H", "O", "G"], syllable: "HOG" },
];
