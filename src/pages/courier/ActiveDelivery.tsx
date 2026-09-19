import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BanknoteIcon, CheckCircle2Icon, MapPinIcon, PackageIcon, PhoneIcon } from 'lucide-react';
import { ChunkyButton } from '../../components/ui/ChunkyButton';
import { Panel } from '../../components/ui/Panel';
import { StatusPill } from '../../components/ops/StatusPill';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { DeliveryMap } from '../../components/order/DeliveryMap';
import { useCourier } from '../../contexts/CourierContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { formatPrice, localize, orderCode } from '../../utils/format';
import { lineName } from '../../utils/orderLine';
import type { OrderStatus } from '../../types';

/** Mirrors the transition table `fn_advance_order_status` enforces. */
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: 'packing',
  packing: 'on_the_way',
  on_the_way: 'delivered'
};

export function ActiveDelivery() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { navigate } = useNavigation();
  const { active, advance } = useCourier();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);

  if (!active) {
    return (
      <div className="flex flex-1 flex-col">
        <ScreenHeader kicker={t('courier.kicker')} title={t('courier.activeTitle')} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-blob border border-ink-600 bg-ink-800">
            <PackageIcon className="h-7 w-7 text-white/40" />
          </span>
          <p className="font-display text-base text-white">{t('courier.noActive')}</p>
          <p className="max-w-[28ch] text-sm text-white/45">{t('courier.noActiveBody')}</p>
          <ChunkyButton size="sm" className="mt-2" onClick={() => navigate({ name: 'courier_queue' })}>
            {t('courier.openQueue')}
          </ChunkyButton>
        </div>
      </div>);

  }

  const next = NEXT[active.status];
  const cash = active.paymentKind === 'cash';
  const allChecked = checked.length === active.lines.length;

  const onAdvance = async () => {
    if (!next) return;
    setBusy(true);
    setError(null);
    try {
      await advance(active.id, next);
      if (next === 'delivered') navigate({ name: 'courier_queue' });
    } catch {
      setError(t('courier.advanceFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader
        kicker={orderCode(active.id)}
        title={t('courier.activeTitle')}
        action={<StatusPill status={active.status} />} />
      

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <DeliveryMap
          height="h-40"
          markers={[{ x: active.address.x, y: active.address.y, tone: 'accent', pulse: true }]} />
        

        <Panel className="mt-4 p-4">
          <p className="flex items-start gap-2 text-[15px] font-extrabold text-white">
            <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span dir="auto">{localize(active.address.line, locale)}</span>
          </p>
          {(active.address.building || active.address.apartment || active.address.landmark) &&
          <p className="mt-1 ps-6 text-xs text-white/45" dir="auto">
              {[active.address.building, active.address.floor, active.address.apartment, active.address.landmark].
            filter(Boolean).
            join(' · ')}
            </p>
          }

          <div className="mt-4 flex items-center gap-3 border-t border-ink-600/70 pt-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neon-violet/20 font-display text-xs text-neon-violet">
              {active.customerName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-white">{active.customerName}</p>
              <p className="truncate text-xs text-white/40" dir="ltr">
                {active.customerPhone}
              </p>
            </div>
            <a
              href={`tel:${active.customerPhone}`}
              aria-label={t('tracking.call')}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-600 bg-ink-700 text-white transition-transform duration-150 ease-pop active:scale-95">
              
              <PhoneIcon className="h-4 w-4" />
            </a>
          </div>
        </Panel>

        <section className="mt-5">
          <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('courier.checklist')}
          </h2>
          <ul className="flex flex-col gap-2">
            {active.lines.map((line) => {
              const on = checked.includes(line.productId);
              return (
                <li key={line.productId}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                    setChecked((prev) =>
                    prev.includes(line.productId) ?
                    prev.filter((id) => id !== line.productId) :
                    [...prev, line.productId]
                    )
                    }
                    className={[
                    'flex w-full items-center gap-3 rounded-chunk border p-3 text-start transition-colors duration-150 ease-pop',
                    on ?
                    'border-accent/50 bg-accent/10' :
                    'border-ink-600 bg-ink-800/50 hover:border-ink-500'].
                    join(' ')}>
                    
                    <CheckCircle2Icon
                      className={['h-5 w-5 shrink-0', on ? 'text-accent' : 'text-white/25'].join(' ')}
                      strokeWidth={2.4} />
                    
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                      {lineName(line, locale)}
                    </span>
                    <span className="font-display text-xs text-white/50">×{line.quantity}</span>
                  </button>
                </li>);

            })}
          </ul>
        </section>

        {cash &&
        <div className="mt-4 flex items-center gap-3 rounded-chunk border border-neon-amber/40 bg-neon-amber/[0.08] p-3.5">
            <BanknoteIcon className="h-5 w-5 shrink-0 text-neon-amber" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[10px] tracking-[0.18em] text-neon-amber">
                {t('courier.collectCash')}
              </p>
              <p className="text-sm font-extrabold text-white">
                {formatPrice(active.total, locale)}
              </p>
            </div>
          </div>
        }

        {error &&
        <p className="mt-4 rounded-2xl border border-neon-magenta/40 bg-neon-magenta/10 px-3 py-2 text-xs font-bold text-neon-magenta">
            {error}
          </p>
        }
      </div>

      {next &&
      <div className="border-t border-ink-700 bg-ink-900/95 px-4 py-3">
          <ChunkyButton
          fullWidth
          size="lg"
          loading={busy}
          disabled={next === 'delivered' && !allChecked}
          onClick={() => void onAdvance()}>
          
            {t(`courier.advance_${next}`)}
          </ChunkyButton>
          {next === 'delivered' && !allChecked &&
        <p className="mt-2 text-center text-[11px] text-white/35">{t('courier.checkAll')}</p>
        }
        </div>
      }
    </div>);

}