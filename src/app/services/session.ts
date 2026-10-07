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

export async function secureSet(key: string, value: string) {
  localStorage.setItem(key, value);
}

export async function secureGet(key: string): Promise<string | null> {
  return localStorage.getItem(key);
}

export async function secureRemove(key: string) {
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
  
  // Hardware Fingerprint Check (Mocked via localStorage for now since native device plugin is removed)
  let liveHardwareId = await secureGet("hardware_fingerprint");
  if (!liveHardwareId) {
    liveHardwareId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    await secureSet("hardware_fingerprint", liveHardwareId);
  }

  try {
    const isMockSupabase = import.meta.env.VITE_SUPABASE_URL === undefined || import.meta.env.VITE_SUPABASE_URL === "";

    if (isMockSupabase) {
      console.warn("Using mock session validation because .env is missing.");
      return { valid: true, profile };
    }

    // OFFLINE FIRST FIX: If the device is offline, trust the local session.
    if (!navigator.onLine) {
      console.warn("Device is offline. Trusting local session.");
      return { valid: true, profile };
    }

    // Race the RPC call against a 5-second timeout.
    const TIMEOUT_MS = 5000;
    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "OFFLINE_TIMEOUT" } }), TIMEOUT_MS)
    );

    const rpcPromise = supabase.rpc("validate_profile_session", {
      p_profile_id: profile.id,
      p_role: profile.role,
      p_device_id: storedDeviceId,
    });

    const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

    if (error) {
      console.warn("Session validation failed or timed out. Trusting local session.", error.message);
      return { valid: true, profile };
    }

    if (data && data.valid === false) {
      console.warn("Session invalid reason:", data.reason);
      await clearStoredSession();
      return { valid: false, profile: null };
    }

    return { valid: true, profile };
  } catch (err: any) {
    console.error("Session validation exception:", err);
    return { valid: true, profile };
  }
}
