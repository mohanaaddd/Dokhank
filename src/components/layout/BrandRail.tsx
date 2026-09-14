import React from 'react';
import { useTranslation } from 'react-i18next';
import { BikeIcon, ShieldCheckIcon, SparklesIcon } from 'lucide-react';

const pillars = [
{ icon: BikeIcon, en: 'Under 30 minutes', ar: 'أقل من ٣٠ دقيقة' },
{ icon: ShieldCheckIcon, en: 'Age verified at the door', ar: 'تحقق العمر عند الباب' },
{ icon: SparklesIcon, en: 'Points on every order', ar: 'نقاط مع كل طلب' }];


export function BrandRail({ locale }: {locale: 'en' | 'ar';}) {
  const { t } = useTranslation();

  return (
    <aside className="hidden w-[380px] shrink-0 flex-col justify-center gap-10 xl:w-[440px] lg:flex">
      <div>
        <p className="font-display text-xs tracking-[0.4em] text-neon-cyan">18+ ONLY</p>
        <h1 className="mt-4 font-display text-6xl leading-[0.95] text-white xl:text-7xl">
          {t('common.appName')}
        </h1>
        <p className="mt-5 max-w-sm text-lg leading-relaxed text-white/60">
          {locale === 'ar' ?
          'كل ما يخص التدخين، يصل إلى بابك قبل أن تنطفئ الولاعة.' :
          'Everything you smoke with, at your door before the lighter cools.'}
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {pillars.map((pillar) =>
        <li key={pillar.en} className="flex items-center gap-3 text-white/75">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ink-600 bg-ink-800">
              <pillar.icon className="h-5 w-5 text-accent" />
            </span>
            <span className="text-[15px] font-semibold">{locale === 'ar' ? pillar.ar : pillar.en}</span>
          </li>
        )}
      </ul>

      <p className="max-w-sm text-xs leading-relaxed text-white/35">
        {locale === 'ar' ?
        'التدخين يضر بصحتك. يُمنع البيع لمن هم دون ١٨ عامًا.' :
        'Smoking harms your health. Sales to under-18s are prohibited.'}
      </p>
    </aside>);

}