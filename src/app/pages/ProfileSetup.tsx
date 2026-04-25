import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { ArrowLeft, User } from "lucide-react";

const AVATARS = ["👦", "👧", "😊", "😃", "😄", "👶", "🧑‍🦱", "👱", "🧒", "👨‍🦰"];

const ACCENTS = [
  { code: "US", label: "American English" },
  { code: "GB", label: "British English" },
  { code: "AU", label: "Australian English" },
  { code: "IN", label: "Indian English" },
  { code: "NG", label: "Nigerian English" },
  { code: "PH", label: "Filipino English" },
  { code: "CA", label: "Canadian English" },
  { code: "NZ", label: "New Zealand English" },
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [accent, setAccent] = useState("US");

  const handleNext = () => {
    if (step === 1 && name.trim()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleSkip = () => {
    if (step === 1) {
      setName("student");
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate("/");
    }
  };

  const handleFinish = () => {
    const profile = {
      name: name.trim(),
      avatar,
      accent,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("userProfile", JSON.stringify(profile));
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl text-gray-800 dark:text-gray-100">
            Create Profile
          </h1>
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${i === step
                  ? "w-12 bg-[#58CC02]"
                  : i < step
                    ? "w-8 bg-[#58CC02]"
                    : "w-8 bg-gray-300 dark:bg-gray-600"
                  }`}
              />
            ))}
          </div>

          {/* Step 1: Name */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#58CC02] to-[#1CB0F6] flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl mb-2 text-gray-800 dark:text-gray-100">
                What's your name?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Enter your name to personalize your learning
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-6 py-4 rounded-2xl border-3 border-[#58CC02] text-lg focus:outline-none focus:ring-2 focus:ring-[#58CC02] bg-white dark:bg-gray-700 dark:text-white mb-6"
                autoFocus
              />
              <div className="flex gap-4">
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  size="lg"
                  className="flex-1 py-6 text-lg rounded-2xl"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!name.trim()}
                  size="lg"
                  className="flex-1 py-6 text-lg rounded-2xl bg-[#58CC02] hover:bg-[#46a302] text-white disabled:opacity-40"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Avatar */}
          {step === 2 && (
            <div className="text-center">
              <h2 className="text-3xl mb-2 text-gray-800 dark:text-gray-100">
                Choose your avatar
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Pick an avatar that represents you
              </p>
              <div className="grid grid-cols-5 gap-4 mb-8">
                {AVATARS.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAvatar(emoji)}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-5xl transition-all hover:scale-105 ${avatar === emoji
                      ? "bg-[#e8f9d4] dark:bg-green-900/30 ring-4 ring-[#58CC02]"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  size="lg"
                  className="flex-1 py-6 text-lg rounded-2xl"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="flex-1 py-6 text-lg rounded-2xl bg-[#58CC02] hover:bg-[#46a302] text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Accent */}
          {step === 3 && (
            <div className="text-center">
              <h2 className="text-3xl mb-2 text-gray-800 dark:text-gray-100">
                Select your accent
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                This helps us understand your speech better
              </p>
              <div className="space-y-3 mb-8 max-h-96 overflow-y-auto">
                {ACCENTS.map((acc) => (
                  <button
                    key={acc.code}
                    onClick={() => setAccent(acc.code)}
                    className={`w-full px-6 py-4 rounded-2xl flex items-center justify-between transition-all ${accent === acc.code
                      ? "bg-[#e8f9d4] dark:bg-green-900/30 ring-2 ring-[#58CC02]"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">
                        {acc.code}
                      </span>
                      <span className="text-gray-800 dark:text-gray-100">
                        {acc.label}
                      </span>
                    </div>
                    {accent === acc.code && (
                      <span className="text-[#58CC02] text-xl">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  size="lg"
                  className="flex-1 py-6 text-lg rounded-2xl"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  size="lg"
                  className="flex-1 py-6 text-lg rounded-2xl bg-[#58CC02] hover:bg-[#46a302] text-white"
                >
                  Start Learning
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
