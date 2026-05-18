import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Mic,
  Home,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  MicOff,
  RotateCcw,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { Button } from "./ui/button";
import { CVC_WORDS, shuffle, getPhoneticPronunciation } from "../data/levels";
import type { SyllablePattern } from "../data/levels";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Confetti } from "./ui/Confetti";

const DIGIT_MAP: Record<string, string> = {
  "0": "ZERO", "1": "ONE", "2": "TWO", "3": "THREE", "4": "FOUR",
  "5": "FIVE", "6": "SIX", "7": "SEVEN", "8": "EIGHT", "9": "NINE", "10": "TEN"
};

// Map words that the API frequently misunderstands because they sound identical or extremely similar
// This covers true homophones, names, and vowel-elongation mistakes (like BIN -> BEAN) for all 64 words.
const HOMOPHONES: Record<string, string[]> = {
  // A Vowels
  "BAT": ["BATT"],
  "MAT": ["MATT"],
  "PAT": ["PATT"],

  // E Vowels
  "RED": ["READ"],
  "LED": ["LEAD"],
  "PEN": ["PEEN", "PENN"],
  "DEN": ["DEEN", "DENE", "THEN"],
  "MEN": ["MEAN"],

  // I Vowels
  "BIN": ["BEAN"],
  "TIN": ["TEEN"],
  "PIN": ["PEEN"],
  "FIN": ["FEEN", "PHIN"],
  "WIN": ["WYNN", "WON", "WEEN"],
  "WIG": ["WHIG", "WEG"],

  // O Vowels
  "COT": ["CAUGHT"],
  "NOT": ["KNOT"],
  "ROT": ["WROUGHT"],
  "DOG": ["DAWG", "DOOG"],

  // U Vowels
  "SUN": ["SON", "SAN"],
  "BUS": ["BUSS", "BASS"],
  "MUG": ["MOG", "MUGGS"],
  "RUG": ["RUGGS", "ROG"],

};

