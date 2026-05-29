/**
 * PhonemeEvaluator.ts
 * 
 * Phoneme-aware evaluator for CV and VC syllable recognition (Level 2).
 * 
 * Problem: Browser SpeechRecognition autocorrects non-words (e.g. "PI" → "PIE").
 * Solution: We map what the browser hears to vowel phoneme classes and consonant groups,
 *           then validate whether the *sounds* are correct, not the literal spelling.
 * 
 * Supports: Online-only (browser SpeechRecognition API).
 */

// ─── Vowel Phoneme Classes ────────────────────────────────────────────────────
//
// Each vowel has:
//   - accepted: transcriptions that represent the CORRECT sound for this vowel
//   - rejected: transcriptions that are WRONG sounds (diphthongs, wrong class)
//
// Children learning CV/VC syllables should produce SHORT vowel sounds:
//   A = /æ/ or /ɑ/ (as in "cat" or "father")
//   E = /ɛ/        (as in "bed")
//   I = /ɪ/ or /iː/(as in "pin" or "see" — both are acceptable for the letter I)
//   O = /ɒ/ or /oʊ/(as in "hot" or "go")
//   U = /ʌ/ or /uː/(as in "cup" or "moon")

const VOWEL_ACCEPTED: Record<string, string[]> = {
  A: ["a", "ah", "aa", "aah", "aw", "uh", "æ", "ɑ", "aɪ", "ɔ"],
  E: ["e", "eh", "ay", "ae", "ɛ", "eɪ", "ə"],
  I: ["i", "ih", "ee", "e", "ie", "ɪ", "iː", "i"],
  O: ["o", "oh", "aw", "oa", "awe", "or", "ɒ", "oʊ", "o"],
  U: ["u", "uh", "oo", "ooh", "ew", "ʌ", "uː", "u", "ʊ"],
};

// These are WRONG phoneme transcriptions — diphthongs or entirely different vowels
const VOWEL_REJECTED: Record<string, string[]> = {
  A: ["ay", "ai", "ace", "ei", "ey", "ate"],
  E: ["ee", "ey", "ea"],
  I: ["eye", "ai", "aye", "igh", "pie", "bye", "die", "lie", "tie", "fie", "vie", "pie"],
  O: ["ow", "ou", "oe"],
  U: [],
};

// ─── Consonant Sound Groups ───────────────────────────────────────────────────
//
// Maps each consonant letter to how it typically appears in a SpeechRecognition transcript or IPA.

const CONSONANT_SOUNDS: Record<string, string[]> = {
  B: ["b"],
  C: ["k", "c", "s"],
  D: ["d"],
  F: ["f", "ph"],
  G: ["g", "ɡ"],
  H: ["h"],
  J: ["j", "dj", "dʒ", "ʒ"],
  K: ["k", "c"],
  L: ["l"],
  M: ["m"],
  N: ["n", "ŋ"],
  P: ["p"],
  R: ["r", "ɹ"],
  S: ["s", "ʃ"],
  T: ["t"],
  V: ["v"],
  W: ["w"],
  Y: ["y", "j"],
  Z: ["z"],
};

// ─── Per-Syllable Exceptions ──────────────────────────────────────────────────
//
// Some syllables are frequently misheared by SpeechRecognition in ways that are
// phonetically close enough to count as correct. List them here explicitly so
// the evaluator accepts them without changing the displayed result.
//
// Key   = target syllable (uppercase)
// Value = extra transcripts to accept as CORRECT (lowercase)

