import { pipeline, env } from '@xenova/transformers';

/**
 * SpeechService — Updated for Meta's facebook/wav2vec2-lv-60-espeak-cv-ft model.
 * This model outputs raw IPA phonemes, allowing for precise sound recognition.
 */

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = false;
env.localModelPath = '/models/'; // Explicitly define this for Capacitor!

export interface SpeechResult {
  text: string;
  confidence?: number;
}

class VoskService {
  private recognizer: any = null;
  private isInitializing = false;
  private isInitialized = false;

  // IPA PHONEME MAPPING: Meta model outputs these specific characters.
  // We map them to the target alphabet letters.
  private readonly PHONEME_MAP: Record<string, string[]> = {
    'A': ['æ', 'eɪ', 'ɑ', 'ə', 'ɐ', 'a', 'æː', 'ɑː', 'ɑ̃', 'ɐɐ', 'aː', 'a5', 'ɑ5', 'aɜ', 'ɑɜ', 'a2', 'ɑ2', 'ai5', 'ɑu5', 'aiɜ', 'ɑuɜ', 'ai2', 'ɑu2', 'a.', 'a.ː', 'a1', 'ɑ1', 'a4', 'ɑ4'],
    'B': ['b', 'p', 'bʰ', 'pʰ', 'bː', 'bʲ', 'bʰː'],
    'C': ['k', 's', 'kʰ', 'ts', 'tʃ', 'kː', 'c', 'cː', 'cʰ', 'ç', 'ts.', 'tsh', 'tsʲ', 'tsː'],
    'D': ['d', 't', 'dʰ', 'tʰ', 'ɾ', 'dʲ', 'dː', 'd[', 'd^', 'ɖ', 'ɖʰ', 'dʑ', 'dʑʲ', 'dˤ', 'dZ', 'dʲʲ', 'dʰː'],
    'E': ['ɛ', 'iː', 'e', 'ə', 'eɪ', 'ɛː', 'eː', 'e̞', 'ɛ̃', 'ɛɹ', 'ei5', 'eiɜ', 'ei2', 'ee', 'eə', 'ẽ', 'ẽː', 'e̞e̞'],
    'F': ['f', 'v', 'ɸ', 'fː', 'fʲ'],
    'G': ['ɡ', 'dʒ', 'k', 'ɡʰ', 'ɡʲ', 'ɡː', 'ɣ'],
    'H': ['h', 'ħ', 'ɦ', 'X', 'χ'],
    'I': ['ɪ', 'iː', 'aɪ', 'i', 'ᵻ', 'ɨ', 'iə', 'iːː', 'i5', 'i.5', 'iɜ', 'iɛ5', 'i.ɜ', 'i2', 'iɛɜ', 'i̪5', 'i.2', 'iɑɜ', 'iɑ2', 'i̪2', 'ɪu', 'i.ː', 'ɪ^', 'i.', 'ie', 'i̪1', 'i̪4', 'ĩ', 'i.1', 'i4', 'yi', 'iɛ1', 'iːː', 'ɪː', 'iɑ1', 'ɪuː', 'iː1', 'i.4', 'i:'],
    'J': ['dʒ', 'tʃ', 'j', 'dʑ', 'ʝ', 'ɟ', 'ɟː', 'ɟʰ', 'dʒʲ', 'dʒː', 'dʑʲ'],
    'K': ['k', 'ɡ', 'kʰ', 'ɡʰ', 'kh', 'kː', 'kʲ', 'kʰː'],
    'L': ['l', 'ɫ', 'ʎ', 'ɭ', 'l̩', 'lː', 'ɭʲ', 'ɬ'],
    'M': ['m', 'mʲ', 'm̩', 'mː'],
    'N': ['n', 'ŋ', 'nʲ', 'ɳ', 'n̩', 'ɴ', 'nː', 'ɲ', 'nʲʲ'],
    'O': ['ɒ', 'ɔː', 'oʊ', 'ə', 'uː', 'o', 'oː', 'ɔ', 'o̞', 'ɔ̃', 'oʊ', 'o5', 'onɡ5', 'ou5', 'oɜ', 'o2', 'oɪ', 'onɡɜ', 'oe', 'onɡ2', 'ou2', 'o1', 'o4', 'õ', 'uo', 'ɔø', 'ɔɪ', 'ɔɨ', 'oe:', 'o̞o̞', 'ou1', 'uo1'],
    'P': ['p', 'b', 'pʰ', 'bʰ', 'pː', 'pʲ', 'ph'],
    'Q': ['kw', 'k', 'kʰ', 'q', 'qː', 'ɢ'],
    'R': ['ɹ', 'r', 'ʁ', 'ɚ', 'ɹ̩', 'rʲ', 'ɽ', 'ɻ', 'rː', 'r̝̊', 'r̝', 'ər2', 'ərɜ', 'ər5', 'r.', 'ər4', 'ər1'],
    'S': ['s', 'z', 'ʃ', 'ʂ', 'ɕ', 's̪', 'sʲ', 's^', 'sː', 's.', 'sʲ', 'sx', 's̪ː'],
    'T': ['t', 'd', 'tʰ', 'dʰ', 'ʃ', 'tʃ', 'ts', 'tʲ', 't̪', 'tː', 't^', 'ʈ', 'th', 'tɕ', 'tɕh', 'tʃʲ', 't[', 'tː', 'tsh', 'ʈʰ', 'tʃː', 't^ː', 'tɕʲ'],
    'U': ['ʌ', 'uː', 'ʊ', 'jʊ', 'u', 'ʉ', 'ɯ', 'ʊɹ', 'ɑ', 'a', 'ɑː', 'uːː', 'u5', 'u2', 'uɜ', 'uo5', 'uoɜ', 'uei5', 'uɨ', 'ũ', 'u"', 'ɯᵝ', 'uə5', 'ua5', 'uɪ', 'uo2', 'uaɜ', 'u:', 'ua2', 'u1', 'u.', 'u.ː', 'uə2', 'ʊə', 'uei2', 'u4', 'ui', 'ũ', 'ɯᵝɯᵝ'],
    'V': ['v', 'f', 'b', 'ʋ', 'vʲ', 'vː'],
    'W': ['w', 'ʍ'],
    'X': ['ks', 'ɡz', 'z', 'kss', 'x', 'xʲ'],
    'Y': ['j', 'aɪ', 'ɪ', 'y', 'yː', 'ɥ', 'y5', 'yɜ', 'y2', 'yə5', 'yu5', 'yɛ5', 'yæ5', 'yæ2', 'yəɜ', 'yiɜ', 'yu2', 'y1', 'yuɜ', 'yə2', 'yɛ2', 'yɛ5ʲ'],
    'Z': ['z', 's', 'dz', 'ʒ', 'ʑ', 'ʐ', 'dzː', 'zː', 'ʑ', 'ʒʲ', 'zː'],

    // --- 12 CVC WORDS FOR LEVEL 3 ---
    'CAT': ['kæt', 'kat', 'kætː', 'cæt', 'kæ', 'ka'],
    'BED': ['bɛd', 'bed', 'bəd', 'bɛ', 'be'],
    'PIN': ['pɪn', 'pin', 'peen', 'pɪ', 'pi'],
    'DOG': ['dɒɡ', 'dɔɡ', 'dɔg', 'dog', 'dɔ', 'do'],
    'SUN': ['sʌn', 'san', 'sən', 'sʌ', 'sa'],
    'HAT': ['hæt', 'hat', 'hætː', 'hæ', 'ha'],
    'RED': ['ɹɛd', 'red', 'ɾɛd', 'ɹɛ', 'ɾe'],
    'WIG': ['wɪɡ', 'wiɡ', 'weɡ', 'wɪ', 'wi'],
    'BOX': ['bɒks', 'bɔks', 'boks', 'bɒk', 'bɔk'],
    'CUP': ['kʌp', 'kap', 'kəp', 'kʌ', 'ka'],
    'PEN': ['pɛn', 'pen', 'pən', 'pɛ', 'pe'],
    'LOG': ['lɒɡ', 'lɔɡ', 'log', 'lɒ', 'lɔ']
  };

  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (this.isInitialized) return { success: true };
    if (this.isInitializing) return { success: false, error: 'Already initializing' };

