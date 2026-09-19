import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BikeIcon, ChevronRightIcon, InboxIcon } from 'lucide-react';
import { StatusPill } from '../../components/ops/StatusPill';
import { useLocale } from '../../contexts/LocaleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useOps } from '../../contexts/OpsContext';
import { formatOrderDate, formatPrice, localize, orderCode } from '../../utils/format';
import type { OpsOrder } from '../../types';

const isToday = (timestamp: number) => {
  const now = new Date();
  const then = new Date(timestamp);
  return (
    now.getFullYear() === then.getFullYear() &&
    now.getMonth() === then.getMonth() &&
    now.getDate() === then.getDate());

};

/**
 * The screen the owner lives on. Grouping is by what needs doing, not by status
 * name: unassigned orders are the only thing that demands an action, so they
 * sit at the top and carry the strongest colour.
 */
export function OrderBoard() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { navigate } = useNavigation();
  const { orders, status } = useOps();

  const { waiting, moving, done, revenue } = useMemo(() => {
    const today = orders.filter((order) => isToday(order.placedAt));
    return {
      waiting: orders.filter((order) => order.status === 'confirmed' && !order.courierId),
      moving: orders.filter(
        (order) =>
        order.status === 'packing' ||
        order.status === 'on_the_way' ||
        order.status === 'confirmed' && Boolean(order.courierId)
      ),
      done: today.filter(
        (order) => order.status === 'delivered' || order.status === 'cancelled'
      ),
      revenue: today.
      filter((order) => order.status !== 'cancelled').
      reduce((total, order) => total + order.total, 0)
    };
  }, [orders]);

  const row = (order: OpsOrder, emphasis: boolean) =>
  <motion.li
    key={order.id}
    layout
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
    
      <button
      type="button"
      onClick={() => navigate({ name: 'owner_order', orderId: order.id })}
      className={[
      'flex w-full items-center gap-3 rounded-2xl border p-3 text-start transition-colors duration-150 ease-pop',
      emphasis ?
      'border-neon-amber/45 bg-neon-amber/[0.07] hover:bg-neon-amber/[0.12]' :
      'border-ink-600/70 bg-ink-800/50 hover:border-ink-500'].
      join(' ')}>
      
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-[13px] text-white">{orderCode(order.id)}</span>
            <span className="truncate text-xs text-white/40">{order.customerName}</span>
          </p>
          <p className="mt-1 truncate text-xs text-white/45" dir="auto">
            {localize(order.address.line, locale)}
          </p>
          <p className="mt-1 flex items-center gap-2 text-[11px] text-white/30">
            <span>{formatOrderDate(order.placedAt, locale)}</span>
            {order.courierId &&
          <span className="flex items-center gap-1 text-neon-cyan/70">
                <BikeIcon className="h-3 w-3" />
                {order.courier.name}
              </span>
          }
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="font-display text-sm text-accent">
            {formatPrice(order.total, locale)}
          </span>
          <StatusPill status={order.status} />
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/25 rtl:rotate-180" />
      </button>
    </motion.li>;


  const section = (titleKey: string, list: OpsOrder[], emphasis = false) =>
  list.length === 0 ? null :
  <section key={titleKey} className="mt-6 first:mt-0">
        <h2 className="mb-2 flex items-baseline gap-2 font-display text-[11px] tracking-[0.2em] text-white/45">
          {t(titleKey)}
          <span className="text-white/25">{list.length}</span>
        </h2>
        <ul className="flex flex-col gap-2">{list.map((order) => row(order, emphasis))}</ul>
      </section>;


  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-ink-700/80 bg-ink-900/90 px-4 py-4 backdrop-blur">
        <p className="font-display text-[10px] tracking-[0.22em] text-accent">
          {t('owner.boardKicker')}
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="font-display text-2xl text-white">{formatPrice(revenue, locale)}</h1>
          <p className="pb-1 text-xs font-bold text-white/45">
            {t('owner.ordersToday', { count: orders.filter((o) => isToday(o.placedAt)).length })}
          </p>
        </div>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {orders.length === 0 ?
        <div className="flex flex-col items-center gap-2 py-20 text-center">
            <InboxIcon className="h-7 w-7 text-white/30" />
            <p className="text-sm text-white/45">
              {status === 'loading' ? t('common.loading') : t('owner.boardEmpty')}
            </p>
          </div> :

        <>
            {section('owner.needsCourier', waiting, true)}
            {section('owner.inProgress', moving)}
            {section('owner.closedToday', done)}
          </>
        }
      </div>
    </div>);

}