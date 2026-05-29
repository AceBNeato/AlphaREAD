import { useEffect, useRef, useState, useCallback } from "react";
import { pipeline, env } from "@xenova/transformers";

// Use huggingface directly for phoneme model
env.allowLocalModels = false;

// Fast downsampler for Wav2Vec2 (requires 16kHz)
function resampleTo16k(audioData: Float32Array, origSampleRate: number): Float32Array {
  if (origSampleRate === 16000) return audioData;
  const ratio = origSampleRate / 16000;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    let sum = 0;
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.ceil((i + 1) * ratio), audioData.length);
    let count = end - start;
    for (let j = start; j < end; j++) {
      sum += audioData[j];
    }
    result[i] = count > 0 ? sum / count : 0;
  }
  return result;
}

// ─── GLOBAL MODEL CACHE ───
// We keep the model loaded in a global variable so it doesn't get 
// garbage collected and cause a 2-second delay every time a user changes routes.
let globalTranscriber: any = null;
let isGlobalTranscriberReady = false;
let isInitializing = false;

export const preloadWav2Vec2IntoMemory = async () => {
  if (globalTranscriber || isInitializing) return;
  isInitializing = true;
  try {
    console.log("[Wav2Vec2] Loading model into RAM in background...");
    globalTranscriber = await pipeline("automatic-speech-recognition", "Xenova/wav2vec2-lv-60-espeak-cv-ft");
    isGlobalTranscriberReady = true;
    console.log("[Wav2Vec2] Model successfully armed in RAM!");
  } catch (err) {
    console.error("[Wav2Vec2] Global Initialization Error:", err);
  } finally {
    isInitializing = false;
  }
};

interface UseVoskProps {
  onResult?: (text: string, context?: any) => void;
  onPartialResult?: (text: string) => void;
  onError?: (err: any) => void;
}

export function useVoskRecognition({ onResult, onPartialResult, onError }: UseVoskProps = {}) {
  const [isVoskReady, setIsVoskReady] = useState(isGlobalTranscriberReady);
  
  const transcriberRef = useRef<any>(globalTranscriber);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isListeningRef = useRef(false);
  const contextRef = useRef<any>(null);
  
  // We accumulate audio chunks into this array while recording
  const audioChunksRef = useRef<Float32Array[]>([]);

  // Store callbacks in refs to avoid infinite re-renders
  const onResultRef = useRef(onResult);
  const onPartialResultRef = useRef(onPartialResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onPartialResultRef.current = onPartialResult;
    onErrorRef.current = onError;
  }, [onResult, onPartialResult, onError]);

  // Initialize model
  useEffect(() => {
    let isMounted = true;
    
    const initWav2Vec2 = async () => {
      if (!isGlobalTranscriberReady) {
        await preloadWav2Vec2IntoMemory();
      }
      if (isMounted && isGlobalTranscriberReady) {
        transcriberRef.current = globalTranscriber;
        setIsVoskReady(true);
      }
    };
    
    // Only init if it was already preloaded by Dashboard
    if (localStorage.getItem("wav2vec2_cached") === "true") {
      initWav2Vec2();
    } else {
      // Setup a fast check in case it's currently downloading
      const interval = setInterval(() => {
        if (localStorage.getItem("wav2vec2_cached") === "true") {
          initWav2Vec2();
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  const runTranscription = async () => {
    if (!transcriberRef.current || audioChunksRef.current.length === 0) return;
    
    // Concatenate all audio chunks
    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const audioData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }
    audioChunksRef.current = []; // Clear for next time
    
    try {
      const sampleRate = audioContextRef.current?.sampleRate || 16000;
      console.log(`[Wav2Vec2] Captured ${totalLength} samples at ${sampleRate}Hz`);
      
      const resampledData = resampleTo16k(audioData, sampleRate);
      console.log(`[Wav2Vec2] Resampled to ${resampledData.length} samples at 16000Hz`);
      
      // Run the model (returns raw IPA phonemes)
      const output = await transcriberRef.current(resampledData);
      const text = output.text;
      console.log("[Wav2Vec2] Recognized phonemes:", text);
      
      if (text && onResultRef.current) {
        onResultRef.current(text, contextRef.current);
      }
    } catch (e) {
      console.error("[Wav2Vec2] Transcription error:", e);
    }
  };

  const stopVoskRecognition = useCallback(() => {
    if (!isListeningRef.current) return;
    isListeningRef.current = false;

    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect();
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error(e));
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Now that recording stopped, run the model on the accumulated audio
    runTranscription();
  }, []);

  const startVoskRecognition = useCallback(async (grammar?: string[], context?: any) => {
    if (!isVoskReady || !transcriberRef.current) {
      console.warn("[Wav2Vec2] Model not ready yet.");
      if (onErrorRef.current) onErrorRef.current("Model not ready");
      return;
    }
    
    if (isListeningRef.current) {
      stopVoskRecognition();
    }
    
    isListeningRef.current = true;
    contextRef.current = context;
    audioChunksRef.current = []; // Reset chunks
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is blocked. Please ensure you are using HTTPS or localhost.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      
      // Allow the browser to use its native hardware sample rate to prevent crashes
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!isListeningRef.current) return;
        // Copy the Float32Array to avoid it being mutated by the browser
        const inputData = e.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(inputData));
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
    } catch (err: any) {
      console.error("[Wav2Vec2] Microphone access error:", err);
      if (err.message && err.message.includes("HTTPS")) {
        alert("Microphone Error: " + err.message);
      }
      isListeningRef.current = false;
      if (onErrorRef.current) onErrorRef.current(err);
    }
  }, [isVoskReady, stopVoskRecognition]);

  return {
    isVoskReady,
    startVoskRecognition,
    stopVoskRecognition
  };
}
