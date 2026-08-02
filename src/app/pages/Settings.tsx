import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Volume2 } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { levels } from "../data/levels";
import { useProgress } from "../hooks/useProgress";

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

interface UserProfile {
  name: string;
  avatar: string;
  accent: string;
  createdAt: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedAccent, setSelectedAccent] = useState("US");
  const { completedLevels } = useProgress();

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (!storedProfile) {
      navigate("/", { replace: true });
      return;
    }
    const profileData = JSON.parse(storedProfile);
    setProfile(profileData);
    setSelectedAccent(profileData.accent || "US");
  }, [navigate]);

  const handleAccentChange = (accentCode: string) => {
    setSelectedAccent(accentCode);

    if (profile) {
      const updatedProfile = { ...profile, accent: accentCode };
      setProfile(updatedProfile);
      localStorage.setItem("userProfile", JSON.stringify(updatedProfile));
    }
  };

  if (!profile) return null;

  const accuracy = completedLevels.length > 0
    ? Math.round((completedLevels.length / levels.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:bg-none dark:bg-[#0d141c]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl text-gray-800 dark:text-gray-100">
              Settings
            </h1>
          </div>
          <ThemeToggle />
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#58CC02] to-[#1CB0F6] flex items-center justify-center text-4xl">
              {profile.avatar}
            </div>
            <div>
              <h2 className="text-2xl text-gray-800 dark:text-gray-100">
                {profile.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Accuracy: {accuracy}%
              </p>
            </div>
          </div>
        </div>

        {/* Accent Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="w-6 h-6 text-[#58CC02]" />
            <h3 className="text-xl text-gray-800 dark:text-gray-100">
              Accent Selection
            </h3>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Choose your accent to improve speech recognition accuracy
          </p>

          <div className="space-y-3">
            {ACCENTS.map((accent) => (
              <button
                key={accent.code}
                onClick={() => handleAccentChange(accent.code)}
                className={`w-full px-6 py-4 rounded-2xl flex items-center gap-3 transition-all ${
                  selectedAccent === accent.code
                    ? "bg-[#e8f9d4] dark:bg-green-900/30 ring-3 ring-[#58CC02]"
                    : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <span className="text-gray-600 dark:text-gray-300 font-medium min-w-[2.5rem]">
                  {accent.code}
                </span>
                <span className="text-gray-800 dark:text-gray-100">
                  {accent.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
