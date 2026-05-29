import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import {
  KeyRound,
  Mail,
  Loader2,
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { generateUUID } from "../utils/uuid";
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;

export default function Activation() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);

  // Unified input state
  const [userInput, setUserInput] = useState("");
  const [isEmail, setIsEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Teacher passwordless flow states
  const [pinSent, setPinSent] = useState(false);
  const [demoPin, setDemoPin] = useState("");
  const [teacherPin, setTeacherPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Detect email vs student code dynamically
  useEffect(() => {
    setIsEmail(userInput.includes("@"));
    setError("");
  }, [userInput]);

  // Global key listener for Admin: Ctrl + Alt + A
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "a") {
      navigate("/admin-login");
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const [isPreloading, setIsPreloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Splash screen transition and AI preload
  useEffect(() => {
    let isMounted = true;
    
    const checkAndDownloadModel = async () => {
      try {
        const cached = localStorage.getItem("wav2vec2_cached");
        if (cached !== "true") {
          setIsPreloading(true);
          await pipeline("automatic-speech-recognition", "Xenova/wav2vec2-lv-60-espeak-cv-ft", {
            progress_callback: (info: any) => {
              if (info.status === "progress" && isMounted) {
                setDownloadProgress(Math.round(info.progress));
              }
            }
          });
          localStorage.setItem("wav2vec2_cached", "true");
        }
      } catch (e) {
        console.error("Failed to preload AI model:", e);
      } finally {
        if (isMounted) {
          setIsPreloading(false);
          finishSplash();
        }
      }
    };

    const finishSplash = () => {
      setTimeout(() => {
        if (!isMounted) return;
        setShowSplash(false);
        const profile = localStorage.getItem("userProfile");
        if (profile) {
          const parsed = JSON.parse(profile);
          if (parsed.role === "teacher") {
            navigate("/teacher-dashboard", { replace: true });
          } else if (parsed.role === "admin") {
            navigate("/admin", { replace: true });
          } else if (parsed.role === "student") {
            navigate("/dashboard", { replace: true });
          }
        }
      }, 1000); // brief pause after download or 1s if already cached
    };

    checkAndDownloadModel();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // ── Unified Submit Handler ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setLoading(true);
    setError("");

    if (isEmail) {
      // ── Teacher Path ──
      try {
        const emailClean = userInput.trim().toLowerCase();
        // Check if teacher exists in profiles
        const { data: teacher, error: dbError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", emailClean)
          .eq("role", "teacher")
          .maybeSingle();

        if (dbError || !teacher) {
          throw new Error("No teacher account found with that email. Ask your Administrator.");
        }

        // Generate a random 6-digit PIN
        const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();

        // Save the PIN to the teacher's profile in Supabase
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ pin_hash: generatedPin })
          .eq("id", teacher.id);

        if (updateError) throw updateError;

        setDemoPin(generatedPin);
        setPinSent(true);
      } catch (err: any) {
        setError(err.message || "Teacher lookup failed.");
      } finally {
        setLoading(false);
      }
    } else {
      // ── Student Path ──
      try {
        const studentCodeClean = userInput.trim().toUpperCase();
        const { data: student, error: dbError } = await supabase
          .from("profiles")
          .select("*")
          .eq("student_code", studentCodeClean)
          .eq("role", "student")
          .maybeSingle();

        if (dbError || !student) {
          throw new Error("Invalid Student Access Code. Please ask your teacher.");
        }

        // Device Binding check
        let localDeviceId = localStorage.getItem("activated_device_id");
        if (!localDeviceId) {
          localDeviceId = generateUUID();
          localStorage.setItem("activated_device_id", localDeviceId);
        }

        if (student.activated_device_id && student.activated_device_id !== localDeviceId) {
          throw new Error("This access code is locked to another active device.");
        }

        // Bind device if not yet bound
        if (!student.activated_device_id) {
          await supabase
            .from("profiles")
            .update({ activated_device_id: localDeviceId })
            .eq("id", student.id);
        }

        localStorage.setItem("userProfile", JSON.stringify({
          id: student.id,
          name: student.first_name,
          avatar: student.avatar || "👦",
          role: "student",
          createdAt: student.created_at
        }));

        navigate("/dashboard", { replace: true });
      } catch (err: any) {
        setError(err.message || "Student login failed.");
      } finally {
        setLoading(false);
      }
    }
  };

  // ── Verification for Teacher PIN ──
  const handleVerifyTeacherPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherPin.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      const emailClean = userInput.trim().toLowerCase();

      // Brute-force check
      const attemptsKey = `lockout_${emailClean}`;
      const lockoutData = JSON.parse(localStorage.getItem(attemptsKey) || '{"attempts": 0, "lockedUntil": null}');

      if (lockoutData.lockedUntil && new Date(lockoutData.lockedUntil) > new Date()) {
        throw new Error(`Account is locked. Try again after ${new Date(lockoutData.lockedUntil).toLocaleTimeString()}`);
      }

      const { data: teacher, error: dbError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", emailClean)
        .eq("role", "teacher")
        .maybeSingle();

      if (dbError || !teacher) {
        throw new Error("Teacher record not found.");
      }

      if (teacher.pin_hash !== teacherPin) {
        lockoutData.attempts += 1;
        if (lockoutData.attempts >= 5) {
          const lockedUntil = new Date(new Date().getTime() + 15 * 60000); // 15 mins
          lockoutData.lockedUntil = lockedUntil.toISOString();
          localStorage.setItem(attemptsKey, JSON.stringify(lockoutData));
          throw new Error(`Too many failed attempts. Account locked until ${lockedUntil.toLocaleTimeString()}`);
        } else {
          localStorage.setItem(attemptsKey, JSON.stringify(lockoutData));
          throw new Error(`Incorrect 6-digit Security PIN. Attempts remaining: ${5 - lockoutData.attempts}`);
        }
      }

      // Reset attempts on success
      localStorage.removeItem(attemptsKey);

      // Log teacher in
      localStorage.setItem("userProfile", JSON.stringify({
        id: teacher.id,
        name: teacher.alias || teacher.first_name || "Teacher",
        avatar: "👩‍🏫",
        role: "teacher",
        createdAt: teacher.created_at
      }));

      navigate("/teacher-dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Verification failed.");
      setTeacherPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden text-gray-100">
      {/* Dynamic Background glow blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#58CC02]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#1CB0F6]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* ── SPLASH SCREEN ── */}
      {showSplash ? (
        <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-700 w-full max-w-sm px-6">
          <div className="relative">
            <div className="absolute inset-0 bg-[#58CC02] rounded-[2rem] blur-3xl opacity-20 animate-pulse" />
            <div className="w-28 h-28 bg-gray-900 rounded-[2.2rem] shadow-2xl flex items-center justify-center relative z-10 border border-gray-800">
              <span className="text-6xl select-none">🦉</span>
            </div>
          </div>
          <div className="text-center w-full">
            <h1 className="text-4xl font-black tracking-tight mb-2">
              <span className="text-[#58CC02]">Alphabet</span>
              <span className="text-[#1CB0F6]">GO!</span>
            </h1>
            
            {isPreloading ? (
              <div className="mt-8 bg-gray-900/80 p-5 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-sm">
                <p className="text-[#1CB0F6] font-bold text-sm mb-3">Downloading Offline AI Brain...</p>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-[#1CB0F6] to-[#0a8ed4] transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500 font-medium">This only happens once</span>
                  <span className="text-xs font-mono text-[#1CB0F6] font-bold">{downloadProgress}%</span>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-500 mt-1 font-medium">Learn • Grow • Succeed</p>
                <div className="flex justify-center gap-2 mt-4">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full bg-[#58CC02] animate-bounce"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ── UNIFIED DARK ENTRY PORTAL ── */
        <div className="w-full max-w-md flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-6 duration-500 relative z-10">

          <div className="text-center mb-2">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-900 border border-gray-800 rounded-3xl flex items-center justify-center shadow-xl">
              <span className="text-4.5xl select-none">🦉</span>
            </div>
            <h1 className="text-3xl font-black">
              <span className="text-[#58CC02]">Alphabet</span>
              <span className="text-[#1CB0F6]">GO!</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1.5 font-medium">Enter your Student Code or Teacher Email</p>
          </div>

          <div className="w-full bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">

            {!pinSent ? (
              /* Step 1: Input Code or Email */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Access Portal</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="e.g. AB3X9P or name@school.com"
                      className="w-full px-4 py-4 rounded-2xl bg-gray-950 border border-gray-800 focus:border-indigo-500 text-white outline-none transition-colors text-center text-lg font-semibold tracking-wider placeholder-gray-700"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center font-semibold bg-red-950/20 border border-red-900/30 py-2.5 rounded-xl animate-shake">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || !userInput.trim()}
                  className={`w-full py-4 text-base font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg ${isEmail
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-[#58CC02] hover:bg-[#49a802] text-white"
                    }`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isEmail ? (
                    <>
                      <GraduationCap className="w-5 h-5" /> Request Security PIN
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-5 h-5" /> Launch Student App
                    </>
                  )}
                </Button>
              </form>
            ) : (
              /* Step 2: Teacher Input PIN */
              <form onSubmit={handleVerifyTeacherPin} className="space-y-6 animate-in slide-in-from-right duration-300">
                <button
                  type="button"
                  onClick={() => {
                    setPinSent(false);
                    setDemoPin("");
                    setTeacherPin("");
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-2 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to portal
                </button>

                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Enter Security PIN</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    We generated a passwordless login PIN and sent it to <span className="text-indigo-400 font-semibold">{userInput}</span>.
                  </p>
                </div>

                {/* Simulated Email Notification Popup inside App */}
                {demoPin && (
                  <div className="bg-indigo-950/40 border border-indigo-900/50 p-4 rounded-2xl relative text-xs leading-relaxed text-indigo-300 animate-bounce">
                    <span className="font-bold text-white block mb-1">📨 Security PIN Delivered!</span>
                    For testing purposes, your magic 6-digit PIN is: <code className="text-white font-bold bg-indigo-900/60 px-1.5 py-0.5 rounded font-mono text-sm tracking-wider">{demoPin}</code>
                  </div>
                )}

                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type={showPin ? "text" : "password"}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={teacherPin}
                    onChange={(e) => setTeacherPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit PIN"
                    className="w-full pl-10 pr-10 py-3.5 rounded-2xl bg-gray-950 border border-gray-800 focus:border-indigo-500 text-white font-mono tracking-widest text-center text-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center font-semibold bg-red-950/20 border border-red-900/30 py-2 rounded-xl">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || teacherPin.length !== 6}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/30"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Verify PIN & Access
                </Button>
              </form>
            )}
          </div>

          <p className="text-xs text-gray-600 select-none">
            Admin? Press <kbd className="px-1.5 py-0.5 bg-gray-900 rounded border border-gray-800 text-gray-400 font-mono text-[10px]">Ctrl+Alt+A</kbd>
          </p>

        </div>
      )}
    </div>
  );
}
