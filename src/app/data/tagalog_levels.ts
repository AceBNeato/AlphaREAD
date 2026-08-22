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
  { letter: "Z", example: "Zebra", image: "zebra" }
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
  "BASO", "KASO", "SIRA", "DAMIT", "BAGO", "KESO", "SAMA-HARD", "SAMA-SOFT", "HITO", "BATA", "KUYA", "SANA",
  "BULA", "LAKI", "SAYA-HARD", "SAYA-SOFT", "HIRAP", "BATO", "LARO", "SALO-HARD", "SALO-SOFT", "LAKAD", "BATOK", "LUMA", "TIRA-HARD", "TIRA-SOFT", "DASAL",
  "BAKAL", "LUTO", "TABO", "TUNOG", "BALAK", "LOBO", "TAMA", "BULAK", "BALIK", "MATA", "TASA",
  "BAGAL", "MAPA", "TALO", "LAMAN", "BARKO", "MALI", "HAYOP", "KANTO", "DAGA", "KAHIT", "BAKA", "BAHA",
  "DAGAT", "KAPIT", "TAHOL", "TAKBO", "GUHIT", "KAHEL", "APAT", "GALIT-HARD", "GALIT-SOFT", "AKIN", "GUSTO",
  "DAHIL", "MAHAL", "ABOT-HARD", "ABOT-SOFT", "HINDI", "KANIN", "AHAS", "RELO",
  // 55 new words added from user's master list
  "TULA", "ISDA", "PATO", "BIBE", "MANOK", "PATING", "PAGONG", "UNGGOY", "ILONG", "BIBIG",
  "LABI", "DILA", "BUHOK", "DALIRI", "SIKO", "TUHOD", "PAA", "TIYAN", "LIKOD", "PISNGI",
  "KUKO", "ITLOG", "GATAS", "KARNE", "SOPAS", "KENDI", "SAGING", "PINYA", "UBAS", "PAKWAN",
  "MESA", "KAMA", "UNAN", "KUMOT", "TINIDOR", "BOTE", "LAPIS", "GUNTING", "ULAN", "LUPA",
  "ILOG", "BUNDOK", "DAMO", "NIYOG", "DAHON", "SANGA", "LOLO", "LOLA", "GURO", "DOKTOR",
  "PULIS", "KUSINA", "BANYO", "SILID", "HARDIN"
];

export const TAGALOG_ASSESSMENT_WORDS = [
  "ASO", "PUSA", "IBON", "PUNO", "BASO", "KESO", "BATA", "BATO", "LOBO", "MATA", 
  "TASA", "MAPA", "BARKO", "DAGA", "BAKA", "ISDA", "PATO", "BIBE", "MANOK", "PATING", 
  "PAGONG", "UNGGOY", "ILONG", "BIBIG", "BUHOK", "BOTE", "KAMA", "MESA", "LAPIS", "RELO"
];

