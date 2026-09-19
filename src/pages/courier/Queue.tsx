import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BanknoteIcon, BikeIcon, InboxIcon, MapPinIcon, PackageIcon } from 'lucide-react';
import { ChunkyButton } from '../../components/ui/ChunkyButton';
import { Panel } from '../../components/ui/Panel';
import { Toggle } from '../../components/ui/Toggle';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { useCourier } from '../../contexts/CourierContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { formatPrice, localize, orderCode } from '../../utils/format';

export function Queue() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { navigate } = useNavigation();
  const { courier, queue, active, onShift, setShift, claim, status } = useCourier();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onClaim = async (orderId: string) => {
    setClaiming(orderId);
    setError(null);
    try {
      await claim(orderId);
      navigate({ name: 'courier_active' });
    } catch {
      setError(t('courier.claimFailed'));
    } finally {
      setClaiming(null);
    }
  };

  if (!courier) {
    return (
      <div className="flex flex-1 flex-col">
        <ScreenHeader kicker={t('courier.kicker')} title={t('courier.queueTitle')} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-blob border border-ink-600 bg-ink-800">
            <BikeIcon className="h-7 w-7 text-white/40" />
          </span>
          <p className="font-display text-base text-white">{t('courier.notLinked')}</p>
          <p className="max-w-[28ch] text-sm text-white/45">{t('courier.notLinkedBody')}</p>
        </div>
      </div>);

  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader kicker={t('courier.kicker')} title={t('courier.queueTitle')} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <Panel
          tone="raised"
          className={[
          'flex items-center gap-3 p-4 transition-colors duration-200 ease-pop',
          onShift ? 'ring-1 ring-accent/50' : ''].
          join(' ')}>
          
          <span
            className={[
            'flex h-11 w-11 items-center justify-center rounded-2xl',
            onShift ? 'bg-accent/20 text-accent' : 'bg-ink-800 text-white/40'].
            join(' ')}>
            
            <BikeIcon className="h-5 w-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm text-white">
              {onShift ? t('courier.onShift') : t('courier.offShift')}
            </p>
            <p className="text-xs text-white/45">
              {onShift ? t('courier.onShiftNote') : t('courier.offShiftNote')}
            </p>
          </div>
          <Toggle
            checked={onShift}
            onChange={() => void setShift(!onShift)}
            label={t('courier.shiftToggle')} />
          
        </Panel>

        {active &&
        <button
          type="button"
          onClick={() => navigate({ name: 'courier_active' })}
          className="mt-3 flex w-full items-center gap-3 rounded-chunk border border-neon-cyan/45 bg-neon-cyan/[0.08] p-3.5 text-start transition-colors duration-150 ease-pop hover:bg-neon-cyan/[0.14]">
          
            <PackageIcon className="h-5 w-5 shrink-0 text-neon-cyan" />
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[10px] tracking-[0.18em] text-neon-cyan">
                {t('courier.carrying')}
              </span>
              <span className="block truncate text-sm font-extrabold text-white">
                {orderCode(active.id)} · {localize(active.address.line, locale)}
              </span>
            </span>
          </button>
        }

        <h2 className="mb-2 mt-6 font-display text-[11px] tracking-[0.2em] text-white/45">
          {t('courier.available', { count: queue.length })}
        </h2>

        {error &&
        <p className="mb-3 rounded-2xl border border-neon-magenta/40 bg-neon-magenta/10 px-3 py-2 text-xs font-bold text-neon-magenta">
            {error}
          </p>
        }

        {!onShift ?
        <p className="rounded-chunk border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-white/40">
            {t('courier.goOnShift')}
          </p> :
        queue.length === 0 ?
        <div className="flex flex-col items-center gap-2 rounded-chunk border border-dashed border-ink-600 px-4 py-10 text-center">
            <InboxIcon className="h-6 w-6 text-white/30" />
            <p className="text-sm text-white/45">
              {status === 'loading' ? t('common.loading') : t('courier.queueEmpty')}
            </p>
          </div> :

        <ul className="flex flex-col gap-3">
            {queue.map((order) =>
          <motion.li
            key={order.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="rounded-chunk border border-ink-600 bg-ink-800/60 p-4">
            
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-sm text-white">{orderCode(order.id)}</p>
                  <p className="ms-auto font-display text-base text-accent">
                    {formatPrice(order.total, locale)}
                  </p>
                </div>

                <p className="mt-2 flex items-start gap-2 text-sm text-white/70">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
                  <span className="min-w-0" dir="auto">
                    {localize(order.address.line, locale)}
                  </span>
                </p>

                <div className="mt-3 flex items-center gap-3 text-xs font-bold text-white/45">
                  <span>{t('orders.items', { count: order.lines.length })}</span>
                  {order.paymentKind === 'cash' &&
              <span className="flex items-center gap-1 text-neon-amber">
                      <BanknoteIcon className="h-3.5 w-3.5" />
                      {t('courier.collectCash')}
                    </span>
              }
                  <span className="ms-auto">{t('tracking.eta', { count: order.etaMinutes })}</span>
                </div>

                <ChunkyButton
              size="sm"
              fullWidth
              className="mt-4"
              loading={claiming === order.id}
              disabled={Boolean(active) || claiming !== null}
              onClick={() => void onClaim(order.id)}>
              
                  {active ? t('courier.finishFirst') : t('courier.claim')}
                </ChunkyButton>
              </motion.li>
          )}
          </ul>
        }
      </div>
    </div>);

}