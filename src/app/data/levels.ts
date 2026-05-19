export interface Letter {
  letter: string;
  example: string;
  image: string;
}

export type LevelType = "pairs" | "sounds" | "syllable-builder" | "voice-evaluation" | "combined-cvc";
export type SyllablePattern = "CV" | "VC" | "CVC";

export interface Level {
  id: number;
  title: string;
  subtitle: string;
  type: LevelType;
  patterns?: SyllablePattern[];
  letters: Letter[];
  locked: boolean;
  completed: boolean;
}

export const allLetters: Letter[] = [
  { letter: "A", example: "Apple", image: "red apple fruit" },
  { letter: "B", example: "Ball", image: "colorful beach ball" },
  { letter: "C", example: "Cat", image: "cute orange cat" },
  { letter: "D", example: "Dog", image: "happy golden retriever dog" },
  { letter: "E", example: "Elephant", image: "gray elephant" },
  { letter: "F", example: "Fish", image: "colorful tropical fish" },
  { letter: "G", example: "Giraffe", image: "tall giraffe" },
  { letter: "H", example: "House", image: "cozy modern house" },
  { letter: "I", example: "Ice Cream", image: "ice cream cone" },
  { letter: "J", example: "Jacket", image: "red winter jacket" },
  { letter: "K", example: "Kite", image: "colorful kite flying" },
  { letter: "L", example: "Lion", image: "majestic lion" },
  { letter: "M", example: "Moon", image: "full moon night" },
  { letter: "N", example: "Nest", image: "bird nest eggs" },
  { letter: "O", example: "Orange", image: "fresh orange fruit" },
  { letter: "P", example: "Penguin", image: "cute penguin" },
  { letter: "Q", example: "Queen", image: "royal crown" },
  { letter: "R", example: "Rainbow", image: "colorful rainbow" },
  { letter: "S", example: "Sun", image: "bright sun sky" },
  { letter: "T", example: "Tree", image: "green oak tree" },
  { letter: "U", example: "Umbrella", image: "red umbrella rain" },
  { letter: "V", example: "Violin", image: "violin instrument" },
  { letter: "W", example: "Whale", image: "blue whale ocean" },
  { letter: "X", example: "Xylophone", image: "colorful xylophone" },
  { letter: "Y", example: "Yacht", image: "white yacht boat" },
  { letter: "Z", example: "Zebra", image: "zebra stripes" },
];

export const VOWELS = ["A", "E", "I", "O", "U"];

// Common consonants used in syllables (excluding Q and X for simplicity)
const SYLLABLE_CONSONANTS = ["B", "C", "D", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "V", "W", "Y", "Z"];

export const CONSONANTS = allLetters
  .map((l) => l.letter)
  .filter((l) => !VOWELS.includes(l));

// Simple consonants for elementary levels (easier sounds)
const SIMPLE_CONSONANTS = ["B", "C", "D", "F", "G", "H", "L", "M", "N", "P", "R", "S", "T"];

// Curated CV syllables from the teacher's worksheet (83 total).
// Organized by consonant A→Z, then vowel A, E, I, O, U.
// Note: C only uses CA, CO, CU because CE≡SE and CI≡SI in English phonics.
export const SIMPLE_CV_SYLLABLES: string[] = [
  // B
  "BA", "BE", "BI", "BO", "BU",
  // C (only hard-C sounds — CE and CI are phonetically identical to SE/SI)
  "CA", "CO", "CU",
  // D
  "DA", "DE", "DI", "DO", "DU",
  // F
  "FA", "FE", "FI", "FO", "FU",
  // H
  "HA", "HE", "HI", "HO", "HU",
  // J
  "JA", "JE", "JI", "JO", "JU",
  // K
  "KA", "KE", "KI", "KO", "KU",
  // L
  "LA", "LE", "LI", "LO", "LU",
  // M
  "MA", "ME", "MI", "MO", "MU",
  // N
  "NA", "NE", "NI", "NO", "NU",
  // P
  "PA", "PE", "PI", "PO", "PU",
  // R
  "RA", "RE", "RI", "RO", "RU",
  // S
  "SA", "SE", "SI", "SO", "SU",
  // T
  "TA", "TE", "TI", "TO", "TU",
  // V
  "VA", "VE", "VI", "VO", "VU",
  // W
  "WA", "WE", "WI", "WO", "WU",
  // Z
  "ZA", "ZE", "ZI", "ZO", "ZU",
];