const SYLLABLE_EXCEPTIONS: Record<string, string[]> = {
  // VC exceptions
  "ES": ["s", "es", "ess"],
  "UL": ["all", "ul", "ull"],
  "UR": ["are", "er", "r", "ur", "uhr"],
  "AS": ["ass", "as"],
  "UT": ["at", "ut", "utt"],
  "IR": ["ear", "eer", "ir", "ihr"],
  "OD": ["odd", "add", "od"],
  "AP": ["app", "ap", "ahp"],
  "EL": ["l", "el", "ell"],
  "EK": ["eck", "ek"],
  "IB": ["eve", "ib", "ihb", "eeb"],
  "UB": ["abb", "ubb", "ab", "ub"],
  "EM": ["m", "em", "emm"],
  "ID": ["eed", "id"],
  "UM": ["om", "um", "uhmm"],
  "EN": ["n", "en", "enn"],

  // CV exceptions
  "JI": ["g", "gee", "ji"],
  "LO": ["law", "lo", "loh"],
  "TU": ["tah", "tuh", "ta", "tu"],
  "FI": ["fee", "fi"],
  "PE": ["peh", "pe"],
  "SE": ["seh", "se"],
  "ZO": ["zoh", "zo"],
  "SO": ["saw", "soh", "so"],
  "KU": ["kaw", "kuh", "ku", "cuh", "cu"],
  "MO": ["maw", "moh", "mo"],
  "JE": ["jeh", "je"],
  "DE": ["deh", "de"],
  "MU": ["mah", "muh", "mu", "ma"],
  "BU": ["baw", "buh", "bu", "bah", "ba", "boh", "bo"],
  "SU": ["sah", "suh", "su", "sah", "sa"],
  "FE": ["feh", "fe"],
  "HU": ["huh", "hu", "hah", "ha"],
  "NU": ["nuh", "nu", "nah", "na"],
  "CU": ["cah", "coh", "co", "cu"],
  "WU": ["wuh", "wu"],
  "JU": ["juh", "ju"],
  "FO": ["foh", "fo"],
  "NI": ["knee", "nee", "ni"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[.,!?']/g, "");
}

/**
 * Detect if a syllable is a CV pattern (e.g. "PI", "BA", "ME")
 */
export function isCVSyllable(syllable: string): boolean {
  if (syllable.length !== 2) return false;
  const consonants = Object.keys(CONSONANT_SOUNDS);
  const vowels = ["A", "E", "I", "O", "U"];
  return consonants.includes(syllable[0]) && vowels.includes(syllable[1]);
}

/**
 * Detect if a syllable is a VC pattern (e.g. "IT", "AM", "OB")
 */
export function isVCSyllable(syllable: string): boolean {
  if (syllable.length !== 2) return false;
  const consonants = Object.keys(CONSONANT_SOUNDS);
  const vowels = ["A", "E", "I", "O", "U"];
  return vowels.includes(syllable[0]) && consonants.includes(syllable[1]);
}

// ─── CV Evaluator ─────────────────────────────────────────────────────────────

/**
 * Evaluate a SpeechRecognition transcript against a target CV syllable.
 * 
 * Example: target = "PI", transcript = "pee" → "correct"
 *          target = "PI", transcript = "pie" → "wrong"  (diphthong AY)
 *          target = "PI", transcript = "pa"  → "close"  (consonant ok, wrong vowel)
 */
function evaluateCV(target: string, transcripts: string[]): "correct" | "close" | "wrong" {
  const consonantLetter = target[0]; // e.g. 'P'
  const vowelLetter = target[1];     // e.g. 'I'

  const consonantSounds = CONSONANT_SOUNDS[consonantLetter] || [];
  const acceptedVowels = VOWEL_ACCEPTED[vowelLetter] || [];
  const rejectedVowels = VOWEL_REJECTED[vowelLetter] || [];

  let consonantMatched = false;
  let vowelMatched = false;
  let vowelRejected = false;

  for (const raw of transcripts) {
    // Check multiple words in the transcript (browser sometimes adds filler)
    const normalized = normalizeText(raw);
    const words = normalized.split(/\s+/);
    
    // Wav2Vec2 outputs phonemes with spaces (e.g. "b æ"). 
    // We add the space-stripped version to evaluate it as a single phonetic unit.
    if (words.length > 1) {
      words.push(normalized.replace(/\s+/g, ""));
    }

    for (const word of words) {
      // 1. Check for rejected diphthong sounds first
      if (rejectedVowels.some(rv => word === rv || word.endsWith(rv))) {
        vowelRejected = true;
        continue; // Don't count this word as a match
      }

      // 2. Find which consonant sound this word starts with
      const matchedConsonant = consonantSounds.find(cs => word.startsWith(cs));
      if (matchedConsonant) {
        consonantMatched = true;
        // 3. Check the vowel portion (what comes after the consonant sound)
        const vowelPortion = word.slice(matchedConsonant.length);
        if (acceptedVowels.some(av => vowelPortion === av || vowelPortion.startsWith(av))) {
          vowelMatched = true;
        }
      }

      // Also check if the whole word is just the consonant sound (e.g. "p" for "PI")
      if (consonantSounds.includes(word)) {
        consonantMatched = true;
      }
    }
  }

  if (consonantMatched && vowelMatched) return "correct";
  if (consonantMatched && !vowelRejected) return "close"; // Got consonant but vowel unclear
  if (vowelMatched) return "close";  // Got the vowel class but wrong consonant
  return "wrong";
}

// ─── VC Evaluator ─────────────────────────────────────────────────────────────

/**
 * Evaluate a SpeechRecognition transcript against a target VC syllable.
 * 
 * Example: target = "IT", transcript = "it" → "correct"
 *          target = "AM", transcript = "aim" → "wrong" (diphthong AY)
 *          target = "AM", transcript = "um"  → "close" (consonant ok, wrong vowel)
 */
function evaluateVC(target: string, transcripts: string[]): "correct" | "close" | "wrong" {
  const vowelLetter = target[0];      // e.g. 'A'
  const consonantLetter = target[1];  // e.g. 'M'

  const consonantSounds = CONSONANT_SOUNDS[consonantLetter] || [];
  const acceptedVowels = VOWEL_ACCEPTED[vowelLetter] || [];
  const rejectedVowels = VOWEL_REJECTED[vowelLetter] || [];

  let consonantMatched = false;
  let vowelMatched = false;
  let vowelRejected = false;

  for (const raw of transcripts) {
    // Check multiple words in the transcript (browser sometimes adds filler)
    const normalized = normalizeText(raw);
    const words = normalized.split(/\s+/);
    
    // Wav2Vec2 outputs phonemes with spaces (e.g. "b æ"). 
    // We add the space-stripped version to evaluate it as a single phonetic unit.
    if (words.length > 1) {
      words.push(normalized.replace(/\s+/g, ""));
    }

    for (const word of words) {
      // Specific exception for "UN": SpeechRecognition often mishears "un" as "on".
      // If the target is "UN" and the word is "on", we accept it.
      if (target === "UN" && word === "on") {
        return "correct";
      }

      // 1. Check rejected vowel patterns
      if (rejectedVowels.some(rv => word.startsWith(rv))) {
        vowelRejected = true;
        continue;
      }

      // 2. Check which accepted vowel sound the word starts with
      const matchedVowel = acceptedVowels.find(av => word.startsWith(av));
      if (matchedVowel) {
        vowelMatched = true;
        // 3. Check the consonant that follows the vowel
        const consonantPortion = word.slice(matchedVowel.length);
        if (consonantSounds.some(cs => consonantPortion === cs || consonantPortion.startsWith(cs))) {
          consonantMatched = true;
        }
      }

      // Also: if browser transcribed just the vowel sound (e.g. "ah" for "AM")
      if (acceptedVowels.includes(word) && !rejectedVowels.includes(word)) {
        vowelMatched = true;
      }
    }
  }

  if (vowelMatched && consonantMatched) return "correct";
  if (vowelMatched && !vowelRejected) return "close";
  if (consonantMatched) return "close";
  return "wrong";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type PhonemeResult = "correct" | "close" | "wrong";

/**
 * Main entry point. Evaluates one or more SpeechRecognition transcript
 * alternatives against a target CV or VC syllable.
 * 
 * @param target     - The syllable to evaluate against, e.g. "PI", "AM"
 * @param transcripts - Array of raw transcript strings from SpeechRecognition
 * @returns "correct" | "close" | "wrong"
 */
export function evaluateSyllable(target: string, transcripts: string[]): PhonemeResult {
  const upper = target.toUpperCase();

  // 1. Literal Match: If the browser transcribed the exact word (e.g., "it", "me", "am")
  for (const raw of transcripts) {
    const text = normalizeText(raw).toUpperCase();
    if (text === upper || text.split(/\s+/).includes(upper)) {
      return "correct";
    }
  }

  // 2. Check per-syllable exceptions — these always win as "correct"
  const exceptions = SYLLABLE_EXCEPTIONS[upper];
  if (exceptions) {
    for (const raw of transcripts) {
      const words = normalizeText(raw).split(/\s+/);
      if (words.some(w => exceptions.includes(w))) return "correct";
    }
  }

  if (isCVSyllable(upper)) return evaluateCV(upper, transcripts);
  if (isVCSyllable(upper)) return evaluateVC(upper, transcripts);

  return "wrong";
}

/**
 * Returns true if the target string is a 2-letter CV or VC syllable
 * that should use PhonemeEvaluator instead of the standard fuzzy matcher.
 */
export function isSyllableTarget(target: string): boolean {
  return isCVSyllable(target.toUpperCase()) || isVCSyllable(target.toUpperCase());
}

/**
 * Builds a Vosk grammar constraint list for the given syllable target.
 *
 * Vosk's KaldiRecognizer accepts a `grammar` JSON string that restricts
 * recognition to only words in the list. By passing the phonetic variants
 * of a syllable (e.g. "eck", "ek" for "EK"), Vosk will stop hallucinating
 * unrelated English words like "eric", "egg", "eg".
 *
 * Always includes "[unk]" as a required fallback for silence/unknown sounds.
 *
 * @param target - The 2-letter syllable, e.g. "EK", "BA", "IT"
 * @returns Array of allowed words to pass as Vosk grammar
 */
export function buildVoskGrammar(target: string): string[] {
  const upper = target.toUpperCase();
  const grammar = new Set<string>();

  // 1. Always add the syllable itself (lowercase) as a word
  grammar.add(upper.toLowerCase());

  // 2. Add per-syllable exception words (these are what Vosk is most likely to return)
  const exceptions = SYLLABLE_EXCEPTIONS[upper] || [];
  exceptions.forEach(e => grammar.add(e));

  // 3. Add phonetic variants from VOWEL/CONSONANT tables
  if (isCVSyllable(upper)) {
    const cLetter = upper[0];
    const vLetter = upper[1];
    const cSounds = CONSONANT_SOUNDS[cLetter] || [];
    const vSounds = VOWEL_ACCEPTED[vLetter] || [];
    // Combine: each consonant sound prefix + each vowel sound suffix
    for (const c of cSounds) {
      grammar.add(c); // bare consonant (e.g. "p" for PI)
      for (const v of vSounds) {
        grammar.add(c + v); // e.g. "pee", "pi", "pih"
      }
    }
  } else if (isVCSyllable(upper)) {
    const vLetter = upper[0];
    const cLetter = upper[1];
    const vSounds = VOWEL_ACCEPTED[vLetter] || [];
    const cSounds = CONSONANT_SOUNDS[cLetter] || [];
    for (const v of vSounds) {
      grammar.add(v); // bare vowel (e.g. "ah" for AM)
      for (const c of cSounds) {
        grammar.add(v + c); // e.g. "am", "ahm"
      }
    }
  }

  // 4. "[unk]" is required by Vosk grammar mode as the unknown/silence token
  grammar.add("[unk]");

  return Array.from(grammar);
}
