import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BanknoteIcon,
  BellIcon,
  BikeIcon,
  ChevronRightIcon,
  CreditCardIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MapPinIcon,
  MessageCircleIcon,
  PackageIcon,
  PhoneIcon,
  PlusIcon,
  ShieldCheckIcon,
  SmartphoneIcon } from
'lucide-react';
import { ChunkyButton } from '../components/ui/ChunkyButton';
import { NeonBadge } from '../components/ui/NeonBadge';
import { useAddresses } from '../contexts/AddressContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocale, type AccentName } from '../contexts/LocaleContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useOrders } from '../contexts/OrderContext';
import { formatNumber, orderCode } from '../utils/format';
import type { Locale } from '../types';

const accents: Array<{id: AccentName;color: string;}> = [
{ id: 'lime', color: '#B8FF3C' },
{ id: 'cyan', color: '#22E4F5' },
{ id: 'magenta', color: '#FF3DCB' },
{ id: 'amber', color: '#FFC93C' }];


const languages: Array<{id: Locale;label: string;}> = [
{ id: 'en', label: 'English' },
{ id: 'ar', label: 'مصري' }];


type PanelId = 'payment' | 'notifications' | 'help';

function Toggle({ checked, onChange, label }: {checked: boolean;onChange: () => void;label: string;}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={[
      'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ease-pop',
      checked ? 'border-accent bg-accent/30' : 'border-ink-600 bg-ink-700'].
      join(' ')}>
      
      <span
        className={[
        'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-[left] duration-200 ease-pop',
        checked ? 'left-[26px] bg-accent' : 'left-[3px] bg-white/50'].
        join(' ')} />
      
    </button>);

}

