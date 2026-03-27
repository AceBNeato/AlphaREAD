export interface Letter {
  letter: string;
  example: string;
  image: string;
}

export type LevelType = "pairs" | "sounds" | "syllable-builder";
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

const allLetters: Letter[] = [
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
export const CONSONANTS = allLetters
  .map((l) => l.letter)
  .filter((l) => !VOWELS.includes(l));

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
  "O": "Ohh",
  "P": "puh",
  "Q": "kwuh",
  "R": "rrr",
  "S": "sss",
  "T": "tih",
  "U": "uh",
  "V": "vuh",
  "W": "wuh",
  "X": "xsss",
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
  // A vowel
  "BA": "Bah", "CA": "Kah", "DA": "Dah", "FA": "Fah", "GA": "Gah",
  "HA": "Hah", "JA": "Jah", "KA": "Kah", "LA": "Lah", "MA": "Mah",
  "NA": "Nah", "PA": "Pah", "QA": "Kwah", "RA": "Rah", "SA": "Sah",
  "TA": "Tah", "VA": "Vah", "WA": "Wah", "XA": "Zah", "YA": "Yah", "ZA": "Zah",
  
  // E vowel
  "BE": "Beh", "CE": "Seh", "DE": "Deh", "FE": "Feh", "GE": "Jeh",
  "HE": "Heh", "JE": "Jeh", "KE": "Keh", "LE": "Leh", "ME": "Meh",
  "NE": "Neh", "PE": "Peh", "QE": "Kweh", "RE": "Reh", "SE": "Seh",
  "TE": "Teh", "VE": "Veh", "WE": "Weh", "XE": "Zeh", "YE": "Yeh", "ZE": "Zeh",
  
  // I vowel
  "BI": "Bee", "CI": "See", "DI": "Dee", "FI": "Fee", "GI": "Jee",
  "HI": "Hee", "JI": "Jee", "KI": "Kee", "LI": "Lee", "MI": "Mee",
  "NI": "Nee", "PI": "Pee", "QI": "Kwee", "RI": "Ree", "SI": "See",
  "TI": "Tee", "VI": "Vee", "WI": "Wee", "XI": "Zee", "YI": "Yee", "ZI": "Zee",
  
  // O vowel
  "BO": "Boh", "CO": "Koh", "DO": "Doh", "FO": "Foh", "GO": "Goh",
  "HO": "Hoh", "JO": "Joh", "KO": "Koh", "LO": "Loh", "MO": "Moh",
  "NO": "Noh", "PO": "Poh", "QO": "Kwoh", "RO": "Roh", "SO": "Soh",
  "TO": "Toh", "VO": "Voh", "WO": "Woh", "XO": "Zoh", "YO": "Yoh", "ZO": "Zoh",
  
  // U vowel
  "BU": "Boo", "CU": "Koo", "DU": "Doo", "FU": "Foo", "GU": "Goo",
  "HU": "Hoo", "JU": "Joo", "KU": "Koo", "LU": "Loo", "MU": "Moo",
  "NU": "Noo", "PU": "Poo", "QU": "Kwoo", "RU": "Roo", "SU": "Soo",
  "TU": "Too", "VU": "Voo", "WU": "Woo", "XU": "Zoo", "YU": "Yoo", "ZU": "Zoo",
};

