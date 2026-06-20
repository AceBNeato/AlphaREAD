import { useParams, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { levels } from "../data/levels";
import { LevelPairs } from "../components/LevelPairs";
import { LevelSyllableBuilder } from "../components/LevelSyllableBuilder";
import { LevelSyllablesMaster } from "../components/LevelSyllablesMaster";
import { LevelCVCMaster } from "../components/LevelCVCMaster";
import { LevelVoiceEvaluation } from "../components/LevelVoiceEvaluation";
import { LevelLetterNames } from "../components/LevelLetterNames";
import { LevelLongVowels } from "../components/LevelLongVowels";
import { LevelBlendsMaster } from "../components/LevelBlendsMaster";

const levelAccents = [
  { primary: "#58CC02", dark: "#46a302", lightBg: "#e8f9d4" },
  { primary: "#1CB0F6", dark: "#0a8ed4", lightBg: "#d4f0fd" },
  { primary: "#FF9600", dark: "#e08600", lightBg: "#fff0d4" },
  { primary: "#CE82FF", dark: "#a855f7", lightBg: "#f3e8ff" },
  { primary: "#FF4B8A", dark: "#e0336e", lightBg: "#ffe4ef" },
  { primary: "#7C3AED", dark: "#6d28d9", lightBg: "#f3e8ff" },
];

export default function Lesson() {
  const { levelId } = useParams();
  const navigate = useNavigate();

  const level = levels.find((l) => l.id === Number(levelId));
  const accent = levelAccents[(Number(levelId) - 1) % levelAccents.length];

  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:bg-none dark:bg-[#0d141c]">
        <div className="text-center">
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 mb-4">
            Level not found
          </h2>
          <Button onClick={() => navigate("/levels")}>Go to Levels</Button>
        </div>
      </div>
    );
  }

  // Logic for Level 3: Combined CVC Master
  if (level.type === "combined-cvc") {
    return <LevelCVCMaster levelId={level.id} accent={accent} />;
  }

  switch (level.type) {
    case "pairs":
      return <LevelPairs levelId={level.id} accent={accent} />;
    case "syllable-builder":
      return <LevelSyllablesMaster levelId={level.id} accent={accent} />;
    case "voice-evaluation":
      return <LevelVoiceEvaluation levelId={level.id} accent={accent} />;
    case "letter-names":
      return <LevelLetterNames levelId={level.id} accent={accent} />;
    case "long-vowels":
      return <LevelLongVowels levelId={level.id} accent={accent} />;
    case "blends":
      return <LevelBlendsMaster levelId={level.id} accent={accent} />;
    default:
      return null;
  }
}

