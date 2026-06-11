// Shared sound effects utility for AlphabetGO
// All sounds use CDN URLs with graceful fallback

const SFX_URLS = {
  click:    "https://assets.mixkit.co/active_storage/sfx/2571/2571-84.wav",
  correct:  "https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav",
  wrong:    "https://assets.mixkit.co/active_storage/sfx/2101/2101-84.wav",
  complete: "https://assets.mixkit.co/active_storage/sfx/1362/1362-84.wav",
} as const;

export type SoundType = keyof typeof SFX_URLS;

export function playSound(type: SoundType, volume = 0.4) {
  try {
    const audio = new Audio(SFX_URLS[type]);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (_) {}
}
