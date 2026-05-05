import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { Trash2, Edit, Save, X, Database, ArrowLeft, Unlock, Smartphone } from "lucide-react";
import { Button } from "../components/ui/button";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const createStudent = () => {
    navigate("/profile-setup");
  };

  const startEditing = (profile: any) => {
    setEditingId(profile.id);
    setEditFirstName(profile.first_name || "");
    setEditLastName(profile.last_name || "");
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: editFirstName, last_name: editLastName })
      .eq("id", id);

    if (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } else {
      setEditingId(null);
      fetchProfiles();
    }
  };

  const deleteProfile = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this student?")) return;
    
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) {
      console.error("Error deleting profile:", error);
      alert("Failed to delete profile.");
    } else {
      fetchProfiles();
    }
  };

  const unlockDevice = async (id: string) => {
    if (!window.confirm("Are you sure you want to unlock this student's account so they can log in on a new device?")) return;

    const { error } = await supabase
      .from("profiles")
      .update({ activated_device_id: null })
      .eq("id", id);

    if (error) {
      console.error("Error unlocking device:", error);
      alert("Failed to unlock device.");
    } else {
      alert("Device unlocked successfully!");
      fetchProfiles();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="rounded-full p-2 -ml-2 sm:ml-0">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2 sm:gap-3">
              <Database className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              Teacher Dashboard
            </h1>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <Button onClick={createStudent} className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white">
              + Add Student
            </Button>
            <Button onClick={fetchProfiles} variant="outline" className="flex-1 sm:flex-none">
              Refresh
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Registered Students</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-sm uppercase text-gray-500 dark:text-gray-400">
                  <th className="p-4 font-semibold">First Name</th>
                  <th className="p-4 font-semibold">Last Name</th>
                  <th className="p-4 font-semibold">Access Code</th>
                  <th className="p-4 font-semibold text-center">Device Status</th>
                  <th className="p-4 font-semibold">Joined Date</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">Loading database...</td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      No students found in the database yet.
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="p-4">
                        {editingId === profile.id ? (
                          <input
                            type="text"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="font-medium text-gray-800 dark:text-gray-200">{profile.first_name || "Unknown"}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingId === profile.id ? (
                          <input
                            type="text"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">{profile.last_name || "Unknown"}</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 font-mono font-bold rounded-lg tracking-widest">
                          {profile.student_code || "NONE"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {profile.activated_device_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-full">
                            <Smartphone className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 text-xs font-semibold rounded-full">
                            <Unlock className="w-3 h-3" /> Open
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        {editingId === profile.id ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => saveEdit(profile.id)} className="bg-green-500 hover:bg-green-600 text-white">
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {profile.activated_device_id && (
                              <Button size="sm" variant="outline" onClick={() => unlockDevice(profile.id)} title="Unlock Device" className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                                <Unlock className="w-4 h-4 text-yellow-600" />
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => startEditing(profile)}>
                              <Edit className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => deleteProfile(profile.id)} className="hover:bg-red-50 dark:hover:bg-red-900/20">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
