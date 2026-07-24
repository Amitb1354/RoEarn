import { isSupabaseConfigured, supabase } from "@/utils/auth";

export const DAILY_CAPS = {
  ptc: 40,
  shortlink: 20,
  passive_ad: 30,
};

export const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getDailyWindowStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

export function getUtcDayKey() {
  return getDailyWindowStartIso().slice(0, 10);
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

export async function fetchUserProfile(userId) {
  if (!isSupabaseConfigured || !userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("username, robux_balance, referral_code, referred_by")
    .eq("id", userId)
    .single();

  return data || null;
}

export async function fetchReferralStats(userId) {
  if (!isSupabaseConfigured || !userId) {
    return { referralCode: "", referredUsers: 0, passivePointsEarned: 0 };
  }

  const { data } = await supabase.rpc("get_referral_stats", { target_user_id: userId });
  return {
    referralCode: data?.referralCode || "",
    referredUsers: Number(data?.referredUsers || 0),
    passivePointsEarned: Number(data?.passivePointsEarned || 0),
  };
}

export async function fetchWithdrawalHistory(userId) {
  if (!isSupabaseConfigured || !userId) return [];

  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  const response = await fetch(`/api/withdrawals?userId=${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return [];

  const data = await response.json();
  return data.withdrawals || [];
}

export async function completeTask(taskCategory, adPayoutValue, metadata = {}) {
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
    body: JSON.stringify({ userId, taskCategory, adPayoutValue, metadata }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Task completion failed.");
  }

  return payload;
}

export function readDailyLocalSet(key) {
  if (typeof window === "undefined") return new Set();
  const fallback = { dayKey: getUtcDayKey(), ids: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null") || fallback;
    if (parsed.dayKey !== getUtcDayKey()) {
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
  localStorage.setItem(key, JSON.stringify({ dayKey: getUtcDayKey(), ids: Array.from(set) }));
}
