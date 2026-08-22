// Shared sound effects utility for AlphabetGO using Web Audio API
// This avoids expiring CDN links and works perfectly offline with zero latency!

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => { });
  }
  return audioCtx;
}

export type SoundType = "click" | "correct" | "wrong" | "complete" | "mic";

let currentAudio: HTMLAudioElement | null = null;

export function stopExclusiveAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function playExclusiveAudio(path: string) {
  return new Promise<void>((resolve, reject) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      currentAudio = new Audio(path);
      currentAudio.play()
        .then(() => resolve())
        .catch((err) => {
          if (err.name === "AbortError") {
            return resolve();
          }
          console.error("Audio playback failed:", err);
          reject(err);
        });
    } catch (err) {
      console.error("Audio instantiation failed:", err);
      reject(err);
    }
  });
}

export function playSound(type: SoundType, volume = 0.4) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
    else if (type === "correct") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.02);
      gainNode.gain.setValueAtTime(volume, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
    else if (type === "wrong") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.3);
      gainNode.gain.setValueAtTime(volume * 0.8, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
    else if (type === "complete") {
      osc.type = "square";
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(volume * 0.15, now + 0.05);

      osc.frequency.setValueAtTime(261.63, now);
      osc.frequency.setValueAtTime(329.63, now + 0.15);
      osc.frequency.setValueAtTime(392.00, now + 0.3);
      osc.frequency.setValueAtTime(523.25, now + 0.45);

      gainNode.gain.setValueAtTime(volume * 0.15, now + 0.45);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      osc.start(now);
      osc.stop(now + 1.2);
    }
    else if (type === "mic") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(volume * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      osc.frequency.setValueAtTime(1200, now + 0.15);
      gainNode.gain.setValueAtTime(volume * 0.3, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    console.error("Audio playback failed:", err);
  }
}
