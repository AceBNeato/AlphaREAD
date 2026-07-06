import { useLanguage } from "../context/LanguageContext";
import * as englishData from "../data/levels";
import * as tagalogData from "../data/tagalog_levels";
import { BLENDS_DATA as englishBlendsData, BLENDS_SENTENCES as englishBlendsSentences } from "../data/blends";
import { Level, Letter, SyllablePattern, SyllableTarget } from "../data/levels";

export interface Curriculum {
  levels: Level[];
  allLetters: Letter[];
  getPhoneticPronunciation: (syllable: string, pattern: SyllablePattern) => string;
  getLetterPhonetic: (letter: string) => string;
  generateLetterPairs: () => [string, string][];
  generateSyllableTargets: (patterns: SyllablePattern[], count?: number) => SyllableTarget[];
  VOWELS: string[];
  CONSONANTS: string[];
  sentences: string[];
  CVC_WORDS: string[];
  BLENDS_DATA: any;
  BLENDS_SENTENCES: string[];
}

export function useCurriculum(): Curriculum {
  const { language } = useLanguage();

  if (language === "tl") {
    return {
      levels: tagalogData.tagalogLevels,
      allLetters: tagalogData.allTagalogLetters,
      getPhoneticPronunciation: (syl: string) => syl,
      getLetterPhonetic: tagalogData.getTagalogPhonetic,
      generateLetterPairs: tagalogData.generateTagalogLetterPairs,
      generateSyllableTargets: tagalogData.generateTagalogSyllableTargets,
      VOWELS: tagalogData.TAGALOG_VOWELS,
      CONSONANTS: tagalogData.TAGALOG_CONSONANTS,
      sentences: tagalogData.TAGALOG_SENTENCES,
      CVC_WORDS: tagalogData.TAGALOG_WORDS,
      BLENDS_DATA: tagalogData.TAGALOG_BLENDS_DATA,
      BLENDS_SENTENCES: tagalogData.TAGALOG_BLENDS_SENTENCES,
    };
  }

  return {
    levels: englishData.levels,
    allLetters: englishData.allLetters,
    getPhoneticPronunciation: englishData.getPhoneticPronunciation,
    getLetterPhonetic: englishData.getLetterPhonetic,
    generateLetterPairs: englishData.generateLetterPairs,
    generateSyllableTargets: englishData.generateSyllableTargets,
    VOWELS: englishData.VOWELS,
    CONSONANTS: englishData.CONSONANTS,
    sentences: englishData.CVC_SENTENCES,
    CVC_WORDS: englishData.CVC_WORDS,
    BLENDS_DATA: englishBlendsData,
    BLENDS_SENTENCES: englishBlendsSentences,
  };
}