export function Profile() {
  const { t } = useTranslation();
  const { locale, setLocale, accent, setAccent } = useLocale();
  const { user, signOut } = useAuth();
  const { orders, activeOrder } = useOrders();
  const { addresses } = useAddresses();
  const { navigate, reset } = useNavigation();

  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [notifications, setNotifications] = useState({ orders: true, offers: true, restock: false });

  const togglePanel = (id: PanelId) => setOpenPanel((prev) => prev === id ? null : id);

  const rowClass =
  'flex w-full items-center gap-3 px-4 py-4 text-start transition-colors duration-150 hover:bg-ink-700/50';

  return (
    <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-6">
      <header className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-blob border-2 border-accent bg-accent/15 font-display text-lg text-accent">
          {user?.initials ?? '—'}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl text-white">{user?.name ?? '—'}</h1>
          <p className="truncate text-sm text-white/45" dir="ltr">
            {user?.phone}
          </p>
          {user?.ageVerified &&
          <span className="mt-1.5 inline-block">
              <NeonBadge tone="lime">
                <ShieldCheckIcon className="h-3 w-3" /> {t('profile.ageVerified')}
              </NeonBadge>
            </span>
          }
        </div>
      </header>

      {user?.idLastFour &&
      <p className="mt-3 text-xs text-white/35">
          {t('profile.idOnFile', { digits: user.idLastFour })}
        </p>
      }

      <dl className="mt-6 grid grid-cols-2 gap-3">
        {[
        { label: t('profile.points'), value: formatNumber(user?.points ?? 0, locale) },
        { label: t('profile.orders'), value: formatNumber(orders.length, locale) }].
        map((stat) =>
        <div key={stat.label} className="rounded-chunk border border-ink-600 bg-ink-800/60 p-4 text-center">
            <dt className="font-display text-[9px] tracking-[0.16em] text-white/40">{stat.label}</dt>
            <dd className="mt-1 font-display text-2xl text-white">{stat.value}</dd>
          </div>
        )}
      </dl>

      {activeOrder &&
      <button
        type="button"
        onClick={() => navigate({ name: 'tracking', orderId: activeOrder.id })}
        className="mt-4 flex w-full items-center gap-3 rounded-chunk border border-neon-cyan/40 bg-neon-cyan/10 p-3 text-start transition-transform duration-150 ease-pop active:scale-[0.99]">
        
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neon-cyan/20">
            <BikeIcon className="h-5 w-5 text-neon-cyan" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[10px] tracking-[0.18em] text-neon-cyan">
              {t('profile.activeOrder')} {orderCode(activeOrder.id)}
            </span>
            <span className="block truncate text-sm font-bold text-white">
              {t(`tracking.${activeOrder.status}`)}
            </span>
          </span>
          <span className="shrink-0 text-xs font-bold text-neon-cyan">{t('profile.trackOrder')}</span>
        </button>
      }

      <section className="mt-6">
        <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
          {t('profile.language')}
        </h2>
        <div className="flex gap-2">
          {languages.map((entry) =>
          <button
            key={entry.id}
            type="button"
            onClick={() => setLocale(entry.id)}
            aria-pressed={locale === entry.id}
            className={[
            'flex-1 rounded-chunk border py-3 text-[15px] font-extrabold transition-[transform,border-color,background-color,color] duration-150 ease-pop active:scale-[0.98]',
            locale === entry.id ?
            'border-accent bg-accent text-ink-950' :
            'border-ink-600 bg-ink-800/60 text-white/60 hover:text-white'].
            join(' ')}>
            
              {entry.label}
            </button>
          )}
        </div>
      </section>

      <section className="mt-6 text-center">
        <h2 className="mb-3 font-display text-[11px] tracking-[0.2em] text-white/45">
          {t('profile.accent')}
        </h2>
        <div className="flex justify-center gap-4">
          {accents.map((entry) =>
          <button
            key={entry.id}
            type="button"
            onClick={() => setAccent(entry.id)}
            aria-label={entry.id}
            aria-pressed={accent === entry.id}
            className={[
            'h-12 w-12 rounded-2xl border-2 transition-transform duration-150 ease-pop active:scale-90',
            accent === entry.id ? 'border-white' : 'border-transparent'].
            join(' ')}
            style={{ backgroundColor: entry.color, boxShadow: `0 0 18px -4px ${entry.color}` }} />

          )}
        </div>
      </section>

      <section className="-mx-2 mt-7">
        <h2 className="mb-3 px-2 font-display text-[11px] tracking-[0.2em] text-white/45">
          {t('profile.settings')}
        </h2>
        <ul className="divide-y divide-ink-700 overflow-hidden rounded-chunk border border-ink-600 bg-ink-800/50">
          <li>
            <button type="button" className={rowClass} onClick={() => navigate({ name: 'orders' })}>
              <PackageIcon className="h-5 w-5 shrink-0 text-white/45" />
              <span className="flex-1 text-start text-[15px] font-bold text-white">
                {t('profile.myOrders')}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-bold text-white/35">
                  {t('profile.ordersCount', { count: orders.length })}
                </span>
                <ChevronRightIcon className="h-4 w-4 text-white/30 rtl:rotate-180" />
              </span>
            </button>
          </li>

          <li>
            <button type="button" className={rowClass} onClick={() => navigate({ name: 'address' })}>
              <MapPinIcon className="h-5 w-5 shrink-0 text-white/45" />
              <span className="flex-1 text-start text-[15px] font-bold text-white">
                {t('profile.addresses')}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-bold text-white/35">
                  {formatNumber(addresses.length, locale)}
                </span>
                <ChevronRightIcon className="h-4 w-4 text-white/30 rtl:rotate-180" />
              </span>
            </button>
          </li>

          <li>
            <button
              type="button"
              className={rowClass}
              aria-expanded={openPanel === 'payment'}
              onClick={() => togglePanel('payment')}>
              
              <CreditCardIcon className="h-5 w-5 shrink-0 text-white/45" />
              <span className="flex-1 text-start text-[15px] font-bold text-white">
                {t('profile.payment')}
              </span>
              <ChevronRightIcon
                className={[
                'h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 ease-pop',
                openPanel === 'payment' ? 'rotate-90' : 'rtl:rotate-180'].
                join(' ')} />
              
            </button>
            <AnimatePresence initial={false}>
              {openPanel === 'payment' &&
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden bg-ink-900/60">
                
                  <ul className="flex flex-col gap-2 px-4 py-4">
                    {[
                  { id: 'Cash', Icon: BanknoteIcon, title: t('profile.paymentCash'), note: t('profile.paymentCashNote'), active: true },
                  { id: 'Card', Icon: CreditCardIcon, title: t('profile.paymentCard'), note: t('profile.paymentCardNote'), active: false },
                  {
                    id: 'Instapay',
                    Icon: SmartphoneIcon,
                    title: t('profile.paymentInstapay'),
                    note: t('profile.paymentInstapayNote', { phone: user?.phone ?? '' }),
                    active: false
                  }].
                  map((method) =>
                  <li
                    key={method.id}
                    className={[
                    'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
                    method.active ? 'border-accent/50 bg-accent/10' : 'border-ink-600 bg-ink-800/60'].
                    join(' ')}>
                    
                        <method.Icon
                      className={['h-4 w-4 shrink-0', method.active ? 'text-accent' : 'text-white/45'].join(' ')} />
                    
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-white">{method.title}</span>
                          <span className="block truncate text-xs text-white/40" dir="auto">
                            {method.note}
                          </span>
                        </span>
                      </li>
                  )}
                    <li>
                      <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-600 py-2.5 text-xs font-bold text-white/50 transition-colors duration-150 hover:border-accent/50 hover:text-accent">
                      
                        <PlusIcon className="h-4 w-4" />
                        {t('profile.paymentAdd')}
                      </button>
                    </li>
                  </ul>
                </motion.div>
              }
            </AnimatePresence>
          </li>

          <li>
            <button
              type="button"
              className={rowClass}
              aria-expanded={openPanel === 'notifications'}
              onClick={() => togglePanel('notifications')}>
              
              <BellIcon className="h-5 w-5 shrink-0 text-white/45" />
              <span className="flex-1 text-start text-[15px] font-bold text-white">
                {t('profile.notifications')}
              </span>
              <ChevronRightIcon
                className={[
                'h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 ease-pop',
                openPanel === 'notifications' ? 'rotate-90' : 'rtl:rotate-180'].
                join(' ')} />
              
            </button>
            <AnimatePresence initial={false}>
              {openPanel === 'notifications' &&
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden bg-ink-900/60">
                
                  <ul className="flex flex-col gap-3 px-4 py-4">
                    {([
                  { key: 'orders', title: t('profile.notifOrders'), note: t('profile.notifOrdersNote') },
                  { key: 'offers', title: t('profile.notifOffers'), note: t('profile.notifOffersNote') },
                  { key: 'restock', title: t('profile.notifRestock'), note: t('profile.notifRestockNote') }] as
                  const).map((entry) =>
                  <li key={entry.key} className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 text-start">
                          <span className="block text-sm font-bold text-white">{entry.title}</span>
                          <span className="block text-xs text-white/40">{entry.note}</span>
                        </span>
                        <Toggle
                      label={entry.title}
                      checked={notifications[entry.key]}
                      onChange={() =>
                      setNotifications((prev) => ({ ...prev, [entry.key]: !prev[entry.key] }))
                      } />
                    
                      </li>
                  )}
                  </ul>
                </motion.div>
              }
            </AnimatePresence>
          </li>

          <li>
            <button
              type="button"
              className={rowClass}
              aria-expanded={openPanel === 'help'}
              onClick={() => togglePanel('help')}>
              
              <LifeBuoyIcon className="h-5 w-5 shrink-0 text-white/45" />
              <span className="flex-1 text-start text-[15px] font-bold text-white">
                {t('profile.help')}
              </span>
              <ChevronRightIcon
                className={[
                'h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 ease-pop',
                openPanel === 'help' ? 'rotate-90' : 'rtl:rotate-180'].
                join(' ')} />
              
            </button>
            <AnimatePresence initial={false}>
              {openPanel === 'help' &&
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden bg-ink-900/60">
                
                  <ul className="flex flex-col gap-2 px-4 py-4">
                    {[
                  { id: 'chat', Icon: MessageCircleIcon, title: t('profile.helpChat'), note: t('profile.helpChatNote') },
                  { id: 'call', Icon: PhoneIcon, title: t('profile.helpCall'), note: t('profile.helpCallNote') },
                  { id: 'faq', Icon: LifeBuoyIcon, title: t('profile.helpFaq'), note: t('profile.helpFaqNote') }].
                  map((entry) =>
                  <li key={entry.id}>
                        <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-2xl border border-ink-600 bg-ink-800/60 px-3 py-2.5 text-start transition-colors duration-150 hover:border-accent/40">
                      
                          <entry.Icon className="h-4 w-4 shrink-0 text-white/45" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-white">{entry.title}</span>
                            <span className="block truncate text-xs text-white/40">{entry.note}</span>
                          </span>
                          <ChevronRightIcon className="h-4 w-4 shrink-0 text-white/25 rtl:rotate-180" />
                        </button>
                      </li>
                  )}
                  </ul>
                </motion.div>
              }
            </AnimatePresence>
          </li>
        </ul>
      </section>

      <ChunkyButton
        variant="ghost"
        fullWidth
        className="mt-6"
        onClick={() => {
          signOut();
          reset({ name: 'welcome' });
        }}>
        
        <LogOutIcon className="h-4 w-4 rtl:rotate-180" />
        {t('profile.signOut')}
      </ChunkyButton>
    </div>);

}