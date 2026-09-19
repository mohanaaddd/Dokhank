import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageIcon, UploadIcon } from 'lucide-react';
import { ChunkyButton } from '../../components/ui/ChunkyButton';
import { Toggle } from '../../components/ui/Toggle';
import { ScreenHeader } from '../../components/layout/ScreenHeader';
import { useLocale } from '../../contexts/LocaleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { uploadProductImage, useOwnerCatalog } from '../../hooks/useOwnerCatalog';
import { localize } from '../../utils/format';
import type { CategoryId, Product, ProductBadge } from '../../types';

const BADGES: Array<ProductBadge | 'none'> = ['none', 'new', 'hot', 'low_stock'];

const blank = (): Product => ({
  id: '',
  name: { en: '', ar: '' },
  tagline: { en: '', ar: '' },
  description: { en: '', ar: '' },
  price: 0,
  image: '',
  category: 'vapes',
  rating: 0,
  reviewCount: 0,
  stock: 0,
  isActive: true,
  specs: []
});

const slug = (value: string) =>
value.
trim().
toLowerCase().
replace(/[^a-z0-9]+/g, '-').
replace(/^-|-$/g, '').
slice(0, 48);

function Field({
  label,
  children



}: {label: string;children: React.ReactNode;}) {
  return (
    <label className="block">
      <span className="font-display text-[10px] tracking-[0.18em] text-white/45">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>);

}

const inputClass =
'w-full rounded-2xl border border-ink-600 bg-ink-800/70 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-accent focus:outline-none';

