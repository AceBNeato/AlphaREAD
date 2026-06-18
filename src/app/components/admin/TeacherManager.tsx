import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useNavigate } from "react-router";
import { 
  GraduationCap, Search, Filter, Plus, X, UserPlus, 
  Eye, EyeOff, Save, Edit, Trash2, Smartphone 
} from "lucide-react";
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
  const [teacherPin, setTeacherPin] = useState("");

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

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherEmail.trim() || !teacherAlias.trim()) return;

    try {
      const teacherId = crypto.randomUUID();
      const { error } = await supabase.from("profiles").insert({
        id: teacherId,
        first_name: teacherAlias.trim(),
        last_name: "Teacher",
        role: "teacher",
        email: teacherEmail.trim().toLowerCase(),
        alias: teacherAlias.trim(),
        avatar: "👩‍🏫"
      });

      if (error) throw error;

      // Simulate sending email by opening the user's default mail client prefilled with credentials
      const subject = encodeURIComponent("Your Alphabet GO Teacher Access");
      const body = encodeURIComponent(`Hello ${teacherAlias.trim()},\n\nYou have been added as a teacher to Alphabet GO.\n\nYour login email is: ${teacherEmail.trim().toLowerCase()}\n\nYou can log in securely using your email. A secure OTP code will be sent to your inbox.\n\nBest,\nAdmin`);
      window.open(`mailto:${teacherEmail.trim().toLowerCase()}?subject=${subject}&body=${body}`, "_blank");

      setIsCreatingTeacher(false);
      setTeacherEmail("");
      setTeacherAlias("");
      onRefresh();
    } catch (err: any) {
      alert(`Failed to register teacher: ${err.message}`);
    }
  };

  const startEditingTeacher = (teacher: any) => {
    setEditingTeacherId(teacher.id);
    setEditTeacherEmail(teacher.email || "");
    setEditTeacherAlias(teacher.alias || "");
  };

  const saveTeacherEdit = async (id: string) => {
    if (!editTeacherEmail.trim() || !editTeacherAlias.trim()) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        email: editTeacherEmail.trim().toLowerCase(),
        alias: editTeacherAlias.trim(),
        first_name: editTeacherAlias.trim()
      })
      .eq("id", id);

    if (error) {
      alert("Failed to update teacher profile.");
    } else {
      setEditingTeacherId(null);
      onRefresh();
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
              className="border-gray-800 text-gray-400 hover:text-white px-3"
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
            <div className="flex gap-3 mt-6">
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
  );
}
