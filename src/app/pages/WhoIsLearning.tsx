import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Sparkles, Users, Settings, ChevronRight, Lock } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { levels } from "../data/levels";

interface UserProfile {
  name: string;
  avatar: string;
  accent: string;
  createdAt: string;
}

export default function WhoIsLearning() {
  const navigate = useNavigate();
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(null);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [showProfileAlert, setShowProfileAlert] = useState(false);

  useEffect(() => {
    const profile = localStorage.getItem("userProfile");
    if (profile) {
      setExistingProfile(JSON.parse(profile));
      const completed = JSON.parse(localStorage.getItem("completedLevels") || "[]");
      setCompletedLevels(completed);
    }
  }, []);

  const handleSelectProfile = () => {
    navigate("/dashboard");
  };

  const handleSettingsClick = () => {
    if (!existingProfile) {
      setShowProfileAlert(true);
    } else {
      navigate("/settings");
    }
  };

  const currentLevel = existingProfile
    ? levels.find((level) => !completedLevels.includes(level.id))?.id || levels.length
    : 0;

  const accuracy = existingProfile && completedLevels.length > 0
    ? Math.round((completedLevels.length / levels.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:bg-none dark:bg-[#0d141c]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* Header */}
        <header className="flex items-center gap-4 mb-12">
          <div className="p-4 rounded-2xl shadow-lg bg-gradient-to-br from-[#58CC02] to-[#46a302]">
            <Sparkles className="w-10 h-10 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-4xl">
              <span className="text-[#58CC02]">Alphabet</span>{" "}
              <span className="text-[#1CB0F6]">GO!</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Master the alphabet through fun learning
            </p>
          </div>
        </header>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-12 mb-8">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-[#58CC02] to-[#1CB0F6] flex items-center justify-center">
              <Users className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-4xl mb-4 text-gray-800 dark:text-gray-100">
              Who's Learning?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-10">
              Create a profile to track your progress and personalize your
              learning experience
            </p>
            <Link to="/profile-setup">
              <Button
                size="lg"
                className="px-12 py-6 text-xl rounded-2xl bg-[#58CC02] hover:bg-[#46a302] text-white shadow-lg hover:shadow-xl transition-all"
              >
                <span className="text-2xl mr-2">+</span>
                Create Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* Existing Profiles */}
        {existingProfile && (
          <div className="mb-8">
            <h3 className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              Existing Profiles
            </h3>
            <div
              onClick={handleSelectProfile}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{existingProfile.avatar}</div>
                  <div>
                    <h4 className="text-xl text-gray-800 dark:text-gray-100">
                      {existingProfile.name}
                    </h4>
                    <p className="text-gray-500 dark:text-gray-400">
                      Level {currentLevel} • {accuracy}% accuracy
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => navigate("/admin-login")}
            variant="outline"
            size="lg"
            className="px-8 py-4 rounded-2xl border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/30"
          >
            <Lock className="w-5 h-5 mr-2" />
            Teacher Access
          </Button>
          
          <Button
            onClick={handleSettingsClick}
            variant="outline"
            size="lg"
            className="px-8 py-4 rounded-2xl"
          >
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </Button>
        </div>

        {/* Profile Alert Modal */}
        {showProfileAlert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF9600] to-[#FF6B00] flex items-center justify-center">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl mb-2 text-gray-800 dark:text-gray-100">
                  Please select a profile first
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  You need to select or create a profile to access settings
                </p>
                <Button
                  onClick={() => setShowProfileAlert(false)}
                  size="lg"
                  className="w-full py-4 text-lg rounded-2xl bg-[#58CC02] hover:bg-[#46a302] text-white"
                >
                  Go to Main Menu
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
