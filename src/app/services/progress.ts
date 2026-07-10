import { supabase } from "../../lib/supabase";
import { getStoredDeviceId, getStoredProfile } from "./session";

interface PendingProgress {
  levelId: number;
  score: number;
  studentId: string;
  deviceId: string;
  createdAt: string;
}

const COMPLETED_LEVELS_KEY = "completedLevels";
const PENDING_PROGRESS_KEY = "pendingProgress";

function readNumberArray(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function writeCompletedLevel(levelId: number) {
  const completed = readNumberArray(COMPLETED_LEVELS_KEY);
  if (!completed.includes(levelId)) {
    completed.push(levelId);
    localStorage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify(completed));
  }
}

function readPendingProgress(): PendingProgress[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_PROGRESS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function queuePendingProgress(levelId: number, score: number, studentId: string, deviceId: string) {
  const pending = readPendingProgress();
  if (!pending.some((item) => item.levelId === levelId && item.studentId === studentId)) {
    pending.push({ levelId, score, studentId, deviceId, createdAt: new Date().toISOString() });
    localStorage.setItem(PENDING_PROGRESS_KEY, JSON.stringify(pending));
  }
}

export async function markLevelComplete(levelId: number, score = 100) {
  writeCompletedLevel(levelId);

  const profile = getStoredProfile();
  const deviceId = getStoredDeviceId(profile);

  if (profile?.role !== "student" || !profile.id || !deviceId) {
    return;
  }

  try {
    const { error } = await supabase.rpc("record_student_progress", {
      p_student_id: profile.id,
      p_device_id: deviceId,
      p_level_id: levelId,
      p_score: score,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn("Progress will be synced later:", error);
    queuePendingProgress(levelId, score, profile.id, deviceId);
  }
}

export async function flushPendingProgress() {
  const pending = readPendingProgress();
  if (!pending.length) return;

  const remaining: PendingProgress[] = [];
  for (const item of pending) {
    // Drop old corrupted pending progress that doesn't have student/device attached
    if (!item.studentId || !item.deviceId) continue;

    try {
      const { error } = await supabase.rpc("record_student_progress", {
        p_student_id: item.studentId,
        p_device_id: item.deviceId,
        p_level_id: item.levelId,
        p_score: item.score,
      });

      if (error) throw error;
    } catch {
      remaining.push(item);
    }
  }

  localStorage.setItem(PENDING_PROGRESS_KEY, JSON.stringify(remaining));
}