    this.isInitializing = true;
    try {
      console.log('[AI] Loading LOCAL Meta Phoneme model with WebGPU acceleration...');
      // We use the quantized version and enable WebGPU for much faster inference
      // Cast to 'any' because @xenova/transformers typedefs are outdated
      // and don't include 'device' yet, but the runtime supports WebGPU.
      this.recognizer = await pipeline('automatic-speech-recognition', 'wav2vec2-phoneme', {
        quantized: true,
        device: 'webgpu',
      } as any);

      this.isInitialized = true;
      this.isInitializing = false;
      console.log('[AI] Pure Phoneme Engine Ready!');
      return { success: true };
    } catch (e: any) {
      this.isInitializing = false;
      console.error('[AI] Model Load Error:', e);
      return { success: false, error: e.message };
    }
  }

  async recognizeLetter(
    targetLetter: string,
    audioBlob: Blob
  ): Promise<{ isMatch: boolean; recognized: string; score: number }> {
    if (!this.isInitialized) {
      const init = await this.initialize();
      if (!init.success) return { isMatch: false, recognized: 'AI Load Failed', score: 0 };
    }

    try {
      const target = targetLetter.toUpperCase();
      const acceptablePhonemes = this.PHONEME_MAP[target] || [target.toLowerCase()];

      // 1. Process Audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const rawData = audioBuffer.getChannelData(0);
      let audioData = new Float32Array(rawData.length);

      // --- PRE-EMPHASIS FILTER ---
      // Boosts high frequencies to make continuants (M, N, F, V, S, Z) sharper
      const alpha = 0.97;
      audioData[0] = rawData[0];
      for (let i = 1; i < rawData.length; i++) {
        audioData[i] = rawData[i] - alpha * rawData[i - 1];
      }

      // --- VOLUME BOOSTER (Normalization) ---
      let maxVal = 0;
      for (let i = 0; i < audioData.length; i++) {
        const abs = Math.abs(audioData[i]);
        if (abs > maxVal) maxVal = abs;
      }

      // CRITICAL FIX: Only boost if the max volume is above 0.03.
      // If we boost below this, we are amplifying pure room static into a roar,
      // which causes the AI to hear nothing but noise and output (silence).
      if (maxVal > 0.03 && maxVal < 0.8) {
        const gain = 0.8 / maxVal;
        for (let i = 0; i < audioData.length; i++) {
          audioData[i] *= gain;
        }
      }

      // --- SILENCE TRIMMER (Focus Trick) ---
      // Lowered threshold to 2% to preserve soft sounds like 'S'
      const threshold = 0.02;
      let start = 0;
      let end = audioData.length - 1;

      while (start < audioData.length && Math.abs(audioData[start]) < threshold) start++;
      while (end > start && Math.abs(audioData[end]) < threshold) end--;

      // Add a 200ms buffer so we don't clip the very start of the speech (the transient)
      const buffer = 3200; // 0.2s at 16kHz
      start = Math.max(0, start - buffer);
      end = Math.min(audioData.length - 1, end + buffer);

      // CRITICAL FIX: Wav2Vec2 needs at least ~0.3 seconds of audio context to work.
      // If the trimmed clip is too short, we expand it back out.
      const minLength = 4800; // 0.3s at 16kHz
      if (end - start < minLength) {
        const paddingNeeded = minLength - (end - start);
        start = Math.max(0, start - Math.floor(paddingNeeded / 2));
        end = Math.min(audioData.length - 1, end + Math.ceil(paddingNeeded / 2));
      }

      if (end > start) {
        audioData = audioData.slice(start, end);
      }

      console.log(`[AI] Analyzing mixed-accent sound for letter ${target}...`);

      // 2. Inference
      const result = await this.recognizer(audioData);
      const rawIPA = result.text.toLowerCase();

      // --- NORMALIZE FOR FILIPINO-ENGLISH MIX ---
      // This removes spaces, tone numbers (a1, a5), and special IPA colons (ː)
      // This bridges the gap between different accent outputs.
      const cleanRecognized = rawIPA
        .replace(/[\s\d:ː.^]/g, '') // Remove junk that stops cross-referencing
        .trim();

      // 3. SCORING LOGIC (Inclusive for Accents)
      const PASS_THRESHOLD = 0.55;
      let bestScore = 0;

      // Clean your map entries on the fly for comparison
      const cleanAcceptable = acceptablePhonemes.map(p =>
        p.toLowerCase().replace(/[\s\d:ː.^]/g, '')
      );

      cleanAcceptable.forEach((phoneme, index) => {
        // EXACT OR PARTIAL MATCH
        if (phoneme.length > 0 && cleanRecognized.includes(phoneme)) {
          // First phoneme in your map = 1.0 (Standard)
          // Others = 0.8 (Accent variations)
          const weight = index === 0 ? 1.0 : 0.8;

          // Bonus for length (more specific sounds)
          const lengthBonus = Math.min(phoneme.length * 0.2, 0.4);

          const score = weight + lengthBonus;
          if (score > bestScore) bestScore = score;
        }
      });

      // --- FILIPINO CONSONANT FALLBACK ---
      // This ensures that common accent-based sound swaps (like F for P) 
      // still get a passing grade (0.6) instead of failing.
      if (bestScore < PASS_THRESHOLD) {
        // Labial swaps
        if (target === 'F' && cleanRecognized.includes('p')) bestScore = 0.6;
        if (target === 'P' && cleanRecognized.includes('f')) bestScore = 0.6;
        if (target === 'V' && cleanRecognized.includes('b')) bestScore = 0.6;
        if (target === 'B' && cleanRecognized.includes('v')) bestScore = 0.6;

        // Sibilant swaps (S/Z is very common in PH accents)
        if (target === 'Z' && cleanRecognized.includes('s')) bestScore = 0.6;
        if (target === 'S' && cleanRecognized.includes('z')) bestScore = 0.6;

        // Nasal swaps
        if (target === 'M' && cleanRecognized.includes('n')) bestScore = 0.6;
        if (target === 'N' && cleanRecognized.includes('m')) bestScore = 0.6;

        // Liquids and Semivowels
        if (target === 'R' && (cleanRecognized.includes('ɾ') || cleanRecognized.includes('r'))) bestScore = 1.0;
        if (target === 'L' && cleanRecognized.includes('r')) bestScore = 0.6;
        if (target === 'Y' && (cleanRecognized.includes('j') || cleanRecognized.includes('i'))) bestScore = 0.6;

        // Breathy sounds
        if (target === 'H' && (cleanRecognized.includes('x') || cleanRecognized.includes('ħ'))) bestScore = 0.6;

        // Digraphs
        if (target === 'TH' && (cleanRecognized.includes('t') || cleanRecognized.includes('d'))) bestScore = 0.6;
      }

      const isMatch = bestScore >= PASS_THRESHOLD;
      console.log(`[AI] Result: "${rawIPA}" → Clean: "${cleanRecognized}" | Score: ${bestScore.toFixed(2)} → ${isMatch ? 'PASS' : 'FAIL'}`);

      await audioContext.close();
      return { isMatch, recognized: cleanRecognized || rawIPA || '(silence)', score: bestScore };
    } catch (e: any) {
      console.error('[AI] Recognition Error:', e);
      return { isMatch: false, recognized: 'Error: ' + e.message, score: 0 };
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const voskService = new VoskService();
