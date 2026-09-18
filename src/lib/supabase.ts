import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isLive, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabaseConfig';

/**
 * A single browser client for the whole app. It is created even when no key is
 * present so imports stay simple — call sites gate on `isLive` instead.
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY || 'anon-key-not-set',
  {
    auth: {
      persistSession: isLive,
      autoRefreshToken: isLive,
      detectSessionInUrl: false
    },
    global: { headers: { 'x-client-info': 'dokhan-web' } }
  }
);

/** Narrow a PostgrestError / AuthError down to a translation key the UI knows. */
export function errorCode(error: unknown): string {
  const message = (error as {message?: string;} | null)?.message ?? '';
  if (/otp|token|code/i.test(message)) return 'invalidCode';
  if (/phone|number/i.test(message)) return 'invalidPhone';
  return 'requestFailed';
}