import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { profileToUser } from '../lib/mappers';
import type { ProfileRow } from '../lib/rows';
import { errorCode, supabase } from '../lib/supabase';
import { devCredentials, DEV_OTP_BYPASS, DEV_OTP_CODE, isLive } from '../lib/supabaseConfig';
import { digitsOnly, fullEgyptianPhone, isValidEgyptianPhone } from '../utils/format';
import type { AsyncStatus, UserProfile } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  status: AsyncStatus;
  error: string | null;
  /** Supabase `auth.signInWithOtp`. Takes the 10 national digits. */
  requestCode: (phone: string) => Promise<void>;
  /** Supabase `auth.verifyOtp`, then loads the `profiles` row. */
  verifyCode: (phone: string, code: string) => Promise<boolean>;
  /** Hashes + age-checks the national ID through `fn_submit_identity`. */
  submitIdentity: (nationalId: string) => Promise<void>;
  signOut: () => void;
  addPoints: (amount: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Egyptian mobiles are stored in E.164 for Auth, and pretty-printed on profiles. */
const e164 = (phone: string) => `+20${digitsOnly(phone)}`;

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

    // The signup trigger creates the row; this RPC is the idempotent safety net
    // for accounts that existed before the migration ran.
    await supabase.rpc('fn_ensure_profile');

    const { data, error: profileError } = await supabase.
    from('profiles').
    select(PROFILE_SELECT).
    eq('id', auth.user.id).
    maybeSingle();

    if (profileError || !data) return null;
    const next = profileToUser(data as unknown as ProfileRow);
    if (mounted.current) setUser(next);
    return next;
  }, []);

  /** Restore an existing session on boot and follow Supabase auth events. */
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

  const requestCode = useCallback(async (phone: string) => {
    setStatus('loading');
    setError(null);

    if (!isValidEgyptianPhone(phone)) {
      setStatus('error');
      setError('invalidPhone');
      throw new Error('invalidPhone');
    }

    if (!isLive || DEV_OTP_BYPASS) {
      await wait(isLive ? 250 : 700);
      setStatus('success');
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: e164(phone),
      options: { channel: 'sms' }
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
      const digits = digitsOnly(phone);

      if (!isLive) {
        await wait(900);
        if (code !== DEV_OTP_CODE) {
          setStatus('error');
          setError('invalidCode');
          return false;
        }
        setUser({
          id: 'user_01',
          name: 'Youssef',
          phone: fullEgyptianPhone(phone),
          initials: 'YS',
          points: 1240,
          ageVerified: false
        });
        setStatus('success');
        return true;
      }

      if (DEV_OTP_BYPASS) {
        if (code !== DEV_OTP_CODE) {
          setStatus('error');
          setError('invalidCode');
          return false;
        }
        const credentials = devCredentials(digits);
        const metadata = { phone: fullEgyptianPhone(phone) };
        let signIn = await supabase.auth.signInWithPassword(credentials);
        if (signIn.error) {
          console.error('[DEV_BYPASS] signIn error:', signIn.error.message);
          const signUp = await supabase.auth.signUp({
            ...credentials,
            options: { data: metadata }
          });
          if (signUp.error) {
            console.error('[DEV_BYPASS] signUp error:', signUp.error.message, signUp.error);
            setStatus('error');
            setError(errorCode(signUp.error));
            return false;
          }
          signIn = await supabase.auth.signInWithPassword(credentials);
          if (signIn.error) {
            console.error('[DEV_BYPASS] signIn after signUp error:', signIn.error.message);
            setStatus('error');
            setError(errorCode(signIn.error));
            return false;
          }
        }
      } else {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          phone: e164(phone),
          token: code,
          type: 'sms'
        });
        if (verifyError) {
          setStatus('error');
          setError('invalidCode');
          return false;
        }
      }

      const profile = await loadProfile();
      if (!profile) {
        setStatus('error');
        setError('requestFailed');
        return false;
      }
      setStatus('success');
      return true;
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
      // Never reject: the onboarding screen advances on resolve and the order
      // RPC is the real gate, so a failed check simply leaves the account
      // unverified with the reason surfaced in `error`.
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

  /**
   * Optimistic locally, authoritative on the server: `fn_add_review_points`
   * clamps the amount and caps how much a member can earn this way.
   */
  const addPoints = useCallback((amount: number) => {
    setUser((prev) => prev ? { ...prev, points: prev.points + amount } : prev);
    if (isLive) void supabase.rpc('fn_add_review_points', { p_amount: amount });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, error, requestCode, verifyCode, submitIdentity, signOut, addPoints }),
    [user, status, error, requestCode, verifyCode, submitIdentity, signOut, addPoints]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}