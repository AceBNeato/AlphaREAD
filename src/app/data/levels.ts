export interface Letter {
  letter: string;
  example: string;
  image: string;
}

export type LevelType = "pairs" | "sounds" | "syllable-builder" | "voice-evaluation" | "combined-cvc" | "letter-names" | "long-vowels" | "blends" | "sentences";
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
  isUnderDevelopment?: boolean;
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
  "BAT", "BED", "BET", "BIB", "BIG", "BOX", "BUD", "BUG", "CAN", "CAR",
  "COB", "CUP", "CUT", "DID", "DIG", "DOG", "DOT", "FAN", "FED", "FIT",
  "FIX", "GAS", "GET", "GOT", "GUM", "GUN", "HAM", "HAT", "HER", "HID",
  "HIM", "HIP", "HOP", "HOT", "HUG", "HUM", "JAM", "JOG", "KIT", "LAD",
  "LED", "LET", "LID", "MAD", "MAN", "MEN", "MET", "MID", "MIX", "NAG",
  "NAP", "NET", "PAD", "PAN", "PEN", "PIN", "POT", "RAG", "RAM", "RAT",
  "RED", "RID", "RUG", "RUN", "SAG", "SET", "SIN", "SIP", "SIT", "SIX",
  "SUM", "TAN", "TAX", "TEN", "TIP", "TOP", "TUB", "TUG", "VAN", "VET",
  "WED", "WET", "WIG", "WIN", "YET"
];

export const CVC_SENTENCES = [
  "The car is red.",
  "Jim ran far.",
  "Tom is on the bed.",
  "The cat is on the bed.",
  "The toy car is red.",
  "Pam is on the red bed.",
  "The dog has a red cap.",
  "The pig ran.",
  "The man got mad.",
  "Dan sat on the mat.",
  "Ben has a big toy car.",
  "The boy is big.",
  "The pig got wet.",
  "Joy has a hen.",
  "The kid ran to the man.",
  "It was a big box.",
  "The fan is on the mat.",
  "Jon is a big boy.",
  "Max is on the bus.",
  "Tim has a red pen.",
  "The pot is hot.",
  "Her leg is big.",
  "A cap is on the box.",
  "Pam has six cats.",
  "The fan is red.",
  "Kim got a big dog.",
  "Sam has a red pin.",
  "The cap is on the big bed.",
  "Jen ran to the bed.",
  "The big bag is on the mat."
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
  "AB": "abb", "AD": "add", "AF": "aff", "AG": "agg", "AK": "ack",
  "AL": "al", "AM": "am", "AN": "an", "AP": "app", "AR": "ar",
  "AS": "ass", "AT": "at", "AV": "avv",

  // E + consonants (11)
  "EB": "ebb", "ED": "edd", "EG": "egg", "EK": "eck", "EL": "ell",
  "EM": "em", "EN": "en", "EP": "epp", "ER": "er", "ES": "ess", "ET": "ett",

  // I + consonants (11)
  "IB": "ibb", "ID": "idd", "IG": "igg", "IK": "ick", "IL": "ill",
  "IM": "im", "IN": "in", "IP": "ipp", "IR": "ear", "IS": "iss", "IT": "it",

  // O + consonants (12)
  "OB": "obb", "OD": "odd", "OF": "off", "OG": "ogg", "OK": "ock",
  "OL": "oll", "OM": "om", "ON": "on", "OP": "opp", "OR": "or",
  "OS": "oss", "OT": "ott",

  // U + consonants (11)
  "UB": "ubb", "UD": "ud", "UG": "ugh", "UK": "uck", "UL": "uhl",
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
    subtitle: "Alphabet review and sound matching",
    type: "pairs",
    letters: allLetters,
    locked: false,
    completed: false,
  },
  {
    id: 2,
    title: "Syllable Builder",
    subtitle: "Build your first syllables",
    type: "syllable-builder",
    patterns: ["VC", "CV"],
    letters: allLetters,
    locked: true,
    completed: false,
  },
  {
    id: 3,
    title: "CVC Master",
    subtitle: "Read 3-letter words",
    type: "combined-cvc",
    patterns: ["CVC"],
    letters: allLetters,
    locked: true,
    completed: false,
  },
  {
    id: 4,
    title: "Letter Names",
    subtitle: "Say the letter names!",
    type: "letter-names",
    letters: allLetters,
    locked: true,
    completed: false,
  },
  {
    id: 5,
    title: "Long Vowels",
    subtitle: "Say Your Name Vowels",
    type: "long-vowels",
    letters: allLetters,
    locked: true,
    completed: false,
  },
  {
    id: 6,
    title: "Consonant Blends",
    subtitle: "Blends and Digraphs",
    type: "blends",
    letters: allLetters,
    locked: true,
    completed: false,
  }
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


  return targets;
}

export const LETTER_NAMES: Record<string, string> = {
  "A": "Ay",
  "B": "Bee",
  "C": "Cee",
  "D": "Dee",
  "E": "Ee",
  "F": "Eff",
  "G": "Jee",
  "H": "Aitch",
  "I": "Eye",
  "J": "Jay",
  "K": "Kay",
  "L": "Ell",
  "M": "Emm",
  "N": "Enn",
  "O": "Oh",
  "P": "Pee",
  "Q": "Cue",
  "R": "Ar",
  "S": "Ess",
  "T": "Tee",
  "U": "You",
  "V": "Vee",
  "W": "Double-U",
  "X": "Ex",
  "Y": "Wye",
  "Z": "Zee"
};

