import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  IdCardIcon,
  LockIcon,
  PartyPopperIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon } from
'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { NeonBadge } from '../components/ui/NeonBadge';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { OTP_LENGTH, OTP_RESEND_SECONDS } from '../lib/supabaseConfig';
import {
  digitsOnly,
  EG_PHONE_LENGTH,
  formatEgyptianPhone,
  fullEgyptianPhone,
  isValidEgyptianPhone } from
'../utils/format';

type Step = 'phone' | 'code' | 'age' | 'id' | 'processing' | 'done';

/** Only the steps the member actively fills in show on the progress bar. */
const STEPS: Step[] = ['phone', 'code', 'age', 'id'];

const ID_LENGTH = 14;

export function Auth() {
  const { t } = useTranslation();
  const { requestCode, verifyCode, submitIdentity, user, status, error: authError, signOut } =
  useAuth();
  const { reset, back, canGoBack } = useNavigation();

  const emptyCode = () => Array.from({ length: OTP_LENGTH }, () => '');

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState<string[]>(emptyCode);
  const [cooldown, setCooldown] = useState(0);
  const [frontCaptured, setFrontCaptured] = useState(false);
  const [backCaptured, setBackCaptured] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [checkIndex, setCheckIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const busy = status === 'loading';
  const onProgress = STEPS.includes(step);

  /** Context errors arrive as translation keys (`invalidCode`, `tooSoon`, …). */
  const remoteError =
  status === 'error' && authError ?
  t(`auth.${authError}`, { defaultValue: t('auth.requestFailed') }) :
  null;
  const message = error ?? remoteError;

  /** Supabase throttles OTP sends, so the resend button counts itself down. */
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const sendCode = async () => {
    await requestCode(phone);
    setCooldown(OTP_RESEND_SECONDS);
  };

  const submitPhone = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isValidEgyptianPhone(phone)) {
      setError(t('auth.invalidPhone'));
      return;
    }
    try {
      await sendCode();
      setCode(emptyCode());
      setStep('code');
      window.setTimeout(() => codeRefs.current[0]?.focus(), 60);
    } catch {

      /* `remoteError` already carries the reason from the context. */}
  };

  const resendCode = async () => {
    if (cooldown > 0 || busy) return;
    setError(null);
    setCode(emptyCode());
    try {
      await sendCode();
      codeRefs.current[0]?.focus();
    } catch {

      /* handled by `remoteError` */}
  };

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const ok = await verifyCode(phone, code.join(''));
    if (ok) setStep('age');
  };

  const onCodeChange = (index: number, value: string) => {
    const digits = digitsOnly(value);
    // Pasting the whole code into any box fills the row.
    if (digits.length > 1) {
      setCode((prev) => {
        const next = [...prev];
        digits.
        slice(0, OTP_LENGTH - index).
        split('').
        forEach((digit, offset) => {
          next[index + offset] = digit;
        });
        return next;
      });
      const last = Math.min(index + digits.length, OTP_LENGTH - 1);
      codeRefs.current[last]?.focus();
      return;
    }

    const digit = digits.slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) codeRefs.current[index + 1]?.focus();
  };

  const submitId = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!frontCaptured || !backCaptured) {
      setError(t('auth.idMissing'));
      return;
    }
    if (nationalId.length !== ID_LENGTH) {
      setError(t('auth.idNumberError'));
      return;
    }
    setCheckIndex(0);
    setStep('processing');
  };

  // Mock review pipeline: three checks tick over while the document "uploads".
  useEffect(() => {
    if (step !== 'processing') return;
    const timers = [
    window.setTimeout(() => setCheckIndex(1), 700),
    window.setTimeout(() => setCheckIndex(2), 1500),
    window.setTimeout(() => setCheckIndex(3), 2300)];

    let cancelled = false;
    submitIdentity(nationalId).then(() => {
      if (!cancelled) setStep('done');
    });
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [step, nationalId, submitIdentity]);

  const goBack = () => {
    setError(null);
    if (step === 'phone') {
      back();
      return;
    }
    setStep(STEPS[Math.max(0, STEPS.indexOf(step) - 1)]);
  };

  if (step === 'processing') {
    const checks = ['checkUpload', 'checkReadable', 'checkAge'] as const;
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <motion.span
          className="flex h-20 w-20 items-center justify-center rounded-blob border-2 border-accent/50 bg-accent/10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
          
          <IdCardIcon className="h-9 w-9 text-accent" strokeWidth={2.2} />
        </motion.span>
        <h2 className="mt-7 font-display text-3xl leading-tight text-white">
          {t('auth.processingTitle')}
        </h2>
        <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-white/55">
          {t('auth.processingBody')}
        </p>

        <ul className="mt-9 flex w-full max-w-xs flex-col gap-3" aria-live="polite">
          {checks.map((key, index) => {
            const complete = checkIndex > index;
            return (
              <li key={key} className="flex items-center gap-3 text-start">
                <span
                  className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                  complete ? 'border-accent bg-accent text-ink-950' : 'border-ink-600 bg-ink-800'].
                  join(' ')}>
                  
                  {complete ?
                  <CheckIcon className="h-4 w-4" strokeWidth={3} /> :

                  <span className="h-2 w-2 animate-pulse rounded-full bg-white/40" />
                  }
                </span>
                <span
                  className={[
                  'text-sm font-bold transition-colors duration-200',
                  complete ? 'text-white' : 'text-white/40'].
                  join(' ')}>
                  
                  {t(`auth.${key}`)}
                </span>
              </li>);

          })}
        </ul>
      </div>);

  }

  if (step === 'done') {
    return (
      <div className="flex flex-1 flex-col px-6 pb-8 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-1 flex-col items-center text-center">
          
          <motion.span
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            className="flex h-20 w-20 items-center justify-center rounded-blob border-2 border-accent bg-accent/15">
            
            <PartyPopperIcon className="h-9 w-9 text-accent" strokeWidth={2.2} />
          </motion.span>

          <h2 className="mt-7 font-display text-4xl leading-tight text-white">
            {t('auth.createdTitle')}
          </h2>
          <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-white/55">
            {t('auth.createdBody', { name: user?.name ?? '' })}
          </p>

          <div className="mt-6 flex flex-col items-center gap-2">
            <NeonBadge tone="lime">
              <ShieldCheckIcon className="h-3 w-3" /> {t('auth.createdVerified')}
            </NeonBadge>
            <p className="text-xs text-white/40" dir="ltr">
              {t('auth.createdPhone', { phone: fullEgyptianPhone(phone) })}
            </p>
          </div>

          <div className="mt-auto w-full pt-10">
            <ChunkyButton size="lg" fullWidth onClick={() => reset({ name: 'home' })}>
              {t('auth.enterShop')}
            </ChunkyButton>
          </div>
        </motion.div>
      </div>);

  }

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-10">
      <div className="flex items-center gap-3">
        {!blocked && (step !== 'phone' || canGoBack) &&
        <button
          type="button"
          onClick={goBack}
          aria-label={t('common.back')}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800 text-white transition-transform duration-150 ease-pop active:scale-95">
          
            <ChevronLeftIcon className="h-5 w-5 rtl:rotate-180" strokeWidth={2.6} />
          </button>
        }
        <p className="font-display text-[10px] tracking-[0.3em] text-accent">
          {t('auth.stepOf', { current: STEPS.indexOf(step) + 1, total: STEPS.length })}
        </p>
      </div>

      {onProgress &&
      <div className="mt-8 flex gap-1.5" aria-hidden>
          {STEPS.map((entry, index) =>
        <span
          key={entry}
          className={[
          'h-1.5 flex-1 rounded-full transition-colors duration-200 ease-pop',
          index <= STEPS.indexOf(step) ? 'bg-accent' : 'bg-ink-600'].
          join(' ')} />

        )}
        </div>
      }

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={blocked ? 'blocked' : step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-1 flex-col pt-10">
          
          {blocked ?
          <div className="flex flex-1 flex-col items-center justify-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-blob border border-neon-magenta/40 bg-neon-magenta/10">
                <ShieldAlertIcon className="h-8 w-8 text-neon-magenta" />
              </span>
              <h2 className="mt-6 font-display text-2xl text-white">{t('auth.ageBlocked')}</h2>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/50">
                {t('auth.ageBody')}
              </p>
              <ChunkyButton
              variant="ghost"
              className="mt-8"
              onClick={() => {
                signOut();
                setBlocked(false);
                setStep('phone');
              }}>
              
                {t('common.back')}
              </ChunkyButton>
            </div> :
          step === 'phone' ?
          <form onSubmit={submitPhone} className="flex flex-1 flex-col">
              <p className="font-display text-[11px] tracking-[0.28em] text-neon-cyan">
                {t('auth.kicker')}
              </p>
              <h2 className="mt-3 font-display text-5xl leading-none text-white">{t('auth.title')}</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/55">{t('auth.subtitle')}</p>

              <label
              htmlFor="phone"
              className="mt-10 block text-xs font-bold uppercase tracking-[0.14em] text-white/45">
              
                {t('auth.phoneLabel')}
              </label>
              <div
              dir="ltr"
              className="mt-2 flex h-14 w-full items-stretch overflow-hidden rounded-chunk border border-ink-600 bg-ink-800 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40">
              
                <span
                className="flex select-none items-center gap-2 border-e border-ink-600 bg-ink-700/70 px-4 font-display text-base text-white"
                aria-hidden>
                
                  🇪🇬 +20
                </span>
                <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={formatEgyptianPhone(phone)}
                onChange={(event) =>
                setPhone(digitsOnly(event.target.value).slice(0, EG_PHONE_LENGTH))
                }
                placeholder="10 1234 5678"
                aria-describedby="phone-hint"
                className="h-full flex-1 bg-transparent px-4 text-lg font-bold tracking-wide text-white placeholder:text-white/25 focus:outline-none" />
              
              </div>
              <p id="phone-hint" className="mt-2 text-xs text-white/40">
                {t('auth.phoneHint')}
              </p>
              {message &&
            <p role="alert" className="mt-3 text-sm font-bold text-neon-magenta">
                  {message}
                </p>
            }

              <div className="mt-auto pt-10">
                <ChunkyButton
                type="submit"
                size="lg"
                fullWidth
                loading={busy}
                disabled={phone.length !== EG_PHONE_LENGTH}>
                
                  {t('auth.sendCode')}
                </ChunkyButton>
              </div>
            </form> :
          step === 'code' ?
          <form onSubmit={submitCode} className="flex flex-1 flex-col">
              <h2 className="font-display text-4xl leading-tight text-white">{t('auth.codeLabel')}</h2>
              <p className="mt-3 text-[15px] text-white/55" dir="ltr">
                {t('auth.codeHint', { phone: fullEgyptianPhone(phone), digits: OTP_LENGTH })}
              </p>

              <div className="mt-10 flex gap-2" dir="ltr">
                {code.map((digit, index) =>
              <input
                key={index}
                ref={(element) => codeRefs.current[index] = element}
                value={digit}
                onChange={(event) => onCodeChange(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && !digit && index > 0) {
                    codeRefs.current[index - 1]?.focus();
                  }
                }}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={OTP_LENGTH}
                aria-label={t('auth.codeDigit', { index: index + 1 })}
                className="h-16 w-full rounded-chunk border border-ink-600 bg-ink-800 text-center font-display text-xl text-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40" />

              )}
              </div>
              {message &&
            <p role="alert" className="mt-3 text-sm font-bold text-neon-magenta">
                  {message}
                </p>
            }

              <button
              type="button"
              disabled={cooldown > 0 || busy}
              className="mt-6 self-start text-sm font-bold text-accent underline-offset-4 hover:underline disabled:text-white/35 disabled:no-underline"
              onClick={resendCode}>
              
                {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
              </button>

              <div className="mt-auto pt-10">
                <ChunkyButton
                type="submit"
                size="lg"
                fullWidth
                loading={busy}
                disabled={code.some((digit) => !digit)}>
                
                  {t('auth.verify')}
                </ChunkyButton>
              </div>
            </form> :
          step === 'age' ?
          <div className="flex flex-1 flex-col">
              <h2 className="font-display text-4xl leading-tight text-white">{t('auth.ageTitle')}</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/55">{t('auth.ageBody')}</p>

              <div className="mt-auto flex flex-col gap-3 pt-10">
                <ChunkyButton size="lg" fullWidth onClick={() => setStep('id')}>
                  {t('auth.ageConfirm')}
                </ChunkyButton>
                <ChunkyButton variant="ghost" size="lg" fullWidth onClick={() => setBlocked(true)}>
                  {t('auth.ageDeny')}
                </ChunkyButton>
              </div>
            </div> :

          <form onSubmit={submitId} className="flex flex-1 flex-col">
              <h2 className="font-display text-4xl leading-tight text-white">{t('auth.idTitle')}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/55">{t('auth.idBody')}</p>

              <div className="mt-7 grid grid-cols-2 gap-3">
                {([
              { side: 'front', captured: frontCaptured, set: setFrontCaptured },
              { side: 'back', captured: backCaptured, set: setBackCaptured }] as
              const).map(({ side, captured, set }) =>
              <button
                key={side}
                type="button"
                onClick={() => {
                  set(!captured);
                  setError(null);
                }}
                aria-pressed={captured}
                className={[
                'flex aspect-[3/2] flex-col items-center justify-center gap-2 rounded-chunk border-2 border-dashed px-3 text-center',
                'transition-[transform,border-color,background-color] duration-150 ease-pop active:scale-[0.98]',
                captured ?
                'border-solid border-accent bg-accent/10' :
                'border-ink-600 bg-ink-800/60 hover:border-ink-500'].
                join(' ')}>
                
                    {captured ?
                <CheckIcon className="h-6 w-6 text-accent" strokeWidth={3} /> :

                <CameraIcon className="h-6 w-6 text-white/40" strokeWidth={2.2} />
                }
                    <span className="text-[12px] font-extrabold text-white">
                      {t(side === 'front' ? 'auth.idFront' : 'auth.idBack')}
                    </span>
                    <span
                  className={[
                  'flex items-center gap-1 text-[11px] font-bold',
                  captured ? 'text-accent' : 'text-white/35'].
                  join(' ')}>
                  
                      {captured && <RotateCcwIcon className="h-3 w-3" />}
                      {t(captured ? 'auth.idRetake' : 'auth.idCapture')}
                    </span>
                  </button>
              )}
              </div>

              <label
              htmlFor="national-id"
              className="mt-7 block text-xs font-bold uppercase tracking-[0.14em] text-white/45">
              
                {t('auth.idNumberLabel')}
              </label>
              <input
              id="national-id"
              dir="ltr"
              inputMode="numeric"
              value={nationalId}
              onChange={(event) => setNationalId(digitsOnly(event.target.value).slice(0, ID_LENGTH))}
              placeholder={t('auth.idNumberPlaceholder')}
              className="mt-2 h-14 w-full rounded-chunk border border-ink-600 bg-ink-800 px-4 text-lg font-bold tracking-[0.12em] text-white placeholder:tracking-normal placeholder:text-white/25 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40" />
            
              <p className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
                <LockIcon className="h-3.5 w-3.5" />
                {t('auth.idPrivacy')}
              </p>
              {message &&
            <p role="alert" className="mt-3 text-sm font-bold text-neon-magenta">
                  {message}
                </p>
            }

              <div className="mt-auto pt-10">
                <ChunkyButton type="submit" size="lg" fullWidth>
                  {t('auth.idSubmit')}
                </ChunkyButton>
              </div>
            </form>
          }
        </motion.div>
      </AnimatePresence>
    </div>);

}