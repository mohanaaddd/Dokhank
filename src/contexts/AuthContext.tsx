import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { fullEgyptianPhone, isValidEgyptianPhone } from '../utils/format';
import type { AsyncStatus, UserProfile } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  status: AsyncStatus;
  error: string | null;
  /** Stubbed for Supabase `auth.signInWithOtp`. Takes the 10 national digits. */
  requestCode: (phone: string) => Promise<void>;
  /** Stubbed for Supabase `auth.verifyOtp`. */
  verifyCode: (phone: string, code: string) => Promise<boolean>;
  /** Mock document check — resolves once the ID has "passed" review. */
  submitIdentity: (nationalId: string) => Promise<void>;
  signOut: () => void;
  addPoints: (amount: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const requestCode = useCallback(async (phone: string) => {
    setStatus('loading');
    setError(null);
    await wait(700);
    if (!isValidEgyptianPhone(phone)) {
      setStatus('error');
      setError('invalidPhone');
      throw new Error('invalidPhone');
    }
    setStatus('success');
  }, []);

  const verifyCode = useCallback(async (phone: string, code: string) => {
    setStatus('loading');
    setError(null);
    await wait(900);
    if (code !== '1234') {
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
  }, []);

  const submitIdentity = useCallback(async (nationalId: string) => {
    setStatus('loading');
    setError(null);
    await wait(2600);
    setUser((prev) =>
    prev ? { ...prev, ageVerified: true, idLastFour: nationalId.slice(-4) } : prev
    );
    setStatus('success');
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setStatus('idle');
    setError(null);
  }, []);

  const addPoints = useCallback((amount: number) => {
    setUser((prev) => prev ? { ...prev, points: prev.points + amount } : prev);
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