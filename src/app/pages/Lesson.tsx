import { useParams, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { useCurriculum } from "../hooks/useCurriculum";
import { LevelPairs } from "../components/LevelPairs";
import { LevelSyllablesMaster } from "../components/LevelSyllablesMaster";
import { LevelCVCMaster } from "../components/LevelCVCMaster";
import { LevelVoiceEvaluation } from "../components/LevelVoiceEvaluation";
import { LevelLetterNames } from "../components/LevelLetterNames";
import { LevelLongVowels } from "../components/LevelLongVowels";
import { LevelCVCSentences } from "../components/LevelCVCSentences";
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
  const { levels } = useCurriculum();

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

  let LevelComponent = null;

  if (level.type === "combined-cvc") {
    LevelComponent = <LevelCVCMaster levelId={level.id} accent={accent} />;
  } else {
    switch (level.type) {
      case "pairs":
        LevelComponent = <LevelPairs levelId={level.id} accent={accent} />;
        break;
      case "syllable-builder":
        LevelComponent = <LevelSyllablesMaster levelId={level.id} accent={accent} />;
        break;
      case "voice-evaluation":
        LevelComponent = <LevelVoiceEvaluation levelId={level.id} accent={accent} />;
        break;
      case "letter-names":
        LevelComponent = <LevelLetterNames levelId={level.id} accent={accent} />;
        break;
      case "long-vowels":
        LevelComponent = <LevelLongVowels levelId={level.id} accent={accent} />;
        break;
      case "sentences":
        LevelComponent = <LevelCVCSentences levelId={level.id} accent={accent} />;
        break;
      case "blends":
        LevelComponent = <LevelBlendsMaster levelId={level.id} accent={accent} />;
        break;
    }
  }

  return (
    <>
      {LevelComponent}
    </>
  );
}