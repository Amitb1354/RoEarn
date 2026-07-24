import { isSupabaseConfigured, supabase } from "@/utils/auth";

export const DAILY_CAPS = {
  ptc: 40,
  shortlink: 20,
  passive_ad: 30,
};

export const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getDailyWindowStartIso() {
  return new Date(Date.now() - DAILY_WINDOW_MS).toISOString();
}

export async function getCurrentUserId() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export async function getAccessToken() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export async function fetchDailyCompletionCounts(userId) {
  const empty = { ptc: 0, shortlink: 0, passive_ad: 0 };
  if (!isSupabaseConfigured || !userId) return empty;

  const { data, error } = await supabase
    .from("task_completions")
    .select("tasks(task_type)")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("completed_at", getDailyWindowStartIso());

  if (error || !data) return empty;

  return data.reduce((counts, row) => {
    const taskType = row.tasks?.task_type;
    if (taskType in counts) counts[taskType] += 1;
    return counts;
  }, empty);
}

export async function fetchUserBalance(userId) {
  if (!isSupabaseConfigured || !userId) return 0;

  const { data } = await supabase
    .from("profiles")
    .select("robux_balance")
    .eq("id", userId)
    .single();

  return Number(data?.robux_balance || 0);
}

export async function completeTask(taskCategory, adPayoutValue) {
  const [userId, accessToken] = await Promise.all([getCurrentUserId(), getAccessToken()]);
  if (!userId || !accessToken) {
    throw new Error("Please sign in before completing tasks.");
  }

  const response = await fetch("/api/complete_task", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ userId, taskCategory, adPayoutValue }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Task completion failed.");
  }

  return payload;
}

export function readDailyLocalSet(key) {
  if (typeof window === "undefined") return new Set();
  const fallback = { startedAt: Date.now(), ids: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null") || fallback;
    if (!parsed.startedAt || Date.now() - parsed.startedAt >= DAILY_WINDOW_MS) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return new Set();
    }
    return new Set(parsed.ids || []);
  } catch {
    return new Set();
  }
}

export function writeDailyLocalSet(key, set) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify({ startedAt: Date.now(), ids: Array.from(set) }));
}
