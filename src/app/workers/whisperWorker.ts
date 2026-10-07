/**
 * Whisper ASR Web Worker
 * 
 * Runs Whisper Base model inference off the main thread to avoid UI freezing.
 * Uses @xenova/transformers to load the quantized ONNX model from local files.
 * 
 * Messages IN:
 *   { type: "load" }           → Pre-load the model
 *   { type: "transcribe", audio: Float32Array }  → Transcribe audio
 * 
 * Messages OUT:
 *   { type: "loading", progress: number }  → Model loading progress
 *   { type: "ready" }                       → Model loaded and ready
 *   { type: "result", text: string }        → Transcription result
 *   { type: "error", message: string }      → Error occurred
 */

import { pipeline, env } from '@xenova/transformers';

// Configure for STRICTLY local/offline model loading
env.allowRemoteModels = false; // Force offline mode
env.allowLocalModels = true;
env.localModelPath = '/models/'; // Look in public/models/
// Model files are bundled in the APK; caching them in the Cache API would just
// duplicate ~77MB on the device.
env.useBrowserCache = false;

// CRITICAL for offline: by default transformers.js fetches the ONNX Runtime
// .wasm binaries from cdn.jsdelivr.net, which fails with no internet.
// Serve them from public/wasm/ instead (bundled into the APK).
env.backends.onnx.wasm.wasmPaths = '/wasm/';
// Android WebView is not cross-origin isolated (no SharedArrayBuffer), so the
// threaded WASM build cannot run. Force the single-threaded build.
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;

let transcriber: any = null;
let loadPromise: Promise<void> | null = null;

/**
 * Initialize the Whisper pipeline (shared promise so concurrent
 * load/transcribe requests all wait for the same load).
 */
function loadModel(): Promise<void> {
  if (transcriber) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = doLoadModel().finally(() => {
      if (!transcriber) loadPromise = null; // allow retry after failure
    });
  }
  return loadPromise;
}

async function doLoadModel() {
  try {
    self.postMessage({ type: 'loading', progress: 0 });

    transcriber = await pipeline(
      'automatic-speech-recognition',
      'whisper-base', // Maps to /models/whisper-base/
      {
        // Use quantized model for smaller size (~75MB vs ~200MB)
        quantized: true,
        // Progress callback for loading UI
        progress_callback: (data: any) => {
          if (data.status === 'progress') {
            self.postMessage({ 
              type: 'loading', 
              progress: Math.round(data.progress || 0),
              file: data.file || ''
            });
          }
        }
      }
    );

    self.postMessage({ type: 'ready' });
  } catch (error: any) {
    self.postMessage({ type: 'error', message: error?.message || 'Failed to load Whisper model' });
  }
}

/**
 * Transcribe audio using the loaded Whisper model.
 * @param audioData - Float32Array of audio samples at 16kHz mono
 */
async function transcribe(audioData: Float32Array) {
  if (!transcriber) {
    self.postMessage({ type: 'error', message: 'Model not loaded yet' });
    return;
  }

  try {
    const t0 = Date.now();
    const result = await transcriber(audioData, {
      // Force Tagalog/Filipino language for better accuracy
      language: 'tl',
      task: 'transcribe',
      // Our clips are short words/sentences (< 15s), so no chunking is needed.
      // CRITICAL on phones: cap the output length. Without this, Whisper can
      // "hallucinate" repeated text up to 448 tokens on noisy/quiet audio,
      // which takes minutes on a single-threaded mobile CPU and looks like an
      // endless "processing" state.
      max_new_tokens: 48,
    });

    const text = (Array.isArray(result) ? result[0]?.text : result?.text)?.trim() || '';
    self.postMessage({ type: 'result', text, ms: Date.now() - t0 });
  } catch (error: any) {
    self.postMessage({ type: 'error', message: error?.message || 'Transcription failed' });
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent) => {
  const { type, audio } = event.data;

  switch (type) {
    case 'load':
      await loadModel();
      break;
    case 'transcribe':
      if (!transcriber) {
        await loadModel();
      }
      await transcribe(audio);
      break;
    default:
      self.postMessage({ type: 'error', message: `Unknown message type: ${type}` });
  }
};
