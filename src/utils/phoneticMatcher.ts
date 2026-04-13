/**
 * Browser-compatible phonetic matching for mobile apps
 * Implements Metaphone algorithm and Levenshtein distance
 */

export interface PhoneticMatch {
  match: string;
  score: number; // 0-1, higher is better
  distance: number;
}

/**
 * Simple Metaphone algorithm implementation
 * Converts words to their phonetic representation
 */
function metaphone(word: string): string {
  if (!word) return '';
  
  word = word.toUpperCase();
  let result = '';
  let i = 0;
  
  while (i < word.length) {
    const char = word[i];
    const nextChar = word[i + 1];
    
    // Skip initial vowels unless at start
    if (i === 0 && 'AEIOU'.includes(char)) {
      result += char;
      i++;
      continue;
    }
    
    // Skip silent letters
    if (char === 'H' && i > 0) {
      // H after vowel is silent, after consonant it's pronounced
      const prevChar = word[i - 1];
      if ('AEIOU'.includes(prevChar)) {
        i++;
        continue;
      }
    }
    
    if (char === 'W' && nextChar === 'A') {
      result += 'W';
      i += 2;
      continue;
    }
    
    if (char === 'X') {
      result += 'KS';
      i++;
      continue;
    }
    
    if (char === 'C' && nextChar === 'H') {
      result += 'CH';
      i += 2;
      continue;
    }
    
    if (char === 'C' && 'EIY'.includes(nextChar)) {
      result += 'S';
      i++;
      continue;
    }
    
    if (char === 'C') {
      result += 'K';
      i++;
      continue;
    }
    
    if (char === 'G' && nextChar === 'H') {
      result += 'GH';
      i += 2;
      continue;
    }
    
    if (char === 'G' && 'EIY'.includes(nextChar)) {
      result += 'J';
      i++;
      continue;
    }
    
    if (char === 'G') {
      result += 'K';
      i++;
      continue;
    }
    
    if (char === 'S' && nextChar === 'H') {
      result += 'SH';
      i += 2;
      continue;
    }
    
    if (char === 'T' && nextChar === 'H') {
      result += 'TH';
      i += 2;
      continue;
    }
    
    if (char === 'P' && nextChar === 'H') {
      result += 'F';
      i += 2;
      continue;
    }
    
    if (char === 'Q') {
      result += 'K';
      i++;
      continue;
    }
    
    if (char === 'Y' && 'AEIOU'.includes(nextChar)) {
      result += 'Y';
      i++;
      continue;
    }
    
    if (char === 'Y' && i > 0) {
      const prevChar = word[i - 1];
      if ('AEIOU'.includes(prevChar)) {
        result += 'Y';
        i++;
        continue;
      }
    }
    
    // Skip vowels (already handled at start)
    if ('AEIOU'.includes(char)) {
      i++;
      continue;
    }
    
    result += char;
    i++;
  }
  
  return result;
}

/**
 * Levenshtein distance algorithm
 * Returns the minimum number of edits to transform one string into another
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings
 * Returns 0-1 where 1 is perfect match
 */
function similarityScore(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(a, b);
  return 1 - (distance / maxLen);
}

/**
 * Find the best phonetic match for a transcript among target words
 */
export function findBestPhoneticMatch(
  transcript: string,
  targetWords: string[]
): PhoneticMatch | null {
  if (!transcript || targetWords.length === 0) return null;
  
  const transcriptPhonetic = metaphone(transcript.trim().toUpperCase());
  const transcriptClean = transcript.trim().toUpperCase();
  
  let bestMatch: PhoneticMatch | null = null;
  
  for (const target of targetWords) {
    const targetPhonetic = metaphone(target.toUpperCase());
    const targetClean = target.toUpperCase();
    
    // Compare phonetic representations
    const phoneticScore = similarityScore(transcriptPhonetic, targetPhonetic);
    
    // Compare exact strings (for close matches)
    const exactScore = similarityScore(transcriptClean, targetClean);
    
    // Check for substring matches
    let substringBonus = 0;
    if (transcriptClean.includes(targetClean) || targetClean.includes(transcriptClean)) {
      substringBonus = 0.3;
    }
    
    // Combined score: phonetic matching is most important for accents
    const combinedScore = (phoneticScore * 0.6) + (exactScore * 0.2) + substringBonus;
    
    if (!bestMatch || combinedScore > bestMatch.score) {
      bestMatch = {
        match: target,
        score: Math.min(combinedScore, 1),
        distance: levenshteinDistance(transcriptClean, targetClean),
      };
    }
  }
  
  return bestMatch;
}

/**
 * Check if transcript matches any target word with given threshold
 */
export function isPhoneticMatch(
  transcript: string,
  targetWords: string[],
  threshold: number = 0.6
): boolean {
  const match = findBestPhoneticMatch(transcript, targetWords);
  return match !== null && match.score >= threshold;
}

/**
 * Get all matches above threshold, sorted by score
 */
export function findAllPhoneticMatches(
  transcript: string,
  targetWords: string[],
  threshold: number = 0.5
): PhoneticMatch[] {
  const matches: PhoneticMatch[] = [];
  
  for (const target of targetWords) {
    const result = findBestPhoneticMatch(transcript, [target]);
    if (result && result.score >= threshold) {
      matches.push(result);
    }
  }
  
  return matches.sort((a, b) => b.score - a.score);
}
