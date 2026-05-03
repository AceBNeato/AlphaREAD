import { useState } from "react";
import { useNavigate } from "react-router";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  // For a college project, a simple hardcoded PIN is often enough for a "Grown-Ups Only" gate.
  // We can connect this to Supabase Auth later if the professor requires strict Authentication.
  const correctPin = "1234";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === correctPin) {
      // Success, go to admin dashboard
      navigate("/admin");
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="absolute top-6 left-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="rounded-full p-2">
          <ArrowLeft className="w-6 h-6 text-gray-500" />
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-10 max-w-sm w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
          <Lock className="w-10 h-10 text-blue-500" />
        </div>
        
        <h2 className="text-3xl mb-2 text-gray-800 dark:text-gray-100">
          Teacher Access
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Enter the admin PIN to manage students and database.
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div>
            <input
              type="password"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 4-digit PIN"
              className={`w-full text-center text-3xl tracking-widest p-4 border-2 rounded-2xl outline-none transition-colors ${
                error 
                  ? "border-red-500 bg-red-50 text-red-500" 
                  : "border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-blue-500"
              }`}
            />
            {error && (
              <p className="text-red-500 text-sm mt-2 font-medium">Incorrect PIN</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full py-6 text-xl rounded-2xl bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all"
          >
            Unlock Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
}
