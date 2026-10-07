/**
 * useWhisperRecognition — Offline Filipino Speech Recognition via Whisper Base
 * 
 * This hook provides a drop-in replacement for the Web Speech API path
 * when the device is offline and the language is Filipino/Tagalog.
 * 
 * Architecture:
 *   1. Records audio from the microphone using MediaRecorder + AudioContext
 *   2. Resamples to 16kHz mono Float32Array (Whisper's required format)
 *   3. Sends audio to a Web Worker running Whisper Base (ONNX)
 *   4. Returns transcription text for evaluation
 * 
 * The Web Worker keeps the model loaded in memory after first use,
 * so subsequent transcriptions are fast (~2-5 seconds on mobile).
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type WhisperStatus = 'idle' | 'loading' | 'ready' | 'recording' | 'processing' | 'error';

interface UseWhisperRecognitionProps {
  /** The target word/sentence being evaluated */
  evaluatingWord: string | null;
  /** Whether recognition is enabled */
  enabled?: boolean;
  /** Callback when transcription is complete */
  onResult: (transcript: string) => void;
  /** Callback when an error occurs */
  onError: (message: string) => void;
  /** Callback for model loading progress */
  onLoadProgress?: (progress: number) => void;
  /** Maximum recording duration in ms (default: 10000 = 10s) */
  maxDuration?: number;
  /** Silence detection threshold (default: 2000ms) */
  silenceTimeout?: number;
  /** Warm up the model in the background (e.g. as soon as offline Filipino mode is active) */
  preload?: boolean;
}

// ─── Audio Resampling Utility ───────────────────────────────────────────────────

/**
 * Resample audio to 16kHz mono Float32Array (Whisper's required format).
 * Uses OfflineAudioContext for high-quality resampling.
 */
