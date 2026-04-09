import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, CheckCircle, XCircle } from 'lucide-react';
import { voiceRecognizer, VoiceRecognitionResult } from '../../utils/voskRecognizer';
import { playElevenLabsAudio } from '../../utils/elevenLabsTTS';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

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
  const [isListening, setIsListening] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [result, setResult] = useState<VoiceRecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeRecognizer();
    return () => {
      cleanup();
    };
  }, []);

  const initializeRecognizer = async () => {
    try {
      setError(null);
      await voiceRecognizer.initialize();
      setIsInitialized(true);
    } catch (err) {
      setError('Failed to initialize voice recognition. Please check your microphone.');
      console.error('Voice recognition init error:', err);
    }
  };

  const startListening = async () => {
    if (!isInitialized) {
      setError('Voice recognition not ready');
      return;
    }

    try {
      setError(null);
      setResult(null);
      setIsProcessing(true);

      // Set target word for better recognition
      voiceRecognizer.setTargetWords([targetWord]);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      mediaStreamRef.current = stream;
      setIsListening(true);

      // Play the target word
      await playElevenLabsAudio(targetWord);

      // Start recognition
      const recognitionResult = await voiceRecognizer.recognizeSpeech(stream);
      
      setResult(recognitionResult);
      onResult?.(recognitionResult);
      
      // Play feedback sound
      if (recognitionResult.isCorrect) {
        await playSuccessSound();
      } else {
        await playErrorSound();
      }

    } catch (err) {
      setError('Microphone access denied or speech recognition failed');
      console.error('Speech recognition error:', err);
    } finally {
      stopListening();
      setIsProcessing(false);
    }
  };

  const stopListening = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
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
    stopListening();
    await voiceRecognizer.cleanup();
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

        {/* Microphone Button */}
        <Button
          onClick={isListening ? stopListening : startListening}
          disabled={!isInitialized || isProcessing}
          size="lg"
          className={`w-20 h-20 rounded-full ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-primary hover:bg-primary/90'
          }`}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>

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
          <p className="text-sm text-muted-foreground">
            Initializing voice recognition...
          </p>
        )}
      </div>
    </Card>
  );
}
