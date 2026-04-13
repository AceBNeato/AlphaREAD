import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { findBestPhoneticMatch, isPhoneticMatch } from './phoneticMatcher';

export interface VoiceRecognitionResult {
  transcript: string;
  isCorrect: boolean;
  confidence: number;
  phoneticScore?: number;
  matchedWord?: string;
}

class NativeSpeechRecognizer {
  private isAvailable: boolean = false;
  private targetWords: string[] = [];
  private isListening: boolean = false;
  private listenersAdded: boolean = false;
  private phoneticThreshold: number = 0.6; // Default threshold for phonetic matching
  private language: string = 'en-US'; // Default language

  async initialize(): Promise<void> {
    try {
      // Check if speech recognition is available
      const { available } = await SpeechRecognition.available();
      this.isAvailable = available;
      
      if (!available) {
        throw new Error('Speech recognition not available on this device');
      }

      // Request permissions - don't throw if it fails, just log it
      try {
        await SpeechRecognition.requestPermissions();
      } catch (permError) {
        console.warn('Permission request failed, will try during start:', permError);
        // Don't throw - permissions might be granted during start
      }
    } catch (error) {
      console.error('Speech recognition initialization error:', error);
      throw error;
    }
  }

  setTargetWords(words: string[]): void {
    this.targetWords = words.map(w => w.toUpperCase());
  }

  setPhoneticThreshold(threshold: number): void {
    this.phoneticThreshold = Math.max(0, Math.min(1, threshold));
  }

  setLanguage(lang: string): void {
    this.language = lang;
  }

  async startListening(): Promise<VoiceRecognitionResult> {
    if (!this.isAvailable) {
      throw new Error('Speech recognition not initialized');
    }

    // Prevent starting if already listening
    if (this.isListening) {
      await this.stopListening();
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay to let previous session clean up
    }

    // Clean up any existing listeners before adding new ones
    if (this.listenersAdded) {
      await SpeechRecognition.removeAllListeners();
      this.listenersAdded = false;
    }

    try {
      this.isListening = true;

      // Start listening with partial results
      await SpeechRecognition.start({
        language: this.language,
        maxResults: 5,
        prompt: 'Say the word',
        partialResults: true,
        popup: false // Don't show native popup, we'll handle UI
      });

      // Wait for results
      return new Promise((resolve, reject) => {
        let resolved = false;
        let timeout: number | null = null;

        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          this.isListening = false;
          // Remove listeners to prevent memory leaks
          SpeechRecognition.removeAllListeners().catch(console.error);
          this.listenersAdded = false;
        };

        timeout = window.setTimeout(() => {
          cleanup();
          SpeechRecognition.stop().catch(console.error);
          reject(new Error('Listening timeout'));
        }, 10000); // 10 second timeout

        // Listen for partial results
        SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
          if (resolved) return;
          
          if (data.matches && data.matches.length > 0) {
            cleanup();
            SpeechRecognition.stop().catch(console.error);
            
            const transcript = data.matches[0].toUpperCase().trim();
            
            // Use phonetic matching for better accent handling
            const phoneticMatch = findBestPhoneticMatch(transcript, this.targetWords);
            const isCorrect = isPhoneticMatch(transcript, this.targetWords, this.phoneticThreshold);

            resolve({
              transcript: data.matches[0],
              isCorrect,
              confidence: phoneticMatch ? phoneticMatch.score : 0.5,
              phoneticScore: phoneticMatch?.score,
              matchedWord: phoneticMatch?.match,
            });
          }
        });

        // Handle listening state changes
        SpeechRecognition.addListener('listeningState', (data: { status: 'started' | 'stopped' }) => {
          if (data.status === 'stopped' && !resolved) {
            cleanup();
            reject(new Error('Recognition stopped'));
          }
        });

        this.listenersAdded = true;
      });

    } catch (error) {
      this.isListening = false;
      this.listenersAdded = false;
      console.error('Speech recognition error:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;

    try {
      await SpeechRecognition.stop();
    } catch (error) {
      console.log('Stop listening error (may be already stopped):', error);
    }

    // Always remove listeners to prevent memory leaks
    if (this.listenersAdded) {
      try {
        await SpeechRecognition.removeAllListeners();
        this.listenersAdded = false;
      } catch (error) {
        console.log('Error removing listeners:', error);
      }
    }
  }

  async cleanup(): Promise<void> {
    this.isListening = false;
    try {
      await SpeechRecognition.stop();
    } catch (error) {
      // Ignore stop errors during cleanup
    }
    try {
      await SpeechRecognition.removeAllListeners();
      this.listenersAdded = false;
    } catch (error) {
      console.log('Error removing listeners during cleanup:', error);
    }
  }
}

export const nativeSpeechRecognizer = new NativeSpeechRecognizer();
