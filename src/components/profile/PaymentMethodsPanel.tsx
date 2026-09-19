import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Toggle } from '../ui/Toggle';
import { useAuth } from '../../contexts/AuthContext';
import { usePayments } from '../../contexts/PaymentContext';
import { PAYMENT_ICONS, paymentNote, paymentTitle } from '../../utils/payment';

/**
 * Mounted only while the payment accordion is open, so the default method is
 * always the one selected when the panel appears.
 */
export function PaymentMethodsPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { methods, defaultId, setDefaultMethod, removeMethod, addCard } = usePayments();
  const [selected, setSelected] = useState<string>(defaultId);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <>
      <ul className="flex flex-col gap-2 px-4 pt-4">
        {methods.map((method) => {
          const Icon = PAYMENT_ICONS[method.kind];
          const isDefault = method.id === defaultId;
          const isSelected = selected === method.id;
          const confirming = confirmId === method.id;
          return (
            <li
              key={method.id}
              className={[
              'overflow-hidden rounded-2xl border',
              isSelected ? 'border-accent/60 bg-accent/10' : 'border-ink-600 bg-ink-800/60'].
              join(' ')}>
              
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setSelected(method.id)}
                  aria-pressed={isSelected}
                  className="flex min-w-0 flex-1 items-center gap-3 text-start">
                  
                  <Icon
                    className={['h-4 w-4 shrink-0', isSelected ? 'text-accent' : 'text-white/45'].join(' ')} />
                  
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-white">
                        {paymentTitle(method, t)}
                      </span>
                      {isDefault &&
                      <span className="shrink-0 rounded-full border border-accent/50 px-1.5 py-0.5 font-display text-[8px] tracking-[0.12em] text-accent">
                          {t('payment.default')}
                        </span>
                      }
                    </span>
                    <span className="block truncate text-xs text-white/40" dir="auto">
                      {paymentNote(method, t, user?.phone)}
                    </span>
                  </span>
                </button>

                <Toggle
                  label={t('payment.makeDefault')}
                  checked={isDefault}
                  onChange={() => {
                    if (isDefault) return;
                    setDefaultMethod(method.id);
                    setSelected(method.id);
                  }} />
                

                {method.removable &&
                <button
                  type="button"
                  onClick={() => setConfirmId(confirming ? null : method.id)}
                  aria-label={t('payment.delete')}
                  aria-expanded={confirming}
                  className={[
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors duration-150',
                  confirming ?
                  'border-neon-magenta text-neon-magenta' :
                  'border-ink-600 text-white/40 hover:border-neon-magenta/60 hover:text-neon-magenta'].
                  join(' ')}>
                  
                    <Trash2Icon className="h-4 w-4" />
                  </button>
                }
              </div>

              {confirming &&
              <div className="flex items-center gap-2 border-t border-ink-700 px-3 py-2.5">
                  <p className="min-w-0 flex-1 text-xs font-bold text-white/60">
                    {t('payment.deleteTitle')}
                  </p>
                  <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className="rounded-xl border border-ink-600 px-2.5 py-1.5 text-xs font-bold text-white/60 transition-colors duration-150 hover:text-white">
                  
                    {t('common.cancel')}
                  </button>
                  <button
                  type="button"
                  onClick={() => {
                    removeMethod(method.id);
                    setConfirmId(null);
                    setSelected((current) =>
                    current === method.id ?
                    methods.find((entry) => entry.kind === 'cash')?.id ?? current :
                    current
                    );
                  }}
                  className="rounded-xl bg-neon-magenta px-2.5 py-1.5 text-xs font-extrabold text-ink-950">
                  
                    {t('payment.deleteConfirm')}
                  </button>
                </div>
              }
            </li>);

        })}

        <li>
          <button
            type="button"
            onClick={addCard}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-600 py-2.5 text-xs font-bold text-white/50 transition-colors duration-150 hover:border-accent/50 hover:text-accent">
            
            <PlusIcon className="h-4 w-4" />
            {t('payment.add')}
          </button>
        </li>
      </ul>

      <p className="px-4 pb-4 pt-3 text-xs text-white/35">{t('payment.defaultNote')}</p>
    </>);

}