import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  targetX: number;
  targetY: number;
  duration: number;
}

export function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const colors = ["#FF4B8A", "#FF9600", "#58CC02", "#1CB0F6", "#CE82FF", "#FFC800"];
    const temp: Particle[] = [];
    const count = 100;
    const leftX = 20;
    const rightX = window.innerWidth - 20;
    const startY = window.innerHeight * 0.8;

    for (let i = 0; i < count; i++) {
      const isLeft = i < count / 2;
      const startX = isLeft ? leftX : rightX;
      
      // Left cannon shoots up-right (-15 to -75 degrees)
      // Right cannon shoots up-left (-105 to -165 degrees)
      const angle = isLeft
        ? -(Math.PI / 12 + Math.random() * (Math.PI / 3))
        : -(Math.PI * 7 / 12 + Math.random() * (Math.PI / 3));

      const velocity = Math.random() * 350 + 250;
      
      temp.push({
        id: i,
        x: startX,
        y: startY,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 9 + 7,
        targetX: startX + Math.cos(angle) * velocity,
        targetY: startY + Math.sin(angle) * velocity + 200, // simulated gravity pull down
        duration: Math.random() * 1.5 + 1.0,
      });
    }

    setParticles(temp);
  }, [active]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {active &&
          particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: p.x, y: p.y, scale: 0, rotate: 0 }}
              animate={{
                x: [p.x, p.targetX],
                y: [p.y, p.targetY],
                scale: [0, 1.5, 1, 0],
                rotate: [0, Math.random() * 720 - 360],
              }}
              transition={{
                duration: p.duration,
                ease: "easeOut",
              }}
              className="absolute rounded-sm shadow-md"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
              }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
