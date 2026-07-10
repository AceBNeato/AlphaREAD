import { supabase } from "../../lib/supabase";

export type AppRole = "admin" | "teacher" | "student" | "teacher-preview";

export interface StoredProfile {
  id?: string;
  name?: string;
  avatar?: string;
  role?: AppRole;
  deviceId?: string;
  createdAt?: string;
  returnTo?: string;
  teacherId?: string;
}

export function getStoredProfile(): StoredProfile | null {
  const raw = localStorage.getItem("userProfile");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    clearStoredSession();
    return null;
  }
}

export function getStoredDeviceId(profile?: StoredProfile | null) {
  return profile?.deviceId || localStorage.getItem("activated_device_id") || null;
}

export function clearStoredSession() {
  localStorage.removeItem("userProfile");
  localStorage.removeItem("activated_device_id");
  localStorage.removeItem("originalTeacherProfile");
}

export async function validateStoredSession(allowedRoles: AppRole[]) {
  const profile = getStoredProfile();
  if (!profile?.role || !allowedRoles.includes(profile.role)) {
    return { valid: false, profile: null };
  }

  if (profile.role === "teacher-preview") {
    return { valid: true, profile };
  }

  if (!profile.id) {
    return { valid: false, profile: null };
  }

  const deviceId = getStoredDeviceId(profile);

  const { data, error } = await supabase.rpc("validate_profile_session", {
    p_profile_id: profile.id,
    p_role: profile.role,
    p_device_id: deviceId,
  });

  if (error) {
    console.error("Session validation failed:", error);
    return { valid: false, profile: null };
  }

  if (!data?.valid) {
    clearStoredSession();
    return { valid: false, profile: null };
  }

  return { valid: true, profile };
}
