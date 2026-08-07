import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Lock, ArrowLeft, Loader2, Mail, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { supabase } from "../../lib/supabase";
import { checkLockout, triggerLockout } from "../utils/alerts";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLockedOut, setIsLockedOut] = useState(false);

  useEffect(() => {
    const check = () => setIsLockedOut(checkLockout());
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      // Just check if they exist as an admin using the secure RPC
      const emailClean = email.trim().toLowerCase();
      const { data: isValid, error: rpcError } = await supabase.rpc('check_staff_email', {
        p_email: emailClean,
        p_role: "admin"
      });

      if (rpcError || !isValid) {
         throw new Error("No administrator found with this email.");
      }

      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to verify admin email.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    if (checkLockout()) return;

    setLoading(true);
    setError("");

    try {
      const emailClean = email.trim().toLowerCase();
      const codeClean = otpCode.trim().toUpperCase();

      // Verify email + access code against the database via secure RPC
      const { data: admin, error: rpcError } = await supabase.rpc('verify_staff_login', {
        p_email: emailClean,
        p_pin: codeClean,
        p_ip: 'unknown'
      });

      if (rpcError) {
        throw new Error("Database Error: " + rpcError.message);
      }
      // Check if the database successfully committed the attempt but returned an error
      if (admin?.error) {
        throw new Error(admin.error);
      }
      if (!admin || admin.role !== 'admin') {
        throw new Error("Invalid admin email or access code.");
      }

      // ── Establish Real Supabase Session for RLS ──
      // We sync their custom code as a Supabase Password so RLS works
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

      // Link auth_id if needed
      if (!admin.auth_id && authData?.session?.user?.id) {
        await supabase
          .from("profiles")
          .update({ auth_id: authData.session.user.id })
          .eq("id", admin.id);
      }

      localStorage.setItem("userProfile", JSON.stringify({
        id: admin.id,
        name: admin.first_name || "Admin",
        avatar: "🛡️",
        role: "admin",
        createdAt: admin.created_at
      }));

      navigate("/admin", { replace: true });
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setOtpCode("");
      if (err.message && err.message.includes("Too many failed")) {
        triggerLockout();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-dashboard min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-10">
        <Button onClick={() => navigate("/")} className="rounded-2xl px-5 py-6 bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800 hover:border-gray-700 flex items-center gap-2 font-bold text-base transition-all shadow-lg">
          <ArrowLeft className="w-5 h-5" /> Back to Portal
        </Button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8 sm:p-10 max-w-sm w-full text-center relative z-10">
        <div className="w-18 h-18 mx-auto mb-6 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <Lock className="w-8 h-8 text-blue-400 animate-pulse" />
        </div>

        <h2 className="text-2xl font-black text-white mb-2">
          Admin Access
        </h2>
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">
          {step === "email" ? "Enter your administrator email to continue." : "Enter your 8-character Admin Access Code."}
        </p>

        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                required
                disabled={isLockedOut}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.com"
                autoFocus
                className={`w-full text-center text-lg p-4 pl-12 bg-gray-950 border-2 rounded-2xl outline-none transition-colors text-white ${error
                    ? "border-red-500 text-red-500 focus:border-red-500"
                    : "border-gray-800 focus:border-blue-500"
                  }`}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm font-semibold animate-shake">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !email.trim() || isLockedOut}
              className="w-full py-6 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Verifying..." : "Continue"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6 animate-in slide-in-from-right duration-300">
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                required
                disabled={isLockedOut}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                placeholder="••••••••"
                autoFocus
                className={`w-full text-center text-3xl font-mono tracking-[0.5em] p-4 bg-gray-950 border-2 rounded-2xl outline-none transition-colors text-white ${error
                    ? "border-red-500 text-red-500 focus:border-red-500"
                    : "border-gray-800 focus:border-blue-500"
                  }`}
              />
            </div>

            {successMsg && (
              <p className="text-green-500 text-sm font-semibold">{successMsg}</p>
            )}

            {error && (
              <p className="text-red-500 text-sm font-semibold animate-shake">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || otpCode.length < 6 || isLockedOut}
              className="w-full py-6 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              <ShieldCheck className="w-5 h-5" /> Verify & Access
            </Button>
            
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtpCode("");
                setError("");
                setSuccessMsg("");
              }}
              className="text-sm text-gray-500 hover:text-gray-300 mt-2"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
