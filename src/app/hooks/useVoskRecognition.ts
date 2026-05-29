import { useEffect, useRef, useState, useCallback } from "react";
import { pipeline, env } from "@xenova/transformers";

// Use huggingface directly for phoneme model
env.allowLocalModels = false;

interface UseVoskProps {
  onResult?: (text: string) => void;
  onPartialResult?: (text: string) => void;
  onError?: (err: any) => void;
}

export function useVoskRecognition({ onResult, onPartialResult, onError }: UseVoskProps = {}) {
  const [isVoskReady, setIsVoskReady] = useState(false);
  
  const transcriberRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isListeningRef = useRef(false);
  
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
      try {
        console.log("[Wav2Vec2] Loading Phoneme Model...");
        const transcriber = await pipeline("automatic-speech-recognition", "Xenova/wav2vec2-lv-60-espeak-cv-ft");
        if (isMounted) {
          transcriberRef.current = transcriber;
          setIsVoskReady(true);
          console.log("[Wav2Vec2] Model Ready!");
        }
      } catch (err) {
        console.error("[Wav2Vec2] Initialization Error:", err);
      }
    };
    
    // Only init if it was already preloaded by Dashboard
    if (localStorage.getItem("wav2vec2_cached") === "true") {
      initWav2Vec2();
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
      console.log("[Wav2Vec2] Running transcription on audio length:", totalLength);
      // Run the model (returns raw IPA phonemes)
      const output = await transcriberRef.current(audioData);
      const text = output.text;
      console.log("[Wav2Vec2] Recognized phonemes:", text);
      
      if (text && onResultRef.current) {
        onResultRef.current(text);
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

  const startVoskRecognition = useCallback(async (grammar?: string[]) => {
    if (!isVoskReady || !transcriberRef.current) {
      console.warn("[Wav2Vec2] Model not ready yet.");
      if (onErrorRef.current) onErrorRef.current("Model not ready");
      return;
    }
    
    if (isListeningRef.current) {
      stopVoskRecognition();
    }
    
    isListeningRef.current = true;
    audioChunksRef.current = []; // Reset chunks
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is blocked. Please ensure you are using HTTPS or localhost.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      
      // Wav2Vec2 requires exactly 16000Hz sample rate
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
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
