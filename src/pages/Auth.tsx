import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { digitsOnly, EG_PHONE_LENGTH, formatEgyptianPhone, isValidEgyptianPhone } from '../utils/format';

export function Auth() {
  const { t } = useTranslation();
  const { signIn, signUp, status, error } = useAuth();
  const { reset, back, canGoBack } = useNavigation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState('');
  const busy = status === 'loading';
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLocalError('');
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) return setLocalError(t('auth.usernameError'));
    if (password.length < 8) return setLocalError(t('auth.passwordError'));
    if (mode === 'signup') {
      if (!firstName.trim() || !lastName.trim() || !/^\d{14}$/.test(nationalId)) return setLocalError(t('auth.signupRequired'));
      if (phone && !isValidEgyptianPhone(phone)) return setLocalError(t('auth.invalidPhone'));
      const profile = await signUp({ username, password, firstName, lastName, nationalId, phone: phone || undefined });
      if (profile) reset({ name: 'home' });
    } else {
      const profile = await signIn(username, password);
      if (profile) reset({ name: 'home' });
    }
  };
  const field = 'mt-2 h-13 w-full rounded-chunk border border-ink-600 bg-ink-800 px-4 text-white placeholder:text-white/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40';
  return <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-8">
    {canGoBack && <button type="button" onClick={back} className="mb-8 self-start text-sm font-bold text-white/60">{t('common.back')}</button>}
    <p className="font-display text-[11px] tracking-[0.28em] text-neon-cyan">{t('auth.kicker')}</p>
    <h1 className="mt-3 font-display text-5xl leading-none text-white">{mode === 'signup' ? t('auth.signupTitle') : t('auth.signinTitle')}</h1>
    <p className="mt-4 text-[15px] leading-relaxed text-white/55">{t('auth.subtitle')}</p>
    <div className="mt-8 flex gap-2">
      {(['signin', 'signup'] as const).map((entry) => <button key={entry} type="button" onClick={() => setMode(entry)} className={`flex-1 rounded-chunk border py-3 text-sm font-extrabold ${mode === entry ? 'border-accent bg-accent text-ink-950' : 'border-ink-600 text-white/60'}`}>{t(`auth.${entry}`)}</button>)}
    </div>
    <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
      {mode === 'signup' && <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-white/45">{t('auth.firstName')}<input className={field} value={firstName} onChange={(e) => setFirstName(e.target.value)} /></label>
        <label className="text-xs font-bold uppercase tracking-wider text-white/45">{t('auth.lastName')}<input className={field} value={lastName} onChange={(e) => setLastName(e.target.value)} /></label>
      </div>}
      <label className="text-xs font-bold uppercase tracking-wider text-white/45">{t('auth.username')}<input className={field} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
      {mode === 'signup' && <><label className="text-xs font-bold uppercase tracking-wider text-white/45">{t('auth.nationalId')}<input className={field} inputMode="numeric" maxLength={14} value={nationalId} onChange={(e) => setNationalId(digitsOnly(e.target.value).slice(0, 14))} /></label>
        <label className="text-xs font-bold uppercase tracking-wider text-white/45">{t('auth.phoneOptional')}<div dir="ltr" className="mt-2 flex h-13 overflow-hidden rounded-chunk border border-ink-600 bg-ink-800"><span className="flex items-center border-e border-ink-600 px-3 text-sm">🇪🇬 +20</span><input className="min-w-0 flex-1 bg-transparent px-3 text-white focus:outline-none" inputMode="numeric" value={formatEgyptianPhone(phone)} onChange={(e) => setPhone(digitsOnly(e.target.value).slice(0, EG_PHONE_LENGTH))} /></div></label></>}
      <label className="text-xs font-bold uppercase tracking-wider text-white/45">{t('auth.password')}<input className={field} type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {(localError || error) && <p role="alert" className="text-sm font-bold text-neon-magenta">{localError || t(`auth.${error}`, { defaultValue: t('auth.requestFailed') })}</p>}
      <div className="mt-auto pt-6"><ChunkyButton type="submit" size="lg" fullWidth loading={busy}>{t(mode === 'signup' ? 'auth.createAccount' : 'auth.signIn')}</ChunkyButton></div>
    </form>
  </div>;
}
