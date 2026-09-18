-- ============================================================================
-- DOKHAN — seed data
-- Idempotent: safe to run more than once. Mirrors `data/products.ts` and
-- `data/addresses.ts` exactly, so the live catalog matches the prototype.
-- ============================================================================

-- ── ops settings ────────────────────────────────────────────────────────────
insert into public.app_settings (key, value) values
  ('delivery', '{"fee": 25, "free_over": 500, "enforce_hours": false}'::jsonb),
  ('hero',     '{"product_id": "iluma-one", "badge": "hot"}'::jsonb),
  ('flags',    '{"paymob": false, "instapay": true, "push": false}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ── zones ───────────────────────────────────────────────────────────────────
-- `enforce_hours` is off in `app_settings` until launch, so these hours are
-- recorded but not yet blocking.
insert into public.zones (name_en, name_ar, min_lat, max_lat, min_lng, max_lng, delivery_fee, opens_at, closes_at, sort_order)
select 'Zamalek', 'الزمالك', 30.04, 30.08, 31.20, 31.24, 25, '10:00', '02:00', 10
where not exists (select 1 from public.zones where name_en = 'Zamalek');

insert into public.zones (name_en, name_ar, min_lat, max_lat, min_lng, max_lng, delivery_fee, opens_at, closes_at, sort_order)
select 'Maadi', 'المعادي', 29.95, 30.00, 31.24, 31.30, 25, '10:00', '02:00', 20
where not exists (select 1 from public.zones where name_en = 'Maadi');

insert into public.zones (name_en, name_ar, min_lat, max_lat, min_lng, max_lng, delivery_fee, opens_at, closes_at, sort_order)
select 'Greater Cairo', 'القاهرة الكبرى', 29.90, 30.20, 31.10, 31.50, 25, '10:00', '02:00', 100
where not exists (select 1 from public.zones where name_en = 'Greater Cairo');

-- ── couriers (dispatch demo riders; the courier app replaces these) ─────────
insert into public.couriers (name, initials, phone, vehicle, status, rating)
select 'Dina', 'DN', '+201001234567', 'Scooter, NX-42', 'idle', 4.9
where not exists (select 1 from public.couriers where phone = '+201001234567');

insert into public.couriers (name, initials, phone, vehicle, status, rating)
select 'Karim', 'KM', '+201009876543', 'Scooter, MZ-08', 'idle', 4.7
where not exists (select 1 from public.couriers where phone = '+201009876543');

-- ── categories ──────────────────────────────────────────────────────────────
insert into public.categories (id, label_en, label_ar, icon, sort_order) values
  ('vapes',        'Vapes',                'فيب',            'Zap',       10),
  ('iqos_devices', 'IQOS devices',         'أجهزة آيكوس',    'Cpu',       20),
  ('iqos_cases',   'IQOS cases',           'جرابات آيكوس',   'Box',       30),
  ('heets',        'IQOS sticks',          'أعواد آيكوس',    'Cigarette', 40),
  ('cigars',       'Cigars',               'سيجار',          'Flame',     50),
  ('cigarettes',   'Egyptian cigarettes',  'سجائر مصرية',    'Landmark',  60)
on conflict (id) do update set
  label_en = excluded.label_en,
  label_ar = excluded.label_ar,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

-- ── products ────────────────────────────────────────────────────────────────
insert into public.products (
  id, name_en, name_ar, tagline_en, tagline_ar, description_en, description_ar,
  price, compare_at_price, image_url, category_id, rating, review_count, stock, badge
) values
  (
    'iluma-one',
    'IQOS ILUMA ONE', 'آيكوس إيلوما ون',
    'Bladeless, 20 sticks per charge', 'بدون شفرة، ٢٠ عودًا بالشحنة',
    'The all-in-one ILUMA heats with induction, so there is no blade to snap and nothing to scrape clean. Twenty consecutive uses on a full charge.',
    'جهاز إيلوما ون يعمل بالتسخين الحثي، بلا شفرة تنكسر وبلا تنظيف. عشرون استخدامًا متتاليًا بشحنة كاملة.',
    2900, 3350,
    'https://cdn.magicpatterns.com/patterns/generated-images/89d6d04a-4ce1-4c78-bbd3-55d44ce59dd7.jpg',
    'iqos_devices', 4.8, 412, 24, 'hot'
  ),
  (
    'iqos-duo',
    'IQOS 3 DUO Kit', 'آيكوس ٣ ديو',
    'Two sticks back to back', 'عودان متتاليان',
    'Pocket charger plus holder. Two consecutive uses without returning the holder to the case, and a full recharge in under two minutes.',
    'شاحن جيب مع الحامل. استخدامان متتاليان دون إعادة الحامل للعلبة، وشحن كامل في أقل من دقيقتين.',
    2350, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/1c6f385f-2eee-4427-a2d8-7af9a1d7efbf.jpg',
    'iqos_devices', 4.6, 268, 17, null
  ),
  (
    'terea-amber',
    'TEREA Amber', 'تيريا أمبر',
    'Roasted tobacco, 20 sticks', 'تبغ محمص، ٢٠ عودًا',
    'A full, roasted tobacco blend with a woody finish. Made for ILUMA devices, no cleaning, no leftover residue.',
    'خلطة تبغ محمصة كاملة بلمسة خشبية. معمولة لأجهزة إيلوما، من غير تنظيف ومن غير بواقي.',
    130, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/73334269-8942-4d0f-b4b6-46a088fa69c2.jpg',
    'heets', 4.7, 1830, 180, null
  ),
  (
    'terea-sienna',
    'TEREA Sienna', 'تيريا سيينا',
    'Rich & rounded, 20 sticks', 'غني ومتوازن، ٢٠ عودًا',
    'A deeper, rounder blend with a hint of dried fruit. The house favourite for evenings on the balcony.',
    'خلطة أعمق وأكثر توازنًا بلمسة فاكهة مجففة. المفضلة لسهرات البلكونة.',
    130, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/8f5fde43-404e-463b-997c-ad4a3e6d4b53.jpg',
    'heets', 4.6, 964, 9, 'low_stock'
  ),
  (
    'cleopatra-box',
    'Cleopatra Box', 'كليوباترا بوكس',
    'Egypt’s classic, 20s', 'الكلاسيكية المصرية، ٢٠ سيجارة',
    'The blue box every kiosk in Cairo keeps behind the counter. Firm draw, familiar Virginia blend, sealed pack.',
    'العلبة الزرقاء الموجودة خلف كل كشك في القاهرة. سحب ثابت وخلطة فيرجينيا المألوفة في علبة محكمة.',
    98, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/d15aa0d4-4fe9-441e-957d-2f56e76e6894.jpg',
    'cigarettes', 4.4, 2410, 320, 'hot'
  ),
  (
    'cleopatra-soft',
    'Cleopatra Soft Pack', 'كليوباترا علبة طرية',
    'The original soft pack, 20s', 'العلبة الطرية الأصلية، ٢٠ سيجارة',
    'Lighter card, softer draw, the same blend the country grew up on. Folds flat into a shirt pocket.',
    'ورق أخف وسحب أنعم بنفس الخلطة التي نشأ عليها الجميع. تنطوي بسهولة في جيب القميص.',
    85, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/4fb42e80-25eb-4988-8bb8-79ca5802d94a.jpg',
    'cigarettes', 4.2, 1120, 280, null
  ),
  (
    'mondial-green',
    'Mondial Green', 'مونديال أخضر',
    'Menthol slims, 20s', 'نعناع سليم، ٢٠ سيجارة',
    'A cool menthol slim from the Eastern Company line-up. Crisp finish, lighter body than the box classics.',
    'سيجارة سليم بالنعناع من إنتاج الشركة الشرقية. نهاية منعشة وجسم أخف من الكلاسيكية.',
    105, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/232c79f4-a9fd-478c-bdd9-e32962b4a87a.jpg',
    'cigarettes', 4.1, 640, 96, null
  ),
  (
    'xros-pod',
    'Vaporesso XROS 4', 'فابوريسو إكسروس ٤',
    'Refillable pod, 1000 mAh', 'بود قابل للتعبئة، ١٠٠٠ مللي أمبير',
    'A pocket pod with adjustable airflow and a battery readout. Mesh coils pull flavour cleanly to the last millilitre.',
    'بود صغير بتحكم في الهواء وشاشة بطارية. ملفات شبكية تستخرج النكهة حتى آخر مليلتر.',
    1250, 1450,
    'https://cdn.magicpatterns.com/patterns/generated-images/8be3af07-0043-425c-b6ff-521a88bbc7fb.jpg',
    'vapes', 4.7, 388, 42, null
  ),
  (
    'bar-10000',
    'Elf Bar BC10000', 'إلف بار ١٠٠٠٠',
    'Disposable, 10k puffs', 'يستخدم مرة واحدة، ١٠ آلاف نفس',
    'Ten thousand puffs with a dual mesh coil and a charge port for the last stretch. Nothing to fill, nothing to clean.',
    'عشرة آلاف نفس بملف شبكي مزدوج ومنفذ شحن للمرحلة الأخيرة. بلا تعبئة وبلا تنظيف.',
    650, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/a8bffe77-4d35-4c5f-98c9-76bd0111fa2e.jpg',
    'vapes', 4.3, 712, 64, 'new'
  ),
  (
    'iqos-leather-case',
    'Leather Sleeve Case', 'جراب جلد طبيعي',
    'Full-grain, hand stitched', 'جلد طبيعي بخياطة يدوية',
    'A full-grain sleeve cut for the ILUMA body, stitched by hand in Damietta. Ages into your pocket, never rattles.',
    'جراب من الجلد الطبيعي مفصل لجسم إيلوما، مخيط يدويًا في دمياط. يتشكل مع الاستخدام ولا يصدر صوتًا.',
    450, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/c31de2d9-9b99-4e71-8ee0-f00e9ca72366.jpg',
    'iqos_cases', 4.8, 152, 38, null
  ),
  (
    'iqos-silicone-case',
    'Silicone Grip Cover', 'غطاء سيليكون',
    'Drop-proof, washable', 'مقاوم للسقوط وقابل للغسل',
    'A soft shell that takes the hit when the device slips. Rinses clean under the tap and dries in minutes.',
    'غطاء لين يمتص الصدمة عند سقوط الجهاز. يُغسل بسهولة ويجف في دقائق.',
    220, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/8496b78b-3ee1-4c02-b391-99fe7ab597f4.jpg',
    'iqos_cases', 4.4, 206, 110, null
  ),
  (
    'iqos-metal-case',
    'Brushed Metal Case', 'علبة معدنية',
    'Magnetic lid, crush-proof', 'غطاء مغناطيسي مقاوم للكسر',
    'Brushed aluminium with a magnetic lid that snaps shut. Holds the holder and a pack of sticks together.',
    'ألومنيوم مصقول بغطاء مغناطيسي محكم. يحمل الحامل وعلبة الأعواد معًا.',
    380, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/f159eced-df5f-4d83-affd-b418e54067ee.jpg',
    'iqos_cases', 4.5, 88, 26, null
  ),
  (
    'robusto-duo',
    'Robusto Duo', 'روبوستو ديو',
    'Two hand-rolled cigars', 'سيجارتان ملفوفتان يدويًا',
    'Two robustos in a cedar sleeve, cocoa and toasted cedar on a slow, even burn of about forty minutes each.',
    'سيجارتين روبوستو في غلاف أرز، كاكاو وأرز محمص باحتراق هادي ومتساوي حوالي أربعين دقيقة للواحدة.',
    850, null,
    'https://cdn.magicpatterns.com/patterns/generated-images/fde53b34-b3af-46e2-b412-5ee0184a8c7e.jpg',
    'cigars', 4.6, 74, 21, null
  ),
  (
    'cedar-humidor',
    'Cedar Humidor Box', 'علبة أرز مرطبة',
    'Holds 10, with hygrometer', 'تتسع ١٠، مع مقياس رطوبة',
    'Spanish cedar lining, brass clasp and a calibrated hygrometer in the lid. Keeps a box of cigars at 70% for months.',
    'بطانة أرز إسباني ومشبك نحاسي ومقياس رطوبة معاير في الغطاء. تحافظ على السيجار عند ٧٠٪ رطوبة لأشهر.',
    2600, 3100,
    'https://cdn.magicpatterns.com/patterns/generated-images/d86101e8-7609-4189-86b6-f10d428ba8ff.jpg',
    'cigars', 4.9, 46, 6, 'low_stock'
  )
on conflict (id) do update set
  name_en = excluded.name_en,
  name_ar = excluded.name_ar,
  tagline_en = excluded.tagline_en,
  tagline_ar = excluded.tagline_ar,
  description_en = excluded.description_en,
  description_ar = excluded.description_ar,
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  image_url = excluded.image_url,
  category_id = excluded.category_id,
  rating = excluded.rating,
  review_count = excluded.review_count,
  stock = excluded.stock,
  badge = excluded.badge,
  is_active = true;

-- ── product specs ───────────────────────────────────────────────────────────
delete from public.product_specs;

insert into public.product_specs (product_id, label_en, label_ar, value_en, value_ar, sort_order) values
  ('iluma-one', 'Uses per charge', 'الاستخدام بالشحنة', '20', '٢٠', 1),
  ('iluma-one', 'Heating', 'التسخين', 'Induction', 'حثي', 2),
  ('iluma-one', 'Warranty', 'الضمان', '1 year', 'سنة واحدة', 3),

  ('iqos-duo', 'Uses per charge', 'الاستخدام بالشحنة', '2 back to back', 'عودان متتاليان', 1),
  ('iqos-duo', 'Recharge', 'الشحن', '1 min 50 s', 'دقيقة و٥٠ ثانية', 2),
  ('iqos-duo', 'In the box', 'المحتويات', 'Holder + charger', 'حامل + شاحن', 3),

  ('terea-amber', 'Sticks', 'الأعواد', '20', '٢٠', 1),
  ('terea-amber', 'Profile', 'النكهة', 'Roasted, woody', 'محمص وخشبي', 2),
  ('terea-amber', 'Fits', 'يناسب', 'ILUMA only', 'إيلوما فقط', 3),

  ('terea-sienna', 'Sticks', 'الأعواد', '20', '٢٠', 1),
  ('terea-sienna', 'Profile', 'النكهة', 'Rich, dried fruit', 'غني بفاكهة مجففة', 2),
  ('terea-sienna', 'Fits', 'يناسب', 'ILUMA only', 'إيلوما فقط', 3),

  ('cleopatra-box', 'Pack', 'العلبة', '20 sticks', '٢٠ سيجارة', 1),
  ('cleopatra-box', 'Blend', 'الخلطة', 'Virginia', 'فيرجينيا', 2),
  ('cleopatra-box', 'Made in', 'بلد الصنع', 'Egypt', 'مصر', 3),

  ('cleopatra-soft', 'Pack', 'العلبة', '20 sticks', '٢٠ سيجارة', 1),
  ('cleopatra-soft', 'Style', 'النوع', 'Soft pack', 'علبة طرية', 2),
  ('cleopatra-soft', 'Made in', 'بلد الصنع', 'Egypt', 'مصر', 3),

  ('mondial-green', 'Pack', 'العلبة', '20 sticks', '٢٠ سيجارة', 1),
  ('mondial-green', 'Profile', 'النكهة', 'Menthol', 'نعناع', 2),
  ('mondial-green', 'Format', 'المقاس', 'Slim', 'سليم', 3),

  ('xros-pod', 'Battery', 'البطارية', '1000 mAh', '١٠٠٠ مللي أمبير', 1),
  ('xros-pod', 'Pod', 'البود', '3 ml refillable', '٣ مل قابل للتعبئة', 2),
  ('xros-pod', 'Charging', 'الشحن', 'USB-C', 'يو إس بي-سي', 3),

  ('bar-10000', 'Puffs', 'الأنفاس', '10,000', '١٠٬٠٠٠', 1),
  ('bar-10000', 'Nicotine', 'النيكوتين', '2% salt', '٢٪ ملحي', 2),
  ('bar-10000', 'Coil', 'الملف', 'Dual mesh', 'شبكي مزدوج', 3),

  ('iqos-leather-case', 'Material', 'المادة', 'Full-grain leather', 'جلد طبيعي', 1),
  ('iqos-leather-case', 'Fits', 'يناسب', 'ILUMA / ILUMA ONE', 'إيلوما / إيلوما ون', 2),
  ('iqos-leather-case', 'Made in', 'بلد الصنع', 'Damietta', 'دمياط', 3),

  ('iqos-silicone-case', 'Material', 'المادة', 'Silicone', 'سيليكون', 1),
  ('iqos-silicone-case', 'Washable', 'قابل للغسل', 'Yes', 'نعم', 2),
  ('iqos-silicone-case', 'Colours', 'الألوان', '6', '٦', 3),

  ('iqos-metal-case', 'Material', 'المادة', 'Aluminium', 'ألومنيوم', 1),
  ('iqos-metal-case', 'Closure', 'الإغلاق', 'Magnetic', 'مغناطيسي', 2),
  ('iqos-metal-case', 'Holds', 'يتسع لـ', 'Device + pack', 'جهاز + علبة', 3),

  ('robusto-duo', 'Count', 'العدد', '2 cigars', 'سيجارتان', 1),
  ('robusto-duo', 'Burn time', 'مدة الاحتراق', '~40 min', '≈٤٠ دقيقة', 2),
  ('robusto-duo', 'Notes', 'النكهات', 'Cocoa, cedar', 'كاكاو وأرز', 3),

  ('cedar-humidor', 'Capacity', 'السعة', '10 cigars', '١٠ سيجار', 1),
  ('cedar-humidor', 'Lining', 'البطانة', 'Spanish cedar', 'أرز إسباني', 2),
  ('cedar-humidor', 'Hygrometer', 'مقياس الرطوبة', 'Included', 'مضمّن', 3);

-- ── a promotion to test the discount path ───────────────────────────────────
insert into public.promotions (code, percent_off, min_subtotal, is_active)
select 'DOKHAN10', 10, 200, true
where not exists (select 1 from public.promotions where code = 'DOKHAN10');

-- ── trending view needs one refresh before it has rows ──────────────────────
refresh materialized view public.v_trending_products;
