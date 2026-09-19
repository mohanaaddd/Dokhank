import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

/** A single browser client for the whole app. */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  global: { headers: { 'x-client-info': 'dokhan-web' } }
});

/**
 * Narrow a PostgrestError / AuthError down to a translation key under `auth.*`.
 * Order matters: provider and rate-limit failures both mention "sms" or "otp",
 * so they are matched before the generic code check.
 */
export function errorCode(error: unknown): string {
  const message = (error as {message?: string;} | null)?.message ?? '';

  if (/provider|not enabled|unsupported|disabled|configur/i.test(message)) return 'smsUnavailable';
  if (/security purposes|rate limit|too many|after \d+ seconds/i.test(message)) return 'tooSoon';
  if (/otp|token|code|expired/i.test(message)) return 'invalidCode';
  if (/phone|number/i.test(message)) return 'invalidPhone';
  return 'requestFailed';
}