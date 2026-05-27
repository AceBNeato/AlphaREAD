import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Unlock, 
  Eye, 
  EyeOff, 
  LogOut, 
  ExternalLink,
  GraduationCap,
  Sparkles,
  Smartphone
} from "lucide-react";
import { Button } from "../components/ui/button";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CRUD state
  const [isCreating, setIsCreating] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newClassCode, setNewClassCode] = useState("A1");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editClassCode, setEditClassCode] = useState("");

  // Visibility of access codes
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const profileStr = localStorage.getItem("userProfile");
    if (!profileStr) {
      navigate("/");
      return;
    }
    const profile = JSON.parse(profileStr);
    if (profile.role !== "teacher") {
      navigate("/");
      return;
    }
    setTeacherProfile(profile);
    fetchStudents(profile.id);

    // Verify teacher account still exists
    const verifyAccount = async () => {
      const { error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", profile.id)
        .single();
        
      if (error && (error.code === "PGRST116" || error.details?.includes("Results contain 0 rows"))) {
        localStorage.removeItem("userProfile");
        alert("Your teacher account has been deleted by an administrator.");
        navigate("/");
      }
    };
    verifyAccount();
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

  const generateStudentCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newClassCode.trim()) return;

    try {
      const studentCode = generateStudentCode();
      const studentId = crypto.randomUUID();

      const { error } = await supabase.from("profiles").insert({
        id: studentId,
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        role: "student",
        student_code: studentCode,
        avatar: "👦",
        teacher_id: teacherProfile.id,
        class_code: newClassCode.trim().toUpperCase()
      });

      if (error) throw error;

      setIsCreating(false);
      setNewFirstName("");
      setNewLastName("");
      setNewClassCode("A1");
      fetchStudents(teacherProfile.id);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to create student: ${err.message}`);
    }
  };

  const startEditing = (student: any) => {
    setEditingId(student.id);
    setEditFirstName(student.first_name || "");
    setEditLastName(student.last_name || "");
    setEditClassCode(student.class_code || "A1");
  };

  const saveEdit = async (id: string) => {
    if (!editFirstName.trim() || !editLastName.trim() || !editClassCode.trim()) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        class_code: editClassCode.trim().toUpperCase()
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to update student.");
    } else {
      setEditingId(null);
      fetchStudents(teacherProfile.id);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this student?")) return;

    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Failed to delete student.");
    } else {
      fetchStudents(teacherProfile.id);
    }
  };

  const unlockDevice = async (id: string) => {
    if (!window.confirm("Unlock this student's device so they can sign in on a new device?")) return;

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

  const handleLogout = () => {
    localStorage.removeItem("userProfile");
    navigate("/");
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
    navigate("/dashboard");
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
              className="border-gray-700 hover:bg-gray-700 text-gray-300 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
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
          <Button
            onClick={() => setIsCreating(true)}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Register Student
          </Button>
        </div>

        {/* Create Student Form Overlay */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form 
              onSubmit={handleCreateStudent}
              className="bg-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-700 shadow-2xl relative animate-in zoom-in duration-200"
            >
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-400" />
                Register New Student
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">First Name</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Class Code</label>
                  <input
                    type="text"
                    required
                    value={newClassCode}
                    onChange={(e) => setNewClassCode(e.target.value)}
                    placeholder="e.g. A1, B3"
                    className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white outline-none focus:border-indigo-500 transition-colors uppercase"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button" 
                  onClick={() => setIsCreating(false)} 
                  variant="outline"
                  className="flex-1 py-3 text-gray-400 border-gray-700 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-green-600 hover:bg-green-500 py-3 text-white"
                >
                  Register
                </Button>
              </div>
            </form>
          </div>
        )}

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
              <p className="text-lg font-bold text-white mb-2">No students registered yet</p>
              <p className="text-sm max-w-sm mx-auto">Click "Register Student" above to add your first student and generate an access code.</p>
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
                    const isEditing = editingId === student.id;
                    const isCodeVisible = visibleCodes.has(student.id);

                    return (
                      <tr key={student.id} className="hover:bg-gray-750 transition-colors">
                        
                        {/* Class Code */}
                        <td className="py-4 px-6 font-mono font-bold text-indigo-400">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editClassCode}
                              onChange={(e) => setEditClassCode(e.target.value)}
                              className="w-16 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white font-mono uppercase"
                            />
                          ) : (
                            student.class_code || "N/A"
                          )}
                        </td>

                        {/* Name */}
                        <td className="py-4 px-6 font-semibold text-white">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editFirstName}
                                onChange={(e) => setEditFirstName(e.target.value)}
                                className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white"
                              />
                              <input
                                type="text"
                                value={editLastName}
                                onChange={(e) => setEditLastName(e.target.value)}
                                className="px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white"
                              />
                            </div>
                          ) : (
                            `${student.first_name} ${student.last_name}`
                          )}
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

                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(student.id)}
                                  className="p-2 bg-green-900/20 text-green-400 hover:bg-green-900/40 rounded-xl transition-all"
                                  title="Save Changes"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-xl transition-all"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(student)}
                                  className="p-2 bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40 rounded-xl transition-all"
                                  title="Edit Student"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteStudent(student.id)}
                                  className="p-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl transition-all"
                                  title="Delete Student"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
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