// Helper function to calculate Levenshtein distance (Fuzzy Matching)
function calculateSimilarity(str1: string, str2: string): number {
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

// Strict vowel check to ensure CVC words aren't falsely marked "close" if the vowel changes (e.g. TIN vs TEEN)
function hasSameVowels(word1: string, word2: string): boolean {
  const getVowels = (w: string) => w.replace(/[^AEIOU]/g, "");
  return getVowels(word1) === getVowels(word2);
}

function normalizeTranscript(text: string): string {
  // Remove punctuation and map numbers to words
  return text
    .toUpperCase()
    .replace(/[.,!?]/g, "")
    .trim()
    .split(/\s+/)
    .map(w => DIGIT_MAP[w] || w)
    .join(" ");
}

// Check if consonants (start and end) match, even if the middle vowel is different
function matchConsonants(word1: string, word2: string): boolean {
  const getConsonants = (w: string) => w.replace(/[AEIOU]/g, "");
  return getConsonants(word1) === getConsonants(word2);
}

const VOWELS = ["A", "E", "I", "O", "U"];

function getSyllablePattern(syllable: string): "CV" | "VC" | "CVC" | null {
  const s = syllable.toUpperCase();
  if (s.length === 2) {
    if (VOWELS.includes(s[0])) return "VC";
    return "CV";
  }
  if (s.length === 3) return "CVC";
  return null;
}

function matchPhoneticSyllable(heard: string, target: string, pattern: "CV" | "VC"): boolean {
  const h = heard.toUpperCase();
  const t = target.toUpperCase();

  if (h === t) return true;

  const phoneticTarget = getPhoneticPronunciation(t, pattern).toUpperCase();
  if (h === phoneticTarget) return true;

  const cvHomophones: Record<string, string[]> = {
    // B
    "BA": ["BAH", "BAT", "BAG", "BAD"],
    "BE": ["BEE", "BAY", "BED"],
    "BI": ["BEE", "BYE"],
    "BO": ["BOW", "BOH", "BOX"],
    "BU": ["BOO", "BUT", "BUG"],

    // C
    "CA": ["KAH", "CAT", "CAB"],
    "CO": ["CO", "COH", "COT"],
    "CU": ["COO", "COP", "CUP"],

    // D
    "DA": ["DAH", "DAD", "DAY"],
    "DE": ["DAY", "DEH"],
    "DI": ["DEE", "DIE", "DIG"],
    "DO": ["DO", "DOH", "DUE", "DOO", "DEW"],
    "DU": ["DOO", "DUG"],

    // F
    "FA": ["FAH", "FAT"],
    "FI": ["FEE", "FIH"],
    "FE": ["FEH", "FEE", "FED"],
    "FO": ["FOH", "FOH", "FOX"],
    "FU": ["FOO", "FUN"],

    // G
    "GO": ["GO", "GOH", "GOT"],

    // H
    "HA": ["HAH", "HAT", "HAD"],
    "HE": ["HE", "HEH", "HER", "HEAD", "HEE"],
    "HI": ["HE", "HEE", "HIM", "HERE", "HIGH"],
    "HO": ["HOH", "HOW", "HOT"],
    "HU": ["HUH", "HOO", "HUG"],

    // J
    "JA": ["JA", "JAH", "JAR", "JOB"],
    "JE": ["JAY", "JEH"],
    "JI": ["JIH", "GEE", "JEE"],
    "JO": ["JOE", "JOH"],
    "JU": ["JEW", "JOO", "JUG"],

    // K
    "KA": ["CAR", "KAH", "CAT"],
    "KE": ["KAY", "KEH"],
    "KI": ["KIH", "KEE"],
    "KO": ["KOH", "COH"],
    "KU": ["COH"],

    // L
    "LA": ["LAH"],
    "LE": ["LEH"],
    "LI": ["LEE"],
    "LO": ["LOH"],
    "LU": ["LUH"],

    // M
    "MA": ["MAH", "MAP", "MAN", "MAD"],
    "ME": ["ME", "MEH", "MY", "MAY", "MEN"],
    "MI": ["MEE", "MY"],
    "MU": ["MOO", "MUD"],

    // N
    "NA": ["NAH", "NAP"],
    "NE": ["NAY", "NEH", "NET"],
    "NI": ["KNEE", "NEE"],
    "NO": ["NO", "NOH", "KNOW", "NEW"],
    "NU": ["NEW", "NOO"],

    // P
    "PA": ["PAH", "PAP", "PAD"],
    "PE": ["PAY", "PEH", "PEN"],
    "PI": ["PEE", "PIE", "PIN"],
    "PO": ["PAW", "POH", "POP"],
    "PU": ["POO", "PUP"],

    // R
    "RA": ["RAH", "RAY", "RAT"],
    "RE": ["RAY", "REH", "RED"],
    "RI": ["REE", "RYE", "RIB"],
    "RO": ["ROW", "ROH", "ROT"],
    "RU": ["RUE", "ROO", "RUN"],

    // S
    "SA": ["SAH", "SAD", "SAY"],
    "SI": ["SEE", "SIGH", "SIT"],
    "SO": ["SO", "SOH", "SEW", "SAW"],
    "SU": ["SUE", "SOO", "SUN"],

    // T
    "TA": ["TAH", "TOY", "TAP"],
    "TE": ["TAY", "TEH", "TEN"],
    "TI": ["TEA", "TEE", "TIE", "TIN"],
    "TO": ["TO", "TOO", "TWO", "TOH", "TOP"],
    "TU": ["TOO", "TOH", "TUB"],

    // V
    "VA": ["VAH", "VAN"],
    "VE": ["VAY", "VEH", "VET"],
    "VI": ["VEE", "VIE"],
    "VO": ["VOW", "VOH"],
    "VU": ["VOO"],

    // W
    "WA": ["WAH", "WAY", "WAR"],
    "WE": ["WE", "WEH", "WAY", "WET", "WEE"],
    "WI": ["WEE", "WHY", "WIN"],
    "WO": ["WOE", "WOH"],
    "WU": ["WOO"],

    // Z
    "ZA": ["ZAH", "ZAP"],
    "ZE": ["THE", "SEE", "SAY"],
    "ZI": ["ZEE"],
    "ZO": ["ZOO", "ZOH"],
    "ZU": ["ZOO"]
  };

  const vcHomophones: Record<string, string[]> = {
    // A
    "AB": ["AB", "APP", "UP"],
    "AC": ["AK", "ACK"],
    "AD": ["ADD", "AD", "AT"],
    "AF": ["AF", "OFF", "HALF"],
    "AG": ["AG", "EGG"],
    "AK": ["AK", "ACK"],
    "AL": ["AL", "OWL", "ALL"],
    "AM": ["AM", "UM", "HAM"],
    "AN": ["AN", "AND", "UN"],
    "AP": ["APP", "UP"],
    "AR": ["ARE", "OUR", "R"],
    "AS": ["AS", "US", "ASS"],
    "AT": ["AT", "IT", "HAT"],
    "AV": ["AV", "HAVE"],

    // E
    "EB": ["EBB", "IB"],
    "EC": ["ECK", "EK"],
    "ED": ["ED", "EDD", "HEAD"],
    "EF": ["F", "EFF"],
    "EG": ["EGG", "IGG"],
    "EK": ["ECK", "EK"],
    "EL": ["L", "ELL"],
    "EM": ["M", "EM"],
    "EN": ["N", "IN", "EN"],
    "EP": ["EP", "APP"],
    "ER": ["ERR", "AIR", "ARE"],
    "ES": ["S", "ESS"],
    "ET": ["AT", "IT", "ET"],
    "EV": ["EV", "HAVE"],

    // I
    "IB": ["IB", "EBB"],
    "IC": ["ICK"],
    "ID": ["ID", "IT"],
    "IF": ["IF"],
    "IG": ["IG", "EGG"],
    "IK": ["ICK"],
    "IL": ["ILL", "L"],
    "IM": ["I'M", "IM", "IN"],
    "IN": ["IN", "INN"],
    "IP": ["IP"],
    "IR": ["EAR", "ERR"],
    "IS": ["IS"],
    "IT": ["IT", "AT"],
    "IV": ["IV", "IF"],

    // O
    "OB": ["OB"],
    "OC": ["OCK"],
    "OD": ["ODD", "OD"],
    "OF": ["OF", "OFF"],
    "OG": ["OG"],
    "OK": ["OK", "OCK"],
    "OL": ["ALL", "OL"],
    "OM": ["OM", "UM"],
    "ON": ["ON", "UN"],
    "OP": ["UP", "OP"],
    "OR": ["OR", "OAR", "OUR"],
    "OS": ["OS", "US"],
    "OT": ["OUGHT", "OT"],
    "OV": ["OF", "OV"],

    // U
    "UB": ["UB"],
    "UC": ["UCK"],
    "UD": ["UD", "ODD"],
    "UF": ["UF", "OFF"],
    "UG": ["UG"],
    "UK": ["UCK"],
    "UL": ["UL", "ALL"],
    "UM": ["UM"],
    "UN": ["UN", "ON"],
    "UP": ["UP"],
    "UR": ["ER", "UR"],
    "US": ["US", "AS"],
    "UT": ["UT", "AT", "IT"],
    "UV": ["OF", "UV"]
  };

  if (cvHomophones[t] && cvHomophones[t].includes(h)) return true;
  if (vcHomophones[t] && vcHomophones[t].includes(h)) return true;

  if (pattern === "CV") {
    const targetConsonant = t[0];
    const targetVowel = t[1];
    if (h.startsWith(targetConsonant)) {
      if (targetVowel === "A" && (h.includes("A") || h.includes("AR") || h.includes("AH"))) return true;
      if (targetVowel === "E" && (h.includes("E") || h.includes("AY") || h.includes("EH"))) return true;
      if (targetVowel === "I" && (h.includes("EE") || h.includes("I") || h.includes("EA"))) return true;
      if (targetVowel === "O" && (h.includes("O") || h.includes("OW") || h.includes("OH"))) return true;
      if (targetVowel === "U" && (h.includes("OO") || h.includes("U") || h.includes("OU"))) return true;
    }
  } else if (pattern === "VC") {
    const targetVowel = t[0];
    const targetConsonant = t[1];
    if (h.endsWith(targetConsonant)) {
      if (targetVowel === "A" && (h.includes("A") || h.includes("AH"))) return true;
      if (targetVowel === "E" && (h.includes("E") || h.includes("EH"))) return true;
      if (targetVowel === "I" && (h.includes("I") || h.includes("IH"))) return true;
      if (targetVowel === "O" && (h.includes("O") || h.includes("OH"))) return true;
      if (targetVowel === "U" && (h.includes("U") || h.includes("UH"))) return true;
    }
  }

  return false;
}

interface LevelVoiceEvaluationProps {
  levelId: number;
  accent: { primary: string; dark: string; lightBg: string };
  customWords?: string[];
  isSubPhase?: boolean;
  onComplete?: () => void;
}

export function LevelVoiceEvaluation({ levelId, accent, customWords, isSubPhase, onComplete }: LevelVoiceEvaluationProps) {
  const navigate = useNavigate();
  const [words] = useState<string[]>(() => customWords ? customWords : shuffle(CVC_WORDS).slice(0, 10));

  const [evaluatingWord, setEvaluatingWord] = useState<string | null>(null);
  const [evalFeedback, setEvalFeedback] = useState<Record<string, "correct" | "close" | "wrong" | null>>({});
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [showShyTip, setShowShyTip] = useState(false);

  const playTTS = async (text: string) => {
    const pattern = getSyllablePattern(text);
    const speakText = pattern ? getPhoneticPronunciation(text, pattern).toLowerCase() : text.toLowerCase();
    try {
      await TextToSpeech.speak({
        text: speakText,
        lang: 'en-US',
        rate: 0.85,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });
    } catch (e) {
      console.warn('[TTS] Capacitor failed, falling back to Web Speech API:', e);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speakText);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const progress = (completedWords.size / words.length) * 100;
  const allDone = completedWords.size >= words.length;

  // Initialize speech recognition and real-time visualizer dynamically
  useEffect(() => {
    let currentRecognition: any = null;
    let autoSilenceTimeout: NodeJS.Timeout | null = null;
    let audioCtx: AudioContext | null = null;
    let analyserNode: AnalyserNode | null = null;
    let micStream: MediaStream | null = null;
    let animationFrameId: number | null = null;

    if (evaluatingWord) {
      // 1. Setup real-time voice visualizer
      const audioVisualizerElement = document.getElementById("audio-visualizer-container");
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          micStream = stream;
          const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

          if (SpeechRecognitionAPI) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(stream);
            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 256;
            source.connect(analyserNode);

            const bufferLength = analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkVolume = () => {
              if (!analyserNode) return;
              analyserNode.getByteFrequencyData(dataArray);

              // Target human voice frequency range (85Hz to 255Hz)
              // With 128 bins (256 fftSize) at 44.1kHz, each bin is ~172Hz.
              // So look at bins 1 to 5 for vocal/lower range.
              let vocalSum = 0;
              for (let i = 1; i <= 5; i++) {
                vocalSum += dataArray[i];
              }
              const average = vocalSum / 5;

              // Apply exponential gain scaling to boost quiet/shy voices
              const rawVol = average / 255;
              const vol = Math.pow(rawVol, 1.5) * 2.0;

              const b1 = document.getElementById("wave-bar-1");
              const b2 = document.getElementById("wave-bar-2");
              const b3 = document.getElementById("wave-bar-3");
              const b4 = document.getElementById("wave-bar-4");
              const b5 = document.getElementById("wave-bar-5");

              if (b1 && b2 && b3 && b4 && b5) {
                b1.style.height = `${Math.max(6, vol * 28 + Math.random() * 4 * vol)}px`;
                b2.style.height = `${Math.max(6, vol * 44 + Math.random() * 6 * vol)}px`;
                b3.style.height = `${Math.max(6, vol * 60 + Math.random() * 8 * vol)}px`;
                b4.style.height = `${Math.max(6, vol * 44 + Math.random() * 6 * vol)}px`;
                b5.style.height = `${Math.max(6, vol * 20 + Math.random() * 4 * vol)}px`;
              }

              animationFrameId = requestAnimationFrame(checkVolume);
            };
            animationFrameId = requestAnimationFrame(checkVolume);
          }
        })
        .catch(err => {
          console.warn("Failed to initialize live voice visualizer:", err);
        });

      // 2. Setup speech recognition
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const SpeechRecognition = SpeechRecognitionAPI;
        currentRecognition = new SpeechRecognition();

        currentRecognition.continuous = false;
        currentRecognition.interimResults = false;
        currentRecognition.lang = "en-US";
        currentRecognition.maxAlternatives = 3;

        currentRecognition.onresult = (event: any) => {
          if (autoSilenceTimeout) clearTimeout(autoSilenceTimeout);
          const results = event.results[0];
          let bestMatch = "";
          let bestSimilarity = 0;
          let isPerfectMatch = false;

          const targetWord = evaluatingWord || "";
          const pattern = getSyllablePattern(targetWord);

          // Check all alternatives
          for (let i = 0; i < results.length; i++) {
            const raw = results[i].transcript.trim();
            const normalized = normalizeTranscript(raw);

            // Get allowed variations
            const allowedWords = [targetWord];
            if (HOMOPHONES[targetWord]) {
              allowedWords.push(...HOMOPHONES[targetWord]);
            }

            const phraseWords = normalized.split(" ");
            let matchedTarget = false;
            for (const target of allowedWords) {
              if (normalized === target || phraseWords.includes(target)) {
                matchedTarget = true;
                break;
              }
            }

            // Fallback phonetic matching for CV / VC syllables
            if (!matchedTarget && pattern && (pattern === "CV" || pattern === "VC")) {
              for (const word of phraseWords) {
                if (matchPhoneticSyllable(word, targetWord, pattern)) {
                  matchedTarget = true;
                  break;
                }
              }
            }

            if (matchedTarget) {
              bestMatch = targetWord;
              bestSimilarity = 1;
              isPerfectMatch = true;
              break;
            }

            for (const word of phraseWords) {
              const similarity = calculateSimilarity(word, targetWord);
              if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = word;
              }
            }
          }

          if (!bestMatch) {
            bestMatch = normalizeTranscript(results[0].transcript.trim());
          }

          setTranscripts(prev => ({ ...prev, [targetWord]: bestMatch }));

          if (isPerfectMatch || bestSimilarity === 1) {
            setEvalFeedback(prev => ({ ...prev, [targetWord]: "correct" }));
            setShowConfetti(true);
            const newCompleted = new Set(completedWords);
            newCompleted.add(targetWord);
            setCompletedWords(newCompleted);
            setTimeout(() => {
              setEvaluatingWord(null);
              setShowConfetti(false);
              if (newCompleted.size >= words.length) {
                setShowCompletionScreen(true);
              }
            }, 2000);
          } else if (bestSimilarity >= 0.5 || matchConsonants(bestMatch, targetWord)) {
            setEvalFeedback(prev => ({ ...prev, [targetWord]: "close" }));
            setTimeout(() => {
              setEvalFeedback(prev => ({ ...prev, [targetWord]: null }));
              setEvaluatingWord(null);
            }, 2500);
          } else {
            setEvalFeedback(prev => ({ ...prev, [targetWord]: "wrong" }));
            setTimeout(() => {
              setEvalFeedback(prev => ({ ...prev, [targetWord]: null }));
              setEvaluatingWord(null);
            }, 2500);
          }
        };

        currentRecognition.onerror = (event: any) => {
          if (autoSilenceTimeout) clearTimeout(autoSilenceTimeout);
          console.error("Speech recognition error:", event.error);
          setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: "wrong" }));
          setTimeout(() => {
            setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: null }));
            setEvaluatingWord(null);
          }, 2000);
        };

        try {
          currentRecognition.start();
          // Start 5-second auto-silence timeout if no speech is detected at all
          autoSilenceTimeout = setTimeout(() => {
            console.warn("[Speech] Auto-silence: No speech detected in 5s. Stopping microphone.");
            if (currentRecognition) {
              try {
                currentRecognition.stop();
              } catch (e) { }
            }
            setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: "wrong" }));
            setTimeout(() => {
              setEvalFeedback(prev => ({ ...prev, [evaluatingWord]: null }));
              setEvaluatingWord(null);
            }, 1500);
          }, 5000);
        } catch (error) {
          console.error("Error starting recognition:", error);
          setEvaluatingWord(null);
        }
      }
    }

    return () => {
      if (autoSilenceTimeout) clearTimeout(autoSilenceTimeout);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioCtx) {
        try {
          audioCtx.close();
        } catch (e) { }
      }
      if (micStream) {
        try {
          micStream.getTracks().forEach(track => track.stop());
        } catch (e) { }
      }
      if (currentRecognition) {
        try {
          currentRecognition.stop();
          currentRecognition.onresult = null;
          currentRecognition.onerror = null;
          currentRecognition.onend = null;
        } catch (e) { }
      }
      // reset visualizer level
      for (let i = 1; i <= 5; i++) {
        const b = document.getElementById(`wave-bar-${i}`);
        if (b) b.style.height = '6px';
      }
    };
  }, [evaluatingWord, completedWords]);

  const startRecording = (word: string) => {
    if (evaluatingWord || completedWords.has(word)) return;
    setEvaluatingWord(word);
    setEvalFeedback(prev => ({ ...prev, [word]: null }));
    setTranscripts(prev => ({ ...prev, [word]: "" }));
  };

  const handleGoBack = () => {
    if (!showCompletionScreen) {
      const confirmExit = window.confirm("Are you sure you want to leave? Your progress will not be saved.");
      if (!confirmExit) return;
    }
    navigate("/levels", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:bg-none dark:bg-[#0d141c]">
      <Confetti active={showConfetti} />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0d141c]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="rounded-full"
          >
            <Home className="w-5 h-5" />
          </Button>

          <h2 className="text-lg font-bold tracking-tight text-center flex-1" style={{ color: accent.primary }}>
            Voice Evaluation
          </h2>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShyTip(true)}
            className="rounded-full flex items-center gap-1.5 border-pink-200 dark:border-gray-700 hover:bg-pink-50 dark:hover:bg-pink-900/20 text-pink-500 font-medium text-xs px-3 py-1.5 shadow-sm"
          >
            <span>🗣️</span>
            <span className="hidden sm:inline">Shy Learner?</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {!(window as any).SpeechRecognition && !(window as any).webkitSpeechRecognition && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>Your browser doesn't support the Voice Recognition API. Please use Chrome or a modern mobile browser.</p>
          </div>
        )}

        {!showCompletionScreen ? (
          <>
            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-200/80 dark:bg-gray-800 rounded-full overflow-hidden mb-6 shadow-inner border border-gray-100 dark:border-gray-700/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${accent.primary}, ${accent.dark})`,
                }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key="list-phase"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-8"
              >
                <div className="space-y-3 bg-white/50 dark:bg-gray-800/50 p-4 rounded-3xl backdrop-blur-sm border-2 border-dashed border-gray-200 dark:border-gray-700 max-h-[60vh] overflow-y-auto">
                  {words.map((w) => {
                    const isDone = completedWords.has(w);
                    const isCurrent = evaluatingWord === w;
                    const feedback = evalFeedback[w];
                    const transcript = transcripts[w];

                    return (
                      <div key={w} className={`flex items-center justify-between p-4 rounded-2xl transition-all ${isDone ? 'bg-green-50 dark:bg-green-900/20' : 'bg-white dark:bg-gray-800'} shadow-sm border-2 ${isCurrent ? 'border-pink-400' : isDone ? 'border-green-200' : 'border-transparent'}`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                          <span className="text-3xl font-bold w-20 text-left tracking-widest uppercase" style={{ color: isDone ? '#58CC02' : accent.primary }}>{w}</span>
                          {feedback === 'correct' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-green-500 flex items-center gap-1 text-sm font-bold"><CheckCircle2 className="w-4 h-4" /> Correct!</motion.div>}
                          {feedback === 'close' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-blue-500 flex items-center gap-1 text-sm font-bold"><Sparkles className="w-4 h-4" /> Close enough!</motion.div>}
                          {feedback === 'wrong' && (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className={`flex items-center justify-center gap-1 font-bold text-sm text-red-500`}>
                              <AlertCircle className="w-4 h-4" /> Try again!
                            </motion.div>
                          )}
                          {isCurrent && transcript && (
                            <div className="p-1 bg-gray-200 rounded text-[10px] font-mono text-gray-700 mt-1 sm:mt-0">
                              Heard: {transcript}
                            </div>
                          )}
                          {isCurrent && !transcript && (
                            <div className="flex items-center gap-2 mt-1 sm:mt-0">
                              <span className="text-pink-500 text-sm font-bold animate-pulse">Listening...</span>
                              <div className="flex gap-1 items-center h-8 justify-center min-w-[50px]">
                                <div id="wave-bar-1" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                <div id="wave-bar-2" className="w-1.5 bg-pink-400 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                <div id="wave-bar-3" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                <div id="wave-bar-4" className="w-1.5 bg-pink-400 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                                <div id="wave-bar-5" className="w-1.5 bg-pink-500 rounded-full transition-all duration-75" style={{ height: '6px' }} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (isCurrent) {
                                setEvaluatingWord(null);
                              } else {
                                startRecording(w);
                              }
                            }}
                            disabled={(evaluatingWord !== null && !isCurrent) || isDone}
                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isDone ? 'bg-green-500 text-white shadow-none opacity-50 cursor-default' : isCurrent ? 'bg-red-500 text-white shadow-lg' : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md hover:scale-105 active:scale-95'}`}
                          >
                            {isCurrent && (
                              <>
                                <span className="absolute inset-0 rounded-xl bg-red-500/40 animate-ping" />
                                <span className="absolute -inset-1 rounded-xl bg-red-500/20 animate-pulse" />
                              </>
                            )}
                            <span className="relative z-10">
                              {isDone ? <CheckCircle2 className="w-6 h-6" /> : isCurrent ? <MicOff className="w-5 h-5 animate-bounce" /> : <Mic className="w-5 h-5" />}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                  Click the mic next to each word to practice its pronunciation
                </div>
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          /* All Done */
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block mb-6"
            >
              <Sparkles className="w-20 h-20 text-[#FFC800]" />
            </motion.div>
            <h3 className="text-3xl mb-4" style={{ color: accent.primary }}>
              Excellent Work!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              You completed {words.length} out of {words.length} words correctly!
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {words.map((word, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => playTTS(word)}
                  className="px-4 py-2.5 rounded-full text-white text-lg font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all hover:brightness-105 active:brightness-95 border-b-4 border-black/20"
                  style={{
                    background: `linear-gradient(135deg, ${accent.primary}, ${accent.dark})`,
                  }}
                >
                  <Volume2 className="w-5 h-5 text-white/90" />
                  <span>{word}</span>
                </motion.button>
              ))}
            </div>
            <Button
              disabled={isSaving}
              onClick={async () => {
                if (isSubPhase) {
                  if (onComplete) onComplete();
                  return;
                }

                setIsSaving(true);
                try {
                  const profileStr = localStorage.getItem("userProfile");
                  if (profileStr) {
                    const profile = JSON.parse(profileStr);
                    if (profile.id) {
                      await supabase.from("progress").insert({
                        student_id: profile.id,
                        level_id: levelId,
                        score: words.length
                      });
                    }
                  }
                } catch (err) {
                  console.error("Error saving progress:", err);
                }

                const completedLevels = JSON.parse(
                  localStorage.getItem("completedLevels") || "[]"
                );
                if (!completedLevels.includes(levelId)) {
                  completedLevels.push(levelId);
                  localStorage.setItem(
                    "completedLevels",
                    JSON.stringify(completedLevels)
                  );
                }
                setIsSaving(false);
                if (onComplete) {
                  onComplete();
                } else {
                  navigate("/levels");
                }
              }}
              size="lg"
              className="rounded-xl px-8 py-6 text-lg text-white"
              style={{
                background: `linear-gradient(135deg, ${accent.primary} 0%, ${accent.dark} 100%)`,
              }}
            >
              {onComplete ? <ArrowRight className="w-5 h-5 mr-2" /> : <Home className="w-5 h-5 mr-2" />}
              {isSaving ? "Saving..." : onComplete ? (isSubPhase ? "Next Challenge" : "Next Phase") : "Back to Levels"}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Shy Mode Tips Modal Overlay */}
      <AnimatePresence>
        {showShyTip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-pink-200 dark:border-gray-700 text-center"
            >
              <span className="text-4xl">🗣️✨</span>
              <h3 className="text-xl font-bold mt-3 mb-2 text-pink-500">Shy Learner Tips</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                If your child is speaking softly or feeling a bit shy, try these simple tips to boost voice recognition:
              </p>
              <div className="text-left space-y-3.5 text-sm text-gray-600 dark:text-gray-300 mb-6">
                <div className="flex gap-2.5">
                  <span className="text-base">📣</span>
                  <span><strong>Speak Closer:</strong> Gently show them how to speak directly into the microphone at the bottom of the device.</span>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-base">👐</span>
                  <span><strong>Cup the Mic:</strong> Cup your hands around the microphone port to act as a megaphone, focusing their soft voice into the sensor.</span>
                </div>
                <div className="flex gap-2.5">
                  <span className="text-base">⚙️</span>
                  <span><strong>Microphone Boost:</strong> Try raising your device's physical microphone gain in system sound settings.</span>
                </div>
              </div>
              <Button
                onClick={() => setShowShyTip(false)}
                className="w-full bg-gradient-to-br from-pink-500 to-rose-500 text-white font-bold rounded-2xl py-3 border-b-4 border-black/20"
              >
                Got it!
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
