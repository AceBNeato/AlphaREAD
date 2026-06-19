import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useNavigate } from "react-router";
import { 
  GraduationCap, Search, Filter, Plus, X, UserPlus, 
  Eye, EyeOff, Save, Edit, Trash2, Smartphone, RefreshCw, Copy, Check 
} from "lucide-react";
import { confirmAction, showAlert } from "../../utils/alerts";
import { Button } from "../ui/button";

interface TeacherManagerProps {
  teachers: any[];
  onRefresh: () => void;
}

export function TeacherManager({ teachers, onRefresh }: TeacherManagerProps) {
  const navigate = useNavigate();

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Visibility of access codes/PINs
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());

  // CRUD for Teachers
  const [isCreatingTeacher, setIsCreatingTeacher] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherAlias, setTeacherAlias] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherEmail, setEditTeacherEmail] = useState("");
  const [editTeacherAlias, setEditTeacherAlias] = useState("");

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

  const generateAccessCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail.trim() || !teacherAlias.trim()) return;

    try {
      const teacherId = crypto.randomUUID();
      const accessCode = generateAccessCode();

      const { error } = await supabase.from("profiles").insert({
        id: teacherId,
        first_name: teacherAlias.trim(),
        last_name: "Teacher",
        role: "teacher",
        email: teacherEmail.trim().toLowerCase(),
        avatar: "👩‍🏫",
        pin_hash: accessCode
      });

      if (error) throw error;

      // Show the code to admin before closing
      setCreatedCode(accessCode);
      setTimeout(() => {
        setCreatedCode(null);
        setIsCreatingTeacher(false);
        setTeacherEmail("");
        setTeacherAlias("");
        onRefresh();
      }, 8000);
    } catch (err: any) {
      showAlert("Error", `Failed to register teacher: ${err.message}`);
    }
  };

  const regenerateCode = async (teacherId: string) => {
    const confirm = await confirmAction("Regenerate Code?", "Generate a new access code for this teacher? The old one will stop working.");
    if (!confirm) return;
    const newCode = generateAccessCode();
    const { error } = await supabase.from("profiles").update({ pin_hash: newCode }).eq("id", teacherId);
    if (error) {
      showAlert("Error", "Failed to regenerate code.");
    } else {
      showAlert("Success", `New access code: ${newCode}<br><br>Please share this with the teacher.`, "success");
      onRefresh();
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEditingTeacher = (teacher: any) => {
    setEditingTeacherId(teacher.id);
    setEditTeacherEmail(teacher.email || "");
    setEditTeacherAlias(teacher.first_name || "");
  };

  const saveTeacherEdit = async (id: string) => {
    if (!editTeacherEmail.trim() || !editTeacherAlias.trim()) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        email: editTeacherEmail.trim().toLowerCase(),
        first_name: editTeacherAlias.trim()
      })
      .eq("id", id);

    if (error) {
      showAlert("Error", "Failed to update teacher profile.");
    } else {
      setEditingTeacherId(null);
      onRefresh();
    }
  };

  const deleteTeacher = async (id: string) => {
    const confirm = await confirmAction("Delete Teacher?", "Permanently delete this teacher? All their student links will be reset!");
    if (!confirm) return;
    
    // Reset teacher_id for all their students
    await supabase.from("profiles").update({ teacher_id: null }).eq("teacher_id", id);
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    
    if (error) {
      showAlert("Error", "Failed to delete teacher.");
    } else {
      onRefresh();
    }
  };

  return (
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
              className="bg-transparent border-gray-800 text-gray-400 hover:text-white px-3"
            >
              <Filter className="w-4 h-4" />
            </Button>
            
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 z-20 animate-in fade-in slide-in-from-top-2">
                <div className="text-xs font-bold text-gray-500 uppercase px-2 py-1.5 mb-1">Filter View</div>
                <button onClick={() => setIsFilterOpen(false)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 rounded-lg transition-colors">All Teachers</button>
                <button onClick={() => setIsFilterOpen(false)} className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 rounded-lg transition-colors">Recently Added</button>
              </div>
            )}
          </div>

          <Button
            onClick={() => {
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
          {createdCode ? (
            <div className="bg-gray-900 border border-green-800 rounded-3xl p-6 sm:p-8 max-w-md w-full relative animate-in zoom-in duration-200 shadow-2xl text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Teacher Registered!</h3>
              <p className="text-sm text-gray-400 mb-4">Share this access code with the teacher. Your email client has been opened.</p>
              <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1">ACCESS CODE</p>
                <p className="text-3xl font-mono font-black tracking-[0.3em] text-green-400">{createdCode}</p>
              </div>
              <p className="text-xs text-yellow-400/70">This dialog will close automatically...</p>
            </div>
          ) : (
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
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">An 8-character access code will be auto-generated and your email client will open so you can send it to the teacher.</p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsCreatingTeacher(false)} className="bg-transparent border-gray-700 hover:bg-gray-800 text-gray-300 flex-1 py-3 transition-colors">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white flex-1 py-3">Register & Send Code</Button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-850 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/60 border-b border-gray-800 text-xs font-bold text-gray-300 uppercase tracking-wider">
                <th className="py-4 px-6">Alias / Name</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">Access Code</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-6 text-center text-gray-500">No teachers registered yet.</td>
                </tr>
              ) : (
                teachers
                  .filter(t => 
                    (t.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
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
                          teacher.first_name || "No Name"
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-green-400 font-bold tracking-wider">
                            {isCodeVisible ? (teacher.pin_hash || "—") : "••••••••"}
                          </span>
                          <button onClick={() => toggleVisibility(teacher.id)} className="text-gray-400 hover:text-white p-1">
                            {isCodeVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {isCodeVisible && teacher.pin_hash && (
                            <button
                              onClick={() => copyCode(teacher.pin_hash, teacher.id)}
                              className="text-gray-400 hover:text-white p-1"
                              title="Copy code"
                            >
                              {copiedId === teacher.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
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
                                    name: teacher.first_name || "Teacher",
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
  );
}