export function ProductEditor({ productId }: {productId: string | null;}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { back } = useNavigation();
  const { items, categories, save } = useOwnerCatalog();
  const fileInput = useRef<HTMLInputElement>(null);

  const existing = useMemo(
    () => productId ? items.find((item) => item.id === productId) : undefined,
    [items, productId]
  );
  const [draft, setDraft] = useState<Product>(existing ?? blank());
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The list loads asynchronously; adopt the real row the moment it arrives.
  const [adopted, setAdopted] = useState(Boolean(existing) || !productId);
  if (!adopted && existing) {
    setDraft(existing);
    setAdopted(true);
  }

  const patch = (changes: Partial<Product>) => setDraft((prev) => ({ ...prev, ...changes }));

  const onUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const id = draft.id || slug(draft.name.en) || `product-${Date.now().toString(36)}`;
      const url = await uploadProductImage(id, file);
      patch({ image: url });
    } catch {
      setError(t('owner.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    const id = draft.id || slug(draft.name.en);
    if (!id || !draft.name.en.trim()) {
      setError(t('owner.nameRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await save({ ...draft, id });
      back();
    } catch {
      setError(t('owner.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader
        onBack={back}
        kicker={t('owner.catalogKicker')}
        title={productId ? t('owner.editProduct') : t('owner.newProduct')} />
      

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-4">
        <div className="flex gap-3">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-chunk border border-ink-600 bg-ink-950">
            {draft.image ?
            <img src={draft.image} alt="" className="h-full w-full object-cover" /> :

            <ImageIcon className="h-7 w-7 text-white/25" />
            }
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <ChunkyButton
              size="sm"
              variant="dark"
              loading={uploading}
              onClick={() => fileInput.current?.click()}>
              
              <UploadIcon className="h-4 w-4" />
              {t('owner.uploadImage')}
            </ChunkyButton>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onUpload(file);
                event.target.value = '';
              }} />
            
            <p className="text-[11px] leading-relaxed text-white/35">{t('owner.imageNote')}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <Field label={t('owner.nameEn')}>
            <input
              dir="ltr"
              value={draft.name.en}
              onChange={(event) => patch({ name: { ...draft.name, en: event.target.value } })}
              className={inputClass} />
            
          </Field>
          <Field label={t('owner.nameAr')}>
            <input
              dir="rtl"
              value={draft.name.ar}
              onChange={(event) => patch({ name: { ...draft.name, ar: event.target.value } })}
              className={inputClass} />
            
          </Field>
          <Field label={t('owner.taglineEn')}>
            <input
              dir="ltr"
              value={draft.tagline.en}
              onChange={(event) => patch({ tagline: { ...draft.tagline, en: event.target.value } })}
              className={inputClass} />
            
          </Field>
          <Field label={t('owner.taglineAr')}>
            <input
              dir="rtl"
              value={draft.tagline.ar}
              onChange={(event) => patch({ tagline: { ...draft.tagline, ar: event.target.value } })}
              className={inputClass} />
            
          </Field>
          <Field label={t('owner.descriptionEn')}>
            <textarea
              dir="ltr"
              rows={3}
              value={draft.description.en}
              onChange={(event) =>
              patch({ description: { ...draft.description, en: event.target.value } })
              }
              className={inputClass} />
            
          </Field>
          <Field label={t('owner.descriptionAr')}>
            <textarea
              dir="rtl"
              rows={3}
              value={draft.description.ar}
              onChange={(event) =>
              patch({ description: { ...draft.description, ar: event.target.value } })
              }
              className={inputClass} />
            
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('owner.price')}>
              <input
                inputMode="decimal"
                value={String(draft.price)}
                onChange={(event) => patch({ price: Number(event.target.value) || 0 })}
                className={inputClass} />
              
            </Field>
            <Field label={t('owner.compareAt')}>
              <input
                inputMode="decimal"
                value={draft.compareAtPrice === undefined ? '' : String(draft.compareAtPrice)}
                onChange={(event) =>
                patch({
                  compareAtPrice: event.target.value ? Number(event.target.value) : undefined
                })
                }
                className={inputClass} />
              
            </Field>
            <Field label={t('owner.stock')}>
              <input
                inputMode="numeric"
                value={String(draft.stock)}
                onChange={(event) => patch({ stock: Math.max(0, Number(event.target.value) || 0) })}
                className={inputClass} />
              
            </Field>
            <Field label={t('owner.category')}>
              <select
                value={draft.category}
                onChange={(event) => patch({ category: event.target.value as CategoryId })}
                className={inputClass}>
                
                {categories.map((category) =>
                <option key={category.id} value={category.id}>
                    {localize(category.label, locale)}
                  </option>
                )}
              </select>
            </Field>
          </div>

          <div>
            <span className="font-display text-[10px] tracking-[0.18em] text-white/45">
              {t('owner.badge')}
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {BADGES.map((badge) => {
                const on = (draft.badge ?? 'none') === badge;
                return (
                  <button
                    key={badge}
                    type="button"
                    aria-pressed={on}
                    onClick={() => patch({ badge: badge === 'none' ? undefined : badge })}
                    className={[
                    'rounded-2xl border px-3 py-2 text-xs font-extrabold transition-colors duration-150 ease-pop',
                    on ?
                    'border-accent bg-accent text-ink-950' :
                    'border-ink-600 bg-ink-800/70 text-white/60 hover:text-white'].
                    join(' ')}>
                    
                    {t(`owner.badge_${badge}`)}
                  </button>);

              })}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-chunk border border-ink-600 bg-ink-800/50 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-white">{t('owner.activeToggle')}</p>
              <p className="text-xs text-white/40">{t('owner.activeNote')}</p>
            </div>
            <Toggle
              checked={draft.isActive !== false}
              onChange={() => patch({ isActive: draft.isActive === false })}
              label={t('owner.activeToggle')} />
            
          </div>
        </div>

        {error &&
        <p className="mt-4 rounded-2xl border border-neon-magenta/40 bg-neon-magenta/10 px-3 py-2 text-xs font-bold text-neon-magenta">
            {error}
          </p>
        }
      </div>

      <div className="flex gap-2 border-t border-ink-700 bg-ink-900/95 px-4 py-3">
        <ChunkyButton variant="ghost" onClick={back}>
          {t('common.cancel')}
        </ChunkyButton>
        <ChunkyButton className="flex-1" loading={busy} onClick={() => void onSave()}>
          {t('common.save')}
        </ChunkyButton>
      </div>
    </div>);

}