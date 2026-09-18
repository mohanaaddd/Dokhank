/**
 * Supabase connection settings.
 *
 * Paste the **anon / publishable** key below (Supabase dashboard → Project
 * Settings → API → `anon public`). The anon key is meant to ship in the client
 * bundle — every table is protected by RLS and every write goes through an RPC.
 * The service-role key must never appear in this file.
 *
 * Until a key is present the app keeps running on its bundled mock data, so the
 * prototype is never broken while the backend is being wired up.
 */

export const SUPABASE_PROJECT_ID = 'iwwjbeiivtfxyujxmzma';

export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

/** ⬇️ PASTE THE ANON KEY HERE (starts with `eyJ…` or `sb_publishable_…`). */
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3d2piZWlpdnRmeHl1anhtem1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MjkwODUsImV4cCI6MjEwNTMwNTA4NX0.dnKFP6M9ZOcU54C9r3_6oYcvpd-tD2mzxKojYqgV0DI';

/** True once the key is in place — every context switches from mock to live. */
export const isLive = SUPABASE_ANON_KEY.trim().length > 20;
