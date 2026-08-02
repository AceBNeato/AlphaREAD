import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Sparkles, Trophy, Power } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";
import { useCurriculum } from "../hooks/useCurriculum";
import { PrivacyPolicyModal } from "../components/PrivacyPolicyModal";
import { App } from '@capacitor/app';
import { supabase } from "../../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../context/LanguageContext";
import { useProgress } from "../hooks/useProgress";
import { translations } from "../utils/translations";

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
  const { levels } = useCurriculum();
  const { language } = useLanguage();
  const t = translations[language].dashboard;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { completedLevels } = useProgress();
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandOrigin, setExpandOrigin] = useState({ x: 0, y: 0 });

  const handleAllLevelsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setExpandOrigin({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });
    setIsExpanding(true);

    setTimeout(() => {
      navigate("/levels");
    }, 700); // Wait for the 0.7s animation
  };

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (!storedProfile) {
      navigate("/", { replace: true });
      return;
    }

    const parsedProfile = JSON.parse(storedProfile);
    setProfile(parsedProfile);

    // Validate device lock to prevent duplicate sessions
    if (parsedProfile.id !== "teacher-preview" && parsedProfile.role !== "student") {
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
                <span className="text-[#58CC02]">Alpha</span>
                <span className="text-[#1CB0F6]">READ!</span>
              </h1>
              <p className="text-gray-500 dark:text-[#849baf] font-medium text-sm mt-0.5">
                {profile.id === "teacher-preview" ? "Previewing Student App" : `Ready to learn, ${profile.name}?`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Welcome Profile Card */}
        <div className="bg-white dark:bg-[#1f2f3d] rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.15)] p-6 mb-8 border border-gray-100 dark:border-white/5 transition-all">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#1CB0F6] to-[#0a8ed4] shadow-inner flex items-center justify-center text-4xl transform -rotate-6 flex-shrink-0">
              {profile.avatar || "🦉"}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#1CB0F6] block mb-0.5">
                {profile.id === "teacher-preview" || (profile as any).role === "teacher-preview" ? t.teacherMode : t.studentMode}
              </span>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-tight">
                {profile.name}
              </h2>

            </div>
          </div>
        </div>

        {/* Main Actions Container */}
        <div className="flex-1 flex flex-col gap-5 justify-center pb-12">

          {/* All Levels Button */}
          <button 
            onClick={handleAllLevelsClick}
            className="w-full bg-gradient-to-br from-[#58CC02] to-[#46a302] rounded-3xl p-6 shadow-[0_8px_0_#3d8c02] hover:shadow-[0_6px_0_#3d8c02] hover:translate-y-[2px] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-between group cursor-pointer outline-none"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md transition-transform group-hover:scale-110">
                <Trophy className="w-8 h-8 text-white" fill="white" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black text-white tracking-wide">
                  {t.allLevels}
                </h3>
                <p className="text-white/80 font-medium">
                  {levels.length} {t.levelsToMaster}
                </p>
              </div>
            </div>
          </button>

          {/* Expand Animation Overlay */}
          <AnimatePresence>
            {isExpanding && (
              <motion.div
                initial={{ 
                  clipPath: `circle(0px at ${expandOrigin.x}px ${expandOrigin.y}px)`
                }}
                animate={{ 
                  clipPath: `circle(150vw at ${expandOrigin.x}px ${expandOrigin.y}px)`
                }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#58CC02] to-[#46a302] pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Exit / Back to Teacher Dashboard Button */}
          <button
            onClick={() => {
              const returnTo = (profile as any).returnTo;
              if (returnTo) {
                if (returnTo === "/admin") {
                  localStorage.setItem("userProfile", JSON.stringify({ role: "admin", name: "Admin" }));
                } else if (returnTo === "/teacher-dashboard") {
                  const original = localStorage.getItem("originalTeacherProfile");
                  if (original) {
                    localStorage.setItem("userProfile", original);
                    localStorage.removeItem("originalTeacherProfile");
                  } else {
                    localStorage.setItem("userProfile", JSON.stringify({ id: (profile as any).teacherId || "teacher", role: "teacher", name: profile.name }));
                  }
                }
                navigate(returnTo);
              } else if (profile.id === "teacher-preview" || (profile as any).role === "teacher-preview") {
                const original = localStorage.getItem("originalTeacherProfile");
                if (original) {
                  localStorage.setItem("userProfile", original);
                  localStorage.removeItem("originalTeacherProfile");
                }
                navigate("/teacher-dashboard");
              } else if ((profile as any).role === "admin") {
                navigate("/admin");
              } else {
                handleExitApp();
              }
            }}
            className={`w-full rounded-3xl p-6 transition-all flex items-center justify-between group mt-2 cursor-pointer ${profile.id === "teacher-preview" || (profile as any).role === "teacher-preview" || (profile as any).role === "admin"
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
                  {profile.id === "teacher-preview" || (profile as any).role === "teacher-preview" || (profile as any).role === "admin" ? t.openDashboard : t.exitApp}
                </h3>
                <p className="text-white/80 font-medium">
                  {profile.id === "teacher-preview" || (profile as any).role === "teacher-preview" || (profile as any).role === "admin" ? t.backToDashboard : t.seeYouNextTime}
                </p>
              </div>
            </div>
          </button>

          <div className="text-center mt-6">
            <PrivacyPolicyModal />
          </div>
        </div>
      </div>
    </div>
  );
}
