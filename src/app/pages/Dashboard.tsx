import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Sparkles, Trophy, Power } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { levels } from "../data/levels";
import { App } from '@capacitor/app';
import { supabase } from "../../lib/supabase";
import { pipeline, env } from "@xenova/transformers";

// Disable local models, fetch directly from Hugging Face
env.allowLocalModels = false;

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  accent?: string;
  role?: string;
  createdAt: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  
  // Model Preload State
  const [isPreloading, setIsPreloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (!storedProfile) {
      navigate("/", { replace: true });
      return;
    }
    
    const parsedProfile = JSON.parse(storedProfile);
    setProfile(parsedProfile);

    const completed = JSON.parse(
      localStorage.getItem("completedLevels") || "[]"
    );
    setCompletedLevels(completed);

    // Validate device lock to prevent duplicate sessions
    if (parsedProfile.id !== "teacher-preview") {
      const validateDevice = async () => {
        // If the device is completely offline, allow them to play the downloaded app
        if (!navigator.onLine) return;

        const localDeviceId = localStorage.getItem("activated_device_id");
        if (!localDeviceId) return;

        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("activated_device_id")
            .eq("id", parsedProfile.id)
            .single();

          // If there is an error but we are online, it might be a missing record. 
          // If the data comes back but the device ID doesn't match, it's a security breach.
          if (error) {
            // Check if it's just a network error failing to reach supabase despite navigator.onLine being true
            if (error.message && error.message.includes("fetch")) return;
            
            // If the error means "No rows found" (PGRST116), the account was deleted!
            if (error.code === "PGRST116" || error.details?.includes("Results contain 0 rows")) {
              localStorage.removeItem("userProfile");
              localStorage.removeItem("activated_device_id");
              alert("Your account has been deleted or deactivated by an administrator.");
              navigate("/", { replace: true });
              return;
            }
          }

          if (data && data.activated_device_id !== localDeviceId) {
            // Security Breach: The teacher unlocked the device, or another device took it over.
            // Force logout the current user.
            localStorage.removeItem("userProfile");
            localStorage.removeItem("activated_device_id");
            alert("Your session has expired or your account was unlocked by the teacher.");
            navigate("/", { replace: true });
          }
        } catch (e) {
          // Network errors shouldn't kick out offline users
          console.warn("Offline or network issue during security check.");
        }
      };
      validateDevice();
    }

    // Check if the AI model is already cached/ready
    const checkModelCache = async () => {
      try {
        const cached = localStorage.getItem("wav2vec2_cached");
        if (cached === "true") {
          setModelReady(true);
        }
      } catch (e) {
        console.error("Cache check failed:", e);
      }
    };
    checkModelCache();

  }, [navigate]);

  const handleStartPreload = async () => {
    setIsPreloading(true);
    try {
      await pipeline("automatic-speech-recognition", "Xenova/wav2vec2-lv-60-espeak-cv-ft", {
        progress_callback: (info: any) => {
          if (info.status === "progress") {
            setDownloadProgress(Math.round(info.progress));
          } else if (info.status === "done") {
            setDownloadProgress(100);
          }
        }
      });
      localStorage.setItem("wav2vec2_cached", "true");
      setModelReady(true);
    } catch (err) {
      console.error("Failed to preload model:", err);
      alert("Failed to download voice AI model. Please check your internet connection.");
    } finally {
      setIsPreloading(false);
    }
  };

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

  if (!modelReady && !isPreloading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:bg-none dark:bg-[#0d141c] flex items-center justify-center p-6 transition-colors duration-300">
        <div className="bg-white dark:bg-[#1f2f3d] p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border-2 border-green-200 dark:border-green-900/30">
          <Sparkles className="w-16 h-16 text-[#58CC02] mx-auto mb-6" />
          <h2 className="text-2xl font-black mb-4">Set Up Voice AI</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 text-sm leading-relaxed">
            Alphabet GO requires a one-time download of the phonics AI model (~140MB). This allows the app to grade pronunciation 100% offline later.
          </p>
          <Button 
            onClick={handleStartPreload}
            className="w-full bg-[#58CC02] hover:bg-[#46a302] text-white font-bold text-lg rounded-2xl py-6 shadow-[0_6px_0_#3d8c02] active:translate-y-[6px] active:shadow-none"
          >
            Download Now
          </Button>
          <p className="text-xs text-gray-400 mt-4">Please connect to Wi-Fi.</p>
        </div>
      </div>
    );
  }

  if (isPreloading && !modelReady) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:bg-none dark:bg-[#0d141c] flex items-center justify-center p-6 transition-colors duration-300">
        <div className="bg-white dark:bg-[#1f2f3d] p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border-2 border-[#1CB0F6]/30">
          <div className="w-16 h-16 border-4 border-[#1CB0F6] border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-bold mb-4">Downloading AI Brain...</h2>
          <div className="w-full h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-[#1CB0F6] to-[#0a8ed4] transition-all duration-300 rounded-full"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <p className="font-mono text-sm text-[#1CB0F6] font-bold">{downloadProgress}%</p>
          <p className="text-xs text-gray-500 mt-6">This only happens once. Keep the app open.</p>
        </div>
      </div>
    );
  }

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
                {profile.id === "teacher-preview" ? "Previewing Student App" : `Ready to learn, ${profile.name}?`}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        {/* Welcome Profile Card */}
        <div className="bg-white dark:bg-[#1f2f3d] rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] p-6 mb-8 border border-gray-100 dark:border-white/5 transition-all">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#1CB0F6] to-[#0a8ed4] shadow-inner flex items-center justify-center text-4xl transform -rotate-6 flex-shrink-0">
              {profile.avatar || "🦉"}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#1CB0F6] block mb-0.5">
                {profile.id === "teacher-preview" || (profile as any).role === "teacher-preview" ? "Teacher Mode" : "Student Mode"}
              </span>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-tight">
                {profile.name}
              </h2>
              {profile.id !== "teacher-preview" && (profile as any).role !== "teacher-preview" && (
                <div className="flex gap-2 mt-1.5">
                  <span className="text-xs font-bold text-[#FF9600] bg-[#fff0d4] dark:bg-[#FF9600]/20 px-2 py-0.5 rounded-lg">
                    Lesson {currentLevel}
                  </span>
                  <span className="text-xs font-bold text-[#58CC02] bg-[#e8f9d4] dark:bg-[#58CC02]/20 px-2 py-0.5 rounded-lg">
                    {accuracy}% Acc
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Actions Container */}
        <div className="flex-1 flex flex-col gap-5 justify-center pb-12">
          
          {/* All Levels Button */}
          <Link to="/levels" className="block outline-none">
            <button className="w-full bg-gradient-to-br from-[#58CC02] to-[#46a302] rounded-3xl p-6 shadow-[0_8px_0_#3d8c02] hover:shadow-[0_6px_0_#3d8c02] hover:translate-y-[2px] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md transition-transform group-hover:scale-110">
                  <Trophy className="w-8 h-8 text-white" fill="white" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-black text-white tracking-wide">
                    All Lessons
                  </h3>
                  <p className="text-white/80 font-medium">
                    {levels.length} lessons to master
                  </p>
                </div>
              </div>
            </button>
          </Link>

          {/* Exit / Back to Teacher Dashboard Button */}
          <button 
            onClick={() => {
              const returnTo = (profile as any).returnTo;
              if (returnTo) {
                if (returnTo === "/admin") {
                  localStorage.setItem("userProfile", JSON.stringify({ role: "admin", name: "Admin" }));
                } else if (returnTo === "/teacher-dashboard") {
                  localStorage.setItem("userProfile", JSON.stringify({ id: (profile as any).teacherId || "teacher", role: "teacher", name: profile.name }));
                }
                navigate(returnTo);
              } else if (profile.id === "teacher-preview" || (profile as any).role === "teacher-preview") {
                navigate("/teacher-dashboard");
              } else {
                handleExitApp();
              }
            }}
            className={`w-full rounded-3xl p-6 transition-all flex items-center justify-between group mt-2 cursor-pointer ${
              profile.id === "teacher-preview" || (profile as any).role === "teacher-preview"
                ? "bg-gradient-to-br from-[#1CB0F6] to-[#0a8ed4] shadow-[0_8px_0_#0979b5] hover:shadow-[0_6px_0_#0979b5]"
                : "bg-gradient-to-br from-[#FF4B4B] to-[#e0336e] shadow-[0_8px_0_#b51e4f] hover:shadow-[0_6px_0_#b51e4f]"
            } hover:translate-y-[2px] active:shadow-none active:translate-y-[8px]`}
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md transition-transform group-hover:scale-110">
                <Power className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white tracking-wide">
                  {profile.id === "teacher-preview" || (profile as any).role === "teacher-preview" ? "Open Dashboard" : "Exit App"}
                </h3>
                <p className="text-white/80 font-medium">
                  {profile.id === "teacher-preview" || (profile as any).role === "teacher-preview" ? "Back to dashboard" : "See you next time!"}
                </p>
              </div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