async function resampleTo16kHz(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const TARGET_SR = 16000;
  
  // If already 16kHz mono, just return the data
  if (audioBuffer.sampleRate === TARGET_SR && audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  const duration = audioBuffer.duration;
  const offlineCtx = new OfflineAudioContext(
    1, // mono
    Math.ceil(duration * TARGET_SR),
    TARGET_SR
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const resampled = await offlineCtx.startRendering();
  return resampled.getChannelData(0);
}

// ─── Silence Detection ─────────────────────────────────────────────────────────

/**
 * Detect if audio is silent (RMS below threshold).
 */
function isAudioSilent(analyser: AnalyserNode, threshold: number = 0.01): boolean {
  const dataArray = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(dataArray);

  let sumSquares = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sumSquares += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sumSquares / dataArray.length);
  return rms < threshold;
}

// ─── Singleton Worker ───────────────────────────────────────────────────────────

import WhisperWorker from '../workers/whisperWorker?worker';

let whisperWorker: Worker | null = null;
let workerReady = false;
let loadPromise: Promise<void> | null = null;
const progressListeners = new Set<(p: number) => void>();

function getWhisperWorker(): Worker {
  if (!whisperWorker) {
    whisperWorker = new WhisperWorker();
  }
  return whisperWorker;
}

/**
 * Load the Whisper model once (shared across all hook instances).
 * Resolves when the worker reports 'ready', rejects on load failure.
 */
function ensureModelLoaded(): Promise<void> {
  if (workerReady) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const worker = getWhisperWorker();
  loadPromise = new Promise<void>((resolve, reject) => {
    const finish = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onWorkerError);
    };
    const onMessage = (event: MessageEvent) => {
      const { type, progress, message } = event.data || {};
      if (type === 'loading') {
        progressListeners.forEach(l => l(progress || 0));
      } else if (type === 'ready') {
        workerReady = true;
        progressListeners.forEach(l => l(100));
        finish();
        resolve();
      } else if (type === 'error') {
        finish();
        loadPromise = null; // allow retry
        reject(new Error(message || 'Failed to load Whisper model'));
      }
    };
    const onWorkerError = (e: ErrorEvent) => {
      finish();
      loadPromise = null;
      // Worker script itself crashed - recreate it on next attempt
      try { worker.terminate(); } catch { /* ignore */ }
      whisperWorker = null;
      reject(new Error(e.message || 'Whisper worker failed to start'));
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onWorkerError);
    worker.postMessage({ type: 'load' });
  });
  return loadPromise;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useWhisperRecognition({
  evaluatingWord,
  enabled = true,
  onResult,
  onError,
  onLoadProgress,
  maxDuration = 10000,
  silenceTimeout = 2000,
  preload = false,
}: UseWhisperRecognitionProps) {
  const [status, setStatus] = useState<WhisperStatus>(workerReady ? 'ready' : 'idle');
  const [loadProgress, setLoadProgress] = useState(workerReady ? 100 : 0);

  // Refs for cleanup
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);
  const hasHadSoundRef = useRef(false);

  // Keep callbacks fresh
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const onLoadProgressRef = useRef(onLoadProgress);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onLoadProgressRef.current = onLoadProgress; }, [onLoadProgress]);

  // ─── Cleanup ────────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    isActiveRef.current = false;

    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) { /* ignore */ }
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  // ─── Pre-load Model ────────────────────────────────────────────────────────

  useEffect(() => {
    const listener = (p: number) => {
      setLoadProgress(p);
      if (onLoadProgressRef.current) onLoadProgressRef.current(p);
    };
    progressListeners.add(listener);
    return () => { progressListeners.delete(listener); };
  }, []);

  const preloadModel = useCallback(() => {
    if (workerReady) return;
    setStatus(s => (s === 'idle' || s === 'error') ? 'loading' : s);
    ensureModelLoaded()
      .then(() => setStatus(s => (s === 'loading' ? 'ready' : s)))
      .catch((err) => {
        console.warn('[AlphabetGO] Whisper preload failed:', err?.message);
        setStatus(s => (s === 'loading' ? 'error' : s));
      });
  }, []);

  // Warm the model up as soon as offline-Filipino mode is active, so the
  // first word doesn't wait for a ~77MB model load.
  useEffect(() => {
    if (preload) preloadModel();
  }, [preload, preloadModel]);

  // ─── Record and Transcribe ─────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    isActiveRef.current = true;
    hasHadSoundRef.current = false;
    setStatus('recording');

    // Start loading the model in parallel with recording (no-op if loaded).
    // Swallow here; the real error is surfaced when we try to transcribe.
    ensureModelLoaded().catch(() => { /* handled in onstop */ });

    try {
      // Add a timeout to getUserMedia so it doesn't hang indefinitely
      const getUserMediaPromise = navigator.mediaDevices.getUserMedia({ audio: true });
      const timeoutPromise = new Promise<MediaStream>((_, reject) =>
        setTimeout(() => reject(new Error("Microphone permission timeout. Please ensure microphone access is allowed.")), 15000)
      );
      
      const stream = await Promise.race([getUserMediaPromise, timeoutPromise]);
      if (!isActiveRef.current) {
        // User left / cancelled while the permission prompt was open
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      mediaStreamRef.current = stream;

      // Set up AudioContext for silence detection
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch { /* ignore */ }
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Record audio chunks
      const chunks: Blob[] = [];
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (!isActiveRef.current) return;

        setStatus('processing');

        // Release the mic as soon as recording ends
        stream.getTracks().forEach(t => t.stop());

        try {
          if (chunks.length === 0) {
            throw new Error('No audio was captured');
          }
          if (!hasHadSoundRef.current) {
            // Skip the model entirely if there was zero sound
            setStatus('ready');
            onResultRef.current("");
            return;
          }
          // Combine chunks into a single blob
          const audioBlob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();

          // Decode and resample to 16kHz mono
          const tempCtx = new AudioContext();
          const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
          await tempCtx.close();

          const float32Audio = await resampleTo16kHz(audioBuffer);

          // Make sure the model has finished loading (first use only)
          await ensureModelLoaded();
          if (!isActiveRef.current) return;

          // Send to Whisper worker
          const worker = getWhisperWorker();

          const handleResult = (event: MessageEvent) => {
            const { type, text, message } = event.data || {};
            if (type !== 'result' && type !== 'error') return;
            worker.removeEventListener('message', handleResult);
            if (watchdogTimerRef.current) {
              clearTimeout(watchdogTimerRef.current);
              watchdogTimerRef.current = null;
            }
            if (!isActiveRef.current) return;

            if (type === 'result') {
              setStatus('ready');
              onResultRef.current(text);
            } else {
              setStatus('error');
              onErrorRef.current(message);
            }
          };

          worker.addEventListener('message', handleResult);
          worker.postMessage({ type: 'transcribe', audio: float32Audio });

          // Hard watchdog: if transcription takes more than 30s, force it to stop
          // so the user isn't stuck forever on older/slower phones.
          watchdogTimerRef.current = setTimeout(() => {
            if (!isActiveRef.current) return;
            worker.removeEventListener('message', handleResult);
            setStatus('error');
            onErrorRef.current('Transcription took too long.');
          }, 30000);
        } catch (err: any) {
          if (!isActiveRef.current) return;
          setStatus('error');
          onErrorRef.current(err?.message || 'Failed to process audio');
        }
      };

      // Start recording
      recorder.start(250); // Collect data every 250ms

      // Silence detection: stop recording after sustained silence
      let silentFrames = 0;
      let hasHadSound = false;
      const SILENCE_FRAMES_THRESHOLD = Math.ceil(silenceTimeout / 200); // Check every 200ms

      silenceTimerRef.current = setInterval(() => {
        if (!isActiveRef.current || !analyserRef.current) return;

        // Lower threshold (0.004) to catch quieter voices
        const silent = isAudioSilent(analyserRef.current, 0.004);

        if (!silent) {
          hasHadSoundRef.current = true;
          silentFrames = 0;
        } else {
          silentFrames++;
          // If we had sound, stop after standard silence timeout (e.g. 2.5s). 
          // If we never heard sound, give up after double that time (e.g. 5s).
          const threshold = hasHadSoundRef.current ? SILENCE_FRAMES_THRESHOLD : SILENCE_FRAMES_THRESHOLD * 2;
          
          if (silentFrames >= threshold) {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            if (silenceTimerRef.current) {
              clearInterval(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          }
        }
      }, 200);

      // Hard max duration limit
      recordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        if (silenceTimerRef.current) {
          clearInterval(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }, maxDuration);

    } catch (err: any) {
      if (!isActiveRef.current) return;
      setStatus('error');
      onErrorRef.current(err?.message || 'Microphone access denied');
    }
  }, [maxDuration, silenceTimeout]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // ─── Auto-start when evaluatingWord changes ────────────────────────────────

  useEffect(() => {
    if (!enabled || !evaluatingWord) {
      cleanup();
      return;
    }

    // Small delay to let any previous recording fully clean up
    const timer = setTimeout(() => {
      startRecording();
    }, 300);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [evaluatingWord, enabled, startRecording, cleanup]);

  return {
    status,
    loadProgress,
    isModelReady: workerReady,
    preloadModel,
    stopRecording,
  };
}
