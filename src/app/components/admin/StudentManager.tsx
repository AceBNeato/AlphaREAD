import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Users, Search, Filter, Plus, X, UserPlus, Eye, EyeOff, Save, Edit, Trash2, Smartphone, Unlock } from "lucide-react";
import { confirmAction, showAlert } from "../../utils/alerts";
import { Button } from "../ui/button";

interface StudentManagerProps {
  students: any[];
  teachers: any[];
  onRefresh: () => void;
}

export function StudentManager({ students, teachers, onRefresh }: StudentManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterClass, setFilterClass] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterBinding, setFilterBinding] = useState("all");

  // Visibility of access codes/PINs
  const [visibleCodes, setVisibleCodes] = useState<Set<string>>(new Set());

  // CRUD for Students
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentClassCode, setStudentClassCode] = useState("A1");
  const [studentTeacherId, setStudentTeacherId] = useState("");
  const [studentPin, setStudentPin] = useState("");

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentFirstName, setEditStudentFirstName] = useState("");
  const [editStudentLastName, setEditStudentLastName] = useState("");
  const [editStudentClassCode, setEditStudentClassCode] = useState("");
  const [editStudentTeacherId, setEditStudentTeacherId] = useState("");
  const [editStudentPin, setEditStudentPin] = useState("");

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
        student_pin: studentPin,
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
      setStudentPin("");
      onRefresh();
    } catch (err: any) {
      showAlert("Error", `Failed to register student: ${err.message}`);
    }
  };

  const startEditingStudent = (student: any) => {
    setEditingStudentId(student.id);
    setEditStudentFirstName(student.first_name || "");
    setEditStudentLastName(student.last_name || "");
    setEditStudentClassCode(student.class_code || "A1");
    setEditStudentTeacherId(student.teacher_id || "");
    setEditStudentPin(student.student_pin || "");
  };

  const saveStudentEdit = async (id: string) => {
    if (!editStudentFirstName.trim() || !editStudentLastName.trim() || !editStudentClassCode.trim()) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: editStudentFirstName.trim(),
        last_name: editStudentLastName.trim(),
        class_code: editStudentClassCode.trim().toUpperCase(),
        student_pin: editStudentPin.trim().toUpperCase(),
        teacher_id: editStudentTeacherId || null
      })
      .eq("id", id);

    if (error) {
      showAlert("Error", "Failed to update student profile.");
    } else {
      setEditingStudentId(null);
      onRefresh();
    }
  };

  const deleteStudent = async (id: string) => {
    const confirm = await confirmAction("Delete Student?", "Permanently delete this student from the system?");
    if (!confirm) return;

    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      showAlert("Error", "Failed to delete student.");
    } else {
      onRefresh();
    }
  };

  const unlockDevice = async (id: string) => {
    const confirm = await confirmAction("Unlock Device?", "Unlock this student's device binding?");
    if (!confirm) return;

    const { error } = await supabase
      .from("profiles")
      .update({ activated_device_id: null })
      .eq("id", id);

    if (error) {
      showAlert("Error", "Failed to unlock device.");
    } else {
      showAlert("Success", "Device binding cleared successfully!", "success");
      onRefresh();
    }
  };

  return (
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
              className="bg-transparent border-gray-800 text-gray-400 hover:text-white px-3"
            >
              <Filter className="w-4 h-4" />
            </Button>
            
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 z-20 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-gray-500 uppercase">Filter View</div>
                  <button onClick={() => {
                    setFilterClass("");
                    setFilterTeacher("");
                    setFilterBinding("all");
                  }} className="text-xs text-blue-400 hover:text-blue-300">Clear All</button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">By Class Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A1"
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-950 border border-gray-800 rounded text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">By Teacher</label>
                    <select 
                      value={filterTeacher}
                      onChange={(e) => setFilterTeacher(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-950 border border-gray-800 rounded text-sm text-white"
                    >
                      <option value="">All Teachers</option>
                      <option value="unassigned">Unassigned</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.first_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">By Binding</label>
                    <select 
                      value={filterBinding}
                      onChange={(e) => setFilterBinding(e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-950 border border-gray-800 rounded text-sm text-white"
                    >
                      <option value="all">All Statuses</option>
                      <option value="bound">Bound Devices</option>
                      <option value="unbound">Unbound</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={() => {
              const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
              const pin = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
              setStudentPin(pin);
              setIsCreatingStudent(true);
            }}
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
                    <option key={t.id} value={t.id}>{t.first_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-xs text-gray-400 font-bold mb-1.5 flex items-center justify-between">
                <span>Secret PIN <span className="text-gray-600">(6 characters)</span></span>
                <button
                  type="button"
                  onClick={() => {
                    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                    setStudentPin(Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
                  }}
                  className="text-[10px] text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-md hover:bg-blue-900/50 transition-colors"
                >
                  Regenerate
                </button>
              </label>
              <input
                type="text" required maxLength={6}
                value={studentPin}
                onChange={(e) => setStudentPin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-green-400 outline-none font-mono tracking-widest text-center focus:border-blue-500 transition-colors"
                placeholder="e.g. AB3X9P"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsCreatingStudent(false)} className="bg-transparent border-gray-700 hover:bg-gray-800 text-gray-300 flex-1 py-3 transition-colors">Cancel</Button>
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
                <th className="py-4 px-6">Secret PIN</th>
                <th className="py-4 px-6">Linked Teacher</th>
                <th className="py-4 px-6">Binding</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {(() => {
                const filteredStudents = students.filter(s => {
                  // Text search
                  const matchesSearch = 
                    (s.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (s.last_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (s.class_code || "").toLowerCase().includes(searchQuery.toLowerCase());
                  
                  // Filters
                  const matchesClass = filterClass ? (s.class_code || "").toLowerCase() === filterClass.toLowerCase() : true;
                  const matchesTeacher = filterTeacher === "unassigned" ? !s.teacher_id : (filterTeacher ? s.teacher_id === filterTeacher : true);
                  const matchesBinding = filterBinding === "bound" ? !!s.activated_device_id : (filterBinding === "unbound" ? !s.activated_device_id : true);

                  return matchesSearch && matchesClass && matchesTeacher && matchesBinding;
                });

                if (filteredStudents.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="py-8 px-6 text-center text-gray-500">No students match your filters.</td>
                    </tr>
                  );
                }

                return (
                  <>
                    <tr className="bg-gray-850/50">
                      <td colSpan={7} className="py-2 px-6 text-xs text-gray-400 text-center border-b border-gray-800">
                        Showing {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
                      </td>
                    </tr>
                    {filteredStudents.map((student) => {
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
                        <span className="font-mono text-white font-bold tracking-wider">
                          {student.student_code}
                        </span>
                      </td>

                      {/* Secret PIN */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-green-400 font-bold tracking-wider">
                            {isEditing ? (
                              <input
                                type="text" maxLength={6} value={editStudentPin}
                                onChange={(e) => setEditStudentPin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                                className="px-2 py-1 bg-gray-950 border border-gray-800 rounded text-white font-mono w-24 text-center tracking-widest"
                                placeholder="6 chars"
                              />
                            ) : (
                              isCodeVisible ? student.student_pin : "••••••"
                            )}
                          </span>
                          {!isEditing && (
                            <button onClick={() => toggleVisibility(student.id)} className="text-gray-400 hover:text-white">
                              {isCodeVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
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
                              <option key={t.id} value={t.id}>{t.first_name}</option>
                            ))}
                          </select>
                        ) : (
                          linkedTeacher ? linkedTeacher.first_name : <span className="text-gray-500 font-normal">Unassigned</span>
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
                })}
              </>
            );
          })()}
        </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
