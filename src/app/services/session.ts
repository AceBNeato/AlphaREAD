import { supabase } from "../../lib/supabase";
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { Device } from '@capacitor/device';

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

export async function secureSet(key: string, value: string) {
  try {
    await SecureStoragePlugin.set({ key, value });
  } catch (err) {
    console.warn("Secure storage set failed, falling back to localStorage", err);
    localStorage.setItem(key, value);
  }
}

export async function secureGet(key: string): Promise<string | null> {
  try {
    const { value } = await SecureStoragePlugin.get({ key });
    return value || null;
  } catch (err) {
    // Fails on missing key or unsupported platform
    return localStorage.getItem(key);
  }
}

export async function secureRemove(key: string) {
  try {
    await SecureStoragePlugin.remove({ key });
  } catch (err) {
    // Ignore error
  }
  localStorage.removeItem(key);
}

export async function getStoredProfile(): Promise<StoredProfile | null> {
  const raw = await secureGet("userProfile");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function getStoredDeviceId(profile?: StoredProfile | null): Promise<string | null> {
  if (profile?.deviceId) return profile.deviceId;
  return await secureGet("activated_device_id");
}

export async function clearStoredSession() {
  await secureRemove("userProfile");
  await secureRemove("activated_device_id");
  await secureRemove("originalTeacherProfile");
}

export async function validateStoredSession(allowedRoles: AppRole[]) {
  const profile = await getStoredProfile();

  if (!profile?.role || !allowedRoles.includes(profile.role)) {
    return { valid: false, profile: null };
  }

  if (profile.role === "teacher-preview") {
    return { valid: true, profile };
  }

  if (!profile.id) {
    return { valid: false, profile: null };
  }

  const storedDeviceId = await getStoredDeviceId(profile);
  
  // Hardware Fingerprint Check
  try {
    const info = await Device.getId();
    const liveHardwareId = info.identifier; // Cross-platform unique identifier
    
    // During first online login (or activation), we should save this liveHardwareId 
    // to "hardware_fingerprint" in secure storage. 
    // If it doesn't match upon future offline opens, we wipe it.
    const savedFingerprint = await secureGet("hardware_fingerprint");
    if (!savedFingerprint) {
      // First time saving it
      await secureSet("hardware_fingerprint", liveHardwareId);
    } else if (savedFingerprint !== liveHardwareId) {
      console.error("CRITICAL: Hardware fingerprint mismatch! App bundle moved.");
      await clearStoredSession();
      return { valid: false, profile: null };
    }
  } catch(e) {
    // Device ID unsupported on web
  }

  try {
    const isMockSupabase = import.meta.env.VITE_SUPABASE_URL === undefined || import.meta.env.VITE_SUPABASE_URL === "";

    if (isMockSupabase) {
      console.warn("Using mock session validation because .env is missing.");
      return { valid: true, profile };
    }

    const { data, error } = await supabase.rpc("validate_profile_session", {
      p_profile_id: profile.id,
      p_role: profile.role,
      p_device_id: storedDeviceId,
    });

    if (error) {
      console.error("Session validation RPC failed:", error);
      return { valid: false, profile: null };
    }

    if (!data?.valid) {
      console.warn("Session invalid reason:", data?.reason);
      await clearStoredSession();
      return { valid: false, profile: null };
    }

    return { valid: true, profile };
  } catch (err) {
    console.error("Session validation exception:", err);
    return { valid: false, profile: null };
  }
}
