import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BikeIcon, CheckIcon, PackageIcon, ReceiptTextIcon, XIcon } from 'lucide-react';
import { ORDER_FLOW, type Order, type OrderStatus } from '../../types';

const icons: Record<Exclude<OrderStatus, 'cancelled'>, typeof CheckIcon> = {
  confirmed: ReceiptTextIcon,
  packing: PackageIcon,
  on_the_way: BikeIcon,
  delivered: CheckIcon
};

export function StatusTimeline({ order }: {order: Order;}) {
  const { t } = useTranslation();
  const cancelled = order.status === 'cancelled';
  // A cancelled order was at least confirmed, so the first node stays lit and
  // the rail stops there rather than collapsing to nothing.
  const currentIndex = cancelled ? 0 : ORDER_FLOW.indexOf(order.status);
  const railHeight = cancelled ? 100 : currentIndex / (ORDER_FLOW.length - 1) * 100;

  return (
    <ol className="relative flex flex-col gap-5">
      <span className="absolute bottom-5 start-[19px] top-5 w-0.5 bg-ink-600" aria-hidden />
      <motion.span
        className={[
        'absolute start-[19px] top-5 w-0.5',
        cancelled ? 'bg-neon-magenta/50' : 'bg-accent'].
        join(' ')}
        aria-hidden
        initial={{ height: 0 }}
        animate={{ height: `${railHeight}%` }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{ maxHeight: 'calc(100% - 40px)' }} />
      

      {ORDER_FLOW.map((step, index) => {
        const done = index <= currentIndex;
        const active = !cancelled && index === currentIndex;
        const Icon = icons[step];
        return (
          <li key={step} className="relative flex items-start gap-4">
            <span
              className={[
              'z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ease-pop',
              done ? 'border-accent bg-accent text-ink-950' : 'border-ink-600 bg-ink-800 text-white/35'].
              join(' ')}>
              
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.8} />
            </span>
            <div className="pt-1.5">
              <p className={done ? 'text-[15px] font-extrabold text-white' : 'text-[15px] font-bold text-white/40'}>
                {t(`tracking.${step}`)}
              </p>
              {active &&
              <p className="mt-0.5 text-[13px] text-white/55">
                  {t(`tracking.${step}Body`, { name: order.courier.name })}
                </p>
              }
            </div>
          </li>);

      })}

      {cancelled &&
      <li className="relative flex items-start gap-4">
          <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-neon-magenta bg-neon-magenta text-ink-950">
            <XIcon className="h-[18px] w-[18px]" strokeWidth={3} />
          </span>
          <div className="pt-1.5">
            <p className="text-[15px] font-extrabold text-neon-magenta">{t('tracking.cancelled')}</p>
            <p className="mt-0.5 text-[13px] text-white/55">
              {order.cancelReason || t('tracking.cancelledBody')}
            </p>
          </div>
        </li>
      }
    </ol>);

}