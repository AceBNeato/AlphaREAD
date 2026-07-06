import { Level, LevelType, SyllablePattern, Letter } from "./levels"; // Re-use types from levels.ts

export const allTagalogLetters: Letter[] = [
  { letter: "A", example: "Aso", image: "dog" },
  { letter: "B", example: "Bola", image: "ball" },
  { letter: "C", example: "Carrot", image: "carrot" },
  { letter: "D", example: "Daga", image: "mouse" },
  { letter: "E", example: "Eroplano", image: "airplane" },
  { letter: "F", example: "Folder", image: "folder" },
  { letter: "G", example: "Gatas", image: "milk" },
  { letter: "H", example: "Halaman", image: "plant" },
  { letter: "I", example: "Ibon", image: "bird" },
  { letter: "J", example: "Jeep", image: "jeepney" },
  { letter: "K", example: "Kuting", image: "kitten" },
  { letter: "L", example: "Lapis", image: "pencil" },
  { letter: "M", example: "Manok", image: "chicken" },
  { letter: "N", example: "Niyog", image: "coconut" },
  { letter: "Ñ", example: "Niño", image: "child" },
  { letter: "Ng", example: "Ngipin", image: "teeth" },
  { letter: "O", example: "Orasan", image: "clock" },
  { letter: "P", example: "Pusa", image: "cat" },
  { letter: "Q", example: "Queso", image: "cheese" },
  { letter: "R", example: "Relos", image: "watch" },
  { letter: "S", example: "Saging", image: "banana" },
  { letter: "T", example: "Tasa", image: "cup" },
  { letter: "U", example: "Ulan", image: "rain" },
  { letter: "V", example: "Vinta", image: "vinta boat" },
  { letter: "W", example: "Watawat", image: "flag" },
  { letter: "X", example: "X-ray", image: "x-ray scan" },
  { letter: "Y", example: "Yoyo", image: "yoyo" },
  { letter: "Z", example: "Zebra", image: "zebra" },
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
export const TAGALOG_VC_SYLLABLES: string[] = [
  "ab", "eb", "ib", "ob", "ub",
  "ak", "ek", "ik", "ok", "uk",
  "ad", "ed", "id", "od", "ud",
  "ag", "eg", "ig", "og", "ug",
  "al", "el", "il", "ol", "ul",
  "am", "em", "im", "om", "um",
  "an", "en", "in", "on", "un",
  "ang", "eng", "ing", "ong", "ung",
  "ap", "ep", "ip", "op", "up",
  "ar", "er", "ir", "or", "us",
  "as", "es", "is", "os", "us",
  "at", "et", "it", "ot", "uy",
  "aw", "ey", "ow",
  "ay", "oy"
].map(s => s.charAt(0).toUpperCase() + s.slice(1)); // Capitalize first letter to match KP format

export const TAGALOG_WORDS = [
  "AKO", "ISA", "OSO", "ULO", "ATE", "IBA", "OPO", "UBO", "ASO", "IYO", "PALA", "UPO",
  "APO", "INA", "PUSA", "URI", "ABO", "IPIS", "PUSO", "ULAP", "APA", "IBON", "PUNO", "ULAM",
  "AMA", "GABI", "PILA", "WALO", "AMIN", "GOMA", "PULA", "KANTA", "ATIN", "GULO", "PERA", "PAPEL",
  "BASO", "KASO", "SIRA", "DAMIT", "BAGO", "KESO", "SAMA", "HITO", "BATA", "KUYA", "SANA",
  "BULA", "LAKI", "SAYA", "HIRAP", "BATO", "LARO", "SALO", "LAKAD", "BATOK", "LUMA", "TIRA", "DASAL",
  "BAKAL", "LUTO", "TABO", "TUNOG", "BALAK", "LOBO", "TAMA", "BULAK", "BALIK", "MATA", "TASA",
  "BAGAL", "MAPA", "TALO", "LAMAN", "BARKO", "MALI", "HAYOP", "KANTO", "DAGA", "KAHIT", "BAKA", "BAHA",
  "DAGAT", "KAPIT", "TAHOL", "TAKBO", "GUHIT", "KAHEL", "APAT", "GALIT", "AKIN", "GUSTO",
  "DAHIL", "MAHAL", "ABOT", "HINDI", "KANIN", "AHAS", "RELO"
];

export const TAGALOG_SENTENCES = [
  "Mabait ang aso at pusa.",
  "Malaki ang barko sa dagat.",
  "Kumakain ako ng luto na kanin.",
  "Bago ang damit ni ate.",
  "Pula ang kulay ng lobo.",
  "Natutulog ang pusa sa kanto.",
  "Malakas ang tunog ng relo.",
  "Gusto ko ang ibon sa puno.",
  "Umiiyak ang bata dahil sa ahas.",
  "Mahal ng ina ang kanyang apo."
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
    type: "pairs",
    letters: allTagalogLetters,
    locked: false,
    completed: false,
  },
  {
    id: 2,
    title: "Pantig Builder",
    subtitle: "Build Tagalog syllables (Ba, Be, Bi...)",
    type: "syllable-builder",
    patterns: ["CV", "VC"],
    letters: allTagalogLetters,
    locked: true,
    completed: false,
    isUnderDevelopment: true,
  },
  {
    id: 3,
    title: "Salita Master",
    subtitle: "Build common Tagalog words",
    type: "combined-cvc",
    patterns: ["CVC"],
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
    const shuffledWords = shuffleTagalog(TAGALOG_WORDS);
    const selectedWords = shuffledWords.slice(0, count);
    return selectedWords.map(word => ({
      pattern: "CVC" as SyllablePattern,
      letters: word.match(/ng|Ng|NG|[A-Za-z]/g) || word.split(""),
      syllable: word,
    }));
  }

  const syllablePool: { pattern: SyllablePattern, syllable: string }[] = [];

  if (patterns.includes("CV")) {
    TAGALOG_CV_SYLLABLES.forEach(s => syllablePool.push({ pattern: "CV", syllable: s }));
  }
  if (patterns.includes("VC")) {
    TAGALOG_VC_SYLLABLES.forEach(s => syllablePool.push({ pattern: "VC", syllable: s }));
  }

  const shuffledPool = shuffleTagalog(syllablePool);
  const selected = shuffledPool.slice(0, count);

  return selected.map(item => ({
    pattern: item.pattern,
    // Safely split considering "Ng" or "ng" as one letter
    letters: item.syllable.match(/ng|Ng|NG|[A-Za-z]/g) || item.syllable.split(""),
    syllable: item.syllable,
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
