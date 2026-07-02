import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "./button";
import { Confetti } from "./Confetti";
import { useNavigate } from "react-router";

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

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      navigate("/levels");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c] flex flex-col items-center justify-center p-4">
      <Confetti active={true} />
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12 max-w-lg w-full mx-auto flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-48 h-48 relative flex items-center justify-center mb-6"
        >
          <div className="absolute inset-0 bg-yellow-400/20 dark:bg-yellow-400/10 rounded-full blur-xl animate-pulse" />
          <motion.img
            src={`${(import.meta as any).env.BASE_URL}dragon.png`}
            alt="Mascot"
            className="w-44 h-44 object-contain relative z-10"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />
        </motion.div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 drop-shadow-sm mb-4">
          {title}
        </h1>
        <div className="text-gray-600 dark:text-gray-300 text-lg font-medium leading-relaxed max-w-sm mx-auto mb-8">
          {subtitle}
        </div>
        <Button
          onClick={handleContinue}
          className="w-full sm:w-auto px-10 py-6 rounded-2xl font-bold text-white text-lg shadow-lg border-b-[4px] border-[#3c8c01] hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #58cc02 0%, #46a302 100%)' }}
        >
          {continueText} <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </div>
  );
}
