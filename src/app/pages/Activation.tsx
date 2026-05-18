import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { KeyRound, Loader2, ShieldCheck, Lock } from "lucide-react";
import { Button } from "../components/ui/button";
import { generateUUID } from "../utils/uuid";


export default function Activation() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Splash screen delay and auto-redirect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      const profile = localStorage.getItem("userProfile");
      if (profile) {
        navigate("/dashboard");
      }
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Look up the student code in the profiles table
      const { data, error: dbError } = await supabase
        .from("profiles")
        .select("*")
        .eq("student_code", code.trim().toUpperCase())
        .single();

      if (dbError || !data) {
        throw new Error("Invalid activation code.");
      }

      // Check device lock
      let localDeviceId = localStorage.getItem("activated_device_id");
      if (!localDeviceId) {
        localDeviceId = generateUUID();
        localStorage.setItem("activated_device_id", localDeviceId);
      }

      if (data.activated_device_id) {
        // If the profile already has an activated_device_id, check if it matches
        if (data.activated_device_id !== localDeviceId) {
          throw new Error("This code has already been used on another device.");
        }
      } else {
        // First time use: lock the code to this device
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ activated_device_id: localDeviceId })
          .eq("id", data.id);

        if (updateError) {
          console.error("Error locking device", updateError);
        }
      }

      // Success! Save the profile locally
      const profile = {
        id: data.id,
        name: data.first_name,
        avatar: data.avatar || "👦",
        accent: "PH", // Hardcoded to Filipino English for all students
        createdAt: data.created_at,
      };
      
      localStorage.setItem("userProfile", JSON.stringify(profile));
      navigate("/dashboard");
      
    } catch (err: any) {
      setError(err.message || "Invalid code. Please check with your teacher.");
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 dark:bg-none dark:bg-[#0d141c] flex flex-col items-center justify-center p-6 relative">
      
      {/* --- SPLASH SCREEN --- */}
      {showSplash ? (
        <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#58CC02] rounded-full blur-2xl opacity-40 animate-pulse"></div>
            <div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl flex items-center justify-center relative z-10 transform rotate-12 hover:rotate-0 transition-transform duration-500 border-4 border-white dark:border-gray-700">
              <span className="text-6xl">🦉</span>
            </div>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-[#58CC02]">
            Commsforedu
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">
            Learn • Grow • Succeed
          </p>
          
          <div className="mt-12 flex gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
            <div className="w-3 h-3 bg-[#58CC02] rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
          </div>
        </div>
      ) : (
        /* --- ACTIVATION GATE --- */
        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Hidden Teacher Login Button (Top Right) */}
          <div className="absolute top-6 right-6 z-50">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/admin-login")}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Lock className="w-5 h-5" />
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-10 max-w-md w-full text-center relative overflow-hidden">
        
        {/* Decorative background element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div className="relative z-10">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">
            App Activation
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Enter the secure Student Code provided by your teacher to unlock the app.
          </p>

          <form onSubmit={handleActivate} className="flex flex-col gap-6">
            <div>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC-123"
                  className={`w-full text-center text-2xl tracking-widest pl-12 pr-4 py-4 border-2 rounded-2xl outline-none transition-colors uppercase ${
                    error 
                      ? "border-red-500 bg-red-50 text-red-500 placeholder-red-300" 
                      : "border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-blue-500"
                  }`}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm mt-3 font-medium animate-bounce">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !code.trim()}
              size="lg"
              className="w-full py-6 text-xl rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Verifying..." : "Unlock App"}
            </Button>
          </form>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-gray-400 dark:text-gray-500">
        Unauthorized access is prohibited.
      </p>
    </div>
      )}
    </div>
  );
}
