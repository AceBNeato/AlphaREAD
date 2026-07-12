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
    name: "Diptonggo",
    patterns: [
      {
        pattern: "Aw",
        words: [
          { word: "Araw", highlights: [2, 3] },
          { word: "Dalaw", highlights: [3, 4] },
          { word: "Tanaw", highlights: [3, 4] },
          { word: "Sawsaw", highlights: [4, 5] },
          { word: "Sabaw", highlights: [3, 4] },
          { word: "Ikaw", highlights: [2, 3] }
        ]
      },
      {
        pattern: "Iw",
        words: [
          { word: "Aliw", highlights: [2, 3] },
          { word: "Giliw", highlights: [3, 4] },
          { word: "Baliw", highlights: [3, 4] }
        ]
      },
      {
        pattern: "Ay",
        words: [
          { word: "Bahay", highlights: [3, 4] },
          { word: "Kamay", highlights: [3, 4] },
          { word: "Buhay", highlights: [3, 4] },
          { word: "Kulay", highlights: [3, 4] },
          { word: "Tunay", highlights: [3, 4] }
        ]
      },
      {
        pattern: "Ey",
        words: [
          { word: "Keyk", highlights: [1, 2] },
          { word: "Reyna", highlights: [1, 2] },
          { word: "Beybi", highlights: [1, 2] }
        ]
      },
      {
        pattern: "Oy",
        words: [
          { word: "Baboy", highlights: [3, 4] },
          { word: "Kahoy", highlights: [3, 4] },
          { word: "Amoy", highlights: [2, 3] }
        ]
      }
    ]
  },
  {
    name: "Kambal Katinig",
    patterns: [
      {
        pattern: "Bl",
        words: [
          { word: "Bleyd", highlights: [0, 1] },
          { word: "Blusa", highlights: [0, 1] },
          { word: "Bloke", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Bleyd", highlights: [0, 1] },
          { word: "Blusa", highlights: [0, 1] },
          { word: "Bloke", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Gl",
        words: [
          { word: "Globo", highlights: [0, 1] },
          { word: "Glosa", highlights: [0, 1] },
          { word: "Gluta", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Globo", highlights: [0, 1] },
          { word: "Glosa", highlights: [0, 1] },
          { word: "Gluta", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Kl",
        words: [
          { word: "Klase", highlights: [0, 1] },
          { word: "Klaro", highlights: [0, 1] },
          { word: "Klima", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Klase", highlights: [0, 1] },
          { word: "Klaro", highlights: [0, 1] },
          { word: "Klima", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Pl",
        words: [
          { word: "Plato", highlights: [0, 1] },
          { word: "Plaka", highlights: [0, 1] },
          { word: "Plema", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Plato", highlights: [0, 1] },
          { word: "Plaka", highlights: [0, 1] },
          { word: "Plema", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Br",
        words: [
          { word: "Braso", highlights: [0, 1] },
          { word: "Bruha", highlights: [0, 1] },
          { word: "Brusko", highlights: [0, 1] },
          { word: "Abril", highlights: [1, 2] },
          { word: "Sombrero", highlights: [3, 4] },
          { word: "Sobra", highlights: [2, 3] },
          { word: "Timbre", highlights: [3, 4] }
        ],
        unahan: [
          { word: "Braso", highlights: [0, 1] },
          { word: "Bruha", highlights: [0, 1] },
          { word: "Brusko", highlights: [0, 1] }
        ],
        gitna: [
          { word: "Abril", highlights: [1, 2] },
          { word: "Sombrero", highlights: [3, 4] }
        ],
        hulihan: [
          { word: "Sobra", highlights: [2, 3] },
          { word: "Timbre", highlights: [3, 4] }
        ]
      },
      {
        pattern: "Dr",
        words: [
          { word: "Dragon", highlights: [0, 1] },
          { word: "Drama", highlights: [0, 1] },
          { word: "Droga", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Dragon", highlights: [0, 1] },
          { word: "Drama", highlights: [0, 1] },
          { word: "Droga", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Gr",
        words: [
          { word: "Grupo", highlights: [0, 1] },
          { word: "Gripo", highlights: [0, 1] },
          { word: "Grado", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Grupo", highlights: [0, 1] },
          { word: "Gripo", highlights: [0, 1] },
          { word: "Grado", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Kr",
        words: [
          { word: "Krus", highlights: [0, 1] },
          { word: "Krema", highlights: [0, 1] },
          { word: "Krimen", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Krus", highlights: [0, 1] },
          { word: "Krema", highlights: [0, 1] },
          { word: "Krimen", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Pr",
        words: [
          { word: "Prutas", highlights: [0, 1] },
          { word: "Preno", highlights: [0, 1] },
          { word: "Premyo", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Prutas", highlights: [0, 1] },
          { word: "Preno", highlights: [0, 1] },
          { word: "Premyo", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Tr",
        words: [
          { word: "Tren", highlights: [0, 1] },
          { word: "Tribo", highlights: [0, 1] },
          { word: "Tropa", highlights: [0, 1] },
          { word: "Letra", highlights: [2, 3] },
          { word: "Metro", highlights: [2, 3] }
        ],
        unahan: [
          { word: "Tren", highlights: [0, 1] },
          { word: "Tribo", highlights: [0, 1] },
          { word: "Tropa", highlights: [0, 1] }
        ],
        gitna: [
          { word: "Letra", highlights: [2, 3] }
        ],
        hulihan: [
          { word: "Metro", highlights: [2, 3] }
        ]
      },
      {
        pattern: "Dy",
        words: [
          { word: "Dyip", highlights: [0, 1] },
          { word: "Dyaket", highlights: [0, 1] },
          { word: "Dyaryo", highlights: [0, 1] },
          { word: "Badyet", highlights: [2, 3] },
          { word: "Medyas", highlights: [2, 3] },
          { word: "Medya", highlights: [2, 3] },
          { word: "Radyo", highlights: [2, 3] }
        ],
        unahan: [
          { word: "Dyip", highlights: [0, 1] },
          { word: "Dyaket", highlights: [0, 1] },
          { word: "Dyaryo", highlights: [0, 1] }
        ],
        gitna: [
          { word: "Badyet", highlights: [2, 3] },
          { word: "Medyas", highlights: [2, 3] },
          { word: "Medya", highlights: [2, 3] }
        ],
        hulihan: [
          { word: "Radyo", highlights: [2, 3] }
        ]
      },
      {
        pattern: "Ts",
        words: [
          { word: "Tsaa", highlights: [0, 1] },
          { word: "Tsinelas", highlights: [0, 1] },
          { word: "Tsuper", highlights: [0, 1] },
          { word: "Kutsara", highlights: [2, 3] },
          { word: "Pitsel", highlights: [2, 3] },
          { word: "Litson", highlights: [2, 3] }
        ],
        unahan: [
          { word: "Tsaa", highlights: [0, 1] },
          { word: "Tsinelas", highlights: [0, 1] },
          { word: "Tsuper", highlights: [0, 1] }
        ],
        gitna: [
          { word: "Kutsara", highlights: [2, 3] },
          { word: "Pitsel", highlights: [2, 3] },
          { word: "Litson", highlights: [2, 3] }
        ]
      },
      {
        pattern: "Ng",
        words: [
          { word: "Ngayon", highlights: [0, 1] },
          { word: "Ngipin", highlights: [0, 1] },
          { word: "Ngiti", highlights: [0, 1] },
          { word: "Sangay", highlights: [2, 3] },
          { word: "Langit", highlights: [2, 3] },
          { word: "Tanggap", highlights: [2, 3] },
          { word: "Ang", highlights: [1, 2] }
        ],
        unahan: [
          { word: "Ngayon", highlights: [0, 1] },
          { word: "Ngipin", highlights: [0, 1] },
          { word: "Ngiti", highlights: [0, 1] }
        ],
        gitna: [
          { word: "Sangay", highlights: [2, 3] },
          { word: "Langit", highlights: [2, 3] },
          { word: "Tanggap", highlights: [2, 3] }
        ],
        hulihan: [
          { word: "Ang", highlights: [1, 2] }
        ]
      },
      {
        pattern: "Kw",
        words: [
          { word: "Kwento", highlights: [0, 1] },
          { word: "Kwintas", highlights: [0, 1] },
          { word: "Kwaderno", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Kwento", highlights: [0, 1] },
          { word: "Kwintas", highlights: [0, 1] },
          { word: "Kwaderno", highlights: [0, 1] }
        ]
      },
      {
        pattern: "Pw",
        words: [
          { word: "Pwesto", highlights: [0, 1] },
          { word: "Pwede", highlights: [0, 1] },
          { word: "Pwersa", highlights: [0, 1] },
          { word: "Kapwa", highlights: [2, 3] }
        ],
        unahan: [
          { word: "Pwesto", highlights: [0, 1] },
          { word: "Pwede", highlights: [0, 1] },
          { word: "Pwersa", highlights: [0, 1] }
        ],
        hulihan: [
          { word: "Kapwa", highlights: [2, 3] }
        ]
      },
      {
        pattern: "Sy",
        words: [
          { word: "Misyon", highlights: [2, 3] },
          { word: "Disyerto", highlights: [2, 3] },
          { word: "Pasyente", highlights: [2, 3] }
        ],
        gitna: [
          { word: "Misyon", highlights: [2, 3] },
          { word: "Disyerto", highlights: [2, 3] },
          { word: "Pasyente", highlights: [2, 3] }
        ]
      }
    ]
  }
];

export const TAGALOG_BLENDS_SENTENCES = [
  "Sobra ang baboy sa plato.",
  "Malaki ang tsinelas ni kuya.",
  "Umakyat sa langit ang globo.",
  "Maganda ang kwento ng reyna.",
  "Mainit ang araw sa disyerto."
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
    isUnderDevelopment: false,
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
