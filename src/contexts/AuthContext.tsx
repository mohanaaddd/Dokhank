import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { profileToUser } from '../lib/mappers';
import { isValidPersonName } from '../lib/prefs';
import type { ProfileRow } from '../lib/rows';
import { errorCode, supabase } from '../lib/supabase';
import { isLive } from '../lib/supabaseConfig';
import { digitsOnly, fullEgyptianPhone, isValidEgyptianPhone } from '../utils/format';
import type { AsyncStatus, UserProfile } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  status: AsyncStatus;
  error: string | null;
  /** True when this Egyptian number already has a profile. */
  lookupPhone: (phone: string) => Promise<boolean>;
  /** Issues a hashed OTP challenge. `name` is required for first-time numbers. */
  requestCode: (phone: string, name?: string) => Promise<void>;
  /** Verifies the OTP via the `otp` Edge Function, then loads `profiles`. */
  verifyCode: (phone: string, code: string) => Promise<UserProfile | null>;
  /** Hashes + age-checks the national ID through `fn_submit_identity`. */
  submitIdentity: (nationalId: string) => Promise<void>;
  signOut: () => void;
  addPoints: (amount: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PROFILE_SELECT =
'id,phone,name,initials,points,locale,accent,age_verified,id_last_four,is_blocked';

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadProfile = useCallback(async (): Promise<UserProfile | null> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return null;

    await supabase.rpc('fn_ensure_profile');

    const { data, error: profileError } = await supabase.
    from('profiles').
    select(PROFILE_SELECT).
    eq('id', auth.user.id).
    maybeSingle();

    if (profileError || !data) return null;
    const row = data as unknown as ProfileRow;
    if (row.is_blocked) {
      await supabase.auth.signOut();
      if (mounted.current) setUser(null);
      return null;
    }
    const next = profileToUser(row);
    if (mounted.current) setUser(next);
    return next;
  }, []);

  useEffect(() => {
    if (!isLive) return;
    void loadProfile();
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (mounted.current) setUser(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void loadProfile();
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, [loadProfile]);

  const lookupPhone = useCallback(async (phone: string) => {
    if (!isValidEgyptianPhone(phone)) {
      throw new Error('invalidPhone');
    }
    if (!isLive) {
      await wait(280);
      return digitsOnly(phone) === '1018013090';
    }
    const { data, error: lookupError } = await supabase.rpc('fn_phone_registered', {
      p_phone: phone
    });
    if (lookupError) throw lookupError;
    return Boolean((data as {exists?: boolean;} | null)?.exists);
  }, []);

  const requestCode = useCallback(async (phone: string, name?: string) => {
    setStatus('loading');
    setError(null);

    if (!isValidEgyptianPhone(phone)) {
      setStatus('error');
      setError('invalidPhone');
      throw new Error('invalidPhone');
    }

    const trimmed = name?.trim();
    if (trimmed && !isValidPersonName(trimmed.split(/\s+/)[0] ?? '')) {
      /* full name is validated by the form; server still checks length */
    }

    if (!isLive) {
      await wait(500);
      setStatus('success');
      return;
    }

    const { error: otpError } = await supabase.rpc('fn_request_phone_otp', {
      p_phone: phone,
      p_name: trimmed || null
    });

    if (otpError) {
      setStatus('error');
      setError(errorCode(otpError));
      throw otpError;
    }
    setStatus('success');
  }, []);

  const verifyCode = useCallback(
    async (phone: string, code: string) => {
      setStatus('loading');
      setError(null);

      if (!isLive) {
        await wait(700);
        if (digitsOnly(code) !== '4938') {
          setStatus('error');
          setError('invalidCode');
          return null;
        }
        const next: UserProfile = {
          id: 'user_01',
          name: 'Youssef',
          phone: fullEgyptianPhone(phone),
          initials: 'YS',
          points: 1240,
          ageVerified: false
        };
        setUser(next);
        setStatus('success');
        return next;
      }

      const { data, error: fnError } = await supabase.functions.invoke('otp', {
        body: { phone, code: digitsOnly(code) }
      });

      if (fnError) {
        setStatus('error');
        const payload = (fnError as {context?: {json?: () => Promise<{error?: string;}>;};}) ?? {};
        void payload;
        setError(errorCode(fnError));
        return null;
      }

      const body = data as {access_token?: string;refresh_token?: string;error?: string;} | null;
      if (!body?.access_token || !body.refresh_token) {
        setStatus('error');
        setError(body?.error ?? 'invalidCode');
        return null;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token
      });
      if (sessionError) {
        setStatus('error');
        setError('requestFailed');
        return null;
      }

      const profile = await loadProfile();
      if (!profile) {
        setStatus('error');
        setError('requestFailed');
        return null;
      }
      setStatus('success');
      return profile;
    },
    [loadProfile]
  );

  const submitIdentity = useCallback(async (nationalId: string) => {
    setStatus('loading');
    setError(null);

    if (!isLive) {
      await wait(2600);
      setUser((prev) =>
      prev ? { ...prev, ageVerified: true, idLastFour: nationalId.slice(-4) } : prev
      );
      setStatus('success');
      return;
    }

    const { data, error: rpcError } = await supabase.rpc('fn_submit_identity', {
      p_national_id: nationalId
    });

    if (rpcError) {
      setStatus('error');
      setError(errorCode(rpcError));
      return;
    }

    const result = (data ?? {}) as {status?: string;reason?: string;};
    if (result.status !== 'approved') {
      setError(result.reason ?? 'idNumberError');
      setStatus('error');
      await loadProfile();
      return;
    }

    await loadProfile();
    setStatus('success');
  }, [loadProfile]);

  const signOut = useCallback(() => {
    setUser(null);
    setStatus('idle');
    setError(null);
    if (isLive) void supabase.auth.signOut();
  }, []);

  const addPoints = useCallback((amount: number) => {
    setUser((prev) => prev ? { ...prev, points: prev.points + amount } : prev);
    if (isLive) void supabase.rpc('fn_add_review_points', { p_amount: amount });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, error, lookupPhone, requestCode, verifyCode, submitIdentity, signOut, addPoints }),
    [user, status, error, lookupPhone, requestCode, verifyCode, submitIdentity, signOut, addPoints]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
