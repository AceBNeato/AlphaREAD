import { useEffect, useRef, useState, useCallback } from "react";
import { evaluateSyllable, isSyllableTarget, PhonemeResult } from "../utils/PhonemeEvaluator";

// Logs only in development — automatically silent in production builds
const DEBUG = false;

const DIGIT_MAP: Record<string, string> = {
  "0": "ZERO", "1": "ONE", "2": "TWO", "3": "THREE", "4": "FOUR",
  "5": "FIVE", "6": "SIX", "7": "SEVEN", "8": "EIGHT", "9": "NINE",
  "10": "TEN"
};

export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
}

export function normalizeTranscript(text: string): string {
  return text
    .toUpperCase()
    .replace(/[.,!?'"]/g, "")
    .trim()
    .split(/\s+/)
    .map(w => DIGIT_MAP[w] || w)
    .join(" ");
}

export function matchConsonants(word1: string, word2: string): boolean {
  const getConsonants = (w: string) => w.replace(/[AEIOU]/g, "");
  return getConsonants(word1) === getConsonants(word2);
}

export function getLCS(targetWords: string[], spokenWords: string[], homophones: Record<string, string[]>): number {
  const m = targetWords.length;
  const n = spokenWords.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    const expected = targetWords[i - 1];
    const allowed = [expected, ...(homophones[expected] || []).map(w => w.toUpperCase())];
    for (let j = 1; j <= n; j++) {
      const spoken = spokenWords[j - 1];
      if (allowed.includes(spoken) || calculateSimilarity(expected, spoken) >= 0.75) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function mergeTranscripts(a: string, b: string): string {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (!aLower) return b.trim();
  if (!bLower) return a.trim();

  if (bLower.startsWith(aLower)) return b.trim();

  const aWords = a.trim().split(/\s+/);
  const bWords = b.trim().split(/\s+/);

  let overlapCount = 0;
  const maxOverlap = Math.min(aWords.length, bWords.length);
  for (let i = 1; i <= maxOverlap; i++) {
    const aEnd = aWords.slice(-i).join(" ").toLowerCase();
    const bStart = bWords.slice(0, i).join(" ").toLowerCase();
    if (aEnd === bStart) {
      overlapCount = i;
    }
  }

  if (overlapCount > 0) {
    return [...aWords, ...bWords.slice(overlapCount)].join(" ");
  }
  return a.trim() + " " + b.trim();
}

export type EvaluationFeedback = "correct" | "close" | "wrong" | null;

interface UseSpeechRecognitionProps {
  evaluatingWord: string | null;
  enabled?: boolean;
  /** When true: continuous=false, interimResults=false — browser auto-stops after one phrase.
   *  Best for single letter/word tasks (Lesson 4 Letter Names, Lesson 5 Long Vowels). */
  singleShot?: boolean;
  /** BCP-47 language tag for SpeechRecognition.
   *  Defaults to "en-US". Pass "fil" for Filipino curriculum. */
  lang?: string;
  isFilipinoDictionary?: boolean;
  onResult: (word: string, status: EvaluationFeedback, transcript: string, matchedWordCount?: number) => void;
  onSilenceTimeout: () => void;
  onError: () => void;
  refreshTrigger?: number;
  initialTranscript?: string;
  onEngineStop?: () => void;
}


// ... (HOMOPHONES block remains) ...
const HOMOPHONES: Record<string, string[]> = {
  // Alphabet phonetic homophones
  // Vowels — expanded to cover common Web Speech API phonetic outputs for single-letter sounds
  "A": ["a", "ay", "hey", "eight", "ah", "eh", "aye", "ha"],
  "E": ["e", "ee", "ih", "eh", "ea"],
  "I": ["i", "eye", "hi", "ai", "aye", "aye"],
  "O": ["o", "oh", "ow", "oe"],
  "U": ["u", "you", "yu", "uh", "yoo"],
  // Consonants
  "B": ["b", "bee", "be", "bi"],
  "C": ["c", "see", "sea", "si"],
  "D": ["d", "dee", "the", "di"],
  "F": ["f", "eff", "if", "half", "ef"],
  "G": ["g", "gee", "jee", "ji"],
  "H": ["h", "aitch", "age", "each", "haitch"],
  "J": ["j", "jay", "jai"],
  "K": ["k", "kay", "okay", "kei"],
  "L": ["l", "ell", "el"],
  "M": ["m", "em", "am", "him"],
  "N": ["n", "en", "an", "and", "in"],
  "P": ["p", "pee", "pea", "pi"],
  "Q": ["q", "cue", "queue", "kyu"],
  "R": ["r", "are", "our", "ar"],
  "S": ["s", "ess", "yes", "is", "es"],
  "T": ["t", "tee", "tea", "ti"],
  "V": ["v", "vee", "vi"],
  "W": ["w", "double u", "double you", "dub"],
  "X": ["x", "ex", "axe", "text", "eks"],
  "Y": ["y", "why", "wye", "wi"],
  "Z": ["z", "zee", "zed", "ze"],

  // CVC homophones
  "BAT": ["bad", "that", "but"],
  "CAT": ["cut", "cap", "can"],
  "DOG": ["dig", "doc", "dot"],
  "PIG": ["big", "pick", "peg"],
  "SUN": ["son", "some"],
  "RUN": ["one", "won", "ran"],
  "HOP": ["hope", "hot", "pop"],
  "BUG": ["bag", "pug", "bud"],

  // Digraphs & Blends
  "THIGH": ["thie", "tie", "thy", "they"],

  // Sentence / common word homophones
  "THE": ["dee", "d", "a", "der", "duh"],
  "TO": ["too", "two", "2", "thru"],
  "IN": ["inn", "an", "and", "n"],
  "ON": ["own", "an", "un"],
  "FOR": ["four", "fore", "4"],
  "ME": ["mi", "my", "may"],
  "MY": ["mi", "mai", "me"],
  "HE": ["hee", "him"],
  "SHE": ["see", "sea", "shie"],
  "WE": ["wee", "with"],
  "LIKE": ["lake", "lick"],
  "AND": ["an", "end", "in"],
  "IS": ["iz", "his", "es", "as"],
  "IT": ["eat", "its", "at", "id"],
  "ITS": ["it's", "it", "eat"],
  "HAS": ["as", "had", "is"],
  "HAVE": ["has", "of"],
  "WITH": ["we", "width"],
  "AT": ["it", "ad", "add"],
  "BE": ["bee", "b"],
  "BED": ["bad", "bet", "red"],
  "RED": ["read", "led", "head", "bed"],
  "BLUE": ["blew", "blow"],
  "GREEN": ["grin", "greene"],
  "BIG": ["pig", "beg", "bag"],
  "SMALL": ["some", "smell"],
  "FROG": ["fog", "frock"],
  "DRESS": ["press", "tress"],
  "PLAY": ["day", "clay"],
  "WAY": ["weigh", "wait", "weight", "why", "away"],
  "SWIM": ["some", "swam"],
  "CRAB": ["cab", "crap"],
  "SAND": ["send", "sound"],
  "SCRUB": ["shrub", "scrubbed"],
  "FLOOR": ["flower", "flour"],
  "SHRIMP": ["shrank", "shrimp"],
  "PLANTED": ["planted", "plant"],
  "TREE": ["three", "free", "try"],
  "GRASS": ["glass", "class"],
  "TRAIN": ["rain", "crane"],
  "TRACK": ["trap", "truck"],
  "STARS": ["star", "start"],
  "SKY": ["guy", "skye"],
  "CLOWN": ["crown", "cloud"],
  "SMILE": ["small", "mile"],
  "SHELL": ["shall", "sell"],
  "CHEESE": ["cheeks", "keys"],
  "CHAIR": ["share", "care"],
  "THUMB": ["some", "come"],
  "WHALE": ["well", "while"],
  "SEA": ["see", "she"],
  "PHOTO": ["pot", "four to"],
  "PHONE": ["bone", "fun"],
  "STREET": ["straight", "treat"],
  "STRONG": ["stone", "song"],
  "SPLASH": ["flash", "clash"],
  "WATER": ["what", "waiter"],
  "SPRING": ["ring", "sprung"],
  "FUN": ["run", "sun"],
  "SEASON": ["sees", "reason"],
  "SCRATCH": ["catch", "stretch"],
  "SCREEN": ["scream", "green"],
  "SQUIRREL": ["square", "squirrels"],
  "EATS": ["eat", "its"],
  "NUTS": ["not", "nut"],
  "SHRINK": ["drink", "shrank"],
  "SHIRT": ["short", "shirt"],
  "BEND": ["band", "bed"],
  "HAND": ["head", "and"],
  "SEND": ["sand", "end"],
  "TEN": ["tin", "tan", "then"],
  "TENT": ["ten", "send"],
  "SIGH": ["psy", "psi", "side", "size", "sign"],
  "HIGH": ["hi", "hai", "hay", "hide"],
  "CAMP": ["cap", "lamp"],
  "WIND": ["win", "went"],
  "BLOW": ["below", "blue"],
  "FAST": ["first", "past"],
  "PAST": ["fast", "passed"],
  "JUMP": ["up", "jumped"],
  "STUMP": ["stop", "stamp"],
  "LAMP": ["camp", "ramp"],
  "DESK": ["disc", "dust"],
  "ASK": ["as", "ask"],
  "TASK": ["ask", "tax"],
  "ICE": ["eyes", "i"],
  "MELT": ["met", "belt"],
  "GOLD": ["cold", "old"],
  "COLD": ["gold", "code"],
  "LIFT": ["left", "live"],
  "HEAVY": ["have", "heaven"],
  "BOX": ["fox", "rocks"]
};

// ─── Filipino (Tagalog) Homophones ─────────────────────────────────────────────
// Comprehensive phonetic dictionary for OFFLINE Filipino voice recognition.
// When offline, the app uses the English speech engine (en-US) as a fallback.
// The English engine hears Filipino words as English-like gibberish.
// This dictionary maps every TARGET Filipino word to its common English misrecognitions.
//
// Filipino vowels are pure: A="ah", E="eh", I="ee", O="oh", U="oo"
// The English engine often: splits words, swaps vowels, drops final consonants,
// or maps Filipino sounds to the nearest English word.
const FILIPINO_HOMOPHONES: Record<string, string[]> = {
  // ─── Particles & Linkers ──────────────────────────────────────────────────────
  "NG": ["nang", "nag", "ning", "ng", "among"],
  "ANG": ["ung", "ong", "ang", "un", "on"],
  "MGA": ["manga", "ma nga", "mga", "maga", "mang ga", "mon ga"],
  "NA": ["nah", "la", "nan", "not"],
  "SA": ["za", "shah", "s", "saw"],
  "AT": ["ad", "ut", "a", "odd", "add", "up"],
  "AY": ["ai", "aye", "eye", "hay", "hey", "a"],
  "NI": ["knee", "ne", "nee", "nay"],
  "SI": ["see", "sea", "she", "c", "si"],
  "KAY": ["kai", "cay", "key", "k"],
  "MO": ["moe", "more", "mo", "mow"],
  "PA": ["pah", "pa", "paw"],
  "MAY": ["my", "mai", "may", "mye"],
  "NAG": ["nug", "nog", "nag"],
  "RAW": ["row", "raw", "rao"],

  // ─── Pronouns & Function Words ────────────────────────────────────────────────
  "AKO": ["aku", "a ko", "aco", "acu", "ah ko", "echo"],
  "AKONG": ["a kong", "ah kong", "echo ng"],
  "KO": ["ku", "co", "coo", "koo", "co"],
  "KONG": ["kong", "cone", "con"],
  "KAMI": ["kami", "come e", "come ee", "commie"],
  "KAMING": ["coming", "kami ng"],
  "NAMIN": ["na min", "naman", "na mean", "no min"],
  "AMIN": ["a min", "amen", "ah min"],
  "NANG": ["nang", "nung", "nong", "non"],
  "PARA": ["para", "pra", "pera", "pra"],
  "INA": ["ina", "in a", "ena", "in ah"],
  "AMA": ["ama", "amma", "a ma", "ah mah"],
  "SINA": ["si na", "seen a", "cena", "see na"],
  "NINA": ["knee na", "nee na", "nina"],
  "KANYANG": ["kanya ng", "can yang", "kaniang", "can young"],
  "NIYA": ["nee ya", "nia", "near"],
  "TAYO": ["tayo", "tie oh", "thai oh"],
  "SYA": ["sha", "siya", "see ya"],
  "IYO": ["ee yo", "yo", "i yo"],

  // ─── Common Verbs ─────────────────────────────────────────────────────────────
  "BIBILI": ["bi-bili", "be billy", "vivi li", "bee bee lee"],
  "BIBIL": ["bee bill", "bibil", "be bill"],
  "LUMILIPAD": ["lumilipad", "lumi lipad", "lummi lipad", "loom ee lee pod"],
  "MAGLULUTO": ["magluluto", "mag luluto", "magluto", "mug loo loo toe"],
  "KUMAKAIN": ["kumakain", "kuma kain", "come a kain", "co-ma kine"],
  "NAGAARAL": ["nagaaral", "nag-aaral", "naga aral", "nag aral", "nag ah ah ral"],
  "NAGLALARO": ["naglalaro", "nag lalaro", "naglaro", "nug la la row"],
  "NAGLULUTO": ["nag loo loo toe", "nagluluto", "nagluto"],
  "NAGSASAKA": ["nagsasaka", "nag sasaka", "nagsaka", "nug sa sa ka"],
  "NAGTUTURO": ["nagtuturo", "nag tuturo", "nagturo", "nug too too row"],
  "NAGTITINDA": ["nag tee teen da", "nagtitinda", "nag tin da"],
  "NAKAKITA": ["nakakita", "naka kita", "nakkita", "na ka kee ta"],
  "NAKITA": ["na kee ta", "nakita", "na key ta"],
  "NALILIGO": ["naliligo", "nali ligo", "naligo", "na lee lee go"],
  "TUMAKBO": ["tumakbo", "to mock bo", "tu makbo", "too mock bow"],
  "MATUTULOG": ["matutulog", "matu tulog", "matulog", "ma too too log"],
  "NAGBEBENTA": ["nagbebenta", "nag bebenta", "nagbenta"],
  "NAGBIBENTA": ["nagbibenta", "nag bibenta", "nagbenta"],
  "UMALIS": ["umalis", "u malis", "um alis", "oo mah lease"],
  "PUMUNTA": ["pumunta", "pu munta", "pumun ta", "poo moon ta"],
  "TUTUGTOG": ["tutugtog", "tugtog", "tu tugtog", "too tug tog"],
  "SASAMA": ["sasama", "sa sama", "sasa ma", "saw saw mah"],
  "SASAYAW": ["sa sa yow", "sasayaw", "sa sigh yow"],
  "SASAKAY": ["sa sa kai", "sasakay", "sa sa k"],
  "INUMIN": ["inumin", "in umin", "inu min", "in oo min"],
  "IINUMIN": ["ee in oo min", "inumin", "e in oo min"],
  "MAGBASA": ["magbasa", "mag basa", "mug bah sah"],
  "MAGLAKAD": ["maglakad", "mag lakad", "mug la cod"],
  "SUMAKAY": ["sue mah kai", "sumakay", "so my kai"],
  "BINILI": ["bee knee lee", "binili", "bin knee lee"],
  "BINIGYAN": ["bee nig yan", "binigyan", "been ig yan"],
  "ISASARA": ["ee sah sah rah", "isasara", "e sa sara"],
  "MALIGO": ["mah lee go", "maligo", "ma lee go"],
  "NAKAKATULONG": ["na ka ka too long", "nakakatulong", "naka ka too long"],
  "BUMAHA": ["boo mah ha", "bumaha", "boom ah ha"],
  "UMULAN": ["oo moo lan", "umulan", "ooh moo lan"],
  "LULUWAS": ["loo loo was", "luluwas", "loo loo us"],
  "MAGPAPALITSON": ["mug pa pa lit son", "magpapalitson", "mag papa litson"],
  "INAALAGAAN": ["ee na ah la ga an", "inaalagaan", "in ah la gone"],
  "HINIRAM": ["he knee ram", "hiniram", "hin ee ram"],
  "IBINIGAY": ["ee bee knee guy", "ibinigay", "e been ee guy"],
  "ISINUOT": ["ee see new ot", "isinuot", "e see nuot"],
  "NAALIW": ["na ah lee oo", "naaliw", "nah ah lee oo"],
  "NAPANALUNAN": ["na pa na loo nan", "napanalunan", "na panel oo nan"],

  // ─── Common Nouns ─────────────────────────────────────────────────────────────
  "ASO": ["ah so", "aso", "a so", "also"],
  "PUSA": ["poo sah", "pusa", "pu sa", "pooh saw"],
  "IBON": ["ee bon", "ibon", "e bon", "ee bone"],
  "PUNO": ["poo no", "puno", "pu no"],
  "BASO": ["bah so", "baso", "ba so", "boss oh"],
  "BATA": ["bah ta", "bata", "ba ta", "but ah"],
  "BATANG": ["ba tang", "bata ng", "but ung"],
  "BATO": ["bah toe", "bato", "ba to", "but oh"],
  "BATOK": ["bah tok", "batok", "ba talk"],
  "LOBO": ["lo bo", "low bow", "lobo"],
  "MATA": ["mah ta", "mata", "ma ta", "mutt ah"],
  "MAPA": ["mah pa", "mapa", "ma pa", "mop ah"],
  "TASA": ["tah sah", "tasa", "ta sa", "toss ah"],
  "BARKO": ["bar ko", "barko", "bark oh"],
  "DAGA": ["dah gah", "daga", "da ga", "dog ah"],
  "DAGAT": ["dah gut", "dagat", "da got"],
  "BAKA": ["bah kah", "baka", "ba ka", "book ah"],
  "ISDA": ["is da", "isda", "iz da", "east da"],
  "PATO": ["pah toe", "pato", "pa to", "pot oh"],
  "BIBE": ["bee beh", "bibe", "be bay", "baby"],
  "MANOK": ["mah nok", "manok", "ma knock", "man oak"],
  "PATING": ["pah ting", "pating", "pa ting", "potting"],
  "PAGONG": ["pah gong", "pagong", "pa gong"],
  "UNGGOY": ["oong goy", "unggoy", "ung goy", "on goy"],
  "ILONG": ["ee long", "ilong", "e long"],
  "BIBIG": ["bee big", "bibig", "be big"],
  "LABI": ["lah bee", "labi", "la be", "lobby"],
  "DILA": ["dee la", "dila", "di la", "dealer"],
  "BUHOK": ["boo hock", "buhok", "bu hook"],
  "DALIRI": ["dah lee ree", "daliri", "da lee ree"],
  "SIKO": ["see ko", "siko", "si ko", "seek oh"],
  "TUHOD": ["too hod", "tuhod", "tu hod"],
  "PAA": ["pah ah", "paa", "pa ah", "pa"],
  "TIYAN": ["tee yan", "tiyan", "ti yan", "tea on"],
  "LIKOD": ["lee cod", "likod", "li cod"],
  "PISNGI": ["pees ngee", "pisngi", "pis ngee"],
  "KUKO": ["koo ko", "kuko", "ku ko", "cook oh"],
  "ITLOG": ["it log", "itlog", "eat log"],
  "GATAS": ["gah tas", "gatas", "ga tas", "got us"],
  "KARNE": ["car neh", "karne", "kar ne"],
  "SOPAS": ["so pas", "sopas", "soap us"],
  "KENDI": ["ken dee", "kendi", "candy"],
  "SAGING": ["sah ging", "saging", "sa ging", "sagging"],
  "PINYA": ["pin ya", "pinya", "peen ya"],
  "UBAS": ["oo bas", "ubas", "u bus", "ooh boss"],
  "PAKWAN": ["pack wan", "pakwan", "pak one"],
  "MESA": ["meh sa", "mesa", "messy", "may sah"],
  "KAMA": ["kah ma", "kama", "ka ma", "comma"],
  "UNAN": ["oo nan", "unan", "u non"],
  "KUMOT": ["koo mot", "kumot", "ku moat"],
  "TINIDOR": ["tee knee door", "tinidor", "teen ee door"],
  "BOTE": ["bo teh", "bote", "boat eh", "bow tay"],
  "LAPIS": ["lah pees", "lapis", "la peace", "lap ease"],
  "GUNTING": ["goon ting", "gunting", "gun ting"],
  "ULAN": ["oo lan", "ulan", "u lawn"],
  "LUPA": ["loo pa", "lupa", "lu pa", "loop ah"],
  "ILOG": ["ee log", "ilog", "e log"],
  "BUNDOK": ["boon dock", "bundok", "bun dock"],
  "DAMO": ["dah mo", "damo", "da moe"],
  "NIYOG": ["nee yog", "niyog", "ni yog", "knee yog"],
  "DAHON": ["dah hon", "dahon", "da hon"],
  "SANGA": ["sung ah", "sanga", "san ga"],
  "LOLO": ["lo lo", "low low", "lolo"],
  "LOLA": ["lo la", "low la", "lola"],
  "GURO": ["goo ro", "guro", "gu row"],
  "DOKTOR": ["doc tor", "doktor", "doctor"],
  "PULIS": ["poo lease", "pulis", "pu lease", "police"],
  "KUSINA": ["koo see nah", "kusina", "ku see na", "cuisine ah"],
  "BANYO": ["ban yo", "banyo", "bon yo"],
  "SILID": ["see lid", "silid", "si lid"],
  "HARDIN": ["har din", "hardin", "hard in"],
  "BAHAY": ["bah hai", "bahay", "ba hay", "ba hi"],
  "PALENGKE": ["palengke", "pa lengke", "paleng ke", "pa link eh"],
  "PALENKE": ["pa leng keh", "palenke", "pa link eh"],
  "ULAM": ["ulam", "olam", "u lam", "oo lum"],
  "HIMPAPAWID": ["himpapawid", "him pa pa wid", "himpa pawid"],
  "PAARALAN": ["paaralan", "pa aralan", "paar alan", "pa ah rah lan"],
  "KAGUBATAN": ["kagubatan", "ka gubatan", "kagu batan"],
  "TAHANAN": ["tahanan", "ta hanan", "taha nan", "ta ha non"],
  "OSPITAL": ["ospital", "hospital", "ospi tal"],
  "BULAKLAK": ["bulaklak", "bulak lak", "bula klak", "bull luck lock"],
  "KAIBIGAN": ["kaibigan", "kai bigan", "ka ibigan", "kai bee gun"],
  "PAGMAMAHAL": ["pagmamahal", "pag mamahal", "pagmama hal"],
  "PAGKAIN": ["pagkain", "pag kain", "pa kain", "pug kine"],
  "PAGKATAPOS": ["pug ka ta pos", "pagkatapos", "pag kata pos"],
  "TAKOT": ["takot", "ta kot", "tacot", "talk ot"],
  "MASIPAG": ["masipag", "ma sipag", "masi pag", "musky pug"],
  "MAPAGMAHAL": ["mapagmahal", "ma pag mahal", "mapag mahal"],
  "MABAIT": ["mabait", "ma bait", "maba it", "ma bait"],
  "AKLAT": ["aklat", "ak lat", "a clot"],
  "TAHOL": ["ta hol", "tahol", "ta hall"],
  "TAKBO": ["tak bo", "takbo", "talk bow"],
  "TABO": ["tah bo", "tabo", "ta bow"],
  "TUBIG": ["too big", "tubig", "tu big"],
  "RELO": ["reh lo", "relo", "ray lo"],
  "RELOS": ["reh los", "relos", "ray los"],
  "PAPEL": ["pah pel", "papel", "pa pal"],
  "DAMIT": ["dah mit", "damit", "da mit", "dammit"],
  "KANIN": ["kah nin", "kanin", "ka neen"],

  // ─── Descriptive / Adjective Words ────────────────────────────────────────────
  "MAALAGA": ["ma ah la ga", "maalaga", "ma la ga"],
  "MABAGAL": ["ma ba gal", "mabagal", "muh bug all"],
  "MABUTI": ["ma boo tee", "mabuti", "ma booty"],
  "MADILIM": ["ma dee lim", "madilim", "ma dill him"],
  "MAGALING": ["ma ga ling", "magaling", "mug uh ling"],
  "MAHAL": ["ma hal", "mahal", "ma hall"],
  "MAHILIG": ["ma he lig", "mahilig", "ma heel ig"],
  "MAINIT": ["my neat", "mainit", "ma in it"],
  "MAKAPAL": ["ma ka pal", "makapal", "maka paul"],
  "MAKULAY": ["ma koo lie", "makulay", "ma cool eye"],
  "MAKULIT": ["ma koo lit", "makulit", "ma cool it"],
  "MALAKAS": ["ma la kas", "malakas", "mala cos"],
  "MALAKI": ["ma la key", "malaki", "mala key"],
  "MALALAKING": ["ma la la king", "malalaking", "mala locking"],
  "MALAMIG": ["ma la mig", "malamig", "mala meg"],
  "MALI": ["ma lee", "mali", "molly"],
  "MALINIS": ["ma lee nis", "malinis", "ma lean ease"],
  "MASARAP": ["ma sa rap", "masarap", "musa rap"],
  "MASAYA": ["ma sa ya", "masaya", "mussa ya"],
  "MATAAS": ["ma ta as", "mataas", "ma toss"],
  "MARANGAL": ["ma rang gal", "marangal", "ma run gal"],
  "NAPAKABAIT": ["na pa ka bait", "napakabait", "napa ca bait"],

  // ─── Common Short Words ───────────────────────────────────────────────────────
  "ISA": ["ee sah", "isa", "e sa"],
  "OSO": ["oh so", "oso", "o so"],
  "ULO": ["oo lo", "ulo", "u lo"],
  "ATE": ["ah teh", "ate", "a te"],
  "IBA": ["ee ba", "iba", "e ba"],
  "IBANG": ["ee bung", "ibang", "e bung"],
  "OPO": ["oh po", "opo", "o po"],
  "UBO": ["oo bo", "ubo", "u bow"],
  "UPO": ["oo po", "upo", "u po"],
  "APO": ["ah po", "apo", "a po"],
  "ABO": ["ah bo", "abo", "a bow"],
  "IPIS": ["ee pees", "ipis", "e peace"],
  "PUSO": ["poo so", "puso", "pu so"],
  "ULAP": ["oo lap", "ulap", "u lap"],
  "APA": ["ah pa", "apa", "a pa"],
  "URI": ["oo ree", "uri", "u ree"],
  "PULA": ["poo la", "pula", "pu la"],
  "PERA": ["peh ra", "pera", "pe ra"],
  "PILA": ["pee la", "pila", "pi la"],
  "GABI": ["gah bee", "gabi", "ga be", "gabby"],
  "GALIT": ["ga lit", "galit", "gah lit"],
  "GOMA": ["go ma", "goma", "go mah"],
  "GULO": ["goo lo", "gulo", "gu lo"],
  "GUSTO": ["goos toe", "gusto", "gus to"],
  "WALO": ["wah lo", "walo", "wa lo"],
  "WALA": ["wah la", "wala", "voila"],
  "KANTA": ["kan ta", "kanta", "con ta"],
  "KANTO": ["kan toe", "kanto", "con toe"],
  "KASO": ["kah so", "kaso", "ka so"],
  "KESO": ["keh so", "keso", "kay so"],
  "SIRA": ["see ra", "sira", "si ra", "sierra"],
  "SAMA": ["sah ma", "sama", "sa ma"],
  "SANA": ["sah na", "sana", "sa na"],
  "SAYA": ["sah ya", "saya", "sa ya"],
  "SALO": ["sah lo", "salo", "sa lo"],
  "HITO": ["he toe", "hito", "hi to"],
  "HIRAP": ["he rap", "hirap", "hi rap"],
  "HINDI": ["hin dee", "hindi", "hen dee"],
  "DAHIL": ["dah hill", "dahil", "da heel"],
  "DASAL": ["dah sal", "dasal", "da soul"],
  "LAKAD": ["la cod", "lakad", "la card"],
  "LAKI": ["la key", "laki", "lackey"],
  "LAMAN": ["la man", "laman", "la mon"],
  "LARO": ["la ro", "laro", "la row"],
  "LUMA": ["loo ma", "luma", "lu ma"],
  "LUTO": ["loo toe", "luto", "lu to"],
  "TALO": ["ta lo", "talo", "ta low"],
  "TAMA": ["ta ma", "tama", "ta mah"],
  "TIRA": ["tee ra", "tira", "ti ra"],
  "TULA": ["too la", "tula", "tu la"],
  "TUNOG": ["too nog", "tunog", "tu nog"],
  "BALAK": ["ba luck", "balak", "ba lac"],
  "BALIK": ["ba lick", "balik", "ba leak"],
  "BULAK": ["boo luck", "bulak", "bu lac"],
  "BULA": ["boo la", "bula", "bu la"],
  "BOLA": ["bo la", "bola", "bow la"],
  "BAGAL": ["ba gal", "bagal", "ba goal"],
  "BAGO": ["ba go", "bago", "bog oh"],
  "BAGONG": ["ba gong", "bagong", "bug ong"],
  "BAHA": ["ba ha", "baha", "ba hah"],

  "LOOB": ["lo ob", "loob", "low obe"],
  "BAKAL": ["ba kal", "bakal", "ba call"],
  "HAYOP": ["hi yop", "hayop", "ha yop"],
  "KAHIT": ["ka hit", "kahit", "ka heat"],
  "KAPIT": ["ka pit", "kapit", "ka peat"],
  "KAHEL": ["ka hel", "kahel", "ka hell"],
  "APAT": ["ah pot", "apat", "a pat"],
  "AKIN": ["ah kin", "akin", "a keen"],
  "AKING": ["ah king", "aking", "a king"],
  "ABOT": ["ah bot", "abot", "a bought"],
  "AHAS": ["ah has", "ahas", "a hoss"],
  "ATIN": ["ah tin", "atin", "a teen"],
  "NASA": ["nah sah", "nasa", "na sa"],
  "KUYA": ["koo ya", "kuya", "ku ya", "cool yeah"],

  // ─── Blends / Diptonggo Words ─────────────────────────────────────────────────
  "ARAW": ["ah raw", "araw", "a row"],
  "DALAW": ["da law", "dalaw", "da lao"],
  "TANAW": ["ta now", "tanaw", "ta nao"],
  "SAWSAW": ["saw saw", "sawsaw", "sauce sauce"],
  "SABAW": ["sa bow", "sabaw", "sab ow"],
  "IKAW": ["ee cow", "ikaw", "e cow"],
  "ALIW": ["ah lee oo", "aliw", "a leave"],
  "GILIW": ["gee lee oo", "giliw", "gi leave"],
  "BALIW": ["ba lee oo", "baliw", "ba leave"],
  "KAMAY": ["ka my", "kamay", "ka mai"],
  "BUHAY": ["boo hai", "buhay", "bu hi"],
  "KULAY": ["koo lie", "kulay", "ku lai"],
  "TUNAY": ["too nai", "tunay", "tu nigh"],
  "KEYK": ["cake", "keyk", "kake"],
  "REYNA": ["ray na", "reyna", "rain ah"],
  "BEYBI": ["bay bee", "beybi", "baby"],
  "BABOY": ["ba boy", "baboy", "bub boy"],
  "KAHOY": ["ka hoy", "kahoy", "ka hoyt"],
  "AMOY": ["ah moy", "amoy", "a moy"],

  // ─── Kambal Katinig (Consonant Blends) ────────────────────────────────────────
  "BLEYD": ["blade", "bleyd", "blade"],
  "BLUSA": ["bloo sa", "blusa", "blue sa"],
  "BLOKE": ["bloke", "block", "bloke"],
  "BLUSANG": ["bloosang", "blusa ng", "blue song"],
  "GLOBO": ["glo bo", "globo", "globe oh"],
  "GLOSA": ["glo sa", "glosa", "close ah"],
  "GLUTA": ["gloo ta", "gluta", "glue ta"],
  "KLASE": ["kla seh", "klase", "class eh", "closet"],
  "KLARO": ["kla ro", "klaro", "cla row"],
  "KLIMA": ["klee ma", "klima", "climate"],
  "PLATO": ["pla toe", "plato", "plot oh"],
  "PLAKA": ["pla ka", "plaka", "pluck ah"],
  "PLEMA": ["pleh ma", "plema", "play ma"],
  "BRASO": ["bra so", "braso", "bras oh"],
  "BRUHA": ["broo ha", "bruha", "brew ha"],
  "BRUSKO": ["broos ko", "brusko", "bruce ko"],
  "SOMBRERO": ["some bray ro", "sombrero", "som bre row"],
  "SOMBRERONG": ["some bray rong", "sombrerong"],
  "SOBRA": ["so bra", "sobra", "sober ah"],
  "TIMBRE": ["tim bray", "timbre", "timber"],
  "DRAGON": ["dragon", "dra gon"],
  "DRAMA": ["drama", "dra ma"],
  "DROGA": ["dro ga", "droga", "drug ah"],
  "GRUPO": ["groo po", "grupo", "group oh"],
  "GRIPO": ["gree po", "gripo", "grip oh"],
  "GRADO": ["gra doe", "grado", "grade oh"],
  "KRUS": ["cruise", "krus", "crews"],
  "KREMA": ["kray ma", "krema", "cream ah"],
  "KRIMEN": ["kree men", "krimen", "cream men"],
  "PRUTAS": ["proo tas", "prutas", "produce"],
  "PRUTASAN": ["proo ta san", "prutasan", "produce on"],
  "PRENO": ["prey no", "preno", "brain oh"],
  "PREMYO": ["prey myo", "premyo", "pray me oh"],
  "PREMYONG": ["prey myong", "premyong", "pray me on"],
  "PROYEKTO": ["pro yeck toe", "proyekto", "project oh"],
  "TREN": ["train", "tren", "trend"],
  "TRIBO": ["tree bo", "tribo", "tribe oh"],
  "TROPA": ["tro pa", "tropa", "trope ah"],
  "LETRA": ["let ra", "letra", "litter ah"],
  "METRO": ["met ro", "metro", "met row"],
  "DYIP": ["jeep", "dyip", "deep"],
  "DYAKET": ["jacket", "dyaket", "jock it"],
  "DYARYO": ["jar yo", "dyaryo", "diary oh"],
  "BADYET": ["budget", "badyet", "bud jet"],
  "MEDYAS": ["med yas", "medyas", "made yes"],
  "MEDYA": ["med ya", "medya", "made ya"],
  "RADYO": ["rad yo", "radyo", "radio"],
  "TSAA": ["cha", "tsaa", "tsa", "chai"],
  "TSINELAS": ["chin ell us", "tsinelas", "she nell us"],
  "TSUPER": ["super", "tsuper", "chew per"],
  "KUTSARA": ["kut sa ra", "kutsara", "cut sarah"],
  "PITSEL": ["pit sel", "pitsel", "pit cell"],
  "LITSON": ["lit son", "litson", "let son"],
  "NGAYON": ["now yon", "ngayon", "na yon"],
  "NGIPIN": ["ngee pin", "ngipin", "knee pin"],
  "NGITI": ["ngee tee", "ngiti", "knee tea"],
  "SANGAY": ["sung eye", "sangay", "sun guy"],
  "LANGIT": ["lung it", "langit", "long it"],
  "KWENTO": ["quen toe", "kwento", "when toe"],
  "KWINTAS": ["quin tas", "kwintas", "win toss"],
  "KWADERNO": ["quad er no", "kwaderno", "when dare no"],
  "PWESTO": ["pwes toe", "pwesto", "west oh"],
  "PWEDE": ["pweh deh", "pwede", "when day"],
  "PWERSA": ["pwer sa", "pwersa", "worse ah"],
  "MISYON": ["me shon", "misyon", "mission"],
  "DISYERTO": ["this yair toe", "disyerto", "desert oh"],
  "PASYENTE": ["posh yen teh", "pasyente", "patient eh"],

  // ─── Names ────────────────────────────────────────────────────────────────────
  "TINA": ["tina", "teen a", "teena"],
  "NILO": ["nilo", "neelo", "ni lo"],
  "NARUBI": ["narubi", "na ruby", "narobi"],
  "MAYA": ["maya", "my a", "maia"],
  "ALAN": ["alan", "allen", "a lan"],
  "LITO": ["lito", "li to", "leeto"],
  "BEN": ["ben", "been", "bin"],
  "TIN": ["tin", "teen"],
  "KEN": ["ken", "can"],
  "TINO": ["tee no", "tino", "teen oh"],
  "MARK": ["mark", "marc"],
  "MARTA": ["mar ta", "marta"],
  "ARA": ["ah ra", "ara", "aura"],
  "ELENA": ["eh leh na", "elena", "a lay na"],
  "MINDA": ["min da", "minda", "mean da"],

  // ─── More Nouns & Misc ────────────────────────────────────────────────────────
  "EROPLANO": ["aero plano", "eroplano", "arrow plan oh"],
  "FOLDER": ["folder"],
  "VINTA": ["vin ta", "vinta", "been ta"],
  "WATAWAT": ["wa ta wat", "watawat", "what a what"],
  "YOYO": ["yo yo", "yoyo"],
  "ZEBRA": ["zebra", "zeebra"],
  "QUESO": ["keh so", "queso", "case oh"],
  "CARROT": ["carrot", "care rot"],
  "JEEP": ["jeep", "jip"],
  "ORASAN": ["or ah san", "orasan", "oh ra sun"],
  "KUTING": ["koo ting", "kuting", "ku ting"],
  "HALAMAN": ["ha la man", "halaman", "hollow man"],
  "NANAY": ["na nai", "nanay", "na nye"],
  "TATAY": ["ta tai", "tatay", "ta tie"],
  "MAMAYA": ["ma my a", "mamaya", "mama ya"],
  "MAMAYANG": ["ma my ung", "mamayang", "mama young"],
  "BANDA": ["bun da", "banda", "bond ah"],
  "BANSA": ["bun sa", "bansa", "bon sa"],
  "BAKURAN": ["ba koo ran", "bakuran", "back oo run"],
  "BAYAN": ["ba yan", "bayan", "buy on"],
  "BUKID": ["boo kid", "bukid", "bu kid"],
  "BUKAS": ["boo kas", "bukas", "bu cos"],
  "BUNSO": ["boon so", "bunso", "bun so"],
  "GOBAT": ["goo but", "gobat"],
  "GUBAT": ["goo but", "gubat", "gu butt"],
  "GUHIT": ["goo hit", "guhit", "gu heat"],
  "MAGKAGRUPO": ["mug ka groo po", "magkagrupo", "mag ka group oh"],
  "MANGGA": ["mung ga", "mangga", "manga"],
  "KAARAWAN": ["ka ah ra wan", "kaarawan", "car ah one"],
  "KAHAPON": ["ka ha pon", "kahapon", "ca ha pone"],
  "KAININ": ["kah ee nin", "kainin", "kai neen"],
  "KASAMA": ["ka sa ma", "kasama", "ka saw ma"],
  "KASE": ["ka seh", "kase", "ka say"],
  "KASI": ["ka see", "kasi", "ka sea"],
  "KAYA": ["kai ya", "kaya", "ka ya"],
  "KAPAG": ["ka pug", "kapag", "ka pog"],
  "KANINA": ["ka nee na", "kanina", "ca knee na"],
  "SIMBAHAN": ["sim ba han", "simbahan", "seem bah hon"],
  "SANGGOL": ["sung goal", "sanggol", "sun goal"],
  "SUPOT": ["sue pot", "supot", "su pot"],
  "SUOT": ["sue ot", "suot", "swat"],
  "PARKE": ["par keh", "parke", "park eh"],
  "PASLIT": ["pas lit", "paslit", "pus lit"],
  "PABORITO": ["pa bo ree toe", "paborito", "pa bore ee toe"],
  "PALIGSAHAN": ["pa lig sa han", "paligsahan", "pa league sa hon"],
  "PAPUNTA": ["pa poon ta", "papunta", "pa pun ta"],
  "PAPUNTANG": ["pa poon tung", "papuntang", "pa pun tung"],
  "SASAKYANG": ["sa sak yung", "sasakyang", "sa suck young"],
  "PALA": ["pa la", "pala", "pa lah"],
  "MAAGA": ["ma ah ga", "maaga", "ma aga"],
  "LUNES": ["loo nes", "lunes", "looney"],
  "UMAGA": ["oo ma ga", "umaga", "u ma ga"],
  "TUWING": ["too wing", "tuwing", "tu wing"],
  "UPANG": ["oo pung", "upang", "u pong"],
  "ANIM": ["ah nim", "anim", "a neem"],
  "MAKINIG": ["ma key nig", "makinig", "ma keen ig"],
  "ISANG": ["ee sung", "isang", "e song"],
  "DALA": ["da la", "dala", "dollar"],
  "DALANG": ["da lung", "dalang", "dollar ng"],
  "DAW": ["dow", "daw", "thou"],
  "DUON": ["doo on", "duon", "do on"],
  "BIGAY": ["bee guy", "bigay", "be guy"],
  "BISEKLETA": ["bee sek let ah", "bisekleta", "bicycle eta"],
  "HABANG": ["ha bung", "habang", "hub ung"],
  "KUSINERO": ["koo see neh ro", "kusinero", "cuisine arrow"],
  "MARAMING": ["ma ra ming", "maraming", "mara ming"],
  "TELA": ["teh la", "tela", "tell ah"],
  "ABRIL": ["ab reel", "abril", "a brill"],
  "ALAGANG": ["ah la gang", "alagang", "a la gung"],
  "ARALAN": ["ah ra lan", "aralan", "a rah lan"],
  "BAGYO": ["bug yo", "bagyo", "bag yo"],
  "JACKET": ["jacket", "jock it"],
  "LABAS": ["la bus", "labas", "la boss"],
  "X-RAY": ["x-ray", "x ray"],

  // ─── Tagalog VC Syllables (used in Level 3) ───────────────────────────────────
  // These are short syllables that the English engine commonly mishears
  "ENG": ["eng", "ing", "ung"],
  "ING": ["ing", "eng"],
  "ONG": ["ong", "ung", "on"],
  "UNG": ["ung", "ong", "young"],
};


/**
 * Normalize Filipino text for comparison:
 * - Converts Ñ/ñ → NY/ny (standard Filipino romanization)
 * - Strips diacritics / accents
 * - Uppercases for uniform comparison
 */
export function normalizeFilipino(text: string): string {
  return text
    .replace(/[Ññ]/g, "NY")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Strip combining diacritics
    .toUpperCase()
    .replace(/[.,!?'"-]/g, "")
    .trim();
}

export function useSpeechRecognition({ evaluatingWord, enabled = true, singleShot = false, lang = "en-US", isFilipinoDictionary, refreshTrigger = 0, initialTranscript = "", onResult, onSilenceTimeout, onError, onEngineStop }: UseSpeechRecognitionProps) {
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultReceivedRef = useRef(false);

  const onResultRef = useRef(onResult);
  const onSilenceTimeoutRef = useRef(onSilenceTimeout);
  const onErrorRef = useRef(onError);
  const onEngineStopRef = useRef(onEngineStop);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onSilenceTimeoutRef.current = onSilenceTimeout; }, [onSilenceTimeout]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onEngineStopRef.current = onEngineStop; }, [onEngineStop]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (!enabled || !evaluatingWord || typeof window === "undefined") {
      cleanup();
      return;
    }

    if (DEBUG) console.log(`\n[AlphabetGO Debug] 🎤 Starting SpeechRecognition for target: "${evaluatingWord}"`);

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      if (DEBUG) console.warn("[AlphabetGO Debug] ❌ SpeechRecognition API not supported in this browser.");
      cleanup();
      return;
    }    resultReceivedRef.current = false;
    let currentAccumulatedTranscript = initialTranscript || "";
    let latestSessionTranscript = "";
    let latestTranscript = currentAccumulatedTranscript; // Track the latest thing heard for the timeout fallback
    let bestRecordedStatus: "correct" | "close" | "wrong" = "wrong";
    let bestRecordedTranscript = "";
    let bestRecordedSequentialCount = 0;
    let lastEmittedSequentialCount = -1; // Throttle UI updates
    let hasMatched = false; // Prevent race conditions while stopping
    let isActive = true; // Track if this specific effect is still active
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = !singleShot;      // singleShot: stops after one phrase
    recognition.interimResults = !singleShot;  // singleShot: only final results
    recognition.lang = lang;
    recognition.maxAlternatives = 1; // 1 drastically improves latency in MS Edge (Azure)

    recognition.onresult = (event: any) => {
      if (!isActive || hasMatched) return; // Prevent overlapping events while stopping or after cleanup
      resultReceivedRef.current = true;

      let foundCorrect = false;
      let foundClose = false;
      let bestStatus: "correct" | "close" | "wrong" = "wrong";
      let bestTranscript = "";
      let matchedSequentialCount = 0;

      if (DEBUG) console.log(`[AlphabetGO Debug] 🗣️ Result Event Received. Evaluating against: "${evaluatingWord}"`);

      // Stitch together all chunks using the overlap merge to prevent Android duplication bugs
      // Generate up to 5 alternative stitched transcripts
      const allTranscripts: string[] = [];
      let primarySessionTranscript = "";

      for (let altIndex = 0; altIndex < 5; altIndex++) {
        let altSessionTranscript = "";
        let hasData = false;
        
        for (let r = 0; r < event.results.length; r++) {
          const result = event.results[r];
          const alt = result[altIndex] || result[0]; // fallback to primary if alternative doesn't exist
          if (alt) {
            altSessionTranscript = mergeTranscripts(altSessionTranscript, alt.transcript);
            hasData = true;
          }
        }
        
        if (hasData) {
          if (altIndex === 0) primarySessionTranscript = altSessionTranscript;
          const fullAltTranscript = (currentAccumulatedTranscript + " " + altSessionTranscript).trim();
          if (!allTranscripts.includes(fullAltTranscript)) {
            allTranscripts.push(fullAltTranscript);
          }
        }
      }

      latestSessionTranscript = primarySessionTranscript;
      latestTranscript = allTranscripts[0] || ""; // Update fallback transcript

      if (DEBUG) console.log(`[AlphabetGO Debug] Evaluated Transcripts:`, allTranscripts);

      const primaryTranscript = allTranscripts[0] || "";

      // Start evaluation block
      {
        let status: "correct" | "close" | "wrong" = "wrong";
        let matchStr = primaryTranscript;

        const trimmedWord = evaluatingWord.trim().toLowerCase();

        // NEW: Check if it's a single letter OR a magic E pattern (e.g., "a_e", "i_e")
        const isSingleLetter = trimmedWord.length === 1 && /[a-z]/.test(trimmedWord);
        const isMagicE = trimmedWord.length === 3 && /^[aeiou]_e$/.test(trimmedWord);

        if (isSingleLetter || isMagicE) {
          // If it's "a_e", grab just the "A". If it's a single letter, grab it.
          const letterUpper = trimmedWord.charAt(0).toUpperCase();
          let matched = false;

          for (let i = 0; i < allTranscripts.length; i++) {
            const normalized = normalizeTranscript(allTranscripts[i]);

            // Look up the homophones for the base letter (e.g., "A")
            const allowedWords = [
              letterUpper,
              `LETTER ${letterUpper}`,
              ...(HOMOPHONES[letterUpper] || [])
            ].map(w => w.toUpperCase());
            const phraseWords = normalized.split(" ");

            if (allowedWords.some(t => normalized === t || phraseWords.includes(t))) {
              matched = true;
              matchStr = letterUpper.toLowerCase();
              break;
            }
          }
          status = matched ? "correct" : "wrong";
        }
        // PATH A: CV / VC Syllable
        else if (isSyllableTarget(evaluatingWord)) {
          const phonemeResult = evaluateSyllable(evaluatingWord, allTranscripts);
          status = phonemeResult;
          matchStr = (status === "correct" || status === "close") ? evaluatingWord.toLowerCase() : primaryTranscript;
        }
        // PATH B: Phrase / Sentence
        else if (evaluatingWord.toUpperCase().replace(/[.,!?]/g, "").trim().includes(" ")) {
          const isFilipino = isFilipinoDictionary ?? lang.startsWith("fil");
          const normFn = isFilipino ? normalizeFilipino : (t: string) => t.toUpperCase().replace(/[.,!?'"-]/g, "").trim();
          const homoDict = isFilipino ? FILIPINO_HOMOPHONES : HOMOPHONES;
          // Filipino: lower threshold because fil-PH produces more spelling variance
          const similarityThreshold = isFilipino ? 0.5 : 0.6;

          const targetClean = normFn(evaluatingWord);
          const targetWords = targetClean.split(/\s+/).map(w => DIGIT_MAP[w] || w);

          let bestSequentialCount = 0;
          let bestSentenceStatus: "correct" | "close" | "wrong" = "wrong";
          let matchedTranscript = "";

          for (let i = 0; i < allTranscripts.length; i++) {
            const rawClean = normFn(allTranscripts[i]);
            const rawWords = rawClean.split(/\s+/).map(w => DIGIT_MAP[w] || w);

            let sequentialMatchCount = 0;
            let rawIdx = 0;

            // Strict sequential lock evaluation
            while (sequentialMatchCount < targetWords.length && rawIdx < rawWords.length) {
              const expected = targetWords[sequentialMatchCount];
              const spoken = rawWords[rawIdx];
              const allowed = [expected, ...(homoDict[expected] || []).map(w => w.toUpperCase())];
              
              // Filipino: skip matchConsonants() — too greedy on short function words (ko/ka, sa/si, ang/ing all collide)
              const consonantMatch = !isFilipino && matchConsonants(expected, spoken);
              
              if (allowed.includes(spoken) || calculateSimilarity(expected, spoken) >= similarityThreshold || consonantMatch) {
                sequentialMatchCount++;
              }
              rawIdx++; // Always advance rawIdx to search forward
            }

            if (sequentialMatchCount > bestSequentialCount) {
               bestSequentialCount = sequentialMatchCount;
               matchedTranscript = allTranscripts[i].trim();
            }
          }

          // Strict checking: must complete the full sequential count
          if (bestSequentialCount === targetWords.length) {
            bestSentenceStatus = "correct";
          } else {
            bestSentenceStatus = "wrong"; // UI handles intermediate visual progress via matchedWordCount
          }

          status = bestSentenceStatus;
          matchedSequentialCount = bestSequentialCount;
          matchStr = matchedTranscript || allTranscripts[0].trim();
        }
        // PATH C: Single Word
        else {
          let wordMatch = "";
          let bestSimilarity = 0;
          let isPerfectMatch = false;
          const wordUpper = evaluatingWord.toUpperCase().replace(/[.,!?'"-]/g, "").replace(/HARD|SOFT/i, "");

          for (let i = 0; i < allTranscripts.length; i++) {
            const normalized = normalizeTranscript(allTranscripts[i]);
            const allowedWords = [wordUpper, ...(HOMOPHONES[wordUpper] || [])].map(w => w.toUpperCase());
            const phraseWords = normalized.split(" ");

            if (allowedWords.some(t => normalized === t || phraseWords.includes(t))) {
              wordMatch = evaluatingWord;
              bestSimilarity = 1;
              isPerfectMatch = true;
              break;
            }

            for (const w of phraseWords) {
              const similarity = calculateSimilarity(w, wordUpper);
              if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                wordMatch = w;
              }
            }
          }
          if (!wordMatch) wordMatch = normalizeTranscript(allTranscripts[0]);

          if (isPerfectMatch || bestSimilarity === 1) {
            status = "correct"; matchStr = wordMatch.toLowerCase();
          } else if (bestSimilarity >= 0.5 || matchConsonants(wordMatch, wordUpper)) {
            status = "close"; matchStr = wordMatch.toLowerCase();
          } else {
            status = "wrong"; matchStr = wordMatch.toLowerCase();
          }
        }

        if (DEBUG) console.log(`[AlphabetGO Debug] Evaluated primary "${primaryTranscript}" -> Status: ${status}, matchStr: "${matchStr}"`);

        // Keep track of the best status heard so far
        if (status === "correct" || matchedSequentialCount > bestRecordedSequentialCount) {
          bestRecordedStatus = status;
          bestRecordedTranscript = matchStr;
          bestRecordedSequentialCount = matchedSequentialCount;
        }

        if (status === "correct") {
          foundCorrect = true;
          bestStatus = "correct";
          bestTranscript = matchStr;
          // Since we stitched everything together, if it's correct, we're done!
        } else if (status === "close") {
          foundClose = true;
          bestStatus = "close";
          bestTranscript = matchStr;
        }
      } // End evaluation block

      // Determine if the target is a multi-word phrase
      const targetWords = evaluatingWord.toUpperCase().replace(/[.,!?]/g, "").trim().split(/\s+/);
      const isPhrase = targetWords.length > 1;
      const isFinalResult = event.results[event.results.length - 1]?.isFinal;
      const allPhraseWordsMatched = isPhrase && matchedSequentialCount >= targetWords.length;

      // If we found a success, or if final result arrived with a close match, stop the mic and complete!
      const shouldEarlyExit = foundCorrect || (foundClose && isFinalResult) || (!isPhrase && foundClose) || allPhraseWordsMatched;

      if (shouldEarlyExit) {
        hasMatched = true; // Block future onresult events
        if (DEBUG) console.log(`[AlphabetGO Debug] ✅ Match successful! Best Status: ${bestStatus}, Best Transcript: "${bestTranscript}"`);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) { }
        }
        onResultRef.current(evaluatingWord, bestStatus, bestTranscript, matchedSequentialCount);
      } else {
        // Prevent React state thrashing: only emit an update if the sequential progress actually advanced
        if (matchedSequentialCount !== lastEmittedSequentialCount) {
          lastEmittedSequentialCount = matchedSequentialCount;
          if (DEBUG) console.log(`[AlphabetGO Debug] ⏳ UI Update: Sequential progress advanced to ${matchedSequentialCount}`);
          onResultRef.current(evaluatingWord, null, latestTranscript, matchedSequentialCount);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (!isActive || hasMatched) return;
      if (event.error === "no-speech") return;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (event.error === "aborted") {
        if (DEBUG) console.log(`[AlphabetGO Debug] ⚠️ Recognition aborted for "${evaluatingWord}".`);
        onErrorRef.current();
        return;
      }
      if (DEBUG) console.error("[AlphabetGO Debug] ❌ Speech recognition error:", event.error);
      hasMatched = true;

      // If we recorded a correct/close match earlier, submit it!
      if (bestRecordedStatus !== "wrong") {
        onResultRef.current(evaluatingWord, bestRecordedStatus, bestRecordedTranscript || latestTranscript, bestRecordedSequentialCount);
      } else {
        // Otherwise, gracefully exit without penalizing the child for a technical error
        onErrorRef.current();
      }
    };

    recognition.onend = () => {
      if (isActive && !hasMatched) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (bestRecordedStatus !== "wrong") {
          hasMatched = true;
          if (DEBUG) console.log(`[AlphabetGO Debug] 🏁 onend — awarding recorded status "${bestRecordedStatus}" for: "${bestRecordedTranscript}"`);
          onResultRef.current(evaluatingWord, bestRecordedStatus, bestRecordedTranscript, bestRecordedSequentialCount);
        } else if (singleShot && resultReceivedRef.current && latestTranscript) {
          hasMatched = true;
          if (DEBUG) console.log(`[AlphabetGO Debug] 🏁 singleShot onend — forcing "wrong" with: "${latestTranscript}"`);
          onResultRef.current(evaluatingWord, "wrong", latestTranscript, bestRecordedSequentialCount);
        } else {
          hasMatched = true;
          if (DEBUG) console.log(`[AlphabetGO Debug] 🤫 onend — emitting null to preserve UI.`);
          onResultRef.current(evaluatingWord, null, latestTranscript, bestRecordedSequentialCount);
          if (onEngineStopRef.current) {
            onEngineStopRef.current();
          }
        }
      }
    };

    // In singleShot mode, add a 200ms warm-up delay before starting recognition.
    // The Web Speech API's audio pipeline needs ~100-200ms to fully initialize.
    // Without this, very short sounds like a single letter name ("A", "B") said
    // immediately after tapping the mic get clipped and are never captured.
    let startupTimerId: ReturnType<typeof setTimeout> | null = null;

    const doStart = () => {
      if (!isActive) return;
      try {
        recognition.start();

        // Removed artificial timeout: We now rely purely on the user completing the 
        // phrase or pressing the "Cancel" button, creating a stress-free environment.
      } catch (error) {
        if (DEBUG) console.error("[AlphabetGO Debug] ❌ Error starting recognition:", error);
        onErrorRef.current();
      }
    };

    if (singleShot) {
      // 200ms delay — lets the browser open the mic fully before the student speaks
      startupTimerId = setTimeout(doStart, 200);
    } else {
      doStart();
    }

    return () => {
      isActive = false;
      if (startupTimerId) clearTimeout(startupTimerId);
      cleanup();
    };
  }, [evaluatingWord, enabled, lang, cleanup, refreshTrigger]);
}
