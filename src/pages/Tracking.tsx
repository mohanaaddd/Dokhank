import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MessageCircleIcon, PhoneIcon } from 'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { DeliveryMap } from '../components/order/DeliveryMap';
import { StatusTimeline } from '../components/order/StatusTimeline';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useOrders } from '../contexts/OrderContext';
import { formatPrice, orderCode } from '../utils/format';
import { lineImage, lineName } from '../utils/orderLine';

const courierStart = { x: 0.12, y: 0.2 };

export function Tracking({ orderId }: {orderId: string;}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { navigate, reset } = useNavigation();
  const { getOrder } = useOrders();
  const order = getOrder(orderId);

  useEffect(() => {
    if (order?.status === 'delivered') {
      const timer = window.setTimeout(() => navigate({ name: 'delivered', orderId }), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [order?.status, orderId, navigate]);

  if (!order) {
    return (
      <div className="flex flex-1 flex-col">
        <ScreenHeader title={t('common.error')} onBack={() => reset({ name: 'home' })} />
        <div className="flex flex-1 items-center justify-center text-sm text-white/50">
          {t('common.error')}
        </div>
      </div>);

  }

  const cancelled = order.status === 'cancelled';
  const progress = { confirmed: 0, packing: 0.25, on_the_way: 0.65, delivered: 1, cancelled: 0 }[
  order.status];

  const courier = {
    x: courierStart.x + (order.address.x - courierStart.x) * progress,
    y: courierStart.y + (order.address.y - courierStart.y) * progress
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader
        title={t('tracking.title')}
        kicker={t('tracking.orderId', { id: orderCode(order.id) })}
        onBack={() => reset({ name: 'home' })} />
      

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
        <DeliveryMap
          height="h-48"
          markers={[
          { x: order.address.x, y: order.address.y, tone: 'accent', pulse: true },
          { x: courier.x, y: courier.y, tone: 'cyan' }]
          } />
        

        <motion.div
          key={order.status}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="mt-4 flex items-end justify-between gap-3">
          
          <div>
            <p className="font-display text-[10px] tracking-[0.2em] text-white/45">
              {t(`tracking.${order.status}`)}
            </p>
            <p
              className={[
              'mt-1 font-display text-2xl',
              cancelled ? 'text-neon-magenta' : 'text-accent'].
              join(' ')}>
              
              {cancelled ?
              order.cancelReason || t('tracking.cancelledBody') :
              t('tracking.eta', { count: order.etaMinutes })}
            </p>
          </div>
          <p className="pb-1 font-display text-sm text-white/60">
            {formatPrice(order.total, locale)}
          </p>
        </motion.div>

        <div className="mt-5 rounded-chunk border border-ink-600 bg-ink-800/60 p-4">
          <StatusTimeline order={order} />
        </div>

        <section className="mt-5">
          <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('tracking.courier')}
          </h2>
          <div className="flex items-center gap-3 rounded-chunk border border-ink-600 bg-ink-800/60 p-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-violet/20 font-display text-sm text-neon-violet">
              {order.courier.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold text-white">{order.courier.name}</p>
              <p className="text-xs text-white/45">{order.courier.vehicle}</p>
            </div>
            <button
              type="button"
              aria-label={t('tracking.call')}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-600 bg-ink-700 text-white transition-transform duration-150 ease-pop active:scale-95">
              
              <PhoneIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t('tracking.message')}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-600 bg-ink-700 text-white transition-transform duration-150 ease-pop active:scale-95">
              
              <MessageCircleIcon className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
            {t('tracking.contents')}
          </h2>
          <ul className="flex flex-col gap-2">
            {order.lines.map((line) =>
            <li
              key={line.productId}
              className="flex items-center gap-3 rounded-chunk border border-ink-600/70 bg-ink-800/50 p-2.5">
              
                <img
                src={lineImage(line) ?? ''}
                alt=""
                className="h-12 w-12 rounded-xl bg-ink-950 object-cover" />
              
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                  {lineName(line, locale)}
                </span>
                <span className="font-display text-xs text-white/50">×{line.quantity}</span>
              </li>
            )}
          </ul>
        </section>
      </div>

      <div className="border-t border-ink-700 bg-ink-900/95 px-4 py-3">
        <ChunkyButton variant="dark" fullWidth onClick={() => reset({ name: 'home' })}>
          {t('delivered.done')}
        </ChunkyButton>
      </div>
    </div>);

}