// Curated VC syllables from the teacher's worksheet (58 total).
// Organized by vowel (A, E, I, O, U) then consonant alphabetically.
export const SIMPLE_VC_SYLLABLES: string[] = [
  // A + consonant (13)
  "AB", "AD", "AF", "AG", "AK", "AL", "AM", "AN", "AP", "AR", "AS", "AT", "AV",
  // E + consonant (11)
  "EB", "ED", "EG", "EK", "EL", "EM", "EN", "EP", "ER", "ES", "ET",
  // I + consonant (11)
  "IB", "ID", "IG", "IK", "IL", "IM", "IN", "IP", "IR", "IS", "IT",
  // O + consonant (12)
  "OB", "OD", "OF", "OG", "OK", "OL", "OM", "ON", "OP", "OR", "OS", "OT",
  // U + consonant (11)
  "UB", "UD", "UG", "UK", "UL", "UM", "UN", "UP", "UR", "US", "UT",
];

// Generate all possible CV syllables (Consonant + Vowel)
// 19 consonants * 5 vowels = 95 combinations
export const ALL_CV_SYLLABLES: string[] = [];
for (const c of SYLLABLE_CONSONANTS) {
  for (const v of VOWELS) {
    ALL_CV_SYLLABLES.push(`${c}${v}`);
  }
}

// Generate all possible VC syllables (Vowel + Consonant)
// 5 vowels * 19 consonants = 95 combinations
export const ALL_VC_SYLLABLES: string[] = [];
for (const v of VOWELS) {
  for (const c of SYLLABLE_CONSONANTS) {
    ALL_VC_SYLLABLES.push(`${v}${c}`);
  }
}

// Phonetic pronunciation for individual letters
export const LETTER_PHONETICS: Record<string, string> = {
  "A": "ah",
  "B": "buh",
  "C": "kuh",
  "D": "duh",
  "E": "eh",
  "F": "fff",
  "G": "guh",
  "H": "hhh",
  "I": "ihh",
  "J": "juh",
  "K": "kuh",
  "L": "lll",
  "M": "mmm",
  "N": "nnn",
  "O": "ahh",
  "P": "puh",
  "Q": "kwuh",
  "R": "rrr",
  "S": "sss",
  "T": "tuh",
  "U": "uh",
  "V": "vuh",
  "W": "wuh",
  "X": "ksss",
  "Y": "yuhh",
  "Z": "zzz"
};

// Get phonetic pronunciation for a single letter
export function getLetterPhonetic(letter: string): string {
  return LETTER_PHONETICS[letter.toUpperCase()] || letter;
}

// Real CVC words for kids (Level 5)
export const CVC_WORDS = [
  "BAT", "CAT", "HAT", "MAT", "RAT", "SAT", "FAT", "PAT",
  "BED", "RED", "LED", "FED", "WED",
  "BIG", "DIG", "FIG", "PIG", "WIG", "JIG",
  "BOX", "FOX",
  "BUS", "CUP", "PUP", "SUN", "RUN", "FUN", "BUN", "GUM",
  "DOG", "LOG", "FOG", "HOG", "JOG",
  "BAG", "TAG", "RAG", "WAG", "GAG",
  "PEN", "TEN", "HEN", "MEN", "DEN",
  "BIN", "FIN", "PIN", "TIN", "WIN",
  "TOP", "HOP", "MOP", "POP",
  "COT", "DOT", "GOT", "HOT", "LOT", "NOT", "POT", "ROT",
];

