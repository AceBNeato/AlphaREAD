import { useParams, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { levels } from "../data/levels";
import { LevelPairs } from "../components/LevelPairs";
import { LevelSounds } from "../components/LevelSounds";
import { LevelSyllableBuilder } from "../components/LevelSyllableBuilder";
import { LevelSyllableReader } from "../components/LevelSyllableReader";

const levelAccents = [
  { primary: "#58CC02", dark: "#46a302", lightBg: "#e8f9d4" },
  { primary: "#1CB0F6", dark: "#0a8ed4", lightBg: "#d4f0fd" },
  { primary: "#FF9600", dark: "#e08600", lightBg: "#fff0d4" },
  { primary: "#CE82FF", dark: "#a855f7", lightBg: "#f3e8ff" },
  { primary: "#FF4B8A", dark: "#e0336e", lightBg: "#ffe4ef" },
  { primary: "#8B5CF6", dark: "#7c3aed", lightBg: "#f3e8ff" }, // Purple for level 6
];

export default function Lesson() {
  const { levelId } = useParams();
  const navigate = useNavigate();

  const level = levels.find((l) => l.id === Number(levelId));
  const accent = levelAccents[(Number(levelId) - 1) % levelAccents.length];

  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 mb-4">
            Level not found
          </h2>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  switch (level.type) {
    case "pairs":
      return <LevelPairs levelId={level.id} accent={accent} />;
    case "sounds":
      return <LevelSounds levelId={level.id} accent={accent} />;
    case "syllable-builder":
      return (
        <LevelSyllableBuilder
          levelId={level.id}
          patterns={level.patterns || ["CV"]}
          accent={accent}
        />
      );
    case "syllable-reader":
      return (
        <LevelSyllableReader
          levelId={level.id}
          patterns={level.patterns || ["CV"]}
        />
      );
    default:
      return null;
  }
}
