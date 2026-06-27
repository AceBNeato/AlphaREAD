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
      case "blends":
        LevelComponent = <LevelBlendsMaster levelId={level.id} accent={accent} />;
        break;
    }
  }

  // To test levels 3-6 while in development, comment out the overlay below!
  const isUnderConstruction = level.id >= 3 && level.id <= 6;

  return (
    <>
      {LevelComponent}
      {/* 
        NOTE: Comment out this entire block to work on Levels 3-6 without the overlay 
      */}
      {isUnderConstruction && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border-4 border-yellow-400">
            <div className="text-yellow-500 mb-4 flex justify-center">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100 mb-2">Under Construction</h2>
            <p className="text-gray-600 dark:text-gray-300 font-medium mb-6">
              This level is currently being developed. Check back soon!
            </p>
            <Button onClick={() => navigate('/levels')} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl py-6 text-lg border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 transition-all">
              Back to Levels
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

