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
  const [activeTab, setActiveTab] = useState<"teachers" | "students">("teachers");
  const [loading, setLoading] = useState(true);

  // Data lists
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(null);


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
    
    // Get current profile id
    const profileStr = localStorage.getItem("userProfile");
    const profile = profileStr ? JSON.parse(profileStr) : null;
    
    if (!profile || !profile.id) {
      localStorage.removeItem("userProfile");
      navigate("/", { replace: true });
      return;
    }

    // Securely verify this specific user is an admin
    const { data: admin, error: adminErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.id)
      .eq("role", "admin")
      .maybeSingle();
      
    if (adminErr) {
      console.error("Admin Fetch Error:", adminErr);
    }
      
    if (!admin || admin.role !== "admin") {
      localStorage.removeItem("userProfile");
      alert("Admin access revoked, invalid, or deleted.");
      navigate("/", { replace: true });
      return;
    }
    setAdminProfile(admin);

    // Fetch Teachers
    const { data: teachersData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .order("first_name", { ascending: true });
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
              onClick={() => navigate("/dashboard")}
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Open App
            </Button>
            <Button
              onClick={() => fetchData()}
              variant="outline"
              className="bg-transparent border-gray-800 hover:bg-gray-850 text-gray-300 font-bold px-3 py-2 rounded-xl flex items-center gap-2"
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
              className="bg-transparent border-gray-800 hover:bg-gray-850 text-gray-300 font-bold px-4 py-2 rounded-xl"
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



          </div>
        )}

      </div>
    </div>
  );
}
