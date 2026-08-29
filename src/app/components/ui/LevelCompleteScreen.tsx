import React, { useEffect } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { PushableButton } from "./PushableButton";
import { Confetti } from "./Confetti";
import { useNavigate } from "react-router";
import { playSound } from "../../utils/soundEffects";

interface LevelCompleteScreenProps {
  title?: string;
  subtitle: React.ReactNode;
  onContinue?: () => void;
  continueText?: string;
}

export function LevelCompleteScreen({
  title = "Level Complete!",
  subtitle,
  onContinue,
  continueText = "Keep Going!"
}: LevelCompleteScreenProps) {
  const navigate = useNavigate();

  useEffect(() => {
    playSound("complete", 0.5);
  }, []);

  const handleContinue = () => {
    playSound("click", 0.2);
    if (onContinue) {
      onContinue();
    } else {
      navigate("/levels");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] flex flex-col items-center justify-center p-4 selection:bg-none">
      <Confetti active={true} />
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center py-8 max-w-lg w-full mx-auto flex flex-col items-center"
      >
        {/* Mascot Section */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.15, 1] }}
          transition={{ delay: 0.15, duration: 0.6, ease: "backOut" }}
          className="w-52 h-52 sm:w-60 sm:h-60 relative flex items-center justify-center mb-6"
        >
          {/* Glowing background */}
          <div className="absolute inset-0 bg-yellow-400/25 dark:bg-yellow-400/15 rounded-full blur-2xl animate-pulse" />
          <motion.img
            src={`${import.meta.env.BASE_URL}elephant.png`}
            alt="Elephant Mascot"
            className="w-48 h-48 sm:w-56 sm:h-56 object-contain relative z-10 drop-shadow-xl"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
          />
        </motion.div>

        <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 drop-shadow-sm mb-3">
          {title}
        </h1>
        <div className="text-gray-600 dark:text-gray-300 text-lg font-medium leading-relaxed max-w-sm mx-auto mb-8">
          {subtitle}
        </div>

        <PushableButton
          onClick={handleContinue}
          className="w-full sm:w-auto min-w-[240px]"
          frontClassName="bg-gradient-to-r from-[#58cc02] to-[#46a302] text-white py-4 px-10 text-lg sm:text-xl font-black flex items-center justify-center gap-2"
          edgeClassName="bg-[#3c8c01]"
        >
          <span>{continueText}</span>
          <ArrowRight className="w-6 h-6 stroke-[3]" />
        </PushableButton>
      </motion.div>
    </div>
  );
}

