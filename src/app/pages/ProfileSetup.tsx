import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { ArrowLeft, User, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

const AVATARS = ["👦", "👧", "🦊", "🦁"];

const ACCENTS = [
  { code: "US", label: "American English" },
  { code: "PH", label: "Filipino English" },
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  const handleNext = () => {
    if (step === 1 && name.trim() && lastName.trim()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1 && step < 3) {
      setStep(step - 1);
    } else {
      navigate("/admin");
    }
  };

  const generateStudentCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    const code = generateStudentCode();
    setGeneratedCode(code);

    try {
      // Generate a UUID locally - no email/auth needed for student accounts
      const userId = crypto.randomUUID();

      const { error: dbError } = await supabase.from("profiles").insert({
        id: userId,
        first_name: name.trim(),
        last_name: lastName.trim(),
        role: "student",
        student_code: code,
        avatar: avatar
      });

      if (dbError) throw dbError;

      setIsSubmitting(false);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      alert(`Failed: ${err.message || JSON.stringify(err)}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e8f9f0] to-[#f0fdf4] dark:bg-none dark:bg-[#0d141c]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl text-gray-800 dark:text-gray-100">
            Create Profile
          </h1>
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
          {/* Progress Indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2].map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${i === step
                  ? "w-12 bg-[#58CC02]"
                  : i < step
                    ? "w-8 bg-[#58CC02]"
                    : "w-8 bg-gray-300 dark:bg-gray-600"
                  }`}
              />
            ))}
          </div>

          {/* Step 1: Name */}
          {step === 1 && (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#58CC02] to-[#1CB0F6] flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl mb-2 text-gray-800 dark:text-gray-100">
                What's the student's name?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Both First and Last name are required
              </p>
              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First Name"
                  className="w-full px-6 py-4 rounded-2xl border-3 border-[#58CC02] text-lg focus:outline-none focus:ring-2 focus:ring-[#58CC02] bg-white dark:bg-gray-700 dark:text-white"
                  autoFocus
                  required
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last Name"
                  className="w-full px-6 py-4 rounded-2xl border-3 border-[#58CC02] text-lg focus:outline-none focus:ring-2 focus:ring-[#58CC02] bg-white dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={handleNext}
                  disabled={!name.trim() || !lastName.trim()}
                  size="lg"
                  className="w-full max-w-xs py-6 text-xl rounded-2xl bg-[#58CC02] hover:bg-[#46a302] text-white disabled:opacity-40"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Avatar */}
          {step === 2 && (
            <div className="text-center">
              <h2 className="text-3xl mb-2 text-gray-800 dark:text-gray-100">
                Choose your avatar
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Pick an avatar that represents you
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {AVATARS.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAvatar(emoji)}
                    className={`aspect-square rounded-2xl flex items-center justify-center text-7xl transition-all hover:scale-105 ${avatar === emoji
                      ? "bg-[#e8f9d4] dark:bg-green-900/30 ring-4 ring-[#58CC02]"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  size="lg"
                  className="flex-1 py-6 text-lg rounded-2xl"
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  size="lg"
                  className="flex-1 py-6 text-lg rounded-2xl bg-[#58CC02] hover:bg-[#46a302] text-white flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isSubmitting ? "Creating..." : "Create Student"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success Screen */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <h2 className="text-3xl mb-2 text-gray-800 dark:text-gray-100">
                Student Created!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Give this 6-digit access code to {name}:
              </p>

              <div className="bg-gray-100 dark:bg-gray-900 border-4 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-8 mb-8">
                <span className="text-5xl font-mono font-bold tracking-[0.2em] text-[#58CC02]">
                  {generatedCode}
                </span>
              </div>

              <Button
                onClick={() => navigate("/admin")}
                size="lg"
                className="w-full py-6 text-xl rounded-2xl bg-[#1CB0F6] hover:bg-[#1899d6] text-white"
              >
                Return to Admin Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
