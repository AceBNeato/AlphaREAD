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
  "DAHIL", "MAHAL", "ABOT", "HINDI", "KANIN", "AHAS", "RELO",
  // 55 new words added from user's master list
  "TULA", "ISDA", "PATO", "BIBE", "MANOK", "PATING", "PAGONG", "UNGGOY", "ILONG", "BIBIG",
  "LABI", "DILA", "BUHOK", "DALIRI", "SIKO", "TUHOD", "PAA", "TIYAN", "LIKOD", "PISNGI",
  "KUKO", "ITLOG", "GATAS", "KARNE", "SOPAS", "KENDI", "SAGING", "PINYA", "UBAS", "PAKWAN",
  "MESA", "KAMA", "UNAN", "KUMOT", "TINIDOR", "BOTE", "LAPIS", "GUNTING", "ULAN", "LUPA",
  "ILOG", "BUNDOK", "DAMO", "NIYOG", "DAHON", "SANGA", "LOLO", "LOLA", "GURO", "DOKTOR",
  "PULIS", "KUSINA", "BANYO", "SILID", "HARDIN"
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
    isUnderDevelopment: false,
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
    isUnderDevelopment: false,
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

export const TAGALOG_WORD_CHUNKS: Record<string, string[][]> = {
  "AKO": [["AK", "O"], ["A", "KO"]],
  "ISA": [["IS", "A"], ["I", "SA"]],
  "OSO": [["OS", "O"], ["O", "SO"]],
  "ULO": [["UL", "O"], ["U", "LO"]],
  "ATE": [["AT", "E"], ["A", "TE"]],
  "IBA": [["IB", "A"], ["I", "BA"]],
  "OPO": [["OP", "O"], ["O", "PO"]],
  "UBO": [["UB", "O"], ["U", "BO"]],
  "ASO": [["AS", "O"], ["A", "SO"]],
  "IYO": [["IY", "O"], ["I", "YO"]],
  "PALA": [["PA", "L", "A"], ["P", "AL", "A"], ["P", "A", "LA"]],
  "UPO": [["UP", "O"], ["U", "PO"]],
  "APO": [["AP", "O"], ["A", "PO"]],
  "INA": [["IN", "A"], ["I", "NA"]],
  "PUSA": [["PU", "S", "A"], ["P", "US", "A"], ["P", "U", "SA"]],
  "URI": [["UR", "I"], ["U", "RI"]],
  "ABO": [["AB", "O"], ["A", "BO"]],
  "IPIS": [["IP", "I", "S"], ["I", "PI", "S"], ["I", "P", "IS"]],
  "PUSO": [["PU", "S", "O"], ["P", "US", "O"], ["P", "U", "SO"]],
  "ULAP": [["UL", "A", "P"], ["U", "LA", "P"], ["U", "L", "AP"]],
  "APA": [["AP", "A"], ["A", "PA"]],
  "IBON": [["IB", "O", "N"], ["I", "BO", "N"], ["I", "B", "ON"]],
  "PUNO": [["PU", "N", "O"], ["P", "UN", "O"], ["P", "U", "NO"]],
  "ULAM": [["UL", "A", "M"], ["U", "LA", "M"], ["U", "L", "AM"]],
  "AMA": [["AM", "A"], ["A", "MA"]],
  "GABI": [["GA", "B", "I"], ["G", "AB", "I"], ["G", "A", "BI"]],
  "PILA": [["PI", "L", "A"], ["P", "IL", "A"], ["P", "I", "LA"]],
  "WALO": [["WA", "L", "O"], ["W", "AL", "O"], ["W", "A", "LO"]],
  "AMIN": [["AM", "I", "N"], ["A", "MI", "N"], ["A", "M", "IN"]],
  "GOMA": [["GO", "M", "A"], ["G", "OM", "A"], ["G", "O", "MA"]],
  "PULA": [["PU", "L", "A"], ["P", "UL", "A"], ["P", "U", "LA"]],
  "KANTA": [["KA", "N", "TA"], ["K", "AN", "TA"]],
  "ATIN": [["AT", "I", "N"], ["A", "TI", "N"], ["A", "T", "IN"]],
  "GULO": [["GU", "L", "O"], ["G", "UL", "O"], ["G", "U", "LO"]],
  "PERA": [["PE", "R", "A"], ["P", "ER", "A"], ["P", "E", "RA"]],
  "PAPEL": [["PA", "PE", "L"], ["PA", "P", "EL"], ["P", "AP", "EL"]],
  "BASO": [["BA", "S", "O"], ["B", "AS", "O"], ["B", "A", "SO"]],
  "KASO": [["KA", "S", "O"], ["K", "AS", "O"], ["K", "A", "SO"]],
  "SIRA": [["SI", "R", "A"], ["S", "IR", "A"], ["S", "I", "RA"]],
  "DAMIT": [["DA", "MI", "T"], ["DA", "M", "IT"], ["D", "AM", "IT"]],
  "BAGO": [["BA", "G", "O"], ["B", "AG", "O"], ["B", "A", "GO"]],
  "KESO": [["KE", "S", "O"], ["K", "ES", "O"], ["K", "E", "SO"]],
  "SAMA": [["SA", "M", "A"], ["S", "AM", "A"], ["S", "A", "MA"]],
  "HITO": [["HI", "T", "O"], ["H", "IT", "O"], ["H", "I", "TO"]],
  "BATA": [["BA", "T", "A"], ["B", "AT", "A"], ["B", "A", "TA"]],
  "KUYA": [["KU", "Y", "A"], ["K", "UY", "A"], ["K", "U", "YA"]],
  "SANA": [["SA", "N", "A"], ["S", "AN", "A"], ["S", "A", "NA"]],
  "BULA": [["BU", "L", "A"], ["B", "UL", "A"], ["B", "U", "LA"]],
  "LAKI": [["LA", "K", "I"], ["L", "AK", "I"], ["L", "A", "KI"]],
  "SAYA": [["SA", "Y", "A"], ["S", "AY", "A"], ["S", "A", "YA"]],
  "HIRAP": [["HI", "RA", "P"], ["HI", "R", "AP"], ["H", "IR", "AP"]],
  "BATO": [["BA", "T", "O"], ["B", "AT", "O"], ["B", "A", "TO"]],
  "LARO": [["LA", "R", "O"], ["L", "AR", "O"], ["L", "A", "RO"]],
  "SALO": [["SA", "L", "O"], ["S", "AL", "O"], ["S", "A", "LO"]],
  "LAKAD": [["LA", "KA", "D"], ["LA", "K", "AD"], ["L", "AK", "AD"]],
  "BATOK": [["BA", "TO", "K"], ["BA", "T", "OK"], ["B", "AT", "OK"]],
  "LUMA": [["LU", "M", "A"], ["L", "UM", "A"], ["L", "U", "MA"]],
  "TIRA": [["TI", "R", "A"], ["T", "IR", "A"], ["T", "I", "RA"]],
  "DASAL": [["DA", "SA", "L"], ["DA", "S", "AL"], ["D", "AS", "AL"]],
  "BAKAL": [["BA", "KA", "L"], ["BA", "K", "AL"], ["B", "AK", "AL"]],
  "LUTO": [["LU", "T", "O"], ["L", "UT", "O"], ["L", "U", "TO"]],
  "TABO": [["TA", "B", "O"], ["T", "AB", "O"], ["T", "A", "BO"]],
  "TUNOG": [["TU", "NO", "G"], ["TU", "N", "OG"], ["T", "UN", "OG"]],
  "BALAK": [["BA", "LA", "K"], ["BA", "L", "AK"], ["B", "AL", "AK"]],
  "LOBO": [["LO", "B", "O"], ["L", "OB", "O"], ["L", "O", "BO"]],
  "TAMA": [["TA", "M", "A"], ["T", "AM", "A"], ["T", "A", "MA"]],
  "BULAK": [["BU", "LA", "K"], ["BU", "L", "AK"], ["B", "UL", "AK"]],
  "BALIK": [["BA", "LI", "K"], ["BA", "L", "IK"], ["B", "AL", "IK"]],
  "MATA": [["MA", "T", "A"], ["M", "AT", "A"], ["M", "A", "TA"]],
  "TASA": [["TA", "S", "A"], ["T", "AS", "A"], ["T", "A", "SA"]],
  "BAGAL": [["BA", "GA", "L"], ["BA", "G", "AL"], ["B", "AG", "AL"]],
  "MAPA": [["MA", "P", "A"], ["M", "AP", "A"], ["M", "A", "PA"]],
  "TALO": [["TA", "L", "O"], ["T", "AL", "O"], ["T", "A", "LO"]],
  "LAMAN": [["LA", "MA", "N"], ["LA", "M", "AN"], ["L", "AM", "AN"]],
  "BARKO": [["BA", "R", "KO"], ["B", "AR", "KO"]],
  "MALI": [["MA", "L", "I"], ["M", "AL", "I"], ["M", "A", "LI"]],
  "HAYOP": [["HA", "YO", "P"], ["HA", "Y", "OP"], ["H", "AY", "OP"]],
  "KANTO": [["KA", "N", "TO"], ["K", "AN", "TO"]],
  "DAGA": [["DA", "G", "A"], ["D", "AG", "A"], ["D", "A", "GA"]],
  "KAHIT": [["KA", "HI", "T"], ["KA", "H", "IT"], ["K", "AH", "IT"]],
  "BAKA": [["BA", "K", "A"], ["B", "AK", "A"], ["B", "A", "KA"]],
  "BAHA": [["BA", "H", "A"], ["B", "AH", "A"], ["B", "A", "HA"]],
  "DAGAT": [["DA", "GA", "T"], ["DA", "G", "AT"], ["D", "AG", "AT"]],
  "KAPIT": [["KA", "PI", "T"], ["KA", "P", "IT"], ["K", "AP", "IT"]],
  "TAHOL": [["TA", "HO", "L"], ["TA", "H", "OL"], ["T", "AH", "OL"]],
  "TAKBO": [["TA", "K", "BO"], ["T", "AK", "BO"]],
  "GUHIT": [["GU", "HI", "T"], ["GU", "H", "IT"], ["G", "UH", "IT"]],
  "KAHEL": [["KA", "HE", "L"], ["KA", "H", "EL"], ["K", "AH", "EL"]],
  "APAT": [["AP", "A", "T"], ["A", "PA", "T"], ["A", "P", "AT"]],
  "GALIT": [["GA", "LI", "T"], ["GA", "L", "IT"], ["G", "AL", "IT"]],
  "AKIN": [["AK", "I", "N"], ["A", "KI", "N"], ["A", "K", "IN"]],
  "GUSTO": [["GU", "S", "TO"], ["G", "US", "TO"]],
  "DAHIL": [["DA", "HI", "L"], ["DA", "H", "IL"], ["D", "AH", "IL"]],
  "MAHAL": [["MA", "HA", "L"], ["MA", "H", "AL"], ["M", "AH", "AL"]],
  "ABOT": [["AB", "O", "T"], ["A", "BO", "T"], ["A", "B", "OT"]],
  "HINDI": [["HI", "N", "DI"], ["H", "IN", "DI"]],
  "KANIN": [["KA", "NI", "N"], ["KA", "N", "IN"], ["K", "AN", "IN"]],
  "AHAS": [["AH", "A", "S"], ["A", "HA", "S"], ["A", "H", "AS"]],
  "RELO": [["RE", "L", "O"], ["R", "EL", "O"], ["R", "E", "LO"]],
  "TULA": [["TU", "L", "A"], ["T", "UL", "A"], ["T", "U", "LA"]],
  "ISDA": [["IS", "D", "A"], ["I", "S", "DA"]],
  "PATO": [["PA", "T", "O"], ["P", "AT", "O"], ["P", "A", "TO"]],
  "BIBE": [["BI", "B", "E"], ["B", "IB", "E"], ["B", "I", "BE"]],
  "MANOK": [["MA", "NO", "K"], ["MA", "N", "OK"], ["M", "AN", "OK"]],
  "PATING": [["PA", "T", "I", "NG"], ["P", "AT", "I", "NG"], ["P", "A", "TI", "NG"], ["P", "A", "T", "ING"]],
  "PAGONG": [["PA", "G", "O", "NG"], ["P", "AG", "O", "NG"], ["P", "A", "GO", "NG"], ["P", "A", "G", "ONG"]],
  "UNGGOY": [["UNG", "G", "O", "Y"], ["U", "NG", "GO", "Y"], ["U", "NG", "G", "OY"]],
  "ILONG": [["IL", "O", "NG"], ["I", "LO", "NG"], ["I", "L", "ONG"]],
  "BIBIG": [["BI", "BI", "G"], ["BI", "B", "IG"], ["B", "IB", "IG"]],
  "LABI": [["LA", "B", "I"], ["L", "AB", "I"], ["L", "A", "BI"]],
  "DILA": [["DI", "L", "A"], ["D", "IL", "A"], ["D", "I", "LA"]],
  "BUHOK": [["BU", "HO", "K"], ["BU", "H", "OK"], ["B", "UH", "OK"]],
  "DALIRI": [["DA", "LI", "R", "I"], ["DA", "L", "IR", "I"], ["DA", "L", "I", "RI"], ["D", "AL", "IR", "I"], ["D", "AL", "I", "RI"], ["D", "A", "LI", "RI"]],
  "SIKO": [["SI", "K", "O"], ["S", "IK", "O"], ["S", "I", "KO"]],
  "TUHOD": [["TU", "HO", "D"], ["TU", "H", "OD"], ["T", "UH", "OD"]],
  "PAA": [["PA", "A"]],
  "TIYAN": [["TI", "YA", "N"], ["TI", "Y", "AN"], ["T", "IY", "AN"]],
  "LIKOD": [["LI", "KO", "D"], ["LI", "K", "OD"], ["L", "IK", "OD"]],
  "PISNGI": [["PI", "S", "NG", "I"], ["P", "IS", "NG", "I"], ["P", "I", "S", "NGI"]],
  "KUKO": [["KU", "K", "O"], ["K", "UK", "O"], ["K", "U", "KO"]],
  "ITLOG": [["IT", "LO", "G"], ["IT", "L", "OG"]],
  "GATAS": [["GA", "TA", "S"], ["GA", "T", "AS"], ["G", "AT", "AS"]],
  "KARNE": [["KA", "R", "NE"], ["K", "AR", "NE"]],
  "SOPAS": [["SO", "PA", "S"], ["SO", "P", "AS"], ["S", "OP", "AS"]],
  "KENDI": [["KE", "N", "DI"], ["K", "EN", "DI"]],
  "SAGING": [["SA", "G", "I", "NG"], ["S", "AG", "I", "NG"], ["S", "A", "GI", "NG"], ["S", "A", "G", "ING"]],
  "PINYA": [["PI", "N", "YA"], ["P", "IN", "YA"]],
  "UBAS": [["UB", "A", "S"], ["U", "BA", "S"], ["U", "B", "AS"]],
  "PAKWAN": [["PA", "K", "WA", "N"], ["PA", "K", "W", "AN"], ["P", "AK", "WA", "N"], ["P", "AK", "W", "AN"]],
  "MESA": [["ME", "S", "A"], ["M", "ES", "A"], ["M", "E", "SA"]],
  "KAMA": [["KA", "M", "A"], ["K", "AM", "A"], ["K", "A", "MA"]],
  "UNAN": [["UN", "A", "N"], ["U", "NA", "N"], ["U", "N", "AN"]],
  "KUMOT": [["KU", "MO", "T"], ["KU", "M", "OT"], ["K", "UM", "OT"]],
  "TINIDOR": [["TI", "NI", "DO", "R"], ["TI", "NI", "D", "OR"], ["TI", "N", "ID", "OR"], ["T", "IN", "ID", "OR"]],
  "BOTE": [["BO", "T", "E"], ["B", "OT", "E"], ["B", "O", "TE"]],
  "LAPIS": [["LA", "PI", "S"], ["LA", "P", "IS"], ["L", "AP", "IS"]],
  "GUNTING": [["GU", "N", "TI", "NG"], ["GU", "N", "T", "ING"], ["G", "UN", "TI", "NG"], ["G", "UN", "T", "ING"]],
  "ULAN": [["UL", "A", "N"], ["U", "LA", "N"], ["U", "L", "AN"]],
  "LUPA": [["LU", "P", "A"], ["L", "UP", "A"], ["L", "U", "PA"]],
  "ILOG": [["IL", "O", "G"], ["I", "LO", "G"], ["I", "L", "OG"]],
  "BUNDOK": [["BU", "N", "DO", "K"], ["BU", "N", "D", "OK"], ["B", "UN", "DO", "K"], ["B", "UN", "D", "OK"]],
  "DAMO": [["DA", "M", "O"], ["D", "AM", "O"], ["D", "A", "MO"]],
  "NIYOG": [["NI", "YO", "G"], ["NI", "Y", "OG"], ["N", "IY", "OG"]],
  "DAHON": [["DA", "HO", "N"], ["DA", "H", "ON"], ["D", "AH", "ON"]],
  "SANGA": [["SA", "NG", "A"], ["S", "ANG", "A"], ["S", "A", "NGA"]],
  "LOLO": [["LO", "L", "O"], ["L", "OL", "O"], ["L", "O", "LO"]],
  "LOLA": [["LO", "L", "A"], ["L", "OL", "A"], ["L", "O", "LA"]],
  "GURO": [["GU", "R", "O"], ["G", "UR", "O"], ["G", "U", "RO"]],
  "DOKTOR": [["DO", "K", "TO", "R"], ["DO", "K", "T", "OR"], ["D", "OK", "TO", "R"], ["D", "OK", "T", "OR"]],
  "PULIS": [["PU", "LI", "S"], ["PU", "L", "IS"], ["P", "UL", "IS"]],
  "KUSINA": [["KU", "SI", "N", "A"], ["KU", "S", "IN", "A"], ["KU", "S", "I", "NA"], ["K", "US", "IN", "A"], ["K", "US", "I", "NA"], ["K", "U", "SI", "NA"]],
  "BANYO": [["BA", "N", "YO"], ["B", "AN", "YO"]],
  "SILID": [["SI", "LI", "D"], ["SI", "L", "ID"], ["S", "IL", "ID"]],
  "HARDIN": [["HA", "R", "DI", "N"], ["HA", "R", "D", "IN"], ["H", "AR", "DI", "N"], ["H", "AR", "D", "IN"]],
};
