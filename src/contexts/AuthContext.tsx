import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { profileToUser } from '../lib/mappers';
import type { ProfileRow } from '../lib/rows';
import { errorCode, supabase } from '../lib/supabase';
import type { AsyncStatus, UserProfile } from '../types';

interface SignupInput {
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  nationalId: string;
  phone?: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  initialized: boolean;
  status: AsyncStatus;
  error: string | null;
  signIn: (username: string, password: string) => Promise<UserProfile | null>;
  signUp: (input: SignupInput) => Promise<UserProfile | null>;
  signOut: () => void;
  updateName: (name: string) => Promise<boolean>;
  addPoints: (amount: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const syntheticEmail = (username: string) => `${username.trim().toLowerCase()}@auth.dokhan.app`;
const PROFILE_SELECT = 'id,phone,username,first_name,last_name,name,initials,points,locale,accent,age_verified,id_last_four,is_blocked,role';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const mounted = useRef(true);

  const loadProfile = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    await supabase.rpc('fn_ensure_profile');
    const { data } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', auth.user.id).maybeSingle();
    if (!data) return null;
    const next = profileToUser(data as unknown as ProfileRow);
    if (mounted.current) setUser(next);
    return next;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadProfile().finally(() => mounted.current && setInitialized(true));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null);
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') void loadProfile();
    });
    return () => { mounted.current = false; data.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback(async (username: string, password: string) => {
    setStatus('loading'); setError(null);
    const result = await supabase.auth.signInWithPassword({ email: syntheticEmail(username), password });
    if (result.error) { setStatus('error'); setError(errorCode(result.error)); return null; }
    const profile = await loadProfile();
    setStatus(profile ? 'success' : 'error');
    if (!profile) setError('requestFailed');
    return profile;
  }, [loadProfile]);

  const signUp = useCallback(async (input: SignupInput) => {
    setStatus('loading'); setError(null);
    const username = input.username.trim().toLowerCase();
    const result = await supabase.auth.signUp({
      email: syntheticEmail(username),
      password: input.password,
      options: { data: { username, first_name: input.firstName.trim(), last_name: input.lastName.trim(), phone: input.phone?.trim() || null } }
    });
    if (result.error) { setStatus('error'); setError(errorCode(result.error)); return null; }
    if (!result.data.session) { setStatus('error'); setError('emailConfirmationRequired'); return null; }
    const { error: identityError } = await supabase.rpc('fn_submit_identity', { p_national_id: input.nationalId });
    if (identityError) { setStatus('error'); setError(errorCode(identityError)); return null; }
    const profile = await loadProfile();
    setStatus(profile ? 'success' : 'error');
    if (!profile) setError('requestFailed');
    return profile;
  }, [loadProfile]);

  const updateName = useCallback(async (name: string) => {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user || trimmed.split(' ').length < 2) return false;
    const { error: updateError } = await supabase.from('profiles').update({ name: trimmed }).eq('id', auth.user.id);
    if (updateError) { setStatus('error'); setError(errorCode(updateError)); return false; }
    await loadProfile(); return true;
  }, [loadProfile]);

  const signOut = useCallback(() => { setUser(null); setStatus('idle'); setError(null); void supabase.auth.signOut(); }, []);
  const addPoints = useCallback((amount: number) => {
    setUser((prev) => prev ? { ...prev, points: prev.points + amount } : prev);
    void supabase.rpc('fn_add_review_points', { p_amount: amount });
  }, []);
  const value = useMemo(() => ({ user, initialized, status, error, signIn, signUp, signOut, updateName, addPoints }), [user, initialized, status, error, signIn, signUp, signOut, updateName, addPoints]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
