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

export function useSpeechRecognition({ evaluatingWord, enabled = true, singleShot = false, lang = "en-US", refreshTrigger = 0, initialTranscript = "", onResult, onSilenceTimeout, onError, onEngineStop }: UseSpeechRecognitionProps) {
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
          const targetClean = evaluatingWord.toUpperCase().replace(/[.,!?'"-]/g, "").trim();
          const targetWords = targetClean.split(/\s+/).map(w => DIGIT_MAP[w] || w);

          let bestSequentialCount = 0;
          let bestSentenceStatus: "correct" | "close" | "wrong" = "wrong";
          let matchedTranscript = "";

          for (let i = 0; i < allTranscripts.length; i++) {
            const rawClean = allTranscripts[i].toUpperCase().replace(/[.,!?'"-]/g, "").trim();
            const rawWords = rawClean.split(/\s+/).map(w => DIGIT_MAP[w] || w);

            let sequentialMatchCount = 0;
            let rawIdx = 0;

            // Strict sequential lock evaluation
            while (sequentialMatchCount < targetWords.length && rawIdx < rawWords.length) {
              const expected = targetWords[sequentialMatchCount];
              const spoken = rawWords[rawIdx];
              const allowed = [expected, ...(HOMOPHONES[expected] || []).map(w => w.toUpperCase())];
              
              if (allowed.includes(spoken) || calculateSimilarity(expected, spoken) >= 0.6 || matchConsonants(expected, spoken)) {
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
