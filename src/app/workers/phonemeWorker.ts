import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js to load models from CDN/Cache (no local filesystem)
env.allowLocalModels = false;

class PhonemePipeline {
  static task: any = 'automatic-speech-recognition';
  // Pure phonetic model - outputs IPA [p] [a] instead of words
  static model = 'Xenova/wav2vec2-leoniesg-base-eng-phone';
  static instance: any = null;

  static async getInstance(progress_callback?: Function) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { 
        progress_callback,
        quantized: true // Keep the model as lightweight as possible
      });
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { type, audioData } = event.data;

  if (type === 'PRELOAD') {
    try {
      await PhonemePipeline.getInstance((x: any) => {
        self.postMessage({ type: 'PROGRESS', payload: x });
      });
      self.postMessage({ type: 'READY' });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', error: err.message });
    }
  }

  if (type === 'RECOGNIZE') {
    try {
      const recognizer = await PhonemePipeline.getInstance();
      // audioData must be a Float32Array at 16kHz
      const output = await recognizer(audioData);
      self.postMessage({ type: 'RESULT', text: output.text });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', error: err.message });
    }
  }
});
