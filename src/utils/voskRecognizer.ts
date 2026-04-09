import { createModel, Model, KaldiRecognizer } from 'vosk-browser';
import { CVC_WORDS, allLetters } from '../app/data/levels';

export interface VoiceRecognitionResult {
  transcript: string;
  isCorrect: boolean;
  confidence: number;
}

export class VoiceRecognizer {
  private model: Model | null = null;
  private recognizer: KaldiRecognizer | null = null;
  private isInitialized = false;
  private targetWords: string[] = [];

  constructor() {
    this.targetWords = [
      ...allLetters.map((l: { letter: string }) => l.letter),
      ...CVC_WORDS
    ];
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load Vosk model (you'll need to download and host the model files)
      const modelPath = '/models/vosk-model-small-en-us-0.15';
      
      this.model = await createModel(modelPath);
      
      // Create recognizer with grammar
      this.recognizer = new this.model.KaldiRecognizer(16000, this.targetWords.join(' '));
      this.model.registerRecognizer(this.recognizer);

      this.isInitialized = true;
      console.log('Voice recognizer initialized');
    } catch (error) {
      console.error('Failed to initialize voice recognizer:', error);
      throw error;
    }
  }

  async recognizeSpeech(audioStream: MediaStream): Promise<VoiceRecognitionResult> {
    if (!this.isInitialized || !this.recognizer || !this.model) {
      throw new Error('Voice recognizer not initialized');
    }

    try {
      // Convert audio stream to format Vosk expects
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(audioStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      let finalResult = '';
      
      // Set up event listener for recognition results
      this.recognizer.on('result', (event: any) => {
        if (event.result && event.result.text) {
          finalResult = event.result.text;
        }
      });

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.recognizer!.acceptWaveformFloat(inputData, 16000);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Wait for speech input (you'll need to implement proper timing)
      await new Promise(resolve => setTimeout(resolve, 3000));

      source.disconnect();
      processor.disconnect();
      audioContext.close();

      // Get final result
      this.recognizer.retrieveFinalResult();
      const finalTranscript = finalResult.trim().toUpperCase();
      
      return {
        transcript: finalTranscript,
        isCorrect: this.targetWords.includes(finalTranscript),
        confidence: 0.8 // Vosk doesn't provide confidence in basic mode
      };

    } catch (error) {
      console.error('Speech recognition failed:', error);
      throw error;
    }
  }

  setTargetWords(words: string[]): void {
    this.targetWords = words.map(w => w.toUpperCase());
  }

  async cleanup(): Promise<void> {
    if (this.recognizer && this.model) {
      const recognizerId = this.recognizer.id;
      this.recognizer.remove();
      this.model.unregisterRecognizer(recognizerId);
      this.recognizer = null;
    }
    if (this.model) {
      this.model.terminate();
      this.model = null;
    }
    this.isInitialized = false;
  }
}

export const voiceRecognizer = new VoiceRecognizer();
