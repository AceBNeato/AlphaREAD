import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Sparkles, PlayCircle, Trophy, BarChart3, Settings, ChevronRight, LogOut } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { levels } from "../data/levels";

interface UserProfile {
  name: string;
  avatar: string;
  accent: string;
  createdAt: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (!storedProfile) {
      navigate("/");
      return;
    }
    setProfile(JSON.parse(storedProfile));

    const completed = JSON.parse(
      localStorage.getItem("completedLevels") || "[]"
    );
    setCompletedLevels(completed);
  }, [navigate]);

  if (!profile) return null;

  // Find next uncompleted level
  const nextLevel = levels.find((level) => !completedLevels.includes(level.id));
  const currentLevel = nextLevel?.id || 1;
  const accuracy = completedLevels.length > 0
    ? Math.round((completedLevels.length / levels.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
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
          </div>
          <ThemeToggle />
        </header>

        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-[#d7f5e3] to-[#e8f9d4] dark:from-green-900/20 dark:to-green-800/20 rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#58CC02] to-[#1CB0F6] flex items-center justify-center text-4xl">
                {profile.avatar}
              </div>
              <div>
                <h2 className="text-2xl text-gray-800 dark:text-gray-100">
                  Welcome, {profile.name}!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Accuracy: {accuracy}% • Level {currentLevel}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full transition-colors"
              title="Switch Profile"
            >
              <LogOut className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Continue Learning Card */}
        <div className="bg-gradient-to-br from-[#fff4d4] to-[#ffe8b3] dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-3xl shadow-lg p-6 mb-6 border-3 border-[#FFC800]">
          <Link to={nextLevel ? `/lesson/${nextLevel.id}` : "/levels"}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF9600] to-[#FF6B00] flex items-center justify-center">
                  <PlayCircle className="w-8 h-8 text-white" fill="white" />
                </div>
                <div>
                  <h3 className="text-xl text-gray-800 dark:text-gray-100">
                    Continue Learning
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {nextLevel
                      ? `Resume Level ${nextLevel.id}`
                      : "All levels completed!"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </div>
          </Link>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* All Levels */}
          <Link to="/levels">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#58CC02] to-[#46a302] flex items-center justify-center">
                  <Trophy className="w-9 h-9 text-white" />
                </div>
                <h3 className="text-xl mb-2 text-gray-800 dark:text-gray-100">
                  All Levels
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {levels.length} levels to master
                </p>
              </div>
            </div>
          </Link>

          {/* My Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#1CB0F6] to-[#0a8ed4] flex items-center justify-center">
                <BarChart3 className="w-9 h-9 text-white" />
              </div>
              <h3 className="text-xl mb-2 text-gray-800 dark:text-gray-100">
                My Progress
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                View your stats
              </p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="text-center">
          <Link to="/settings">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 rounded-2xl"
            >
              <Settings className="w-5 h-5 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
