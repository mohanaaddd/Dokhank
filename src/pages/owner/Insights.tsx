import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { useLocale } from '../../contexts/LocaleContext';
import { useInsights } from '../../hooks/useInsights';
import { formatNumber, formatPrice, localize } from '../../utils/format';

function delta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round((current - previous) / previous * 100);
}

function Delta({ value }: {value: number | null;}) {
  if (value === null) return null;
  const up = value >= 0;
  const Icon = up ? TrendingUpIcon : TrendingDownIcon;
  return (
    <span
      className={[
      'flex items-center gap-1 text-[11px] font-extrabold',
      up ? 'text-accent' : 'text-neon-magenta'].
      join(' ')}>
      
      <Icon className="h-3.5 w-3.5" />
      {up ? '+' : ''}
      {value}%
    </span>);

}

export function Insights() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { snapshot, days, top, status } = useInsights();

  const recent = days.slice(-14);
  const peak = Math.max(1, ...recent.map((day) => day.revenue));
  const aov = snapshot.orders30d > 0 ? snapshot.revenue30d / snapshot.orders30d : 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-ink-700/80 bg-ink-900/90 px-4 py-4 backdrop-blur">
        <p className="font-display text-[10px] tracking-[0.22em] text-accent">
          {t('owner.insightsKicker')}
        </p>
        <div className="mt-1 flex items-end gap-3">
          <h1 className="font-display text-3xl text-white">
            {formatPrice(snapshot.revenueToday, locale)}
          </h1>
          <span className="pb-1.5">
            <Delta value={delta(snapshot.revenueToday, snapshot.revenueYesterday)} />
          </span>
        </div>
        <p className="mt-0.5 text-xs text-white/40">{t('owner.revenueToday')}</p>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {status === 'loading' && days.length === 0 ?
        <p className="py-20 text-center text-sm text-white/40">{t('common.loading')}</p> :

        <>
            <div className="grid grid-cols-3 gap-2">
              <Panel className="p-3">
                <p className="font-display text-[9px] tracking-[0.14em] text-white/40">
                  {t('owner.last7')}
                </p>
                <p className="mt-1 font-display text-sm text-white">
                  {formatPrice(snapshot.revenue7d, locale)}
                </p>
                <div className="mt-1">
                  <Delta value={delta(snapshot.revenue7d, snapshot.revenuePrev7d)} />
                </div>
              </Panel>
              <Panel className="p-3">
                <p className="font-display text-[9px] tracking-[0.14em] text-white/40">
                  {t('owner.ordersTodayShort')}
                </p>
                <p className="mt-1 font-display text-sm text-white">
                  {formatNumber(snapshot.ordersToday, locale)}
                </p>
              </Panel>
              <Panel className="p-3">
                <p className="font-display text-[9px] tracking-[0.14em] text-white/40">
                  {t('owner.avgOrder')}
                </p>
                <p className="mt-1 font-display text-sm text-white">{formatPrice(aov, locale)}</p>
              </Panel>
            </div>

            <section className="mt-6">
              <h2 className="mb-3 font-display text-[11px] tracking-[0.2em] text-white/45">
                {t('owner.last14')}
              </h2>
              {recent.length === 0 ?
            <p className="rounded-chunk border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-white/40">
                  {t('owner.noData')}
                </p> :

            <div className="flex h-36 items-end gap-1.5 rounded-chunk border border-ink-600 bg-ink-800/40 p-3">
                  {recent.map((day) =>
              <div key={day.day} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                      <div
                  className="w-full rounded-t-md bg-accent/80 transition-[height] duration-200 ease-pop"
                  style={{ height: `${Math.max(3, day.revenue / peak * 100)}%` }}
                  title={`${day.day} · ${formatPrice(day.revenue, locale)}`} />
                
                      <span className="text-center text-[8px] text-white/30">
                        {day.day.slice(-2)}
                      </span>
                    </div>
              )}
                </div>
            }
            </section>

            <section className="mt-6">
              <h2 className="mb-2 font-display text-[11px] tracking-[0.2em] text-white/45">
                {t('owner.topProducts')}
              </h2>
              {top.length === 0 ?
            <p className="rounded-chunk border border-dashed border-ink-600 px-4 py-6 text-center text-sm text-white/40">
                  {t('owner.noData')}
                </p> :

            <ol className="flex flex-col gap-2">
                  {top.map((product, rank) =>
              <li
                key={product.productId}
                className="flex items-center gap-3 rounded-2xl border border-ink-600/70 bg-ink-800/50 p-3">
                
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-700 font-display text-[11px] text-white/60">
                        {rank + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                        {localize(product.name, locale)}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-white/45">
                        {t('owner.units', { count: product.units })}
                      </span>
                      <span className="shrink-0 font-display text-xs text-accent">
                        {formatPrice(product.revenue, locale)}
                      </span>
                    </li>
              )}
                </ol>
            }
            </section>
          </>
        }
      </div>
    </div>);

}