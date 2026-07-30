/**
 * Utility to standardize the text-to-speech voice across AlphabetGO.
 * Prioritizes Microsoft Zira (female) on Windows, and falls back to
 * high-quality female voices on macOS/iOS and Android.
 */

let availableVoices: SpeechSynthesisVoice[] = [];

export const initVoices = () => {
  if ('speechSynthesis' in window) {
    // Some browsers need this event to load voices
    window.speechSynthesis.onvoiceschanged = () => {
      availableVoices = window.speechSynthesis.getVoices();
    };
    // Others load it immediately
    availableVoices = window.speechSynthesis.getVoices();
  }
};

// Initialize early
if (typeof window !== "undefined") {
  initVoices();
}

export const stopTTS = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

export const playTTS = (text: string, rate: number = 0.9, pitch: number = 1.2) => {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = pitch;

  let voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    voices = availableVoices;
  }

  // Preferred lively female voices across platforms
  const preferredNames = [
    'google uk english female',
    'google us english',
    'zira',
    'samantha',
    'karen',
    'hazel',
    'catherine',
    'susan',
    'aria',
    'jenny',
    'sara'
  ];

  let selectedVoice = null;
  for (const name of preferredNames) {
    selectedVoice = voices.find(v => v.name.toLowerCase().includes(name));
    if (selectedVoice) break;
  }

  // If no preferred voice found, get any English voice that isn't a known male voice
  if (!selectedVoice) {
    selectedVoice = voices.find(v =>
      v.lang.startsWith('en') &&
      !v.name.toLowerCase().includes('david') &&
      !v.name.toLowerCase().includes('mark') &&
      !v.name.toLowerCase().includes('george') &&
      !v.name.toLowerCase().includes('brian') &&
      !v.name.toLowerCase().includes('james')
    );
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  window.speechSynthesis.speak(utterance);
};
