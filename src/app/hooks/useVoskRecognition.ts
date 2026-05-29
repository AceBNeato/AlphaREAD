import { useEffect, useRef, useState, useCallback } from "react";
import { createModel } from "vosk-browser";

interface UseVoskProps {
  onResult?: (text: string) => void;
  onPartialResult?: (text: string) => void;
  onError?: (err: any) => void;
}

export function useVoskRecognition({ onResult, onPartialResult, onError }: UseVoskProps = {}) {
  const [isVoskReady, setIsVoskReady] = useState(false);
  
  const modelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isListeningRef = useRef(false);

  // Store callbacks in refs to avoid infinite re-renders
  const onResultRef = useRef(onResult);
  const onPartialResultRef = useRef(onPartialResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onPartialResultRef.current = onPartialResult;
    onErrorRef.current = onError;
  }, [onResult, onPartialResult, onError]);

  // Initialize Vosk Model (Done once)
  useEffect(() => {
    let isMounted = true;
    
    const initVosk = async () => {
      try {
        console.log("[Vosk] Loading Local Model...");
        const baseUrl = (import.meta as any).env.BASE_URL || "/";
        const modelPath = `${baseUrl}models/vosk-model-small-en-us-0.15.tar.gz`.replace('//', '/');
        const model = await createModel(modelPath);
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
        if (finalResult.text && onResultRef.current) {
          onResultRef.current(finalResult.text);
        }
        recognizerRef.current.free();
      } catch (e) {
        console.error(e);
      }
      recognizerRef.current = null;
    }
  }, []);

  /**
   * Start recognition.
   * @param grammar  Optional array of words/phrases Vosk is allowed to return.
   *                 Pass the phonetic variants of the target syllable so Vosk
   *                 cannot hallucinate unrelated English words (e.g. "eric", "eg").
   *                 Example: ["eck", "ek", "eg", "[unk]"]
   *                 Always include "[unk]" so Vosk has a fallback for silence.
   */
  const startVoskRecognition = useCallback(async (grammar?: string[]) => {
    if (!isVoskReady || !modelRef.current) {
      console.warn("[Vosk] Model not ready yet.");
      if (onErrorRef.current) onErrorRef.current("Model not ready");
      return;
    }
    
    if (isListeningRef.current) {
      stopVoskRecognition();
    }
    isListeningRef.current = true;
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is blocked. Please ensure you are using HTTPS or localhost.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Build grammar JSON string — if provided, Vosk only returns words from this list.
      // This prevents hallucination of random English words for non-word phonemes.
      const grammarJson = grammar && grammar.length > 0
        ? JSON.stringify(grammar)
        : undefined;
      
      if (grammarJson) {
        console.log("[Vosk] Using grammar constraint:", grammarJson);
      }

      // Pass the actual sample rate + optional grammar to the recognizer
      recognizerRef.current = new modelRef.current.KaldiRecognizer(
        audioContext.sampleRate,
        grammarJson
      );
      
      // Listen to async events from the Vosk Web Worker
      recognizerRef.current.on("result", (message: any) => {
        if (message.result && message.result.text && onResultRef.current) {
          onResultRef.current(message.result.text);
          stopVoskRecognition();
        }
      });
      
      recognizerRef.current.on("partialresult", (message: any) => {
        if (message.result && message.result.partial && onPartialResultRef.current) {
          onPartialResultRef.current(message.result.partial);
        }
      });
      
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!recognizerRef.current || !isListeningRef.current) return;
        try {
          recognizerRef.current.acceptWaveform(e.inputBuffer);
        } catch (err) {
          console.error("Vosk acceptWaveform error:", err);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
    } catch (err: any) {
      console.error("[Vosk] Microphone access error:", err);
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
