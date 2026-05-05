/**
 * Utility for audio processing and phoneme comparison
 */

let sharedAudioCtx: AudioContext | null = null;
const referenceCache: Record<string, Float32Array> = {};

function getAudioContext() {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
}

export async function getAudioFeatures(audioBlob: Blob): Promise<Float32Array> {
  const audioContext = getAudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  
  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0;
  
  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);
  
  await offlineCtx.startRendering();
  
  const frequencyData = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(frequencyData);
  
  const numBands = 40;
  const bands = new Float32Array(numBands);
  const binsPerBand = Math.floor(frequencyData.length / numBands);
  
  for (let i = 0; i < numBands; i++) {
    let sum = 0;
    let count = 0;
    for (let j = 0; j < binsPerBand; j++) {
      const val = frequencyData[i * binsPerBand + j];
      if (isFinite(val)) {
        sum += val;
        count++;
      }
    }
    bands[i] = count > 0 ? sum / count : -100;
  }
  
  return bands;
}

/**
 * Compares two audio samples based on their frequency spectrum similarity.
 */
export async function comparePhonemes(
  userAudio: Blob,
  referenceUrl: string,
  threshold: number = 0.55
): Promise<{ isMatch: boolean; score: number }> {
  try {
    // Check cache for reference features
    let refBands = referenceCache[referenceUrl];
    
    if (!refBands) {
      const refResponse = await fetch(referenceUrl);
      const refBlob = await refResponse.blob();
      refBands = await getAudioFeatures(refBlob);
      referenceCache[referenceUrl] = refBands;
    }
    
    const userBands = await getAudioFeatures(userAudio);
    
    // Normalize dB levels to 0-1 range (assuming -80 to -20 range)
    const normalize = (arr: Float32Array) => {
      const min = -80;
      const max = -20;
      return arr.map(v => {
        const clamped = Math.max(min, Math.min(max, v));
        return (clamped - min) / (max - min);
      });
    };
    
    const normUser = normalize(userBands);
    const normRef = normalize(refBands);
    
    // Cosine Similarity
    let dotProduct = 0;
    let userMag = 0;
    let refMag = 0;
    
    for (let i = 0; i < normUser.length; i++) {
      dotProduct += normUser[i] * normRef[i];
      userMag += normUser[i] * normUser[i];
      refMag += normRef[i] * normRef[i];
    }
    
    const score = dotProduct / (Math.sqrt(userMag) * Math.sqrt(refMag) || 1);
    
    return {
      isMatch: score >= threshold,
      score: Math.round(score * 100) / 100
    };
  } catch (error) {
    console.error("Phoneme comparison error:", error);
    return { isMatch: false, score: 0 };
  }
}