// Phonetic pronunciation for CV patterns (consonant + vowel sounds blended)
const CV_PHONETICS: Record<string, string> = {
  // A vowel (17)
  "BA": "Bah", "CA": "Ka", "DA": "Dah", "FA": "Fah", "HA": "Hah",
  "JA": "Jah", "KA": "Ka", "LA": "Lah", "MA": "Mah", "NA": "Nah",
  "PA": "Pah", "RA": "Rah", "SA": "Sah", "TA": "Tah", "VA": "Vah",
  "WA": "Wah", "ZA": "Zah",

  // E vowel (16 - note CE is excluded)
  "BE": "Beh", "DE": "deh", "FE": "feh", "HE": "Heh", "JE": "jeh",
  "KE": "Keh", "LE": "Leh", "ME": "Meh", "NE": "Neh", "PE": "peh",
  "RE": "Reh", "SE": "seh", "TE": "teh", "VE": "Veh", "WE": "Weh",
  "ZE": "Zeh",

  // I vowel (16 - note CI is excluded)
  "BI": "Bee", "DI": "Dee", "FI": "Fee", "HI": "Hee", "JI": "Jee",
  "KI": "Kee", "LI": "Lee", "MI": "Mee", "NI": "Nee", "PI": "Pee",
  "RI": "Ree", "SI": "See", "TI": "Tee", "VI": "Vee", "WI": "Wee",
  "ZI": "Zee",

  // O vowel (17)
  "BO": "Boh", "CO": "Koh", "DO": "Doh", "FO": "foh", "HO": "Hoh",
  "JO": "Joh", "KO": "Koh", "LO": "Loh", "MO": "moh", "NO": "Noh",
  "PO": "Poh", "RO": "Roh", "SO": "soh", "TO": "toe", "VO": "Voh",
  "WO": "Woh", "ZO": "zoh",

  // U vowel (17)
  "BU": "buh", "CU": "coh", "DU": "duh", "FU": "fuh", "HU": "huh",
  "JU": "juh", "KU": "kuh", "LU": "luh", "MU": "muh", "NU": "nuh",
  "PU": "Puh", "RU": "ruh", "SU": "suh", "TU": "tuh", "VU": "vuh",
  "WU": "wuh", "ZU": "zuh",
};

// Phonetic pronunciation for VC patterns (vowel + consonant sounds blended)
const VC_PHONETICS: Record<string, string> = {
  // A + consonants (13)
  "AB": "ahb", "AD": "ad", "AF": "af", "AG": "ag", "AK": "ak",
  "AL": "al", "AM": "am", "AN": "an", "AP": "app", "AR": "ar",
  "AS": "as", "AT": "at", "AV": "av",

  // E + consonants (11)
  "EB": "ehb", "ED": "ed", "EG": "egg", "EK": "eck", "EL": "ell",
  "EM": "em", "EN": "en", "EP": "ep", "ER": "er", "ES": "ess", "ET": "ett",

  // I + consonants (11)
  "IB": "ib", "ID": "eed", "IG": "ig", "IK": "ik", "IL": "il",
  "IM": "im", "IN": "in", "IP": "ip", "IR": "ear", "IS": "is", "IT": "it",

  // O + consonants (12)
  "OB": "ob", "OD": "odd", "OF": "of", "OG": "og", "OK": "ock",
  "OL": "ol", "OM": "om", "ON": "on", "OP": "op", "OR": "or",
  "OS": "os", "OT": "ot",

  // U + consonants (11)
  "UB": "ubb", "UD": "ud", "UG": "ugh", "UK": "uck", "UL": "ull",
  "UM": "uhmm", "UN": "uhn", "UP": "up", "UR": "uhrr", "US": "us", "UT": "utt",
};

