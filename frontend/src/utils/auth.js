import { createClient } from '@supabase/supabase-js';
import { getFingerprint } from '@/utils/fingerprint';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  !rawUrl.includes('your-supabase-project') &&
  rawKey !== 'your-anon-key'
);

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co';
const supabaseKey = isSupabaseConfigured ? rawKey : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Wrapper that automatically attaches security related headers to every request
 * that mutates data (insert/update/delete). It adds:
 *   - fingerprint: device fingerprint string
 *   - last_ip: client IP (fetched via /api/ip endpoint)
 *   - Authorization header (session JWT) – already handled by Supabase client
 */
export async function secureRequestHeaders() {
  const fingerprint = await getFingerprint();
  let ip = '';
  try {
    const res = await fetch('/api/ip');
    const data = await res.json();
    ip = data.ip;
  } catch (e) {
    console.warn('Unable to fetch client IP', e);
  }
  return {
    fingerprint,
    last_ip: ip,
  };
}

/**
 * Example of using the wrapper for a protected mutation.
 * Usage: const { data, error } = await secureInsert('profiles', newProfile);
 */
export async function secureInsert(table, values) {
  const meta = await secureRequestHeaders();
  const { data, error } = await supabase.from(table).insert({ ...values, ...meta });
  return { data, error };
}
