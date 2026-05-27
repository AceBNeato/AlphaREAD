import { useEffect, useRef } from "react";

export function useAudioVisualizer(isMobile: boolean, isListening: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // We only connect to the microphone for the visualizer on desktop.
    // On mobile, getUserMedia can conflict with SpeechRecognition and Vosk.
    if (!isListening || isMobile || typeof window === "undefined") {
      cleanup();
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        micStreamRef.current = stream;
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioCtxRef.current = audioCtx;
          const analyserNode = audioCtx.createAnalyser();
          analyserRef.current = analyserNode;
          analyserNode.fftSize = 32;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyserNode);

          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }

          const bufferLength = analyserNode.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const checkVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            const limit = Math.min(6, bufferLength);
            for (let i = 0; i < limit; i++) {
              sum += dataArray[i];
            }
            const avg = sum / limit;
            const vol = Math.min(1, avg / 60);

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

            animationFrameRef.current = requestAnimationFrame(checkVolume);
          };
          animationFrameRef.current = requestAnimationFrame(checkVolume);
        }
      })
      .catch(err => {
        console.warn("Failed to initialize live voice visualizer:", err);
      });

    return () => {
      cleanup();
    };
  }, [isListening, isMobile]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    // reset visualizer levels
    for (let i = 1; i <= 5; i++) {
      const b = document.getElementById(`wave-bar-${i}`);
      if (b) b.style.height = '6px';
    }
  };
}