// Phonetic pronunciation for VC patterns (vowel + consonant sounds blended)
const VC_PHONETICS: Record<string, string> = {
  // A + consonants
  "AB": "Ab", "AC": "Ak", "AD": "Ad", "AF": "Af", "AG": "Ag",
  "AH": "Ah", "AJ": "Aj", "AK": "Ak", "AL": "Al", "AM": "Am",
  "AN": "An", "AP": "Ap", "AQ": "Ak", "AR": "Ar", "AS": "As",
  "AT": "At", "AV": "Av", "AW": "Aw", "AX": "Ax", "AY": "Ay", "AZ": "Az",
  
  // E + consonants
  "EB": "Eb", "EC": "Ek", "ED": "Ed", "EF": "Ef", "EG": "Eg",
  "EH": "Eh", "EJ": "Ej", "EK": "Ek", "EL": "El", "EM": "Em",
  "EN": "En", "EP": "Ep", "EQ": "Ek", "ER": "Er", "ES": "Es",
  "ET": "Et", "EV": "Ev", "EW": "Ew", "EX": "Ex", "EY": "Ey", "EZ": "Ez",
  
  // I + consonants
  "IB": "Ib", "IC": "Ik", "ID": "Id", "IF": "If", "IG": "Ig",
  "IH": "Ih", "IJ": "Ij", "IK": "Ik", "IL": "Il", "IM": "Im",
  "IN": "In", "IP": "Ip", "IQ": "Ik", "IR": "Ir", "IS": "Is",
  "IT": "It", "IV": "Iv", "IW": "Iw", "IX": "Ix", "IY": "Iy", "IZ": "Iz",
  
  // O + consonants
  "OB": "Ob", "OC": "Ok", "OD": "Od", "OF": "Of", "OG": "Og",
  "OH": "Oh", "OJ": "Oj", "OK": "Ok", "OL": "Ol", "OM": "Om",
  "ON": "On", "OP": "Op", "OQ": "Ok", "OR": "Or", "OS": "Os",
  "OT": "Ot", "OV": "Ov", "OW": "Ow", "OX": "Ox", "OY": "Oy", "OZ": "Oz",
  
  // U + consonants
  "UB": "Ub", "UC": "Uk", "UD": "Ud", "UF": "Uf", "UG": "Ug",
  "UH": "Uh", "UJ": "Uj", "UK": "Uk", "UL": "Ul", "UM": "Um",
  "UN": "Un", "UP": "Up", "UQ": "Uk", "UR": "Ur", "US": "Us",
  "UT": "Ut", "UV": "Uv", "UW": "Uw", "UX": "Ux", "UY": "Uy", "UZ": "Uz",
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
    title: "Letter Pairs",
    subtitle: "Listen to shuffled letter pairs",
    type: "pairs",
    letters: allLetters,
    locked: false,
    completed: false,
  },
  {
    id: 2,
    title: "Letter Sounds",
    subtitle: "Tap any letter to hear its sound",
    type: "sounds",
    letters: allLetters,
    locked: true,
    completed: false,
  },
  {
    id: 3,
    title: "VC Builder",
    subtitle: "Build Vowel + Consonant syllables",
    type: "syllable-builder",
    patterns: ["VC"],
    letters: allLetters,
    locked: true,
    completed: false,
  },
  {
    id: 4,
    title: "CV & VC Builder",
    subtitle: "Build mostly CV syllables with some VC practice",
    type: "syllable-builder",
    patterns: ["CV", "CV", "CV", "VC"],
    letters: allLetters,
    locked: true,
    completed: false,
  },
  {
    id: 5,
    title: "CVC Master",
    subtitle: "Build CV, VC, and CVC syllables",
    type: "syllable-builder",
    patterns: ["CV", "VC", "CVC"],
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
  count: number = 8
): SyllableTarget[] {
  const targets: SyllableTarget[] = [];
  const usedSyllables = new Set<string>();

  // If CVC is in patterns, prioritize using real CVC words
  if (patterns.includes("CVC")) {
    const shuffledWords = shuffle(CVC_WORDS);
    let wordIndex = 0;
    
    // Add real CVC words
    while (targets.length < count && wordIndex < shuffledWords.length) {
      const word = shuffledWords[wordIndex];
      if (!usedSyllables.has(word)) {
        usedSyllables.add(word);
        targets.push({
          pattern: "CVC",
          letters: word.split(""),
          syllable: word,
        });
      }
      wordIndex++;
    }
    
    return shuffle(targets);
  }

  // For CV and VC patterns, generate them
  const shuffledConsonants = shuffle(CONSONANTS);
  const shuffledVowels = shuffle(VOWELS);

  let ci = 0;
  let vi = 0;
  let attempts = 0;

  while (targets.length < count && attempts < count * 5) {
    attempts++;
    const pattern = patterns[targets.length % patterns.length];
    const c1 = shuffledConsonants[ci % shuffledConsonants.length];
    const v = shuffledVowels[vi % shuffledVowels.length];
    const c2 = shuffledConsonants[(ci + 3) % shuffledConsonants.length];

    let syllable: string;
    let letters: string[];

    switch (pattern) {
      case "CV":
        syllable = `${c1}${v}`;
        letters = [c1, v];
        break;
      case "VC":
        syllable = `${v}${c1}`;
        letters = [v, c1];
        break;
      case "CVC":
        syllable = `${c1}${v}${c2}`;
        letters = [c1, v, c2];
        break;
    }

    if (!usedSyllables.has(syllable)) {
      usedSyllables.add(syllable);
      targets.push({ pattern, letters, syllable });
    }

    ci++;
    if (ci % 3 === 0) vi++;
  }

  return shuffle(targets);
}