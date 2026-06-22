import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { 
  Users, 
  UserPlus, 
  Save, 
  X, 
  Unlock, 
  Eye, 
  EyeOff, 
  LogOut, 
  ExternalLink,
  GraduationCap,
  Sparkles,
  Smartphone,
  Edit
} from "lucide-react";
import { confirmAction } from "../utils/alerts";
import { Button } from "../components/ui/button";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Visibility of access codes
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const profileStr = localStorage.getItem("userProfile");
    if (!profileStr) {
      navigate("/", { replace: true });
      return;
    }
    const profile = JSON.parse(profileStr);
    if (profile.role !== "teacher") {
      navigate("/", { replace: true });
      return;
    }
    setTeacherProfile(profile);
    fetchStudents(profile.id);

    // Verify teacher account still exists and is actually a teacher
    const verifyAccount = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, current_device_id")
        .eq("id", profile.id)
        .eq("role", "teacher")
        .single();
        
      if (error || !data || data.role !== "teacher") {
        localStorage.removeItem("userProfile");
        alert("Teacher access revoked, invalid, or deleted.");
        navigate("/", { replace: true });
        return;
      }

      // Check if an Admin forced a logout (unlocked the account) or another device took over
      // Since the secure RPC now ensures devices register properly, if the DB is null or doesn't match, they must be kicked.
      if (profile.deviceId && data.current_device_id !== profile.deviceId) {
        localStorage.removeItem("userProfile");
        alert("Session Expired: An admin forcefully unlocked your account, or you logged in elsewhere.");
        navigate("/", { replace: true });
      }
    };
    verifyAccount();

    // HTMX-style live polling: Continuously check if the admin forcefully logged them out
    const intervalId = setInterval(verifyAccount, 5000);

    return () => clearInterval(intervalId);
  }, [navigate]);

  const fetchStudents = async (teacherId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .eq("teacher_id", teacherId)
      .order("class_code", { ascending: true })
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Error fetching students:", error);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  const unlockDevice = async (id: string) => {
    const confirm = await confirmAction("Unlock Device?", "Unlock this student's device so they can sign in on a new device?");
    if (!confirm) return;

    const { error } = await supabase
      .from("profiles")
      .update({ activated_device_id: null })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to unlock device.");
    } else {
      alert("Device unlocked successfully!");
      fetchStudents(teacherProfile.id);
    }
  };

  const toggleCodeVisibility = (id: string) => {
    setVisibleCodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleLogout = async () => {
    if (teacherProfile?.id) {
      // Clear the current_device_id in the database to unlock the account for other devices
      await supabase.from("profiles").update({ current_device_id: null }).eq("id", teacherProfile.id);
    }
    localStorage.removeItem("userProfile");
    navigate("/", { replace: true });
  };

  const handleOpenApp = () => {
    // Inject a preview profile for the teacher to view lessons
    localStorage.setItem("userProfile", JSON.stringify({
      id: "teacher-preview",
      name: teacherProfile?.name || "Teacher",
      avatar: "👨‍🏫",
      role: "teacher-preview",
      returnTo: "/teacher-dashboard"
    }));
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gray-800 p-6 rounded-3xl border border-gray-700 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Teacher Dashboard</span>
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Welcome back, <span className="text-indigo-300 font-semibold">{teacherProfile?.name || "Teacher"}</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            <Button 
              onClick={handleOpenApp}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4" /> Open App
            </Button>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="bg-transparent border-gray-700 hover:bg-gray-700 text-gray-300 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </Button>
          </div>
        </header>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-indigo-400" />
            My Students ({students.length})
          </h2>
          <div className="text-sm text-gray-400">
            Contact your Administrator to register new students.
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-3xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400 text-sm">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <span className="text-5xl block mb-4">👦👧</span>
              <p className="text-lg font-bold text-white mb-2">No students assigned to you yet.</p>
              <p className="text-sm max-w-sm mx-auto">Please contact your administrator to assign students to your class.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-700/50 border-b border-gray-700 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    <th className="py-4 px-6">Class</th>
                    <th className="py-4 px-6">Student Name</th>
                    <th className="py-4 px-6">Access Code</th>
                    <th className="py-4 px-6">Device Bind</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60 text-sm">
                  {students.map((student) => {
                    const isCodeVisible = visibleCodes.has(student.id);

                    return (
                      <tr key={student.id} className="hover:bg-gray-750 transition-colors">
                        
                        {/* Class Code */}
                        <td className="py-4 px-6 font-mono font-bold text-indigo-400">
                          {student.class_code || "N/A"}
                        </td>

                        {/* Name */}
                        <td className="py-4 px-6 font-semibold text-white">
                          {`${student.first_name} ${student.last_name}`}
                        </td>

                        {/* Student Access Code */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold tracking-wider text-green-400 min-w-[70px]">
                              {isCodeVisible ? student.student_code : "••••••"}
                            </span>
                            <button
                              onClick={() => toggleCodeVisibility(student.id)}
                              className="p-1 hover:bg-gray-750 rounded text-gray-400 hover:text-white transition-colors"
                              title={isCodeVisible ? "Hide Access Code" : "Show Access Code"}
                            >
                              {isCodeVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>

                        {/* Device Binding */}
                        <td className="py-4 px-6">
                          {student.activated_device_id ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-300 border border-blue-800">
                              <Smartphone className="w-3.5 h-3.5" /> Bound
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-700/50 text-gray-400 border border-gray-600">
                              Unbound
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {student.activated_device_id && (
                              <button
                                onClick={() => unlockDevice(student.id)}
                                className="p-2 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 rounded-xl transition-all"
                                title="Unlock/Unbind Device"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
