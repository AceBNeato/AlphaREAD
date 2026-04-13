import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Volume2, Trophy, RotateCcw, Mic, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import VoiceRecognition from './VoiceRecognition';
import { playElevenLabsAudio } from '../../utils/elevenLabsTTS';
import { CVC_WORDS, allLetters } from '../data/levels';
import { VoiceRecognitionResult } from '../../utils/nativeSpeechRecognizer';

interface VoicePracticeItem {
  text: string;
  type: 'letter' | 'word';
  example?: string;
}

interface LevelVoicePracticeProps {
  title: string;
  subtitle: string;
  items: VoicePracticeItem[];
  onLevelComplete: () => void;
}

// Accent colors for Level 6
const levelAccent = {
  primary: '#8B5CF6',
  dark: '#7c3aed',
  lightBg: '#f3e8ff',
};

export default function LevelVoicePractice({
  items,
  onLevelComplete
}: LevelVoicePracticeProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [skippedItems, setSkippedItems] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isReEvaluation, setIsReEvaluation] = useState(false);
  const [reEvalItems, setReEvalItems] = useState<number[]>([]);
  const [reEvalIndex, setReEvalIndex] = useState(0);
  const [lastResult, setLastResult] = useState<VoiceRecognitionResult | null>(null);

  const currentItem = isReEvaluation ? items[reEvalItems[reEvalIndex]] : items[currentIndex];
  const currentItemIndex = isReEvaluation ? reEvalItems[reEvalIndex] : currentIndex;
  const progress = ((completedItems.size + (isReEvaluation ? reEvalIndex : 0)) / (items.length + reEvalItems.length)) * 100;

  useEffect(() => {
    // Check if main items are done and we need to start re-evaluation
    if (!isReEvaluation && completedItems.size + skippedItems.size === items.length && skippedItems.size > 0) {
      const skippedArray = Array.from(skippedItems);
      setReEvalItems(skippedArray);
      setReEvalIndex(0);
      setIsReEvaluation(true);
      setShowResult(false);
    }
    // Check if everything is complete (main + re-evaluation)
    else if (isReEvaluation && reEvalIndex >= reEvalItems.length) {
      setIsLevelComplete(true);
    }
    else if (completedItems.size === items.length && skippedItems.size === 0) {
      setIsLevelComplete(true);
    }
  }, [completedItems, skippedItems, items.length, isReEvaluation, reEvalIndex, reEvalItems.length]);

  const handleVoiceResult = (result: VoiceRecognitionResult) => {
    const itemIdx = isReEvaluation ? reEvalItems[reEvalIndex] : currentIndex;
    const newAttempts = { ...attempts, [itemIdx]: (attempts[itemIdx] || 0) + 1 };
    setAttempts(newAttempts);
    setLastResult(result);
    setShowResult(true);

    if (result.isCorrect) {
      setCompletedItems(new Set([...completedItems, itemIdx]));
      // If in re-evaluation, also remove from skipped
      if (isReEvaluation) {
        setSkippedItems(prev => {
          const newSkipped = new Set(prev);
          newSkipped.delete(itemIdx);
          return newSkipped;
        });
      }
    }
  };

  const handleBack = () => {
    if (isReEvaluation) {
      if (reEvalIndex > 0) {
        setReEvalIndex(reEvalIndex - 1);
        setShowResult(false);
        setLastResult(null);
      } else {
        navigate("/levels");
      }
    } else {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setShowResult(false);
        setLastResult(null);
      } else {
        navigate("/levels");
      }
    }
  };

  const handleNext = () => {
    // If wrong, skip this item (add to skipped for re-evaluation)
    if (lastResult && !lastResult.isCorrect) {
      const itemIdx = isReEvaluation ? reEvalItems[reEvalIndex] : currentIndex;
      setSkippedItems(new Set([...skippedItems, itemIdx]));
    }

    if (isReEvaluation) {
      if (reEvalIndex < reEvalItems.length - 1) {
        setReEvalIndex(reEvalIndex + 1);
        setShowResult(false);
        setLastResult(null);
      } else {
        // End of re-evaluation
        setIsLevelComplete(true);
      }
    } else {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowResult(false);
        setLastResult(null);
      }
    }
  };

  const handleRetry = () => {
    setShowResult(false);
    setLastResult(null);
  };

  const playInstruction = async () => {
    const item = isReEvaluation ? items[reEvalItems[reEvalIndex]] : items[currentIndex];
    try {
      await playElevenLabsAudio(`Say ${item.text}`);
    } catch (err) {
      console.error('Failed to play instruction:', err);
    }
  };

  if (isLevelComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/levels')}
              className="rounded-full gap-2 h-12 px-4 text-base touch-manipulation"
            >
              <ArrowLeft className="w-6 h-6" />
              Back
            </Button>
            <div className="flex-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: levelAccent.primary }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
            <span className="text-sm" style={{ color: levelAccent.primary }}>
              {items.length}/{items.length}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6">
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
              <Trophy className="w-20 h-20 text-[#FFC800]" />
            </motion.div>
            <h3 className="text-3xl mb-4" style={{ color: levelAccent.primary }}>
              All Words Completed!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You completed {completedItems.size} out of {items.length} words!
            </p>
            {skippedItems.size > 0 && (
              <p className="text-sm text-amber-600 mb-4">
                {skippedItems.size} words still need practice
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {items.map((item, i) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-full text-white text-lg cursor-pointer hover:scale-105 transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${levelAccent.primary}, ${levelAccent.dark})`,
                    opacity: completedItems.has(i) ? 1 : 0.5,
                  }}
                  onClick={() => playElevenLabsAudio(item.text)}
                >
                  <Volume2 className="w-3 h-3 inline mr-1" />
                  {item.text}
                </span>
              ))}
            </div>
            <Button
              type="button"
              onClick={() => {
                const completedLevels = JSON.parse(
                  localStorage.getItem("completedLevels") || "[]"
                );
                if (!completedLevels.includes(6)) {
                  completedLevels.push(6);
                  localStorage.setItem(
                    "completedLevels",
                    JSON.stringify(completedLevels)
                  );
                }
                onLevelComplete();
              }}
              className="rounded-xl px-8 py-6 text-lg text-white h-16 touch-manipulation"
              style={{
                background: `linear-gradient(135deg, ${levelAccent.primary} 0%, ${levelAccent.dark} 100%)`,
              }}
            >
              <ArrowLeft className="w-6 h-6 mr-2" />
              Back to Levels
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={handleBack}
            className="rounded-full gap-2 h-14 px-6 text-lg touch-manipulation"
          >
            <ArrowLeft className="w-6 h-6" />
            Back
          </Button>
          <div className="flex-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: levelAccent.primary }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <span className="text-sm" style={{ color: levelAccent.primary }}>
            {completedItems.size}/{items.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Title Section */}
        <div className="text-center mb-4">
          <h2 className="text-2xl mb-1" style={{ color: levelAccent.primary }}>
            {isReEvaluation ? '🔁 Re-Evaluation' : 'Voice Evaluation'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isReEvaluation 
              ? `Let's try the ${skippedItems.size} words you skipped again!`
              : 'Tap the microphone and say the word out loud!'}
          </p>
          {skippedItems.size > 0 && !isReEvaluation && (
            <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full text-white" style={{ background: levelAccent.primary }}>
              {skippedItems.size} skipped for re-evaluation
            </span>
          )}
        </div>

      {/* Current Target Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${isReEvaluation ? 'reval' : 'main'}-${currentItemIndex}`}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="text-center mb-6"
        >
          {/* Target info */}
          <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            {isReEvaluation 
              ? `Re-eval ${reEvalIndex + 1} of ${reEvalItems.length}`
              : `Word ${currentIndex + 1} of ${items.length}`}
          </div>

          {/* Word Display Card */}
          <div
            className="inline-flex flex-col items-center gap-3 px-8 py-5 rounded-2xl shadow-lg mb-4"
            style={{
              background: `linear-gradient(135deg, ${levelAccent.primary}20, ${levelAccent.primary}10)`,
              border: `2px solid ${levelAccent.primary}`,
            }}
          >
            <span
              className="text-xs px-3 py-1 rounded-full text-white"
              style={{ background: levelAccent.primary }}
            >
              {currentItem.type === 'letter' ? 'Letter' : 'Word'}
            </span>

            <div className="flex items-center gap-3">
              <span
                className="text-5xl tracking-widest"
                style={{ color: levelAccent.primary }}
              >
                {currentItem.text}
              </span>
              <button
                onClick={playInstruction}
                className="p-3 rounded-full text-white shadow-md hover:scale-110 active:scale-95 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${levelAccent.primary}, ${levelAccent.dark})`,
                }}
              >
                <Volume2 className="w-6 h-6" />
              </button>
            </div>

            {currentItem.example && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Example: {currentItem.example}
              </span>
            )}

            {attempts[currentItemIndex] > 0 && (
              <span className="text-xs text-gray-500">
                Attempts: {attempts[currentItemIndex]}
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Voice Recognition Area */}
      {!showResult ? (
        <div className="flex justify-center">
          <VoiceRecognition
            key={`${isReEvaluation ? 'reval' : 'main'}-${currentItemIndex}`}
            targetWord={currentItem.text}
            onResult={handleVoiceResult}
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-auto"
        >
          <Card className="p-6 text-center">
            <div className="space-y-4">
              {lastResult?.isCorrect ? (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-600">
                    Excellent! 🎉
                  </h3>
                  <p className="text-sm text-gray-600">
                    You said "{lastResult?.transcript}" correctly!
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                    <Mic className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-red-600">
                    Not quite right
                  </h3>
                  <p className="text-sm text-gray-600">
                    You said: "{lastResult?.transcript}"
                  </p>
                  <p className="text-xs text-amber-600">
                    Skipped words will be tested again at the end!
                  </p>
                </>
              )}

              <div className="flex gap-3 justify-center pt-2">
                <Button onClick={handleRetry} variant="outline" className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Try Again
                </Button>
                {(!lastResult?.isCorrect || 
                  (isReEvaluation && reEvalIndex < reEvalItems.length - 1) ||
                  (!isReEvaluation && currentIndex < items.length - 1) ||
                  (!isReEvaluation && skippedItems.size > 0)) && (
                  <Button 
                    onClick={handleNext}
                    className="flex-1"
                    style={{ 
                      background: lastResult?.isCorrect ? levelAccent.primary : undefined 
                    }}
                  >
                    {lastResult?.isCorrect ? (
                      <>
                        Next <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      'Skip & Next'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  </div>
  );
}

// Helper function to create voice practice levels
export function createLetterVoiceLevel(): VoicePracticeItem[] {
  return allLetters.map((letter: { letter: string; example: string }) => ({
    text: letter.letter,
    type: 'letter' as const,
    example: letter.example
  }));
}

export function createCVCVoiceLevel(): VoicePracticeItem[] {
  return CVC_WORDS.map(word => ({
    text: word,
    type: 'word' as const
  }));
}
