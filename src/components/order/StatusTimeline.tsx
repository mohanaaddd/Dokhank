import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BikeIcon, CheckIcon, PackageIcon, ReceiptTextIcon } from 'lucide-react';
import { ORDER_FLOW, type Order, type OrderStatus } from '../../types';

const icons: Record<OrderStatus, typeof CheckIcon> = {
  confirmed: ReceiptTextIcon,
  packing: PackageIcon,
  on_the_way: BikeIcon,
  delivered: CheckIcon
};

export function StatusTimeline({ order }: {order: Order;}) {
  const { t } = useTranslation();
  const currentIndex = ORDER_FLOW.indexOf(order.status);

  return (
    <ol className="relative flex flex-col gap-5">
      <span className="absolute bottom-5 start-[19px] top-5 w-0.5 bg-ink-600" aria-hidden />
      <motion.span
        className="absolute start-[19px] top-5 w-0.5 bg-accent"
        aria-hidden
        initial={{ height: 0 }}
        animate={{ height: `${currentIndex / (ORDER_FLOW.length - 1) * 100}%` }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{ maxHeight: 'calc(100% - 40px)' }} />
      

      {ORDER_FLOW.map((step, index) => {
        const done = index <= currentIndex;
        const active = index === currentIndex;
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
    </ol>);

}