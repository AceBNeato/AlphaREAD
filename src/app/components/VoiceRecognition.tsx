import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { nativeSpeechRecognizer, VoiceRecognitionResult } from '../../utils/nativeSpeechRecognizer';
import { playElevenLabsAudio } from '../../utils/elevenLabsTTS';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useStudent } from '../context/StudentContext';

interface VoiceRecognitionProps {
  targetWord: string;
  onResult?: (result: VoiceRecognitionResult) => void;
  onComplete?: () => void;
}

export default function VoiceRecognition({ 
  targetWord, 
  onResult, 
  onComplete 
}: VoiceRecognitionProps) {
  const { currentProfile } = useStudent();
  const [isListening, setIsListening] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const [result, setResult] = useState<VoiceRecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    initializeRecognizer();
    return () => {
      cleanup();
    };
  }, []);

  // Cleanup when target word changes
  useEffect(() => {
    // Reset state when target changes
    setResult(null);
    setError(null);
    setIsListening(false);
    setIsProcessing(false);
  }, [targetWord]);

  const initializeRecognizer = async () => {
    try {
      setError(null);
      setInitProgress(10);
      
      // Configure recognizer with student profile settings
      if (currentProfile) {
        nativeSpeechRecognizer.setLanguage(currentProfile.accent);
        nativeSpeechRecognizer.setPhoneticThreshold(currentProfile.phoneticBias);
      }
      
      setInitProgress(50);
      
      await nativeSpeechRecognizer.initialize();
      
      setInitProgress(100);
      setIsInitialized(true);
    } catch (err) {
      setError('Failed to initialize voice recognition. Please check your microphone.');
      console.error('Voice recognition init error:', err);
    }
  };

  const handleMicTap = async () => {
    if (!isInitialized || isProcessing || isListening) return;
    
    // Reset states before starting
    setError(null);
    setResult(null);
    
    await startListening();
  };

  const startListening = async () => {
    if (!isInitialized) {
      setError('Voice recognition not ready');
      return;
    }

    // Prevent starting if already listening
    if (isListening || isProcessing) {
      console.log('Already listening or processing, ignoring tap');
      return;
    }

    try {
      setError(null);
      setResult(null);
      setIsProcessing(true);

      // Set target word for better recognition
      nativeSpeechRecognizer.setTargetWords([targetWord]);

      setIsListening(true);

      // Play the target word
      await playElevenLabsAudio(targetWord);

      // Wait a moment after playing audio before starting recognition
      await new Promise(resolve => setTimeout(resolve, 500));

      // Start native speech recognition
      const recognitionResult = await nativeSpeechRecognizer.startListening();
      
      setResult(recognitionResult);
      onResult?.(recognitionResult);
      
      // Play feedback sound
      if (recognitionResult.isCorrect) {
        await playSuccessSound();
      } else {
        await playErrorSound();
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Speech recognition error:', err);
      
      // Don't show error for normal stops
      if (!errorMessage.includes('stopped') && !errorMessage.includes('timeout')) {
        setError('Microphone access denied or speech recognition failed');
      }
    } finally {
      await stopListening();
      setIsProcessing(false);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await nativeSpeechRecognizer.stopListening();
    } catch (error) {
      console.log('Stop listening error:', error);
    }
  };

  const playSuccessSound = () => {
    // You can add a success sound file
    console.log('Success sound');
  };

  const playErrorSound = () => {
    // You can add an error sound file
    console.log('Error sound');
  };

  const cleanup = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      await nativeSpeechRecognizer.cleanup();
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  };

  const replayTargetWord = async () => {
    try {
      await playElevenLabsAudio(targetWord);
    } catch (err) {
      console.error('Failed to play audio:', err);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="text-center space-y-4">
        {/* Target Word Display */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Say this word:</h3>
          <div className="text-4xl font-bold text-primary">
            {targetWord}
          </div>
        </div>

        {/* Audio Controls */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={replayTargetWord}
            disabled={isProcessing}
          >
            <Volume2 className="w-4 h-4 mr-1" />
            Replay
          </Button>
        </div>

        {/* Microphone Button - Tap to Speak */}
        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={handleMicTap}
            disabled={!isInitialized || isProcessing}
            size="lg"
            className={`w-24 h-24 rounded-full transition-all duration-200 ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 scale-110' 
                : 'bg-primary hover:bg-primary/90 hover:scale-105'
            }`}
          >
            {isListening ? (
              <div className="flex flex-col items-center">
                <MicOff className="w-8 h-8" />
                <span className="text-xs mt-1">Listening...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Mic className="w-8 h-8" />
                <span className="text-xs mt-1">Tap to Speak</span>
              </div>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            {isListening ? 'Listening...' : 'Tap microphone to speak'}
          </p>
        </div>

        {/* Status Messages */}
        {isProcessing && (
          <p className="text-sm text-muted-foreground">
            Listening...
          </p>
        )}

        {error && (
          <Badge variant="destructive" className="text-sm">
            {error}
          </Badge>
        )}

        {/* Result Display */}
        {result && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-center gap-2">
              {result.isCorrect ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <span className="font-medium">
                You said: "{result.transcript}"
              </span>
            </div>
            
            {result.isCorrect ? (
              <p className="text-green-600 font-medium">Excellent! 🎉</p>
            ) : (
              <p className="text-red-600">
                Not quite. Try again!
              </p>
            )}

            {onComplete && (
              <Button 
                onClick={onComplete}
                className="mt-2"
              >
                Continue
              </Button>
            )}
          </div>
        )}

        {/* Initialization Status */}
        {!isInitialized && !error && (
          <div className="space-y-3 w-full max-w-xs mx-auto">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading speech model...</span>
            </div>
            <Progress value={initProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              This may take 5-10 seconds on first load
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
