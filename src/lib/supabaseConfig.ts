/**
 * Supabase connection settings.
 *
 * The **anon / publishable** key below (Supabase dashboard → Project Settings →
 * API → `anon public`) is meant to ship in the client bundle — every table is
 * protected by RLS and every write goes through an RPC. The service-role key
 * must never appear in this file.
 */

export const SUPABASE_PROJECT_ID = 'iwwjbeiivtfxyujxmzma';

export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

/** Anon / publishable key — safe to ship in the bundle, guarded by RLS. */
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3d2piZWlpdnRmeHl1anhtem1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjkwODUsImV4cCI6MjEwNTMwNTA4NX0.dnKFP6M9ZOcU54C9r3_6oYcvpd-tD2mzxKojYqgV0DI';

/** True once the key is in place. */
export const isLive = SUPABASE_ANON_KEY.trim().length > 20;

/**
 * Sign-in runs on real Supabase phone OTP (`signInWithOtp` → `verifyOtp`).
 *
 * Flip this to `true` only to fall back to the offline bypass, which maps the
 * phone number to a synthetic email account so the session, the `profiles` row
 * and every RLS policy still behave exactly as they do in production. The
 * bypass needs Auth → Providers → Email with "Confirm email" turned OFF.
 */
export const DEV_OTP_BYPASS: boolean = false;

/** The code the dev bypass accepts. Ignored when `DEV_OTP_BYPASS` is false. */
export const DEV_OTP_CODE = '1234';

/**
 * Digits in the code box. Supabase SMS OTP is 6 digits by default (Auth →
 * Providers → Phone → "OTP length"); the bypass code is 4.
 */
export const OTP_LENGTH = DEV_OTP_BYPASS ? DEV_OTP_CODE.length : 6;

/** Supabase rate-limits OTP sends; keep the resend button honest about it. */
export const OTP_RESEND_SECONDS = 60;

/** Synthetic credentials used only by the dev bypass. */
export function devCredentials(nationalDigits: string) {
  return {
    email: `eg${nationalDigits}@dokhan.dev`,
    password: `dokhan-dev-${nationalDigits}`
  };
}