// Get phonetic pronunciation for a syllable
export function getPhoneticPronunciation(syllable: string, pattern: SyllablePattern): string {
  syllable = syllable.toUpperCase();

  if (pattern === "CVC") {
    // For CVC, check if it's a real word first
    if (CVC_WORDS.includes(syllable)) {
      // Return the word itself for real words (speech synthesis handles these well)
      return syllable.toLowerCase();
    }
  }

  if (pattern === "CV" && CV_PHONETICS[syllable]) {
    return CV_PHONETICS[syllable];
  }

  if (pattern === "VC" && VC_PHONETICS[syllable]) {
    return VC_PHONETICS[syllable];
  }

  // Fallback to original syllable
  return syllable;
}

export const levels: Level[] = [
  {
    id: 1,
    title: "Alphabet Master",
    subtitle: "Alphabet review and voice evaluation",
    type: "pairs",
    letters: allLetters,
    locked: false,
    completed: false,
  },
  {
    id: 2,
    title: "Syllable Builder",
    subtitle: "Build VC & CV syllables (2.1 & 2.2)",
    type: "syllable-builder",
    patterns: ["VC", "CV"],
    letters: allLetters,
    locked: true,
    completed: false,
  },
  {
    id: 3,
    title: "CVC Master",
    subtitle: "Build & Pronounce CVC words",
    type: "combined-cvc",
    patterns: ["CVC"],
    letters: allLetters,
    locked: true,
    completed: false,
  },
];

// Helper to shuffle an array
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate shuffled pairs for Level 1
export function generateLetterPairs(): [string, string][] {
  const shuffled = shuffle(allLetters.map((l) => l.letter));
  const pairs: [string, string][] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;
}

// Syllable target type
export interface SyllableTarget {
  pattern: SyllablePattern;
  letters: string[];
  syllable: string;
}

// Generate syllable targets for a given set of patterns
export function generateSyllableTargets(
  patterns: SyllablePattern[],
  count: number = 10
): SyllableTarget[] {
  const targets: SyllableTarget[] = [];

  // If CVC is in patterns, prioritize using real CVC words
  if (patterns.includes("CVC")) {
    const shuffledWords = shuffle(CVC_WORDS);
    const selectedWords = shuffledWords.slice(0, count);

    return selectedWords.map(word => ({
      pattern: "CVC" as SyllablePattern,
      letters: word.split(""),
      syllable: word,
    }));
  }

  // For CV only - use simple CV list for elementary level
  if (patterns.length === 1 && patterns[0] === "CV") {
    const shuffledCV = shuffle([...SIMPLE_CV_SYLLABLES]);
    const selected = shuffledCV.slice(0, count);

    return selected.map(syllable => ({
      pattern: "CV" as SyllablePattern,
      letters: syllable.split(""),
      syllable,
    }));
  }

  // For VC only - use simple VC list for elementary level
  if (patterns.length === 1 && patterns[0] === "VC") {
    const shuffledVC = shuffle([...SIMPLE_VC_SYLLABLES]);
    const selected = shuffledVC.slice(0, count);

    return selected.map(syllable => ({
      pattern: "VC" as SyllablePattern,
      letters: syllable.split(""),
      syllable,
    }));
  }

  // For mixed patterns (CV + VC)
  if (patterns.includes("CV") && patterns.includes("VC")) {
    const halfCount = Math.floor(count / 2);
    const cvCount = halfCount;
    const vcCount = count - cvCount;

    const shuffledCV = shuffle([...ALL_CV_SYLLABLES]);
    const shuffledVC = shuffle([...ALL_VC_SYLLABLES]);

    const cvTargets = shuffledCV.slice(0, cvCount).map(syllable => ({
      pattern: "CV" as SyllablePattern,
      letters: syllable.split(""),
      syllable,
    }));

    const vcTargets = shuffledVC.slice(0, vcCount).map(syllable => ({
      pattern: "VC" as SyllablePattern,
      letters: syllable.split(""),
      syllable,
    }));

    return shuffle([...cvTargets, ...vcTargets]);
  }

  return targets;
}