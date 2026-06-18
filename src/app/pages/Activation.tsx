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

export default function Activation() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);

  // Unified input state
  const [userInput, setUserInput] = useState("");
  const [isEmail, setIsEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Step state
  const [authStep, setAuthStep] = useState<"initial" | "teacher-code" | "student-pin">("initial");
  
  // Teacher Access Code
  const [accessCode, setAccessCode] = useState("");
  
  // Student PIN
  const [studentPin, setStudentPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Detect email vs student code dynamically
  useEffect(() => {
    if (authStep === "initial") {
      setIsEmail(userInput.includes("@"));
      setError("");
    }
  }, [userInput, authStep]);

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

  // Splash screen transition
  useEffect(() => {
    let isMounted = true;
    
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
    }, 2500);

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // ── Unified Submit Handler (Step 1) ──
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");
    if (isEmail) {
      // ── Teacher/Admin Path: Go to access code entry ──
      setAuthStep("teacher-code");
      setLoading(false);
    } else {
      // ── Student Path: Proceed to PIN entry ──
      // We don't check the DB yet, we check it securely inside the RPC later.
      setAuthStep("student-pin");
      setLoading(false);
    }
  };

  // ── Verification for Teacher/Admin Access Code ──
  const handleVerifyAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.length < 6) return;

    setLoading(true);
    setError("");

    try {
      const emailClean = userInput.trim().toLowerCase();
      const codeClean = accessCode.trim().toUpperCase();

      // Verify email + access code against the database
      const { data: profile, error: dbError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", emailClean)
        .eq("pin_hash", codeClean)
        .in("role", ["teacher", "admin"])
        .maybeSingle();

      if (dbError || !profile) {
        throw new Error("Invalid email or access code. Contact your administrator.");
      }

      // Log user in locally
      localStorage.setItem("userProfile", JSON.stringify({
        id: profile.id,
        name: profile.alias || profile.first_name || "Teacher",
        avatar: profile.role === "admin" ? "🛡️" : "👩‍🏫",
        role: profile.role,
        createdAt: profile.created_at
      }));

      if (profile.role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/teacher-dashboard", { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Verification failed.");
      setAccessCode("");
    } finally {
      setLoading(false);
    }
  };

  // ── Verification for Student PIN ──
  const handleVerifyStudentPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentPin.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      const studentCodeClean = userInput.trim().toUpperCase();
      const studentPinClean = studentPin.trim().toUpperCase();

      // Ensure device ID exists
      let localDeviceId = localStorage.getItem("activated_device_id");
      if (!localDeviceId) {
        localDeviceId = generateUUID();
        localStorage.setItem("activated_device_id", localDeviceId);
      }

      // Call secure RPC
      const { data: student, error: rpcError } = await supabase.rpc('verify_student_login', {
        p_code: studentCodeClean,
        p_pin: studentPinClean,
        p_device_id: localDeviceId
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Authentication failed.");
      }

      if (!student) {
        throw new Error("Invalid Student Code or PIN.");
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
      setStudentPin("");
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
            <p className="text-white/80 font-medium tracking-wider mt-4">
              Empowering Little Voices
            </p>
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

            {authStep === "initial" ? (
              /* Step 1: Input Code or Email */
              <form onSubmit={handleInitialSubmit} className="space-y-6">
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
                      <GraduationCap className="w-5 h-5" /> Continue with Email
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-5 h-5" /> Next Step
                    </>
                  )}
                </Button>
              </form>
            ) : authStep === "teacher-code" ? (
              /* Step 2A: Teacher enters their access code */
              <form onSubmit={handleVerifyAccessCode} className="space-y-6 animate-in slide-in-from-right duration-300">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("initial");
                    setAccessCode("");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-2 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to portal
                </button>

                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Enter Access Code</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    Enter the 8-character access code provided by your administrator for{" "}
                    <span className="text-indigo-400 font-semibold">{userInput}</span>.
                  </p>
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    maxLength={8}
                    required
                    autoFocus
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                    placeholder="AB3X9PK2"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-950 border border-gray-800 focus:border-indigo-500 text-white font-mono tracking-[0.4em] text-center text-2xl outline-none"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center font-semibold bg-red-950/20 border border-red-900/30 py-2 rounded-xl animate-shake">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || accessCode.length < 6}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/30"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  <ShieldCheck className="w-5 h-5" /> Verify & Access
                </Button>
              </form>
            ) : (
              /* Step 2B: Student enters their 6-digit alphanumeric PIN */
              <form onSubmit={handleVerifyStudentPin} className="space-y-6 animate-in slide-in-from-right duration-300">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("initial");
                    setStudentPin("");
                    setError("");
                  }}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-2 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>

                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Enter Your PIN</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    Welcome back! Enter your 6-character secret PIN.
                  </p>
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={studentPin}
                    onChange={(e) => setStudentPin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-gray-950 border border-gray-800 focus:border-[#58CC02] text-white font-mono tracking-[0.5em] text-center text-3xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center font-semibold bg-red-950/20 border border-red-900/30 py-2 rounded-xl animate-shake">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || studentPin.length !== 6}
                  className="w-full py-4 bg-[#58CC02] hover:bg-[#49a802] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  <BookOpen className="w-5 h-5" /> Launch App
                </Button>
              </form>
            )}
          </div>


        </div>
      )}
    </div>
  );
}
