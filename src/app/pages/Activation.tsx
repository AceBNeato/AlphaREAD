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
import { PrivacyPolicyModal } from "../components/PrivacyPolicyModal";
import { triggerLockout, checkLockout } from "../utils/alerts";
import { generateUUID } from "../utils/uuid";

const POPUP_ITEMS = ["A", "B", "C", "D", "E", "F", "CAT", "DOG", "SUN", "AT", "IN", "UP", "BA", "MA", "DA", "BE"];
const POPUP_COLORS = ["text-white", "text-[#58CC02]", "text-[#1CB0F6]", "text-[#ce82ff]", "text-[#FF9600]", "text-[#FF4B4B]"];

interface ClickItem {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  rot: number;
  dur: string;
  tx1: string; ty1: string;
  tx2: string; ty2: string;
  tx3: string; ty3: string;
  tx4: string; ty4: string;
}

export default function Activation() {
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);

  // Interactive background state
  const [clickItems, setClickItems] = useState<ClickItem[]>([]);
  const [clickIdCounter, setClickIdCounter] = useState(0);

  const handleBgClick = (e: React.MouseEvent) => {
    // Only spawn if they click the background, not the login box
    if ((e.target as HTMLElement).closest('.z-10')) return;

    const randomTx = () => `${Math.floor(Math.random() * 200) - 100}px`;
    const newItem: ClickItem = {
      id: clickIdCounter,
      text: POPUP_ITEMS[Math.floor(Math.random() * POPUP_ITEMS.length)],
      x: e.clientX,
      y: e.clientY,
      color: POPUP_COLORS[Math.floor(Math.random() * POPUP_COLORS.length)],
      rot: Math.floor(Math.random() * 60) - 30, // -30 to 30
      dur: `${Math.floor(Math.random() * 15) + 10}s`,
      tx1: randomTx(), ty1: randomTx(),
      tx2: randomTx(), ty2: randomTx(),
      tx3: randomTx(), ty3: randomTx(),
      tx4: randomTx(), ty4: randomTx(),
    };

    setClickItems(prev => {
      const newItems = [...prev, newItem];
      if (newItems.length > 15) return newItems.slice(newItems.length - 15);
      return newItems;
    });
    setClickIdCounter(c => c + 1);
  };

  // Unified input state
  const [userInput, setUserInput] = useState("");
  const [isEmail, setIsEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLockedOut, setIsLockedOut] = useState(false);

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
    const check = () => setIsLockedOut(checkLockout());
    check();
    const interval = setInterval(check, 1000);

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
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
    if (checkLockout()) return;

    setLoading(true);
    setError("");

    try {
      const emailClean = userInput.trim().toLowerCase();
      const codeClean = accessCode.trim().toUpperCase();

      // Verify email + access code via RPC to bypass RLS
      const { data: profile, error: rpcError } = await supabase.rpc('verify_staff_login', {
        p_email: emailClean,
        p_pin: codeClean,
        p_ip: 'unknown'
      });

      if (rpcError) {
        throw new Error("Database Error: " + rpcError.message);
      }
      // Check if the database successfully committed the attempt but returned an error
      if (profile?.error) {
        throw new Error(profile.error);
      }
      if (!profile) {
        throw new Error("Invalid email or access code. Contact your administrator.");
      }

      if (profile.role === "admin") {
        throw new Error("Access Denied: Administrators must use the dedicated Admin Portal.");
      }

      // -- Single Device Policy for Teachers --
      // If the teacher is already logged in elsewhere, block them
      if (profile.current_device_id) {
        throw new Error("Device Limit Reached: You are already logged in on another device. Please sign out from that device first, or ask an Admin to unlock your account.");
      }

      // Generate a unique device session ID for this login
      const newDeviceId = crypto.randomUUID();

      // ── Establish Real Supabase Session for RLS ──
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password: codeClean
      });

      if (authError) {
        // If they don't exist in auth.users yet, silently sign them up!
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: emailClean,
          password: codeClean
        });
        if (signUpError) throw new Error("Failed to establish secure session: " + signUpError.message);
        authData = signUpData as any;
      }

      // Link auth_id if needed, and register this device securely via RPC to bypass RLS
      const { error: updateError } = await supabase.rpc('register_device_session', {
        p_profile_id: profile.id,
        p_auth_id: authData?.session?.user?.id || profile.auth_id,
        p_device_id: newDeviceId
      });

      if (updateError) {
        console.warn("Failed to register device session via RPC, falling back to direct update:", updateError);
        // Fallback in case RPC isn't created yet
        await supabase
          .from("profiles")
          .update({
            auth_id: authData?.session?.user?.id || profile.auth_id,
            current_device_id: newDeviceId
          })
          .eq("id", profile.id);
      }

      // Log user in locally
      localStorage.setItem("userProfile", JSON.stringify({
        id: profile.id,
        name: profile.first_name || "Teacher",
        avatar: "👩‍🏫",
        role: profile.role,
        deviceId: newDeviceId, // Store the device session locally
        createdAt: profile.created_at
      }));

      navigate("/teacher-dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "Verification failed.");
      setAccessCode("");
      if (err.message && err.message.includes("Too many failed")) {
        triggerLockout();
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Verification for Student PIN ──
  const handleVerifyStudentPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentPin.length !== 6) return;
    if (checkLockout()) return;

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
        p_device_id: localDeviceId,
        p_ip: 'unknown'
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Authentication failed.");
      }
      
      // Check if the database successfully committed the attempt but returned an error
      if (student?.error) {
        throw new Error(student.error);
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
      if (err.message && err.message.includes("Too many failed")) {
        triggerLockout();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden text-gray-100"
      onClick={handleBgClick}
    >
      {/* Dynamic Background glow blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#58CC02]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#1CB0F6]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Letters Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 select-none z-0">
        <style>{`
          @keyframes drift {
            0%   { transform: translate(0px, 0px) rotate(var(--rot)) scale(1); }
            20%  { transform: translate(var(--tx1), var(--ty1)) rotate(calc(var(--rot) + 35deg)) scale(1.15); }
            40%  { transform: translate(var(--tx2), var(--ty2)) rotate(calc(var(--rot) - 15deg)) scale(0.9); }
            60%  { transform: translate(var(--tx3), var(--ty3)) rotate(calc(var(--rot) + 25deg)) scale(1.1); }
            80%  { transform: translate(var(--tx4), var(--ty4)) rotate(calc(var(--rot) - 30deg)) scale(0.95); }
            100% { transform: translate(0px, 0px) rotate(var(--rot)) scale(1); }
          }
          .floating-letter {
            position: absolute;
            font-weight: 900;
            animation: drift var(--dur) linear infinite;
            animation-delay: var(--del);
            transform: rotate(var(--rot));
          }
        `}</style>
        <span className="floating-letter text-7xl text-white top-[15%] left-[10%]" style={{ '--rot': '15deg', '--dur': '18s', '--del': '0s', '--tx1': '100px', '--ty1': '-80px', '--tx2': '-60px', '--ty2': '120px', '--tx3': '80px', '--ty3': '40px', '--tx4': '-50px', '--ty4': '-90px' } as React.CSSProperties}>A</span>
        <span className="floating-letter text-8xl text-[#58CC02] top-[20%] right-[15%]" style={{ '--rot': '-20deg', '--dur': '22s', '--del': '-5s', '--tx1': '-140px', '--ty1': '90px', '--tx2': '80px', '--ty2': '-110px', '--tx3': '-100px', '--ty3': '-40px', '--tx4': '120px', '--ty4': '60px' } as React.CSSProperties}>B</span>
        <span className="floating-letter text-9xl text-[#1CB0F6] bottom-[20%] left-[15%]" style={{ '--rot': '25deg', '--dur': '20s', '--del': '-2s', '--tx1': '120px', '--ty1': '-130px', '--tx2': '-90px', '--ty2': '-50px', '--tx3': '110px', '--ty3': '80px', '--tx4': '-60px', '--ty4': '140px' } as React.CSSProperties}>C</span>
        <span className="floating-letter text-6xl text-[#ce82ff] top-[55%] right-[8%]" style={{ '--rot': '-10deg', '--dur': '17s', '--del': '-7s', '--tx1': '-80px', '--ty1': '-100px', '--tx2': '120px', '--ty2': '60px', '--tx3': '-90px', '--ty3': '110px', '--tx4': '70px', '--ty4': '-80px' } as React.CSSProperties}>D</span>
        <span className="floating-letter text-7xl text-white bottom-[10%] right-[30%]" style={{ '--rot': '18deg', '--dur': '24s', '--del': '-1s', '--tx1': '150px', '--ty1': '80px', '--tx2': '-120px', '--ty2': '-90px', '--tx3': '140px', '--ty3': '-60px', '--tx4': '-80px', '--ty4': '110px' } as React.CSSProperties}>E</span>
        <span className="floating-letter text-6xl text-[#FF9600] top-[40%] left-[5%]" style={{ '--rot': '-25deg', '--dur': '26s', '--del': '-4s', '--tx1': '-110px', '--ty1': '-120px', '--tx2': '100px', '--ty2': '90px', '--tx3': '50px', '--ty3': '-140px', '--tx4': '-130px', '--ty4': '50px' } as React.CSSProperties}>F</span>
        <span className="floating-letter text-5xl text-[#FF4B4B] bottom-[40%] right-[25%]" style={{ '--rot': '10deg', '--dur': '16s', '--del': '-3s', '--tx1': '90px', '--ty1': '140px', '--tx2': '-100px', '--ty2': '-80px', '--tx3': '-40px', '--ty3': '120px', '--tx4': '110px', '--ty4': '-60px' } as React.CSSProperties}>G</span>

        {/* Simple Words & CV/VC Blocks */}
        <span className="floating-letter text-4xl text-[#58CC02] top-[5%] right-[40%]" style={{ '--rot': '-15deg', '--dur': '21s', '--del': '-8s', '--tx1': '-100px', '--ty1': '60px', '--tx2': '120px', '--ty2': '150px', '--tx3': '40px', '--ty3': '-110px', '--tx4': '-130px', '--ty4': '-40px' } as React.CSSProperties}>CAT</span>
        <span className="floating-letter text-5xl text-[#1CB0F6] bottom-[15%] left-[30%]" style={{ '--rot': '12deg', '--dur': '28s', '--del': '-12s', '--tx1': '150px', '--ty1': '-100px', '--tx2': '-80px', '--ty2': '-130px', '--tx3': '-120px', '--ty3': '90px', '--tx4': '140px', '--ty4': '60px' } as React.CSSProperties}>SUN</span>
        <span className="floating-letter text-3xl text-white top-[30%] left-[40%]" style={{ '--rot': '8deg', '--dur': '19s', '--del': '-6s', '--tx1': '80px', '--ty1': '130px', '--tx2': '-110px', '--ty2': '60px', '--tx3': '90px', '--ty3': '-100px', '--tx4': '-60px', '--ty4': '-140px' } as React.CSSProperties}>DOG</span>
        <span className="floating-letter text-4xl text-[#ce82ff] bottom-[35%] right-[15%]" style={{ '--rot': '-20deg', '--dur': '18s', '--del': '-4s', '--tx1': '-130px', '--ty1': '-80px', '--tx2': '90px', '--ty2': '-100px', '--tx3': '120px', '--ty3': '120px', '--tx4': '-70px', '--ty4': '90px' } as React.CSSProperties}>BA</span>
        <span className="floating-letter text-5xl text-[#FF9600] top-[70%] left-[8%]" style={{ '--rot': '25deg', '--dur': '23s', '--del': '-9s', '--tx1': '100px', '--ty1': '-140px', '--tx2': '-150px', '--ty2': '80px', '--tx3': '60px', '--ty3': '130px', '--tx4': '-110px', '--ty4': '-70px' } as React.CSSProperties}>IN</span>
        <span className="floating-letter text-4xl text-[#FF4B4B] top-[10%] right-[5%]" style={{ '--rot': '-5deg', '--dur': '15s', '--del': '-11s', '--tx1': '-80px', '--ty1': '110px', '--tx2': '130px', '--ty2': '-60px', '--tx3': '-120px', '--ty3': '-100px', '--tx4': '90px', '--ty4': '140px' } as React.CSSProperties}>UP</span>
        <span className="floating-letter text-3xl text-white bottom-[5%] left-[5%]" style={{ '--rot': '30deg', '--dur': '27s', '--del': '-14s', '--tx1': '160px', '--ty1': '-60px', '--tx2': '-60px', '--ty2': '-150px', '--tx3': '130px', '--ty3': '90px', '--tx4': '-140px', '--ty4': '110px' } as React.CSSProperties}>AT</span>
      </div>

      {/* Click-spawned items */}
      {clickItems.map(item => (
        <div
          key={item.id}
          className="absolute pointer-events-none select-none z-0 opacity-40 animate-in fade-in zoom-in duration-300"
          style={{
            left: item.x,
            top: item.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span
            className={`block floating-letter font-black text-5xl sm:text-7xl ${item.color}`}
            style={{
              '--rot': `${item.rot}deg`,
              '--dur': item.dur,
              '--del': '0s',
              '--tx1': item.tx1, '--ty1': item.ty1,
              '--tx2': item.tx2, '--ty2': item.ty2,
              '--tx3': item.tx3, '--ty3': item.ty3,
              '--tx4': item.tx4, '--ty4': item.ty4,
              textShadow: '0 4px 12px rgba(0,0,0,0.5)',
              position: 'relative'
            } as React.CSSProperties}
          >
            {item.text}
          </span>
        </div>
      ))}

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
              <span className="text-[#58CC02]">Alpha</span>
              <span className="text-[#1CB0F6]">READ</span>
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
              <span className="text-[#58CC02]">Alpha</span>
              <span className="text-[#1CB0F6]">READ</span>
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
                      disabled={isLockedOut}
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
                  disabled={loading || !userInput.trim() || isLockedOut}
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
                  disabled={loading || accessCode.length < 6 || isLockedOut}
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
                    disabled={isLockedOut}
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
                  disabled={loading || studentPin.length !== 6 || isLockedOut}
                  className="w-full py-4 bg-[#58CC02] hover:bg-[#49a802] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  <BookOpen className="w-5 h-5" /> Launch App
                </Button>
              </form>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <PrivacyPolicyModal />
          </div>

        </div>
      )}
    </div>
  );
}
