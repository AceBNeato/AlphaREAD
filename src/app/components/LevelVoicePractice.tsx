import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Volume2, Trophy, RotateCcw } from 'lucide-react';
import VoiceRecognition from './VoiceRecognition';
import { playElevenLabsAudio } from '../../utils/elevenLabsTTS';
import { CVC_WORDS, allLetters, Letter } from '../data/levels';
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

export default function LevelVoicePractice({
  title,
  subtitle,
  items,
  onLevelComplete
}: LevelVoicePracticeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [isLevelComplete, setIsLevelComplete] = useState(false);

  const currentItem = items[currentIndex];
  const progress = (completedItems.size / items.length) * 100;

  useEffect(() => {
    if (completedItems.size === items.length) {
      setIsLevelComplete(true);
    }
  }, [completedItems, items.length]);

  const handleVoiceResult = (result: VoiceRecognitionResult) => {
    const newAttempts = { ...attempts, [currentIndex]: (attempts[currentIndex] || 0) + 1 };
    setAttempts(newAttempts);

    if (result.isCorrect) {
      setCompletedItems(new Set([...completedItems, currentIndex]));
      setShowResult(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowResult(false);
    }
  };

  const handleRetry = () => {
    setShowResult(false);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCompletedItems(new Set());
    setAttempts({});
    setShowResult(false);
    setIsLevelComplete(false);
  };

  const playInstruction = async () => {
    try {
      await playElevenLabsAudio(`Say ${currentItem.text}`);
    } catch (err) {
      console.error('Failed to play instruction:', err);
    }
  };

  if (isLevelComplete) {
    return (
      <Card className="p-8 max-w-md mx-auto text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-2xl font-bold mb-2">Level Complete! 🎉</h2>
        <p className="text-muted-foreground mb-6">
          Great job! You've completed all voice practice exercises.
        </p>
        <div className="space-y-2 mb-6">
          <p className="text-sm">
            Total attempts: {Object.values(attempts).reduce((sum, count) => sum + count, 0)}
          </p>
          <p className="text-sm">
            Items completed: {completedItems.size}/{items.length}
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button onClick={handleRestart} variant="outline">
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry Level
          </Button>
          <Button onClick={onLevelComplete}>
            Continue
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span>Progress:</span>
            <Progress value={progress} className="w-32" />
            <span>{completedItems.size}/{items.length}</span>
          </div>
        </div>
      </Card>

      {/* Current Item Info */}
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Badge variant={currentItem.type === 'letter' ? 'default' : 'secondary'}>
              {currentItem.type === 'letter' ? 'Letter' : 'Word'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Item {currentIndex + 1} of {items.length}
            </span>
          </div>

          <div className="space-y-2">
            <div className="text-4xl font-bold text-primary">
              {currentItem.text}
            </div>
            {currentItem.example && (
              <p className="text-lg text-muted-foreground">
                Example: {currentItem.example}
              </p>
            )}
            {attempts[currentIndex] > 0 && (
              <p className="text-sm text-muted-foreground">
                Attempts: {attempts[currentIndex]}
              </p>
            )}
          </div>

          <Button
            onClick={playInstruction}
            variant="outline"
            size="sm"
          >
            <Volume2 className="w-4 h-4 mr-1" />
            Hear Example
          </Button>
        </div>
      </Card>

      {/* Voice Recognition */}
      {!showResult ? (
        <VoiceRecognition
          targetWord={currentItem.text}
          onResult={handleVoiceResult}
        />
      ) : (
        <Card className="p-6 text-center">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-green-600">
              Excellent! You said it correctly! 🎉
            </h3>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRetry} variant="outline">
                Try Again
              </Button>
              {currentIndex < items.length - 1 && (
                <Button onClick={handleNext}>
                  Next Item
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
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
