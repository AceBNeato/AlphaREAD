import { KokoroTTS } from "kokoro-js";

class KokoroService {
  private tts: any = null;
  private isInitializing = false;
  private isInitialized = false;
  private audioPlayer: HTMLAudioElement | null = null;

  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.isInitialized) return { success: true };
    if (this.isInitializing) return { success: false, error: "Already initializing" };

    this.isInitializing = true;
    try {
      console.log("[Kokoro] Loading local TTS model (82M)...");
      const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
      this.tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: "q8",
        device: "wasm", // Fallback to wasm for safety across devices
      });

      this.audioPlayer = new Audio();
      this.isInitialized = true;
      this.isInitializing = false;
      console.log("[Kokoro] TTS Model Ready!");
      return { success: true };
    } catch (e: any) {
      this.isInitializing = false;
      console.error("[Kokoro] Model Load Error:", e);
      return { success: false, error: e.message };
    }
  }

  async speak(text: string, voice = "af_heart"): Promise<void> {
    if (!this.isInitialized) {
      const init = await this.initialize();
      if (!init.success) return;
    }

    try {
      console.log(`[Kokoro] Generating speech for: "${text}"`);
      // Generate the raw audio data using Kokoro
      const audioData = await this.tts.generate(text, { voice });
      
      let url: string;
      if (audioData.toBlob) {
        url = URL.createObjectURL(audioData.toBlob());
      } else if (audioData.audio) {
        // Fallback for raw float32 array
        url = this.createWavBlob(audioData.audio, audioData.sampling_rate);
      } else {
        throw new Error("Unknown audio format returned from Kokoro");
      }

      if (this.audioPlayer) {
        this.audioPlayer.pause();
        this.audioPlayer.src = url;
        await this.audioPlayer.play();
      }
    } catch (e) {
      console.error("[Kokoro] Speech Generation Error:", e);
    }
  }

  private createWavBlob(samples: Float32Array, sampleRate: number): string {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const blob = new Blob([view], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }
}

export const kokoroService = new KokoroService();
