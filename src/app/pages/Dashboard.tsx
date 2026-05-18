import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Sparkles, Trophy, LogOut, Power } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { levels } from "../data/levels";
import { App } from '@capacitor/app';

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

  const handleExitApp = async () => {
    try {
      await App.exitApp();
    } catch (e) {
      console.error("Could not exit app via Capacitor", e);
    }
  };

  const currentLevel = levels.find((level) => !completedLevels.includes(level.id))?.id || 1;
  const accuracy = completedLevels.length > 0
    ? Math.round((completedLevels.length / levels.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:bg-none dark:bg-[#0d141c] transition-colors duration-300">
      <div className="max-w-md mx-auto px-6 py-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl shadow-md bg-gradient-to-br from-[#58CC02] to-[#46a302]">
              <Sparkles className="w-8 h-8 text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                <span className="text-[#58CC02]">Alphabet</span>
                <span className="text-[#1CB0F6]">GO!</span>
              </h1>
              <p className="text-gray-500 dark:text-[#849baf] font-medium text-sm mt-0.5">
                Ready to learn, {profile.name}?
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Welcome Profile Card */}
        <div className="bg-white dark:bg-[#1f2f3d] rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] p-6 mb-8 border border-gray-100 dark:border-white/5 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#1CB0F6] to-[#0a8ed4] shadow-inner flex items-center justify-center text-4xl transform -rotate-6">
                {profile.avatar}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {profile.name}
                </h2>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs font-bold text-[#FF9600] bg-[#fff0d4] dark:bg-[#FF9600]/20 px-2 py-1 rounded-lg">
                    Lvl {currentLevel}
                  </span>
                  <span className="text-xs font-bold text-[#58CC02] bg-[#e8f9d4] dark:bg-[#58CC02]/20 px-2 py-1 rounded-lg">
                    {accuracy}% Acc
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("/")}
              className="p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-colors active:scale-90"
              title="Switch Profile"
            >
              <LogOut className="w-6 h-6 text-gray-400 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Main Actions Container */}
        <div className="flex-1 flex flex-col gap-5 justify-center pb-12">
          
          {/* All Levels Button */}
          <Link to="/levels" className="block outline-none">
            <button className="w-full bg-gradient-to-br from-[#58CC02] to-[#46a302] rounded-3xl p-6 shadow-[0_8px_0_#3d8c02] hover:shadow-[0_6px_0_#3d8c02] hover:translate-y-[2px] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-between group">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md transition-transform group-hover:scale-110">
                  <Trophy className="w-8 h-8 text-white" fill="white" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-white tracking-wide">
                    All Levels
                  </h3>
                  <p className="text-white/80 font-medium">
                    {levels.length} levels to master
                  </p>
                </div>
              </div>
            </button>
          </Link>

          {/* Exit App Button */}
          <button 
            onClick={handleExitApp}
            className="w-full bg-gradient-to-br from-[#FF4B4B] to-[#e0336e] rounded-3xl p-6 shadow-[0_8px_0_#b51e4f] hover:shadow-[0_6px_0_#b51e4f] hover:translate-y-[2px] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-between group mt-2"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md transition-transform group-hover:scale-110">
                <Power className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white tracking-wide">
                  Exit App
                </h3>
                <p className="text-white/80 font-medium">
                  See you next time!
                </p>
              </div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
