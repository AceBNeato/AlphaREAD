import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { 
  Database,
  ArrowLeft, 
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"teachers" | "students" | "security">("teachers");
  const [loading, setLoading] = useState(true);

  // Data lists
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  // Visibility of access codes/PINs
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // CRUD for Teachers
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherAlias, setTeacherAlias] = useState("");
  const [teacherPin, setTeacherPin] = useState("");

  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherEmail, setEditTeacherEmail] = useState("");
  const [editTeacherAlias, setEditTeacherAlias] = useState("");
  const [editTeacherPin, setEditTeacherPin] = useState("");

  // CRUD for Students
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentClassCode, setStudentClassCode] = useState("A1");
  const [studentTeacherId, setStudentTeacherId] = useState("");

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentFirstName, setEditStudentFirstName] = useState("");
  const [editStudentLastName, setEditStudentLastName] = useState("");
  const [editStudentClassCode, setEditStudentClassCode] = useState("");
  const [editStudentTeacherId, setEditStudentTeacherId] = useState("");

  // Security
  const [newAdminPin, setNewAdminPin] = useState("");
  const [adminPinError, setAdminPinError] = useState("");
  const [adminPinSuccess, setAdminPinSuccess] = useState("");

  useEffect(() => {
    const profileStr = localStorage.getItem("userProfile");
    if (!profileStr) {
      navigate("/admin-login");
      return;
    }
    const profile = JSON.parse(profileStr);
    if (profile.role !== "admin") {
      navigate("/");
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
      navigate("/");
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

  // ── TEACHER CRUD ──
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail.trim() || !teacherAlias.trim() || teacherPin.length !== 6) return;

    try {
      const teacherId = crypto.randomUUID();
      const { error } = await supabase.from("profiles").insert({
        id: teacherId,
        first_name: teacherAlias.trim(),
        last_name: "Teacher",
        role: "teacher",
        email: teacherEmail.trim().toLowerCase(),
        alias: teacherAlias.trim(),
        pin_hash: teacherPin,
        avatar: "👩‍🏫"
      });

      if (error) throw error;

      setIsCreatingTeacher(false);
      setTeacherEmail("");
      setTeacherAlias("");
      setTeacherPin("");
      fetchData(true);
    } catch (err: any) {
      alert(`Failed to register teacher: ${err.message}`);
    }
  };

  const startEditingTeacher = (teacher: any) => {
    setEditingTeacherId(teacher.id);
    setEditTeacherEmail(teacher.email || "");
    setEditTeacherAlias(teacher.alias || "");
    setEditTeacherPin(teacher.pin_hash || "");
  };

  const saveTeacherEdit = async (id: string) => {
    if (!editTeacherEmail.trim() || !editTeacherAlias.trim() || editTeacherPin.length !== 6) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        email: editTeacherEmail.trim().toLowerCase(),
        alias: editTeacherAlias.trim(),
        first_name: editTeacherAlias.trim(),
        pin_hash: editTeacherPin
      })
      .eq("id", id);

    if (error) {
      alert("Failed to update teacher profile.");
    } else {
      setEditingTeacherId(null);
      fetchData(true);
    }
  };

  const deleteTeacher = async (id: string) => {
    if (!window.confirm("Permanently delete this teacher? All their student links will be reset!")) return;
    
    // Reset teacher_id for all their students
    await supabase.from("profiles").update({ teacher_id: null }).eq("teacher_id", id);
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    
    if (error) {
      alert("Failed to delete teacher.");
    } else {
      fetchData(true);
    }
  };

  // ── STUDENT CRUD ──
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFirstName.trim() || !studentLastName.trim() || !studentClassCode.trim()) return;

    try {
      const studentCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const studentId = crypto.randomUUID();

      const { error } = await supabase.from("profiles").insert({
        id: studentId,
        first_name: studentFirstName.trim(),
        last_name: studentLastName.trim(),
        role: "student",
        student_code: studentCode,
        avatar: "👦",
        class_code: studentClassCode.trim().toUpperCase(),
        teacher_id: studentTeacherId || null
      });

      if (error) throw error;

      setIsCreatingStudent(false);
      setStudentFirstName("");
      setStudentLastName("");
      setStudentClassCode("A1");
      setStudentTeacherId("");
      fetchData(true);
    } catch (err: any) {
      alert(`Failed to register student: ${err.message}`);
    }
  };

  const startEditingStudent = (student: any) => {
    setEditingStudentId(student.id);
    setEditStudentFirstName(student.first_name || "");
    setEditStudentLastName(student.last_name || "");
    setEditStudentClassCode(student.class_code || "A1");
    setEditStudentTeacherId(student.teacher_id || "");
  };

  const saveStudentEdit = async (id: string) => {
    if (!editStudentFirstName.trim() || !editStudentLastName.trim() || !editStudentClassCode.trim()) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: editStudentFirstName.trim(),
        last_name: editStudentLastName.trim(),
        class_code: editStudentClassCode.trim().toUpperCase(),
        teacher_id: editStudentTeacherId || null
      })
      .eq("id", id);

    if (error) {
      alert("Failed to update student profile.");
    } else {
      setEditingStudentId(null);
      fetchData(true);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!window.confirm("Permanently delete this student from the system?")) return;

    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      alert("Failed to delete student.");
    } else {
      fetchData(true);
    }
  };

  const unlockDevice = async (id: string) => {
    if (!window.confirm("Unlock this student's device binding?")) return;

    const { error } = await supabase
      .from("profiles")
      .update({ activated_device_id: null })
      .eq("id", id);

    if (error) {
      alert("Failed to unlock device.");
    } else {
      alert("Device binding cleared successfully!");
      fetchData(true);
    }
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

  const toggleVisibility = (id: string) => {
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Master Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-gray-900 border border-gray-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/")} className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-gray-850">
              <ArrowLeft className="w-6 h-6" />
            </Button>
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
                navigate("/");
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
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-blue-400" />
                    System Teachers ({teachers.length})
                  </h2>
                  <div className="flex items-center gap-2 w-full sm:w-auto relative">
                    <div className="relative flex-1 sm:w-48 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search teachers..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    
                    <div>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="border-gray-800 text-gray-400 hover:text-white px-3"
                      >
                        <Filter className="w-4 h-4" />
                      </Button>
                      
                      {isFilterOpen && activeTab === "teachers" && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 z-20 animate-in fade-in slide-in-from-top-2">
                          <div className="text-xs font-bold text-gray-500 uppercase px-2 py-1.5 mb-1">Filter View</div>
                          <button onClick={() => setIsFilterOpen(false)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 rounded-lg transition-colors">All Teachers</button>
                          <button onClick={() => setIsFilterOpen(false)} className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded-lg transition-colors">Recently Added</button>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
                        setTeacherPin(randomPin);
                        setIsCreatingTeacher(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> Add Teacher
                    </Button>
                  </div>
                </div>

                {isCreatingTeacher && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleCreateTeacher} className="bg-gray-900 border border-gray-700 rounded-3xl p-6 sm:p-8 max-w-md w-full relative animate-in zoom-in duration-200 shadow-2xl">
                      <button 
                        type="button"
                        onClick={() => setIsCreatingTeacher(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-400" />
                        Register New Teacher
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-gray-400 font-bold mb-1.5">Alias/Name</label>
                          <input
                            type="text" required placeholder="e.g. Teacher Sarah"
                            value={teacherAlias} onChange={(e) => setTeacherAlias(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 font-bold mb-1.5">Email</label>
                          <input
                            type="email" required placeholder="sarah@school.com"
                            value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div className="mb-6">
                        <label className="block text-xs text-gray-400 font-bold mb-1.5 flex items-center justify-between">
                          <span>Auto-Generated 6-Digit PIN</span>
                          <span className="text-[10px] text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-md">Read Only</span>
                        </label>
                        <input
                          type="text" required maxLength={6}
                          value={teacherPin}
                          readOnly
                          className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-blue-400 outline-none font-mono tracking-widest text-center cursor-not-allowed opacity-80"
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setIsCreatingTeacher(false)} className="border-gray-700 hover:bg-gray-800 text-gray-300 flex-1 py-3 transition-colors">Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white flex-1 py-3">Register Teacher</Button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-gray-900 border border-gray-850 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-800/60 border-b border-gray-800 text-xs font-bold text-gray-300 uppercase tracking-wider">
                          <th className="py-4 px-6">Alias / Name</th>
                          <th className="py-4 px-6">Email</th>
                          <th className="py-4 px-6">Access PIN</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 text-sm">
                        {teachers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 px-6 text-center text-gray-500">No teachers registered yet.</td>
                          </tr>
                        ) : (
                          teachers
                            .filter(t => 
                              (t.alias || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (t.email || "").toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((teacher) => {
                            const isEditing = editingTeacherId === teacher.id;
                            const isCodeVisible = visibleCodes.has(teacher.id);

                            return (
                              <tr key={teacher.id} className="hover:bg-gray-850/40">
                                <td className="py-4 px-6 text-white font-bold">
                                  {isEditing ? (
                                    <input
                                      type="text" value={editTeacherAlias}
                                      onChange={(e) => setEditTeacherAlias(e.target.value)}
                                      className="px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white font-bold"
                                    />
                                  ) : (
                                    teacher.alias || "No Name"
                                  )}
                                </td>
                                <td className="py-4 px-6 font-mono text-gray-300">
                                  {isEditing ? (
                                    <input
                                      type="email" value={editTeacherEmail}
                                      onChange={(e) => setEditTeacherEmail(e.target.value)}
                                      className="px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white font-mono text-xs"
                                    />
                                  ) : (
                                    teacher.email
                                  )}
                                </td>
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-green-400 font-bold tracking-wider">
                                      {isEditing ? (
                                        <input
                                          type="text" maxLength={6} value={editTeacherPin}
                                          onChange={(e) => setEditTeacherPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                          className="px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white font-mono w-24 text-center tracking-widest"
                                        />
                                      ) : (
                                        isCodeVisible ? teacher.pin_hash : "••••••"
                                      )}
                                    </span>
                                    {!isEditing && (
                                      <button onClick={() => toggleVisibility(teacher.id)} className="text-gray-400 hover:text-white">
                                        {isCodeVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {isEditing ? (
                                      <>
                                        <button onClick={() => saveTeacherEdit(teacher.id)} className="p-1.5 bg-green-900/20 text-green-400 rounded-lg"><Save className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingTeacherId(null)} className="p-1.5 bg-gray-800 text-gray-400 rounded-lg"><X className="w-4 h-4" /></button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => startEditingTeacher(teacher)} className="p-1.5 bg-blue-900/20 text-blue-400 rounded-lg"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => deleteTeacher(teacher.id)} className="p-1.5 bg-red-900/20 text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                        <button
                                          onClick={() => {
                                            localStorage.setItem("userProfile", JSON.stringify({
                                              id: "teacher-preview",
                                              name: teacher.alias || "Teacher",
                                              avatar: "👨‍🏫",
                                              role: "teacher-preview",
                                              returnTo: "/admin",
                                              createdAt: new Date().toISOString()
                                            }));
                                            navigate("/dashboard");
                                          }}
                                          className="p-1.5 bg-indigo-900/20 text-indigo-400 rounded-lg hover:bg-indigo-900/40"
                                          title="Open App Preview"
                                        >
                                          <Smartphone className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: STUDENT CRUD ── */}
            {activeTab === "students" && (
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    All System Students ({students.length})
                  </h2>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto relative">
                    <div className="relative flex-1 sm:w-48 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search students..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    
                    <div>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="border-gray-800 text-gray-400 hover:text-white px-3"
                      >
                        <Filter className="w-4 h-4" />
                      </Button>
                      
                      {isFilterOpen && activeTab === "students" && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 z-20 animate-in fade-in slide-in-from-top-2">
                          <div className="text-xs font-bold text-gray-500 uppercase px-2 py-1.5 mb-1">Filter View</div>
                          <button onClick={() => setIsFilterOpen(false)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 rounded-lg transition-colors">All Students</button>
                          <button onClick={() => setIsFilterOpen(false)} className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded-lg transition-colors">Recently Added</button>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => setIsCreatingStudent(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> Add Student
                    </Button>
                  </div>
                </div>

                {isCreatingStudent && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleCreateStudent} className="bg-gray-900 border border-gray-700 rounded-3xl p-6 sm:p-8 max-w-md w-full relative animate-in zoom-in duration-200 shadow-2xl">
                      <button 
                        type="button"
                        onClick={() => setIsCreatingStudent(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-400" />
                        Register New Student
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-gray-400 font-bold mb-1.5">First Name</label>
                          <input
                            type="text" required placeholder="e.g. John"
                            value={studentFirstName} onChange={(e) => setStudentFirstName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 font-bold mb-1.5">Last Name</label>
                          <input
                            type="text" required placeholder="e.g. Doe"
                            value={studentLastName} onChange={(e) => setStudentLastName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-xs text-gray-400 font-bold mb-1.5">Class Code (e.g. A1)</label>
                          <input
                            type="text" required placeholder="e.g. A1"
                            value={studentClassCode} onChange={(e) => setStudentClassCode(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white outline-none focus:border-blue-500 font-mono uppercase transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 font-bold mb-1.5">Assigned Teacher</label>
                          <select
                            value={studentTeacherId} onChange={(e) => setStudentTeacherId(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white outline-none focus:border-blue-500 transition-colors appearance-none"
                          >
                            <option value="">-- No Teacher --</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.alias}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setIsCreatingStudent(false)} className="border-gray-700 hover:bg-gray-800 text-gray-300 flex-1 py-3 transition-colors">Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white flex-1 py-3">Register Student</Button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-gray-900 border border-gray-850 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-800/60 border-b border-gray-800 text-xs font-bold text-gray-300 uppercase tracking-wider">
                          <th className="py-4 px-6">Class</th>
                          <th className="py-4 px-6">Student Name</th>
                          <th className="py-4 px-6">Student Code</th>
                          <th className="py-4 px-6">Linked Teacher</th>
                          <th className="py-4 px-6">Binding</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 text-sm">
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 px-6 text-center text-gray-500">No students registered yet.</td>
                          </tr>
                        ) : (
                          students
                            .filter(s => 
                              (s.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (s.last_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (s.class_code || "").toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((student) => {
                            const isEditing = editingStudentId === student.id;
                            const isCodeVisible = visibleCodes.has(student.id);
                            const linkedTeacher = teachers.find(t => t.id === student.teacher_id);

                            return (
                              <tr key={student.id} className="hover:bg-gray-850/40">
                                
                                {/* Class Code */}
                                <td className="py-4 px-6 font-mono font-bold text-indigo-400">
                                  {isEditing ? (
                                    <input
                                      type="text" value={editStudentClassCode}
                                      onChange={(e) => setEditStudentClassCode(e.target.value)}
                                      className="px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white font-mono uppercase w-16"
                                    />
                                  ) : (
                                    student.class_code || "N/A"
                                  )}
                                </td>

                                {/* Student Name */}
                                <td className="py-4 px-6 text-white font-bold">
                                  {isEditing ? (
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text" value={editStudentFirstName}
                                        onChange={(e) => setEditStudentFirstName(e.target.value)}
                                        className="px-2 py-0.5 bg-gray-950 border border-gray-800 rounded text-white text-xs w-24"
                                      />
                                      <input
                                        type="text" value={editStudentLastName}
                                        onChange={(e) => setEditStudentLastName(e.target.value)}
                                        className="px-2 py-0.5 bg-gray-950 border border-gray-800 rounded text-white text-xs w-24"
                                      />
                                    </div>
                                  ) : (
                                    `${student.first_name} ${student.last_name}`
                                  )}
                                </td>

                                {/* Student Code */}
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-green-400 font-bold tracking-wider">
                                      {isCodeVisible ? student.student_code : "••••••"}
                                    </span>
                                    <button onClick={() => toggleVisibility(student.id)} className="text-gray-400 hover:text-white">
                                      {isCodeVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </td>

                                {/* Linked Teacher */}
                                <td className="py-4 px-6 font-semibold text-gray-300">
                                  {isEditing ? (
                                    <select
                                      value={editStudentTeacherId}
                                      onChange={(e) => setEditStudentTeacherId(e.target.value)}
                                      className="bg-gray-955 border border-gray-800 rounded text-white text-xs px-2 py-1"
                                    >
                                      <option value="">-- No Teacher --</option>
                                      {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.alias}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    linkedTeacher ? linkedTeacher.alias : <span className="text-gray-500 font-normal">Unassigned</span>
                                  )}
                                </td>

                                {/* Binding */}
                                <td className="py-4 px-6">
                                  {student.activated_device_id ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-900/40 border border-blue-800 rounded-full text-xs font-semibold text-blue-300">
                                      <Smartphone className="w-3.5 h-3.5" /> Bound
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-400">
                                      Unbound
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-4 px-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {student.activated_device_id && (
                                      <button onClick={() => unlockDevice(student.id)} className="p-1.5 bg-yellow-900/20 text-yellow-400 rounded-lg hover:bg-yellow-900/40" title="Unlock Device"><Unlock className="w-4 h-4" /></button>
                                    )}
                                    {isEditing ? (
                                      <>
                                        <button onClick={() => saveStudentEdit(student.id)} className="p-1.5 bg-green-900/20 text-green-400 rounded-lg"><Save className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingStudentId(null)} className="p-1.5 bg-gray-800 text-gray-400 rounded-lg"><X className="w-4 h-4" /></button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => startEditingStudent(student)} className="p-1.5 bg-blue-900/20 text-blue-400 rounded-lg"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => deleteStudent(student.id)} className="p-1.5 bg-red-900/20 text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                      </>
                                    )}
                                  </div>
                                </td>

                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
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
