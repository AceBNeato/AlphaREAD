import { useEffect, useRef } from "react";

interface AudioVisualizerOptions {
  isListening: boolean;
  barsRef: React.RefObject<(HTMLDivElement | null)[]>;
}

export function useAudioVisualizer({ isListening, barsRef }: AudioVisualizerOptions) {
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!isListening || typeof window === "undefined") {
      cleanup();
      return;
    }

    const simulateVolume = (timestamp: number) => {
      if (timestamp - lastUpdateRef.current > 50) {
        phaseRef.current += 0.15;
        lastUpdateRef.current = timestamp;

        const pulse = Math.sin(phaseRef.current) * 0.5 + 0.5;
        const vol = Math.max(0.2, pulse * 0.7 + Math.random() * 0.3);

        const multipliers = [24, 32, 40, 28, 20];
        const randomSpikes = [4, 6, 8, 5, 4];

        if (barsRef.current) {
          barsRef.current.forEach((bar, index) => {
            if (bar) {
              const height = Math.max(6, vol * multipliers[index] + Math.random() * randomSpikes[index] * vol);
              bar.style.height = `${height}px`;
            }
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(simulateVolume);
    };

    animationFrameRef.current = requestAnimationFrame(simulateVolume);

    return () => cleanup();
  }, [isListening, barsRef]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (barsRef.current) {
      barsRef.current.forEach((bar) => {
        if (bar) bar.style.height = '6px';
      });
    }
  };
}
