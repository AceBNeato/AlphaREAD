import { Level, LevelType, SyllablePattern, Letter } from "./levels"; // Re-use types from levels.ts

export const allTagalogLetters: Letter[] = [
  { letter: "A", example: "Aso", image: "dog" },
  { letter: "B", example: "Bola", image: "ball" },
  { letter: "K", example: "Kuting", image: "kitten" },
  { letter: "D", example: "Daga", image: "mouse" },
  { letter: "E", example: "Eroplano", image: "airplane" },
  { letter: "G", example: "Gatas", image: "milk" },
  { letter: "H", example: "Halaman", image: "plant" },
  { letter: "I", example: "Ibon", image: "bird" },
  { letter: "L", example: "Lapis", image: "pencil" },
  { letter: "M", example: "Manok", image: "chicken" },
  { letter: "N", example: "Niyog", image: "coconut" },
  { letter: "Ng", example: "Ngipin", image: "teeth" },
  { letter: "O", example: "Orasan", image: "clock" },
  { letter: "P", example: "Pusa", image: "cat" },
  { letter: "R", example: "Relos", image: "watch" },
  { letter: "S", example: "Saging", image: "banana" },
  { letter: "T", example: "Tasa", image: "cup" },
  { letter: "U", example: "Ulan", image: "rain" },
  { letter: "W", example: "Watawat", image: "flag" },
  { letter: "Y", example: "Yoyo", image: "yoyo" },
];

export const TAGALOG_VOWELS = ["A", "E", "I", "O", "U"];
export const TAGALOG_CONSONANTS = ["B", "K", "D", "G", "H", "L", "M", "N", "Ng", "P", "R", "S", "T", "W", "Y"];

// Tagalog syllables (Pantig)
export const TAGALOG_CV_SYLLABLES: string[] = [];
for (const c of TAGALOG_CONSONANTS) {
  for (const v of TAGALOG_VOWELS) {
    TAGALOG_CV_SYLLABLES.push(`${c}${v}`);
  }
}

// 3-Letter Tagalog words for Level 3
export const TAGALOG_3_LETTER_WORDS = [
  "ASO", "TAO", "BAO", "IBA", "USA", "UBO", "OPO", "ATE", "AMA", "INA",
  "PAA", "MGA", "AKO", "ITO", "IDO", "UNA", "ULO", "UNO", "UPO", "APO",
  "DAW", "DIN", "KAY", "MAN", "MAY", "RAW", "RIN",
  "BAT", "NAY", "SAN", "TAY", "WAG",
  "BAG", "BAS", "GAS", "MAS", "PAN",
  "DING", "KONG", "LANG", "MANG"
];

export const TAGALOG_SENTENCES = [
  "Ang aso ay tumatahol.",
  "Ang pusa ay natutulog.",
  "Naglalaro ang mga bata.",
  "Ang araw ay mainit.",
  "Kumakain ako ng saging.",
  "Ang ibon ay lumilipad.",
  "Ang gatas ay masarap.",
  "Nagbabasa si ate ng aklat.",
  "Ang bola ay bilog.",
  "Kulay pula ang mansanas."
];

export const TAGALOG_BLENDS_DATA = [
  {
    name: "2-Letter Blends",
    patterns: [
      {
        pattern: "Ts",
        words: [
          { word: "Tsinelas", highlights: [0, 1] },
          { word: "Tsokolate", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Dy",
        words: [
          { word: "Dyip", highlights: [0, 1] },
          { word: "Dyanitor", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Pl",
        words: [
          { word: "Plato", highlights: [0, 1] },
          { word: "Plantsa", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Tr",
        words: [
          { word: "Trak", highlights: [0, 1] },
          { word: "Trompo", highlights: [0, 1] }
        ]
      }
    ]
  }
];

export const TAGALOG_BLENDS_SENTENCES = [
  "Ang tsinelas ay bago.",
  "Sumakay ako sa dyip.",
  "Nabasag ang plato.",
  "Malaki ang trak."
];

export const tagalogLevels: Level[] = [
  {
    id: 1,
    title: "Abakada Master",
    subtitle: "Alphabet review and sound matching",
    description: "Learn the 20 letters of the traditional Abakada alphabet. Match letters and practice their sounds!",
    type: "pairs",
    letters: allTagalogLetters,
    locked: false,
    completed: false,
  },
  {
    id: 2,
    title: "Pantig Builder",
    subtitle: "Build Tagalog syllables (Ba, Be, Bi...)",
    description: "Learn to build Tagalog syllables using consonants and vowels (like Ba, Be, Bi, Bo, Bu)!",
    type: "syllable-builder",
    patterns: ["CV"],
    letters: allTagalogLetters,
    locked: true,
    completed: false,
  },
  {
    id: 3,
    title: "Salita Master",
    subtitle: "Build 3-letter Tagalog words",
    description: "Use the syllables you've learned to build and pronounce 3-letter Tagalog words!",
    type: "combined-cvc",
    patterns: ["CVC"], // Actually 3-letter words
    letters: allTagalogLetters,
    locked: true,
    completed: false,
    isUnderDevelopment: true,
  },
  // Level 4 is EXCLUDED per requirements
  {
    id: 4,
    title: "Blends at Pangungusap",
    subtitle: "Advanced sounds and sentences",
    description: "Master Tagalog consonant blends (Ts, Dy, Pl, Tr) and read full Tagalog sentences out loud!",
    type: "blends",
    letters: allTagalogLetters,
    locked: true,
    completed: false,
    isUnderDevelopment: true,
  }
];

// Helper to shuffle
export function shuffleTagalog<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateTagalogLetterPairs(): [string, string][] {
  const shuffled = shuffleTagalog(allTagalogLetters.map((l) => l.letter));
  const pairs: [string, string][] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    if (shuffled[i + 1]) {
      pairs.push([shuffled[i], shuffled[i + 1]]);
    }
  }
  return pairs;
}

export function generateTagalogSyllableTargets(
  patterns: SyllablePattern[],
  count: number = 10
) {
  if (patterns.includes("CVC")) {
    const shuffledWords = shuffleTagalog(TAGALOG_3_LETTER_WORDS);
    const selectedWords = shuffledWords.slice(0, count);
    return selectedWords.map(word => ({
      pattern: "CVC" as SyllablePattern,
      letters: word.match(/Ng|[A-Za-z]/g) || word.split(""),
      syllable: word,
    }));
  }

  const shuffledCV = shuffleTagalog([...TAGALOG_CV_SYLLABLES]);
  const selected = shuffledCV.slice(0, count);

  return selected.map(syllable => ({
    pattern: "CV" as SyllablePattern,
    // Safely split considering "Ng" as one letter
    letters: syllable.match(/Ng|[A-Za-z]/g) || syllable.split(""),
    syllable,
  }));
}

export function getTagalogPhonetic(letter: string): string {
  // Simple fallback for Tagalog phonetics since they are mostly pure
  const phonetics: Record<string, string> = {
    "A": "ah", "B": "bah", "K": "kah", "D": "dah", "E": "eh",
    "G": "gah", "H": "hah", "I": "ee", "L": "lah", "M": "mah",
    "N": "nah", "Ng": "ngah", "O": "oh", "P": "pah", "R": "rah",
    "S": "sah", "T": "tah", "U": "oo", "W": "wah", "Y": "yah"
  };
  return phonetics[letter] || letter.toLowerCase();
}
