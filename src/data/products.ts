import type { Category, Product } from '../types';

export const categories: Category[] = [
{ id: 'vapes', label: { en: 'Vapes', ar: 'فيب' }, icon: 'Zap' },
{ id: 'iqos_devices', label: { en: 'IQOS devices', ar: 'أجهزة آيكوس' }, icon: 'Cpu' },
{ id: 'iqos_cases', label: { en: 'IQOS cases', ar: 'جرابات آيكوس' }, icon: 'Box' },
{ id: 'heets', label: { en: 'IQOS sticks', ar: 'أعواد آيكوس' }, icon: 'Cigarette' },
{ id: 'cigars', label: { en: 'Cigars', ar: 'سيجار' }, icon: 'Flame' },
{ id: 'cigarettes', label: { en: 'Egyptian cigarettes', ar: 'سجائر مصرية' }, icon: 'Landmark' }];


export const products: Product[] = [
{
  id: 'iluma-one',
  name: { en: 'IQOS ILUMA ONE', ar: 'آيكوس إيلوما ون' },
  tagline: { en: 'Bladeless, 20 sticks per charge', ar: 'بدون شفرة، ٢٠ عودًا بالشحنة' },
  description: {
    en: 'The all-in-one ILUMA heats with induction, so there is no blade to snap and nothing to scrape clean. Twenty consecutive uses on a full charge.',
    ar: 'جهاز إيلوما ون يعمل بالتسخين الحثي، بلا شفرة تنكسر وبلا تنظيف. عشرون استخدامًا متتاليًا بشحنة كاملة.'
  },
  price: 2900,
  compareAtPrice: 3350,
  image: "/89d6d04a-4ce1-4c78-bbd3-55d44ce59dd7.jpg",
  category: 'iqos_devices',
  rating: 4.8,
  reviewCount: 412,
  stock: 24,
  badge: 'hot',
  specs: [
  { label: { en: 'Uses per charge', ar: 'الاستخدام بالشحنة' }, value: { en: '20', ar: '٢٠' } },
  { label: { en: 'Heating', ar: 'التسخين' }, value: { en: 'Induction', ar: 'حثي' } },
  { label: { en: 'Warranty', ar: 'الضمان' }, value: { en: '1 year', ar: 'سنة واحدة' } }]

},
{
  id: 'iqos-duo',
  name: { en: 'IQOS 3 DUO Kit', ar: 'آيكوس ٣ ديو' },
  tagline: { en: 'Two sticks back to back', ar: 'عودان متتاليان' },
  description: {
    en: 'Pocket charger plus holder. Two consecutive uses without returning the holder to the case, and a full recharge in under two minutes.',
    ar: 'شاحن جيب مع الحامل. استخدامان متتاليان دون إعادة الحامل للعلبة، وشحن كامل في أقل من دقيقتين.'
  },
  price: 2350,
  image: "/1c6f385f-2eee-4427-a2d8-7af9a1d7efbf.jpg",
  category: 'iqos_devices',
  rating: 4.6,
  reviewCount: 268,
  stock: 17,
  specs: [
  { label: { en: 'Uses per charge', ar: 'الاستخدام بالشحنة' }, value: { en: '2 back to back', ar: 'عودان متتاليان' } },
  { label: { en: 'Recharge', ar: 'الشحن' }, value: { en: '1 min 50 s', ar: 'دقيقة و٥٠ ثانية' } },
  { label: { en: 'In the box', ar: 'المحتويات' }, value: { en: 'Holder + charger', ar: 'حامل + شاحن' } }]

},
{
  id: 'terea-amber',
  name: { en: 'TEREA Amber', ar: 'تيريا أمبر' },
  tagline: { en: 'Roasted tobacco, 20 sticks', ar: 'تبغ محمص، ٢٠ عودًا' },
  description: {
    en: 'A full, roasted tobacco blend with a woody finish. Made for ILUMA devices, no cleaning, no leftover residue.',
    ar: 'خلطة تبغ محمصة كاملة بلمسة خشبية. معمولة لأجهزة إيلوما، من غير تنظيف ومن غير بواقي.'
  },
  price: 130,
  image: "/73334269-8942-4d0f-b4b6-46a088fa69c2.jpg",
  category: 'heets',
  rating: 4.7,
  reviewCount: 1830,
  stock: 180,
  specs: [
  { label: { en: 'Sticks', ar: 'الأعواد' }, value: { en: '20', ar: '٢٠' } },
  { label: { en: 'Profile', ar: 'النكهة' }, value: { en: 'Roasted, woody', ar: 'محمص وخشبي' } },
  { label: { en: 'Fits', ar: 'يناسب' }, value: { en: 'ILUMA only', ar: 'إيلوما فقط' } }]

},
{
  id: 'terea-sienna',
  name: { en: 'TEREA Sienna', ar: 'تيريا سيينا' },
  tagline: { en: 'Rich & rounded, 20 sticks', ar: 'غني ومتوازن، ٢٠ عودًا' },
  description: {
    en: 'A deeper, rounder blend with a hint of dried fruit. The house favourite for evenings on the balcony.',
    ar: 'خلطة أعمق وأكثر توازنًا بلمسة فاكهة مجففة. المفضلة لسهرات البلكونة.'
  },
  price: 130,
  image: "/8f5fde43-404e-463b-997c-ad4a3e6d4b53.jpg",
  category: 'heets',
  rating: 4.6,
  reviewCount: 964,
  stock: 9,
  badge: 'low_stock',
  specs: [
  { label: { en: 'Sticks', ar: 'الأعواد' }, value: { en: '20', ar: '٢٠' } },
  { label: { en: 'Profile', ar: 'النكهة' }, value: { en: 'Rich, dried fruit', ar: 'غني بفاكهة مجففة' } },
  { label: { en: 'Fits', ar: 'يناسب' }, value: { en: 'ILUMA only', ar: 'إيلوما فقط' } }]

},
{
  id: 'cleopatra-box',
  name: { en: 'Cleopatra Box', ar: 'كليوباترا بوكس' },
  tagline: { en: 'Egypt’s classic, 20s', ar: 'الكلاسيكية المصرية، ٢٠ سيجارة' },
  description: {
    en: 'The blue box every kiosk in Cairo keeps behind the counter. Firm draw, familiar Virginia blend, sealed pack.',
    ar: 'العلبة الزرقاء الموجودة خلف كل كشك في القاهرة. سحب ثابت وخلطة فيرجينيا المألوفة في علبة محكمة.'
  },
  price: 98,
  image: "/d15aa0d4-4fe9-441e-957d-2f56e76e6894.jpg",
  category: 'cigarettes',
  rating: 4.4,
  reviewCount: 2410,
  stock: 320,
  badge: 'hot',
  specs: [
  { label: { en: 'Pack', ar: 'العلبة' }, value: { en: '20 sticks', ar: '٢٠ سيجارة' } },
  { label: { en: 'Blend', ar: 'الخلطة' }, value: { en: 'Virginia', ar: 'فيرجينيا' } },
  { label: { en: 'Made in', ar: 'بلد الصنع' }, value: { en: 'Egypt', ar: 'مصر' } }]

},
{
  id: 'cleopatra-soft',
  name: { en: 'Cleopatra Soft Pack', ar: 'كليوباترا علبة طرية' },
  tagline: { en: 'The original soft pack, 20s', ar: 'العلبة الطرية الأصلية، ٢٠ سيجارة' },
  description: {
    en: 'Lighter card, softer draw, the same blend the country grew up on. Folds flat into a shirt pocket.',
    ar: 'ورق أخف وسحب أنعم بنفس الخلطة التي نشأ عليها الجميع. تنطوي بسهولة في جيب القميص.'
  },
  price: 85,
  image: "/4fb42e80-25eb-4988-8bb8-79ca5802d94a.jpg",
  category: 'cigarettes',
  rating: 4.2,
  reviewCount: 1120,
  stock: 280,
  specs: [
  { label: { en: 'Pack', ar: 'العلبة' }, value: { en: '20 sticks', ar: '٢٠ سيجارة' } },
  { label: { en: 'Style', ar: 'النوع' }, value: { en: 'Soft pack', ar: 'علبة طرية' } },
  { label: { en: 'Made in', ar: 'بلد الصنع' }, value: { en: 'Egypt', ar: 'مصر' } }]

},
{
  id: 'mondial-green',
  name: { en: 'Mondial Green', ar: 'مونديال أخضر' },
  tagline: { en: 'Menthol slims, 20s', ar: 'نعناع سليم، ٢٠ سيجارة' },
  description: {
    en: 'A cool menthol slim from the Eastern Company line-up. Crisp finish, lighter body than the box classics.',
    ar: 'سيجارة سليم بالنعناع من إنتاج الشركة الشرقية. نهاية منعشة وجسم أخف من الكلاسيكية.'
  },
  price: 105,
  image: "/232c79f4-a9fd-478c-bdd9-e32962b4a87a.jpg",
  category: 'cigarettes',
  rating: 4.1,
  reviewCount: 640,
  stock: 96,
  specs: [
  { label: { en: 'Pack', ar: 'العلبة' }, value: { en: '20 sticks', ar: '٢٠ سيجارة' } },
  { label: { en: 'Profile', ar: 'النكهة' }, value: { en: 'Menthol', ar: 'نعناع' } },
  { label: { en: 'Format', ar: 'المقاس' }, value: { en: 'Slim', ar: 'سليم' } }]

},
{
  id: 'xros-pod',
  name: { en: 'Vaporesso XROS 4', ar: 'فابوريسو إكسروس ٤' },
  tagline: { en: 'Refillable pod, 1000 mAh', ar: 'بود قابل للتعبئة، ١٠٠٠ مللي أمبير' },
  description: {
    en: 'A pocket pod with adjustable airflow and a battery readout. Mesh coils pull flavour cleanly to the last millilitre.',
    ar: 'بود صغير بتحكم في الهواء وشاشة بطارية. ملفات شبكية تستخرج النكهة حتى آخر مليلتر.'
  },
  price: 1250,
  compareAtPrice: 1450,
  image: "/8be3af07-0043-425c-b6ff-521a88bbc7fb.jpg",
  category: 'vapes',
  rating: 4.7,
  reviewCount: 388,
  stock: 42,
  specs: [
  { label: { en: 'Battery', ar: 'البطارية' }, value: { en: '1000 mAh', ar: '١٠٠٠ مللي أمبير' } },
  { label: { en: 'Pod', ar: 'البود' }, value: { en: '3 ml refillable', ar: '٣ مل قابل للتعبئة' } },
  { label: { en: 'Charging', ar: 'الشحن' }, value: { en: 'USB-C', ar: 'يو إس بي-سي' } }]

},
{
  id: 'bar-10000',
  name: { en: 'Elf Bar BC10000', ar: 'إلف بار ١٠٠٠٠' },
  tagline: { en: 'Disposable, 10k puffs', ar: 'يستخدم مرة واحدة، ١٠ آلاف نفس' },
  description: {
    en: 'Ten thousand puffs with a dual mesh coil and a charge port for the last stretch. Nothing to fill, nothing to clean.',
    ar: 'عشرة آلاف نفس بملف شبكي مزدوج ومنفذ شحن للمرحلة الأخيرة. بلا تعبئة وبلا تنظيف.'
  },
  price: 650,
  image: "/a8bffe77-4d35-4c5f-98c9-76bd0111fa2e.jpg",
  category: 'vapes',
  rating: 4.3,
  reviewCount: 712,
  stock: 64,
  badge: 'new',
  specs: [
  { label: { en: 'Puffs', ar: 'الأنفاس' }, value: { en: '10,000', ar: '١٠٬٠٠٠' } },
  { label: { en: 'Nicotine', ar: 'النيكوتين' }, value: { en: '2% salt', ar: '٢٪ ملحي' } },
  { label: { en: 'Coil', ar: 'الملف' }, value: { en: 'Dual mesh', ar: 'شبكي مزدوج' } }]

},
{
  id: 'iqos-leather-case',
  name: { en: 'Leather Sleeve Case', ar: 'جراب جلد طبيعي' },
  tagline: { en: 'Full-grain, hand stitched', ar: 'جلد طبيعي بخياطة يدوية' },
  description: {
    en: 'A full-grain sleeve cut for the ILUMA body, stitched by hand in Damietta. Ages into your pocket, never rattles.',
    ar: 'جراب من الجلد الطبيعي مفصل لجسم إيلوما، مخيط يدويًا في دمياط. يتشكل مع الاستخدام ولا يصدر صوتًا.'
  },
  price: 450,
  image: "/c31de2d9-9b99-4e71-8ee0-f00e9ca72366.jpg",
  category: 'iqos_cases',
  rating: 4.8,
  reviewCount: 152,
  stock: 38,
  specs: [
  { label: { en: 'Material', ar: 'المادة' }, value: { en: 'Full-grain leather', ar: 'جلد طبيعي' } },
  { label: { en: 'Fits', ar: 'يناسب' }, value: { en: 'ILUMA / ILUMA ONE', ar: 'إيلوما / إيلوما ون' } },
  { label: { en: 'Made in', ar: 'بلد الصنع' }, value: { en: 'Damietta', ar: 'دمياط' } }]

},
{
  id: 'iqos-silicone-case',
  name: { en: 'Silicone Grip Cover', ar: 'غطاء سيليكون' },
  tagline: { en: 'Drop-proof, washable', ar: 'مقاوم للسقوط وقابل للغسل' },
  description: {
    en: 'A soft shell that takes the hit when the device slips. Rinses clean under the tap and dries in minutes.',
    ar: 'غطاء لين يمتص الصدمة عند سقوط الجهاز. يُغسل بسهولة ويجف في دقائق.'
  },
  price: 220,
  image: "/8496b78b-3ee1-4c02-b391-99fe7ab597f4.jpg",
  category: 'iqos_cases',
  rating: 4.4,
  reviewCount: 206,
  stock: 110,
  specs: [
  { label: { en: 'Material', ar: 'المادة' }, value: { en: 'Silicone', ar: 'سيليكون' } },
  { label: { en: 'Washable', ar: 'قابل للغسل' }, value: { en: 'Yes', ar: 'نعم' } },
  { label: { en: 'Colours', ar: 'الألوان' }, value: { en: '6', ar: '٦' } }]

},
{
  id: 'iqos-metal-case',
  name: { en: 'Brushed Metal Case', ar: 'علبة معدنية' },
  tagline: { en: 'Magnetic lid, crush-proof', ar: 'غطاء مغناطيسي مقاوم للكسر' },
  description: {
    en: 'Brushed aluminium with a magnetic lid that snaps shut. Holds the holder and a pack of sticks together.',
    ar: 'ألومنيوم مصقول بغطاء مغناطيسي محكم. يحمل الحامل وعلبة الأعواد معًا.'
  },
  price: 380,
  image: "/f159eced-df5f-4d83-affd-b418e54067ee.jpg",
  category: 'iqos_cases',
  rating: 4.5,
  reviewCount: 88,
  stock: 26,
  specs: [
  { label: { en: 'Material', ar: 'المادة' }, value: { en: 'Aluminium', ar: 'ألومنيوم' } },
  { label: { en: 'Closure', ar: 'الإغلاق' }, value: { en: 'Magnetic', ar: 'مغناطيسي' } },
  { label: { en: 'Holds', ar: 'يتسع لـ' }, value: { en: 'Device + pack', ar: 'جهاز + علبة' } }]

},
{
  id: 'robusto-duo',
  name: { en: 'Robusto Duo', ar: 'روبوستو ديو' },
  tagline: { en: 'Two hand-rolled cigars', ar: 'سيجارتان ملفوفتان يدويًا' },
  description: {
    en: 'Two robustos in a cedar sleeve, cocoa and toasted cedar on a slow, even burn of about forty minutes each.',
    ar: 'سيجارتين روبوستو في غلاف أرز، كاكاو وأرز محمص باحتراق هادي ومتساوي حوالي أربعين دقيقة للواحدة.'
  },
  price: 850,
  image: "/fde53b34-b3af-46e2-b412-5ee0184a8c7e.jpg",
  category: 'cigars',
  rating: 4.6,
  reviewCount: 74,
  stock: 21,
  specs: [
  { label: { en: 'Count', ar: 'العدد' }, value: { en: '2 cigars', ar: 'سيجارتان' } },
  { label: { en: 'Burn time', ar: 'مدة الاحتراق' }, value: { en: '~40 min', ar: '≈٤٠ دقيقة' } },
  { label: { en: 'Notes', ar: 'النكهات' }, value: { en: 'Cocoa, cedar', ar: 'كاكاو وأرز' } }]

},
{
  id: 'cedar-humidor',
  name: { en: 'Cedar Humidor Box', ar: 'علبة أرز مرطبة' },
  tagline: { en: 'Holds 10, with hygrometer', ar: 'تتسع ١٠، مع مقياس رطوبة' },
  description: {
    en: 'Spanish cedar lining, brass clasp and a calibrated hygrometer in the lid. Keeps a box of cigars at 70% for months.',
    ar: 'بطانة أرز إسباني ومشبك نحاسي ومقياس رطوبة معاير في الغطاء. تحافظ على السيجار عند ٧٠٪ رطوبة لأشهر.'
  },
  price: 2600,
  compareAtPrice: 3100,
  image: "/d86101e8-7609-4189-86b6-f10d428ba8ff.jpg",
  category: 'cigars',
  rating: 4.9,
  reviewCount: 46,
  stock: 6,
  badge: 'low_stock',
  specs: [
  { label: { en: 'Capacity', ar: 'السعة' }, value: { en: '10 cigars', ar: '١٠ سيجار' } },
  { label: { en: 'Lining', ar: 'البطانة' }, value: { en: 'Spanish cedar', ar: 'أرز إسباني' } },
  { label: { en: 'Hygrometer', ar: 'مقياس الرطوبة' }, value: { en: 'Included', ar: 'مضمّن' } }]

}];