export const LETTER_TTS: Record<string, string> = {
  "A": "A",
  "B": "B",
  "C": "C",
  "D": "D",
  "E": "E",
  "F": "F",
  "G": "G",
  "H": "H",
  "I": "I",
  "J": "J",
  "K": "K",
  "L": "L",
  "M": "M",
  "N": "N",
  "O": "O",
  "P": "P",
  "Q": "Q",
  "R": "R",
  "S": "S",
  "T": "T",
  "U": "U",
  "V": "V",
  "W": "W",
  "X": "X",
  "Y": "Y",
  "Z": "Z"
};

export interface LongVowelWord {
  word: string;
  highlights: number[];
}

export interface LongVowelPattern {
  name: string;
  pattern: string;
  words: LongVowelWord[];
}

export interface LongVowelVowelData {
  vowel: string;
  patterns: LongVowelPattern[];
}

export const LONG_VOWELS_DATA: LongVowelVowelData[] = [
  {
    vowel: "A",
    patterns: [
      {
        name: "Magic E",
        pattern: "a_e",
        words: [
          { word: "cake", highlights: [1, 3] },
          { word: "make", highlights: [1, 3] },
          { word: "bake", highlights: [1, 3] }
        ]
      },
      {
        name: "Vowel Team",
        pattern: "ai",
        words: [
          { word: "mail", highlights: [1, 2] },
          { word: "tail", highlights: [1, 2] },
          { word: "rain", highlights: [1, 2] }
        ]
      },
      {
        name: "Vowel Team",
        pattern: "ay",
        words: [
          { word: "day", highlights: [1, 2] },
          { word: "say", highlights: [1, 2] },
          { word: "way", highlights: [1, 2] }
        ]
      }
    ]
  },
  {
    vowel: "E",
    patterns: [
      {
        name: "Vowel Team",
        pattern: "ee",
        words: [
          { word: "bee", highlights: [1, 2] },
          { word: "feet", highlights: [1, 2] },
          { word: "seed", highlights: [1, 2] }
        ]
      },
      {
        name: "Vowel Team",
        pattern: "ea",
        words: [
          { word: "leaf", highlights: [1, 2] },
          { word: "meat", highlights: [1, 2] },
          { word: "seat", highlights: [1, 2] }
        ]
      },
      {
        name: "Magic E",
        pattern: "e_e",
        words: [
          { word: "Pete", highlights: [1, 3] },
          { word: "here", highlights: [1, 3] },
          { word: "eve", highlights: [0, 2] }
        ]
      }
    ]
  },
  {
    vowel: "I",
    patterns: [
      {
        name: "Magic E",
        pattern: "i_e",
        words: [
          { word: "kite", highlights: [1, 3] },
          { word: "bite", highlights: [1, 3] },
          { word: "like", highlights: [1, 3] }
        ]
      },
      {
        name: "Vowel Team",
        pattern: "ie",
        words: [
          { word: "pie", highlights: [1, 2] },
          { word: "tie", highlights: [1, 2] },
          { word: "lie", highlights: [1, 2] }
        ]
      },
      {
        name: "Pattern",
        pattern: "igh",
        words: [
          { word: "night", highlights: [1, 2, 3] },
          { word: "high", highlights: [1, 2, 3] },
          { word: "sigh", highlights: [1, 2, 3] }
        ]
      }
    ]
  },
  {
    vowel: "O",
    patterns: [
      {
        name: "Magic E",
        pattern: "o_e",
        words: [
          { word: "bone", highlights: [1, 3] },
          { word: "cone", highlights: [1, 3] },
          { word: "home", highlights: [1, 3] }
        ]
      },
      {
        name: "Vowel Team",
        pattern: "oa",
        words: [
          { word: "boat", highlights: [1, 2] },
          { word: "goat", highlights: [1, 2] },
          { word: "road", highlights: [1, 2] }
        ]
      }
    ]
  },
  {
    vowel: "U",
    patterns: [
      {
        name: "Magic E",
        pattern: "u_e",
        words: [
          { word: "cute", highlights: [1, 3] },
          { word: "mute", highlights: [1, 3] },
          { word: "cube", highlights: [1, 3] }
        ]
      }
    ]
  }
];

export const LONG_VOWELS_SENTENCES: string[] = [
  "I want to bake a cake.",
  "The game started late.",
  "My name is Pete.",
  "The rain will stop soon.",
  "The mail came today.",
  "Wait for me at home.",
  "Mom wants to pay for the cake.",
  "We will go home tonight.",
  "I made a big cake for Mom.",
  "I need to meet him at nine.",
  "The bee is cute.",
  "I want to see the snow.",
  "Gab wants me to read a book.",
  "The tea is so hot.",
  "Tom and Max read books.",
  "Delete my name from the mail.",
  "Ben and James like meat.",
  "The dog took a leap into the sea.",
  "We had fried egg for dinner at home.",
  "Ella rides her red bike.",
  "Dad will make me a kite.",
  "It's time to clean the room.",
  "Ted has five pairs of socks.",
  "We ate a sweet pie.",
  "The plant will die if I don't water it.",
  "Jen got high grades.",
  "I sleep so well at night.",
  "Let's turn off the light.",
  "Dad gave Mom a rose.",
  "We need to vote for the right person.",
  "Let's go home later.",
  "Your soap smells sweet.",
  "The road has bike lanes.",
  "Your red coat looks cute.",
  "Keep your tone low.",
  "Let's make five rows.",
  "I saw a crow yesterday.",
  "Yen will use my tube.",
  "The cube is so cold.",
  "The cute cat is near me."
];