import { useRef } from 'react';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';

interface AudioVisualizerProps {
  isListening: boolean;
  isMobile?: boolean;
}

export function AudioVisualizer({ isListening, isMobile = false }: AudioVisualizerProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Only turn on the JS loop if we are NOT on mobile AND listening
  useAudioVisualizer({ isListening: !isMobile && isListening, barsRef });

  // Mobile View: Pure CSS Keyframe Animations
  if (isMobile) {
    const mobileBars = [
      { height: '16px', delay: '0ms', color: 'bg-pink-500' },
      { height: '22px', delay: '100ms', color: 'bg-pink-400' },
      { height: '28px', delay: '200ms', color: 'bg-pink-500' },
      { height: '22px', delay: '300ms', color: 'bg-pink-400' },
      { height: '16px', delay: '400ms', color: 'bg-pink-500' },
    ];

    return (
      <div className="flex items-center justify-center gap-1 h-8">
        {mobileBars.map((bar, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full ${bar.color}`}
            style={{
              // Fallback height when idle, or baseline height when moving
              height: isListening ? bar.height : '6px',
              // Only animate when actively listening
              animation: isListening
                ? `wave 0.8s ease-in-out infinite ${bar.delay}`
                : 'none',
              transition: 'height 0.2s ease'
            }}
          />
        ))}
      </div>
    );
  }

  // Desktop View: High-fidelity requestAnimationFrame Loop
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          ref={(el) => { barsRef.current[index] = el; }}
          className={`w-1.5 rounded-full transition-all duration-75 ${index % 2 === 0 ? 'bg-pink-500' : 'bg-pink-400'
            }`}
          style={{ height: '6px' }}
        />
      ))}
    </div>
  );
}
