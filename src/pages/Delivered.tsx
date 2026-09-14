import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CheckIcon, StarIcon } from 'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useLocale } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useOrders } from '../contexts/OrderContext';
import { formatPrice, orderCode } from '../utils/format';

export function Delivered({ orderId }: {orderId: string;}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { reset } = useNavigation();
  const { getOrder } = useOrders();
  const { add } = useCart();
  const { addPoints } = useAuth();
  const [rating, setRating] = useState(0);
  const order = getOrder(orderId);

  const points = order ? Math.round(order.total * 10) : 0;

  const reorder = () => {
    order?.lines.forEach((line) => add(line.productId, line.quantity));
    reset({ name: 'home' });
  };

  return (
    <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-12 text-center">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-blob"
        style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 60px -10px var(--accent)' }}>
        
        <CheckIcon className="h-12 w-12 text-ink-950" strokeWidth={3.4} />
      </motion.div>

      <h1 className="mt-8 font-display text-4xl leading-none text-white">{t('delivered.title')}</h1>
      <p className="mx-auto mt-3 max-w-[30ch] text-[15px] text-white/55">
        {t('delivered.subtitle', {
          id: order ? orderCode(order.id) : '',
          count: order?.etaMinutes ?? 0
        })}
      </p>

      <div className="mt-8 rounded-chunk border border-accent/30 bg-accent/10 p-5">
        <p className="font-display text-3xl text-accent">{t('delivered.pointsEarned', { count: points })}</p>
        <p className="mt-2 text-sm text-white/55">{t('delivered.pointsBody')}</p>
      </div>

      {order &&
      <p className="mt-4 font-display text-xs tracking-[0.18em] text-white/40">
          {formatPrice(order.total, locale)}
        </p>
      }

      <div className="mt-8">
        <p className="text-sm font-bold text-white/70">
          {rating > 0 ? t('delivered.rateThanks') : t('delivered.rate')}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((value) =>
          <button
            key={value}
            type="button"
            onClick={() => {
              setRating(value);
              addPoints(5);
            }}
            aria-label={`Rate ${value} of 5`}
            className="transition-transform duration-150 ease-pop hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            
              <StarIcon
              className={[
              'h-8 w-8',
              value <= rating ? 'fill-neon-amber text-neon-amber' : 'text-ink-500'].
              join(' ')} />
            
            </button>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-10">
        <ChunkyButton size="lg" fullWidth onClick={reorder}>
          {t('delivered.reorder')}
        </ChunkyButton>
        <ChunkyButton variant="ghost" size="lg" fullWidth onClick={() => reset({ name: 'home' })}>
          {t('delivered.done')}
        </ChunkyButton>
      </div>
    </div>);

}