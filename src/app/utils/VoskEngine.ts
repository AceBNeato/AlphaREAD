import { createModel } from 'vosk-browser';

class VoskEngineClass {
  private model: any = null;
  private recognizer: any = null;
  private isReady: boolean = false;
  private isInitializing: boolean = false;

  // The 40MB model URL. We use a public CDN or a local path.
  // We recommend using a CDN for the small English model.
  private modelUrl = "https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.zip";

  async initialize() {
    if (this.isReady || this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      // 1. Create the model
      console.log("[Vosk] Downloading & Loading Model (this may take a while)...");
      this.model = await createModel(this.modelUrl);
      
      console.log("[Vosk] Model Loaded Successfully!");
      this.isReady = true;
    } catch (e) {
      console.error("[Vosk] Failed to initialize:", e);
    } finally {
      this.isInitializing = false;
    }
  }

  isLoaded() {
    return this.isReady;
  }

  async createRecognizer(sampleRate: number = 16000) {
    if (!this.isReady) {
      await this.initialize();
    }
    
    // 2. Create the recognizer instance from the model
    this.recognizer = new this.model.KaldiRecognizer(sampleRate);
    
    // To restrict phonemes (CV / VC matching), we could pass a grammar list:
    // this.recognizer = new this.model.KaldiRecognizer(sampleRate, '["ni", "knee", "nee"]');
    
    return this.recognizer;
  }

  async processAudioBuffer(audioData: AudioBuffer) {
    if (!this.recognizer) return "";
    
    // Convert Float32Array audio buffer to 16-bit PCM for Vosk
    const pcmData = this.floatTo16BitPCM(audioData.getChannelData(0));
    
    this.recognizer.acceptWaveform(pcmData);
    const result = this.recognizer.result();
    return result.text || "";
  }

  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const buffer = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buffer;
  }
}

export const VoskEngine = new VoskEngineClass();
