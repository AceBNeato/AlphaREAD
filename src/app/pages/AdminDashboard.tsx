import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { 
  Database,
  Trash2, 
  Edit, 
  Save, 
  X, 
  Unlock, 
  Eye, 
  EyeOff, 
  Users, 
  GraduationCap, 
  Key, 
  UserPlus, 
  ShieldCheck, 
  Smartphone,
  Calendar,
  Lock,
  Plus,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";
import { Button } from "../components/ui/button";
import { TeacherManager } from "../components/admin/TeacherManager";
import { StudentManager } from "../components/admin/StudentManager";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"teachers" | "students" | "security">("teachers");
  const [loading, setLoading] = useState(true);

  // Data lists
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Security
  const [newAdminPin, setNewAdminPin] = useState("");
  const [adminPinError, setAdminPinError] = useState("");
  const [adminPinSuccess, setAdminPinSuccess] = useState("");

  useEffect(() => {
    const profileStr = localStorage.getItem("userProfile");
    if (!profileStr) {
      navigate("/admin-login", { replace: true });
      return;
    }
    const profile = JSON.parse(profileStr);
    if (profile.role !== "admin") {
      navigate("/", { replace: true });
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    // Fetch Admin profile
    const { data: admin } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "admin")
      .maybeSingle();
      
    if (!admin) {
      localStorage.removeItem("userProfile");
      alert("Admin access has been revoked or deleted.");
      navigate("/", { replace: true });
      return;
    }
    setAdminProfile(admin);

    // Fetch Teachers
    const { data: teachersData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .order("alias", { ascending: true });
    setTeachers(teachersData || []);

    // Fetch Students with Teacher details
    const { data: studentsData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("class_code", { ascending: true })
      .order("last_name", { ascending: true });
    setStudents(studentsData || []);

    if (!silent) setLoading(false);
  };

  // ── ADMIN SECURITY PIN CHANGE (Once a week restriction) ──
  const handleChangeAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPin.length !== 6) return;
    setAdminPinError("");
    setAdminPinSuccess("");

    if (adminProfile?.pin_last_changed) {
      const lastChanged = new Date(adminProfile.pin_last_changed);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      if (lastChanged > oneWeekAgo) {
        const nextAvailable = new Date(lastChanged);
        nextAvailable.setDate(nextAvailable.getDate() + 7);
        setAdminPinError(`You can only edit your PIN once a week. Available on: ${nextAvailable.toLocaleDateString()}`);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        pin_hash: newAdminPin,
        pin_last_changed: new Date().toISOString()
      })
      .eq("id", adminProfile.id);

    if (error) {
      setAdminPinError("Failed to update Admin PIN.");
    } else {
      setAdminPinSuccess("Admin PIN updated successfully!");
      setNewAdminPin("");
      fetchData(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Master Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-gray-900 border border-gray-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3">

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                <Database className="w-7 h-7 text-blue-500" />
                Admin Dashboard
              </h1>
              <p className="text-gray-400 text-xs mt-0.5">AlphabetGO Master Control Center</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => fetchData()}
              variant="outline"
              className="border-gray-800 hover:bg-gray-850 text-gray-300 font-bold px-3 py-2 rounded-xl flex items-center gap-2"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => {
                localStorage.removeItem("userProfile");
                navigate("/", { replace: true });
              }}
              variant="outline"
              className="border-gray-800 hover:bg-gray-850 text-gray-300 font-bold px-4 py-2 rounded-xl"
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Tabs Bar */}
        <div className="flex border-b border-gray-800 mb-8 overflow-x-auto gap-4">
          <button
            onClick={() => setActiveTab("teachers")}
            className={`py-3 px-4 text-sm font-black border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "teachers" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Manage Teachers
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={`py-3 px-4 text-sm font-black border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "students" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Users className="w-4 h-4" /> Manage Students
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`py-3 px-4 text-sm font-black border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "security" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> System Security
          </button>
        </div>

        {/* LOADING SCREEN */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Querying secure records...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* ── TAB 1: TEACHER CRUD ── */}
            {activeTab === "teachers" && (
              <TeacherManager teachers={teachers} onRefresh={() => fetchData(true)} />
            )}

            {/* ── TAB 2: STUDENT CRUD ── */}
            {activeTab === "students" && (
              <StudentManager students={students} teachers={teachers} onRefresh={() => fetchData(true)} />
            )}

            {/* ── TAB 3: SYSTEM SECURITY / PIN CHANGE ── */}
            {activeTab === "security" && adminProfile && (
              <div className="bg-gray-900 border border-gray-850 p-6 rounded-3xl max-w-lg shadow-2xl">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white mb-6">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  Admin Security settings
                </h2>
                
                <div className="bg-blue-950/20 border border-blue-900/40 p-4 rounded-2xl mb-6 text-sm text-blue-300 leading-relaxed flex gap-3">
                  <Calendar className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Weekly Safety Guard Active</p>
                    <p className="mt-1 text-xs text-blue-400">
                      Administrative PINs may only be altered once every 7 days. 
                      {adminProfile.pin_last_changed ? (
                        <> Last modified on: <span className="font-bold">{new Date(adminProfile.pin_last_changed).toLocaleString()}</span></>
                      ) : (
                        " Has not been edited yet."
                      )}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleChangeAdminPin} className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">New 6-Digit Admin PIN</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="password"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={newAdminPin}
                        onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter new 6-digit PIN"
                        className="w-full pl-10 pr-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white outline-none focus:border-blue-500 font-mono tracking-widest text-center"
                      />
                    </div>
                  </div>

                  {adminPinError && (
                    <p className="text-red-400 text-sm font-semibold">{adminPinError}</p>
                  )}
                  {adminPinSuccess && (
                    <p className="text-green-400 text-sm font-semibold">{adminPinSuccess}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={newAdminPin.length !== 6}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    Update Security PIN
                  </Button>
                </form>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
