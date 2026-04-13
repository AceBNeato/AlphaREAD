
// Audio cache to avoid redundant loads
const audioCache = new Map<string, HTMLAudioElement>();

// Map letters to their corresponding audio files
const letterAudioMap: Record<string, string> = {
  'A': '/audio/alphasounds-a.mp3',
  'B': '/audio/alphasounds-b.mp3',
  'C': '/audio/alphasounds-c.mp3',
  'D': '/audio/alphasounds-d.mp3',
  'E': '/audio/alphasounds-e.mp3',
  'F': '/audio/alphasounds-f.mp3',
  'G': '/audio/alphasounds-g.mp3',
  'H': '/audio/alphasounds-h.mp3',
  'I': '/audio/alphasounds-i.mp3',
  'J': '/audio/alphasounds-j.mp3',
  'K': '/audio/alphasounds-k.mp3',
  'L': '/audio/alphasounds-l.mp3',
  'M': '/audio/alphasounds-m.mp3',
  'N': '/audio/alphasounds-n.mp3',
  'O': '/audio/alphasounds-o.mp3',
  'P': '/audio/alphasounds-p-2.mp3',
  'Q': '/audio/alphasounds-q.mp3',
  'R': '/audio/alphasounds-r.mp3',
  'S': '/audio/alphasounds-s.mp3',
  'T': '/audio/alphasounds-t.mp3',
  'U': '/audio/alphasounds-u.mp3',
  'V': '/audio/alphasounds-v.mp3',
  'W': '/audio/alphasounds-w.mp3',
  'X': '/audio/alphasounds-x.mp3',
  'Y': '/audio/alphasounds-y.mp3',
  'Z': '/audio/alphasounds-z.mp3',
};

/**
 * Plays local audio file for a letter
 * @param text - The letter or text to play
 * @param onStart - Callback when audio starts playing
 * @param onEnd - Callback when audio finishes playing
 * @returns Promise that resolves when audio completes
 */
export async function playElevenLabsAudio(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  try {
    // Extract the first letter if it's a phonetic string
    const letter = text.toUpperCase().charAt(0);
    
    // Check cache first
    let audio = audioCache.get(letter);

    if (!audio) {
      // Get the audio file path for this letter
      const audioPath = letterAudioMap[letter];
      
      if (!audioPath) {
        throw new Error(`No audio file found for letter: ${letter}`);
      }

      // Create new audio element
      audio = new Audio(audioPath);
      
      // Cache the audio element
      audioCache.set(letter, audio);
    }

    // Reset audio to start if it was played before
    audio.currentTime = 0;
    
    if (onStart) {
      audio.addEventListener('play', onStart, { once: true });
    }
    
    if (onEnd) {
      audio.addEventListener('ended', onEnd, { once: true });
    }

    await audio.play();
  } catch (error) {
    console.error('Error playing local audio:', error);
    if (onEnd) onEnd(); // Still call onEnd to reset UI state
    throw error;
  }
}

/**
 * Clears the audio cache (useful for memory management)
 */
export function clearAudioCache(): void {
  audioCache.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
  audioCache.clear();
}