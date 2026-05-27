import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Lock, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { supabase } from "../../lib/supabase";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) return;
    setLoading(true);
    setError("");

    try {
      // Look up admin profile in database
      let { data: admin, error: dbError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "admin")
        .maybeSingle();

      // If no admin profile exists, seed it with the default '999999' PIN
      if (!admin) {
        const adminId = crypto.randomUUID();
        const { data: newAdmin, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: adminId,
            first_name: "System",
            last_name: "Admin",
            role: "admin",
            email: "admin@system.com",
            pin_hash: "999999",
            avatar: "🛡️"
          })
          .select()
          .single();

        if (insertError) throw insertError;
        admin = newAdmin;
      }

      if (admin && admin.pin_hash === pin) {
        // Save admin profile locally
        localStorage.setItem("userProfile", JSON.stringify({
          id: admin.id,
          name: admin.first_name || "Admin",
          role: "admin",
          createdAt: admin.created_at
        }));
        navigate("/admin", { replace: true });
      } else {
        throw new Error("Incorrect Admin PIN.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-6 left-6 z-10">
        <Button variant="ghost" onClick={() => navigate("/")} className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-800">
          <ArrowLeft className="w-6 h-6" />
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
          Enter the 6-digit administrative PIN to manage the system. (Default: <code className="text-blue-400 font-bold font-mono">999999</code>)
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              autoFocus
              className={`w-full text-center text-4xl font-mono tracking-[0.25em] p-4 bg-gray-950 border-2 rounded-2xl outline-none transition-colors text-white ${error
                  ? "border-red-500 text-red-500 focus:border-red-500"
                  : "border-gray-800 focus:border-blue-500"
                }`}
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
            <p className="text-red-500 text-sm font-semibold animate-shake">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="w-full py-6 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Authenticating..." : "Unlock System"}
          </Button>
        </form>
      </div>
    </div>
  );
}