export const TAGALOG_SENTENCES = [
  "Ako ay mabait, masipag, at mapagmahal na bata.",
  "Ako ay may alagang pusa at aso sa bahay.",
  "Ang ina ko ang magluluto ng ulam.",
  "Bibili ako ng anim na kendi.",
  "Bibili kami ng itlog sa palengke.",
  "Bibili si Tina ng bagong damit.",
  "Dala ni Nilo ang goma at gunting.",
  "Inumin mo ang tubig sa baso.",
  "Kanin at isda ang pagkain sa mesa.",
  "Kasama ko sina lola at lolo sa bukid.",
  "Kumakain ng saging ang unggoy.",
  "Kusinero ang ama ko sa isang barko.",
  "Lapis at papel ang laman ng supot.",
  "Lumilipad ang mga ibon sa himpapawid.",
  "Maalaga ang nanay at tatay namin.",
  "Mabagal maglakad ang pagong.",
  "Madilim ang ulap bago umulan.",
  "Magaling ang mga doktor sa ospital.",
  "Magbasa tayo ng aklat.",
  "Mahilig sa keso ang bata.",
  "Mainit pa ang sopas sa mesa.",
  "Makulit ang aso ni Narubi.",
  "Malakas ang tahol ng aso.",
  "Malamig ang tubig sa ilog.",
  "Malinis ang banyo sa tahanan.",
  "Maraming bulaklak sa hardin.",
  "Masarap ang gatas ng baka.",
  "May apat na lapis sa loob ng silid aralan.",
  "May unggoy sa kagubatan.",
  "Nagaaral kami sa silid.",
  "Nagbebenta si Lito nang bote at bakal.",
  "Nagbibenta si Ben ng pakwan.",
  "Naglalaro ang mga bata sa parke.",
  "Nagsasaka ang ina at ama ko.",
  "Nagtuturo ang guro sa paaralan.",
  "Nakakita ako ng daga.",
  "Nakakita ako ng pating sa dagat.",
  "Naliligo ang mga bata sa ulan.",
  "Nasa silid ang unan at kumot.",
  "Paborito ko ang ubas at pinya.",
  "Puno ng pagmamahal ang puso ko.",
  "Sa amin, matutulog ang bata.",
  "Sasama ako kay ate mamayang gabi.",
  "Si Maya ay may apat na lobo.",
  "Suot ni Alan ang relo.",
  "Takot na takot ako sa ahas.",
  "Tumakbo ako dahil takot ako sa ipis.",
  "Tutugtog ang banda mamaya.",
  "Umalis si kuya sa bahay para pumunta sa kanyang kaibigan."
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
          { word: "Ang", highlights: [1, 2] }
        ],
        unahan: [
          { word: "Ngayon", highlights: [0, 1] },
          { word: "Ngipin", highlights: [0, 1] },
          { word: "Ngiti", highlights: [0, 1] }
        ],
        gitna: [
          { word: "Sangay", highlights: [2, 3] },
          { word: "Langit", highlights: [2, 3] }
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
          { word: "Pwersa", highlights: [0, 1] }
        ],
        unahan: [
          { word: "Pwesto", highlights: [0, 1] },
          { word: "Pwede", highlights: [0, 1] },
          { word: "Pwersa", highlights: [0, 1] }
        ],
        hulihan: [
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
  "Ang luto ni nanay ang gusto kong kainin.",
  "Ang malalaking puno sa gubat ay nakakatulong upang hindi bumaha.",
  "Bago ang tsinelas na isinuot ni Ara kahapon.",
  "Bibil kami sa prutasan ng maraming mangga.",
  "Bigay ni Ken ang sombrerong suot ko ngayon.",
  "Dala ko ang jacket na hiniram ko kay Minda.",
  "Isasara ko ang gripo pagkatapos kong maligo.",
  "Mabait si Reyna Elena, kasi binigyan niya ng pagkain ang batang paslit.",
  "Magkagrupo sina Ben at Tin sa isang proyekto.",
  "Magpapalitson si nanay sa kaarawan nina ate at kuya.",
  "Makulay na tela ang gusto ko para sa aking damit.",
  "Malaki ang premyong napanalunan ni kuya sa paligsahan.",
  "Malamig ang klima kapag may bagyo, kaya makapal ang jacket ko.",
  "Masaya ang tropa nina Ben at Mark habang nagluluto.",
  "Mataas ang grado ni Tino, kase nagaaral sya ng mabuti.",
  "May baboy kaming inaalagaan sa bakuran.",
  "May gatas na binili si nanay para kay bunso.",
  "May klase na sa lunes, kaya matutulog ako ng maaga.",
  "May plaka ang sasakyang nasa labas ng bahay.",
  "May pwesto kami sa palenke, at duon kami nagtitinda.",
  "May sobra akong dalang pagkain.",
  "Naaliw ako sa sanggol na nakita ko kanina.",
  "Nag kwento si Marta na napakabait daw ng kanyang lola.",
  "Paborito ni lolo ang makinig sa radyo tuwing umaga.",
  "Pwede raw sumakay ng bisekleta papuntang paaralan.",
  "Sa abril, kami luluwas papunta sa ibang bansa.",
  "Sasakay kami sa tren papuntang bayan.",
  "Sasakay tayo sa dyip ni tatay papuntang simbahan.",
  "Sasayaw kami bukas sa simbahan.",
  "Si tatay ay isang marangal na pulis.",
  "Suot ko ang blusang ibinigay ng paborito kong guro.",
  "Tsaa ang iinumin namin kapag wala nang gatas."
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

export const TAGALOG_WORD_CHUNKS: Record<string, string[]> = {
  "AKO": ["A", "KO"],
  "ISA": ["I", "SA"],
  "OSO": ["O", "SO"],
  "ULO": ["U", "LO"],
  "ATE": ["A", "TE"],
  "IBA": ["I", "BA"],
  "OPO": ["O", "PO"],
  "UBO": ["U", "BO"],
  "ASO": ["A", "SO"],
  "IYO": ["I", "YO"],
  "PALA": ["PA", "LA"],
  "UPO": ["U", "PO"],
  "APO": ["A", "PO"],
  "INA": ["I", "NA"],
  "PUSA": ["PU", "SA"],
  "URI": ["U", "RI"],
  "ABO": ["A", "BO"],
  "IPIS": ["I", "PI", "S"],
  "PUSO": ["PU", "SO"],
  "ULAP": ["U", "LA", "P"],
  "APA": ["A", "PA"],
  "IBON": ["I", "BO", "N"],
  "PUNO": ["PU", "NO"],
  "ULAM": ["U", "LA", "M"],
  "AMA": ["A", "MA"],
  "GABI": ["GA", "BI"],
  "PILA": ["PI", "LA"],
  "WALO": ["WA", "LO"],
  "AMIN": ["A", "MI", "N"],
  "GOMA": ["GO", "MA"],
  "PULA": ["PU", "LA"],
  "KANTA": ["KA", "N", "TA"],
  "ATIN": ["A", "TI", "N"],
  "GULO": ["GU", "LO"],
  "PERA": ["PE", "RA"],
  "PAPEL": ["PA", "PE", "L"],
  "BASO": ["BA", "SO"],
  "KASO": ["KA", "SO"],
  "SIRA": ["SI", "RA"],
  "DAMIT": ["DA", "MI", "T"],
  "BAGO": ["BA", "GO"],
  "KESO": ["KE", "SO"],
  "SAMA-HARD": ["SA", "MA"],
  "SAMA-SOFT": ["SA", "MA"],
  "HITO": ["HI", "TO"],
  "BATA": ["BA", "TA"],
  "KUYA": ["KU", "YA"],
  "SANA": ["SA", "NA"],
  "BULA": ["BU", "LA"],
  "LAKI": ["LA", "KI"],
  "SAYA-HARD": ["SA", "YA"],
  "SAYA-SOFT": ["SA", "YA"],
  "HIRAP": ["HI", "RA", "P"],
  "BATO": ["BA", "TO"],
  "LARO": ["LA", "RO"],
  "SALO-HARD": ["SA", "LO"],
  "SALO-SOFT": ["SA", "LO"],
  "LAKAD": ["LA", "KA", "D"],
  "BATOK": ["BA", "TO", "K"],
  "LUMA": ["LU", "MA"],
  "TIRA-HARD": ["TI", "RA"],
  "TIRA-SOFT": ["TI", "RA"],
  "DASAL": ["DA", "SA", "L"],
  "BAKAL": ["BA", "KA", "L"],
  "LUTO": ["LU", "TO"],
  "TABO": ["TA", "BO"],
  "TUNOG": ["TU", "NO", "G"],
  "BALAK": ["BA", "LA", "K"],
  "LOBO": ["LO", "BO"],
  "TAMA": ["TA", "MA"],
  "BULAK": ["BU", "LA", "K"],
  "BALIK": ["BA", "LI", "K"],
  "MATA": ["MA", "TA"],
  "TASA": ["TA", "SA"],
  "BAGAL": ["BA", "GA", "L"],
  "MAPA": ["MA", "PA"],
  "TALO": ["TA", "LO"],
  "LAMAN": ["LA", "MA", "N"],
  "BARKO": ["BA", "R", "KO"],
  "MALI": ["MA", "LI"],
  "HAYOP": ["HA", "YO", "P"],
  "KANTO": ["KA", "N", "TO"],
  "DAGA": ["DA", "GA"],
  "KAHIT": ["KA", "HI", "T"],
  "BAKA": ["BA", "KA"],
  "BAHA": ["BA", "HA"],
  "DAGAT": ["DA", "GA", "T"],
  "KAPIT": ["KA", "PI", "T"],
  "TAHOL": ["TA", "HO", "L"],
  "TAKBO": ["TA", "K", "BO"],
  "GUHIT": ["GU", "HI", "T"],
  "KAHEL": ["KA", "HE", "L"],
  "APAT": ["A", "PA", "T"],
  "GALIT-HARD": ["GA", "LI", "T"],
  "GALIT-SOFT": ["GA", "LI", "T"],
  "AKIN": ["A", "KI", "N"],
  "GUSTO": ["GU", "S", "TO"],
  "DAHIL": ["DA", "HI", "L"],
  "MAHAL": ["MA", "HA", "L"],
  "ABOT-HARD": ["A", "BO", "T"],
  "ABOT-SOFT": ["A", "BO", "T"],
  "HINDI": ["HI", "N", "DI"],
  "KANIN": ["KA", "NI", "N"],
  "AHAS": ["A", "HA", "S"],
  "RELO": ["RE", "LO"],
  "TULA": ["TU", "LA"],
  "ISDA": ["IS", "DA"],
  "PATO": ["PA", "TO"],
  "BIBE": ["BI", "BE"],
  "MANOK": ["MA", "NO", "K"],
  "PATING": ["PA", "T", "ING"],
  "PAGONG": ["PA", "GO", "NG"],
  "UNGGOY": ["UNG", "GO", "Y"],
  "ILONG": ["I", "LO", "NG"],
  "BIBIG": ["BI", "BI", "G"],
  "LABI": ["LA", "BI"],
  "DILA": ["DI", "LA"],
  "BUHOK": ["BU", "HO", "K"],
  "DALIRI": ["DA", "LI", "RI"],
  "SIKO": ["SI", "KO"],
  "TUHOD": ["TU", "HO", "D"],
  "PAA": ["PA", "A"],
  "TIYAN": ["TI", "YA", "N"],
  "LIKOD": ["LI", "KO", "D"],
  "PISNGI": ["PI", "S", "NGI"],
  "KUKO": ["KU", "KO"],
  "ITLOG": ["IT", "LO", "G"],
  "GATAS": ["GA", "TA", "S"],
  "KARNE": ["KA", "R", "NE"],
  "SOPAS": ["SO", "PA", "S"],
  "KENDI": ["KE", "N", "DI"],
  "SAGING": ["SA", "GI", "NG"],
  "PINYA": ["PI", "N", "YA"],
  "UBAS": ["U", "BA", "S"],
  "PAKWAN": ["PA", "K", "WA", "N"],
  "MESA": ["ME", "SA"],
  "KAMA": ["KA", "MA"],
  "UNAN": ["U", "NA", "N"],
  "KUMOT": ["KU", "MO", "T"],
  "TINIDOR": ["TI", "NI", "DO", "R"],
  "BOTE": ["BO", "TE"],
  "LAPIS": ["LA", "PI", "S"],
  "GUNTING": ["GU", "N", "TI", "NG"],
  "ULAN": ["U", "LA", "N"],
  "LUPA": ["LU", "PA"],
  "ILOG": ["I", "LO", "G"],
  "BUNDOK": ["BU", "N", "DO", "K"],
  "DAMO": ["DA", "MO"],
  "NIYOG": ["NI", "YO", "G"],
  "DAHON": ["DA", "HO", "N"],
  "SANGA": ["SA", "NGA"],
  "LOLO": ["LO", "LO"],
  "LOLA": ["LO", "LA"],
  "GURO": ["GU", "RO"],
  "DOKTOR": ["DO", "K", "TO", "R"],
  "PULIS": ["PU", "LI", "S"],
  "KUSINA": ["KU", "SI", "NA"],
  "BANYO": ["BA", "N", "YO"],
  "SILID": ["SI", "LI", "D"],
  "HARDIN": ["HA", "R", "DI", "N"],
};


