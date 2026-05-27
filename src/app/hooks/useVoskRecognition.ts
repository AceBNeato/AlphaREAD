import { useEffect, useRef, useState, useCallback } from "react";
import { createModel } from "vosk-browser";

interface UseVoskProps {
  onResult?: (text: string) => void;
  onError?: (err: any) => void;
}

export function useVoskRecognition({ onResult, onError }: UseVoskProps = {}) {
  const [isVoskReady, setIsVoskReady] = useState(false);
  
  const modelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isListeningRef = useRef(false);

  // Initialize Vosk Model (Done once)
  useEffect(() => {
    let isMounted = true;
    
    const initVosk = async () => {
      try {
        console.log("[Vosk] Loading Local Model...");
        const model = await createModel("/models/vosk-model-small-en-us-0.15.tar.gz");
        if (isMounted) {
          modelRef.current = model;
          setIsVoskReady(true);
          console.log("[Vosk] Model Ready!");
        }
      } catch (err) {
        console.error("[Vosk] Initialization Error:", err);
      }
    };
    
    initVosk();
    
    return () => {
      isMounted = false;
      if (modelRef.current) {
        modelRef.current.terminate();
      }
    };
  }, []);

  const stopVoskRecognition = useCallback(() => {
    if (!isListeningRef.current) return;
    isListeningRef.current = false;

    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect();
      // Don't close the audio context entirely, just suspend it or let GC handle it,
      // as closing it might cause issues on quick restarts.
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.error(e));
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (recognizerRef.current) {
      try {
        const finalResult = recognizerRef.current.finalResult();
        if (finalResult.text && onResult) {
          onResult(finalResult.text);
        }
        recognizerRef.current.free();
      } catch (e) {
        console.error(e);
      }
      recognizerRef.current = null;
    }
  }, [onResult]);

  const startVoskRecognition = useCallback(async () => {
    if (!isVoskReady || !modelRef.current) {
      console.warn("[Vosk] Model not ready yet.");
      if (onError) onError("Model not ready");
      return;
    }
    
    if (isListeningRef.current) {
      stopVoskRecognition();
    }
    isListeningRef.current = true;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      recognizerRef.current = new modelRef.current.KaldiRecognizer(16000);
      
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!recognizerRef.current || !isListeningRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        
        const isUtteranceEnd = recognizerRef.current.acceptWaveform(pcmData);
        if (isUtteranceEnd) {
          const result = recognizerRef.current.result();
          if (result.text && onResult) {
            onResult(result.text);
            stopVoskRecognition(); // Auto-stop on utterance end
          }
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
    } catch (err) {
      console.error("[Vosk] Microphone access error:", err);
      isListeningRef.current = false;
      if (onError) onError(err);
    }
  }, [isVoskReady, stopVoskRecognition, onResult, onError]);

  return {
    isVoskReady,
    startVoskRecognition,
    stopVoskRecognition
  };
}
