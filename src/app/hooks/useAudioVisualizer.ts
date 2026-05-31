import { useEffect, useRef } from "react";

export function useAudioVisualizer(isMobile: boolean, isListening: boolean) {
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    if (!isListening || typeof window === "undefined") {
      cleanup();
      return;
    }

    // Simulate voice activity visually to prevent hardware microphone locks.
    // Calling getUserMedia twice (once for AI, once for visuals) causes Windows/Mobile drivers to crash.
    const simulateVolume = () => {
      phaseRef.current += 0.15;

      // Create a pulsating baseline with random noise to simulate natural speech
      const pulse = Math.sin(phaseRef.current) * 0.5 + 0.5; // 0 to 1
      const vol = Math.max(0.2, pulse * 0.7 + Math.random() * 0.3);

      const b1 = document.getElementById('wave-bar-1');
      const b2 = document.getElementById('wave-bar-2');
      const b3 = document.getElementById('wave-bar-3');
      const b4 = document.getElementById('wave-bar-4');
      const b5 = document.getElementById('wave-bar-5');

      if (b1 && b2 && b3 && b4 && b5) {
        b1.style.height = `${Math.max(6, vol * 24 + Math.random() * 4 * vol)}px`;
        b2.style.height = `${Math.max(6, vol * 32 + Math.random() * 6 * vol)}px`;
        b3.style.height = `${Math.max(6, vol * 40 + Math.random() * 8 * vol)}px`;
        b4.style.height = `${Math.max(6, vol * 28 + Math.random() * 5 * vol)}px`;
        b5.style.height = `${Math.max(6, vol * 20 + Math.random() * 4 * vol)}px`;
      }

      // Slower update rate looks more like a real speech envelope
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(simulateVolume);
      }, 50);
    };

    animationFrameRef.current = requestAnimationFrame(simulateVolume);

    return () => {
      cleanup();
    };
  }, [isListening]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Reset visualizer levels
    for (let i = 1; i <= 5; i++) {
      const b = document.getElementById(`wave-bar-${i}`);
      if (b) b.style.height = '6px';
    }
  };
}
