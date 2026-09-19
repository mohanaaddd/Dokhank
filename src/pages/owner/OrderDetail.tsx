import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BikeIcon, PhoneIcon } from 'lucide-react';
import { ChunkyButton } from '../../components/ui/ChunkyButton';
import { Panel } from '../../components/ui/Panel';
import { StatusPill } from '../../components/ops/StatusPill';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { OrderSummary } from '../../components/cart/OrderSummary';
import { useLocale } from '../../contexts/LocaleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useOps } from '../../contexts/OpsContext';
import { formatOrderDate, formatPrice, localize, orderCode } from '../../utils/format';
import { lineName, lineTotal } from '../../utils/orderLine';
import type { OrderStatus } from '../../types';

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: 'packing',
  packing: 'on_the_way',
  on_the_way: 'delivered'
};

export function OrderDetail({ orderId }: {orderId: string;}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { back } = useNavigation();
  const { getOrder, couriers, advance, cancel, assign } = useOps();
  const order = getOrder(orderId);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  if (!order) {
    return (
      <div className="flex flex-1 flex-col">
        <ScreenHeader title={t('common.error')} onBack={back} />
        <div className="flex flex-1 items-center justify-center text-sm text-white/50">
          {t('common.error')}
        </div>
      </div>);

  }

  const next = NEXT[order.status];
  const open = order.status !== 'delivered' && order.status !== 'cancelled';

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(t('owner.actionFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader
        onBack={back}
        kicker={orderCode(order.id)}
        title={order.customerName}
        action={<StatusPill status={order.status} />} />
      

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <Panel className="p-4">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-baseline gap-3">
              <dt className="text-white/40">{t('orders.receiptDate')}</dt>
              <dd className="ms-auto font-bold text-white">
                {formatOrderDate(order.placedAt, locale)}
              </dd>
            </div>
            <div className="flex items-baseline gap-3">
              <dt className="text-white/40">{t('orders.receiptPayment')}</dt>
              <dd className="ms-auto font-bold text-white">
                {t(`payment.${order.paymentKind ?? 'cash'}`)}
              </dd>
            </div>
            <div className="flex items-baseline gap-3">
              <dt className="shrink-0 text-white/40">{t('orders.receiptAddress')}</dt>
              <dd className="ms-auto min-w-0 truncate text-end font-bold text-white" dir="auto">
                {localize(order.address.line, locale)}
              </dd>
            </div>
          </dl>

          <a
            href={`tel:${order.customerPhone}`}
            className="mt-3 flex items-center gap-2 border-t border-ink-600/70 pt-3 text-sm font-bold text-neon-cyan"
            dir="ltr">
            
            <PhoneIcon className="h-4 w-4" />
            {order.customerPhone}
          </a>
        </Panel>

        <section className="mt-5">
          <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('orders.receiptItems')}
          </h2>
          <ul className="flex flex-col gap-2 border-b border-ink-700 pb-4">
            {order.lines.map((line) =>
            <li key={line.productId} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-ink-700 px-1 font-display text-[10px] text-white/70">
                  {line.quantity}
                </span>
                <span className="min-w-0 flex-1 truncate text-white/70">
                  {lineName(line, locale)}
                </span>
                <span className="font-bold text-white">{formatPrice(lineTotal(line), locale)}</span>
              </li>
            )}
          </ul>
          <div className="pt-4">
            <OrderSummary
              subtotal={order.subtotal}
              deliveryFee={order.deliveryFee}
              total={order.total}
              locale={locale} />
            
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('owner.courier')}
          </h2>
          {order.courierId ?
          <div className="flex items-center gap-3 rounded-chunk border border-ink-600 bg-ink-800/60 p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neon-cyan/20 font-display text-xs text-neon-cyan">
                {order.courier.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-white">{order.courier.name}</p>
                <p className="truncate text-xs text-white/40">{order.courier.vehicle}</p>
              </div>
              <BikeIcon className="h-4 w-4 text-white/25" />
            </div> :

          <p className="rounded-chunk border border-dashed border-ink-600 px-4 py-3 text-center text-xs text-white/40">
              {t('owner.unassigned')}
            </p>
          }

          {open && couriers.length > 0 &&
          <div className="mt-2 flex flex-wrap gap-2">
              {couriers.map((courier) =>
            <button
              key={courier.id}
              type="button"
              disabled={busy || courier.id === order.courierId}
              onClick={() => void run(() => assign(order.id, courier.id))}
              className={[
              'rounded-2xl border px-3 py-2 text-xs font-extrabold transition-colors duration-150 ease-pop disabled:opacity-40',
              courier.id === order.courierId ?
              'border-accent bg-accent text-ink-950' :
              'border-ink-600 bg-ink-800/70 text-white/65 hover:text-white'].
              join(' ')}>
              
                  {courier.name}
                  <span className="ms-1.5 text-white/35">{t(`owner.shift_${courier.status}`)}</span>
                </button>
            )}
            </div>
          }
        </section>

        {order.cancelReason &&
        <p className="mt-5 rounded-chunk border border-neon-magenta/40 bg-neon-magenta/[0.08] px-3 py-2.5 text-xs font-bold text-neon-magenta">
            {order.cancelReason}
          </p>
        }

        {error &&
        <p className="mt-4 rounded-2xl border border-neon-magenta/40 bg-neon-magenta/10 px-3 py-2 text-xs font-bold text-neon-magenta">
            {error}
          </p>
        }

        {cancelling &&
        <div className="mt-5 rounded-chunk border border-ink-600 bg-ink-800/70 p-4">
            <label
            htmlFor="cancel-reason"
            className="font-display text-[10px] tracking-[0.18em] text-white/45">
            
              {t('owner.cancelReason')}
            </label>
            <input
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('owner.cancelPlaceholder')}
            className="mt-2 w-full rounded-2xl border border-ink-600 bg-ink-900 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-accent focus:outline-none" />
          
            <div className="mt-3 flex gap-2">
              <ChunkyButton
              size="sm"
              variant="ghost"
              className="flex-1"
              onClick={() => setCancelling(false)}>
              
                {t('common.cancel')}
              </ChunkyButton>
              <ChunkyButton
              size="sm"
              variant="magenta"
              className="flex-1"
              loading={busy}
              onClick={() =>
              void run(async () => {
                await cancel(order.id, reason);
                setCancelling(false);
                setReason('');
              })
              }>
              
                {t('owner.confirmCancel')}
              </ChunkyButton>
            </div>
          </div>
        }
      </div>

      {open && !cancelling &&
      <div className="flex gap-2 border-t border-ink-700 bg-ink-900/95 px-4 py-3">
          <ChunkyButton
          variant="ghost"
          size="md"
          onClick={() => setCancelling(true)}
          disabled={busy}>
          
            {t('owner.cancelOrder')}
          </ChunkyButton>
          {next &&
        <ChunkyButton
          className="flex-1"
          loading={busy}
          onClick={() => void run(() => advance(order.id, next))}>
          
              {t(`courier.advance_${next}`)}
            </ChunkyButton>
        }
        </div>
      }
    </div>);

}