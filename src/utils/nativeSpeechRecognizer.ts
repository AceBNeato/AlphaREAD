import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export interface VoiceRecognitionResult {
  transcript: string;
  isCorrect: boolean;
  confidence: number;
}

// Event interfaces for speech recognition
interface ListeningEvent {
  result?: string;
  results?: string[];
}

interface ErrorEvent {
  error?: string;
  message?: string;
}

class NativeSpeechRecognizer {
  private isAvailable: boolean = false;
  private targetWords: string[] = [];

  async initialize(): Promise<void> {
    try {
      // Check if speech recognition is available
      const { available } = await SpeechRecognition.available();
      this.isAvailable = available;
      
      if (!available) {
        throw new Error('Speech recognition not available on this device');
      }

      // Request permissions
      await SpeechRecognition.requestPermissions();
    } catch (error) {
      console.error('Speech recognition initialization error:', error);
      throw error;
    }
  }

  setTargetWords(words: string[]): void {
    this.targetWords = words.map(w => w.toUpperCase());
  }

  async startListening(): Promise<VoiceRecognitionResult> {
    if (!this.isAvailable) {
      throw new Error('Speech recognition not initialized');
    }

    try {
      // Start listening with partial results
      await SpeechRecognition.start({
        language: 'en-US',
        maxResults: 5,
        prompt: 'Say the word',
        partialResults: true,
        popup: false // Don't show native popup, we'll handle UI
      });

      // Wait for results
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          SpeechRecognition.stop();
          reject(new Error('Listening timeout'));
        }, 10000); // 10 second timeout

        // Listen for partial results
        SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          if (data.matches && data.matches.length > 0) {
            clearTimeout(timeout);
            
            const transcript = data.matches[0].toUpperCase().trim();
            
            // Check if any target word is in the transcript
            const isCorrect = this.targetWords.some(word => 
              transcript.includes(word) || word.includes(transcript)
            );

            resolve({
              transcript: data.matches[0],
              isCorrect,
              confidence: isCorrect ? 0.9 : 0.5
            });
          }
        });

        // Handle listening state changes
        SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
          if (data.status === 'stopped') {
            clearTimeout(timeout);
          }
        });
      });

    } catch (error) {
      console.error('Speech recognition error:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      await SpeechRecognition.stop();
    } catch (error) {
      console.log('Stop listening error (may be already stopped):', error);
    }
  }

  async cleanup(): Promise<void> {
    await this.stopListening();
    SpeechRecognition.removeAllListeners();
  }
}

export const nativeSpeechRecognizer = new NativeSpeechRecognizer();
