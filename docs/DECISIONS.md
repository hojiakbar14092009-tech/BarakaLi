# Qarorlar (DECISIONS)

Brifdagi noaniqliklar bo'yicha qabul qilingan qarorlar. Yangi qaror oxiriga qo'shiladi.

## MVP doirasi

- 23:00 muddatiga MVP: poydevor, baza, kirish, katalog va mahsulot sahifasi (dona/ulgurji), hunarmand
  kabineti (mahsulot + `.glb`), 3D ko'rsatkich, buyurtma va komissiya. Qolgani `TODO.md` da.
- Kalendar, sharh, shikoyat, materiallar, jamg'arma, darslar sahifasi, admin paneli MVP'ga kirmaydi.
  Arxitektura (holatlar jadvali, `orders.type`, `StorageProvider`, `PaymentProvider`) ularga tayyor.

## Texnik

- **Paket menejeri:** pnpm 12 workspaces. Vercel'da `npx pnpm@12.10.1` bilan o'rnatiladi (`vercel.json`).
- **Versiyalar:** React 18.3, Vite 6, Vitest 3, ESLint 9, Tailwind 4, zod 3, Express 5.
- **Ma'lumotlar bazasi:** production'da PostgreSQL (`DATABASE_URL`, masalan Neon). `DATABASE_URL`
  bo'sh bo'lsa development va testlarda ichki PostgreSQL (PGlite, `btree_gist` + `pg_trgm`) ishlaydi:
  Docker yoki lokal Postgres shart emas. Production kodi PGlite'ni yuklamaydi.
- **Vercel'da API:** `apps/api` esbuild bilan bitta `api/index.js` fayliga yig'iladi (CommonJS).
  Vercel funksiyalarni build'dan oldin aniqlagani uchun bu fayl repoda saqlanadi
  (`pnpm build:api` qayta yaratadi). `api/package.json` uni CommonJS deb belgilaydi.
- **Fayl saqlash:** Vercel diski doimiy emas, shuning uchun `StorageProvider` hozir fayllarni
  PostgreSQL'da (`files` jadvali) saqlaydi va `/api/files/:name` orqali to'g'ri `Content-Type` va
  kesh sarlavhalari bilan beradi. Keyin S3-mos adapter bilan almashtiriladi.
- **Vercel so'rov hajmi:** Vercel funksiyalari so'rov tanasini 4.5 MB bilan cheklaydi. Rasmlar
  brauzerda siqilib yuboriladi; `.glb` uchun amaliy chegara 4.5 MB (konstanta 10 MB, S3 adapteridan
  keyin to'liq ishlaydi).
- **Migratsiya:** `apps/api/migrations/*.sql` (`node-pg-migrate` formati: `-- Up Migration` /
  `-- Down Migration`). `node-pg-migrate` o'rniga shu fayllarni o'qiydigan o'z kichik yuklovchimiz
  (`src/db/migrator.ts`) ishlatiladi: PGlite, node-postgres va serverless uchun bitta yo'l, advisory lock
  bilan bir vaqtda ishga tushishdan himoyalangan. Vercel'da SQL esbuild paketiga joylanadi va birinchi
  so'rovda avtomatik qo'llanadi (`DATABASE_URL` dan boshqa narsa kerak emas).
- **Namuna ma'lumotlar:** `pnpm db:seed` yoki `SEED_SAMPLE_DATA=true` (birinchi so'rovda, idempotent).
  Namuna rasmlar matnsiz yaratiladi: serverlessda shrift yo'q.
- **Production DB testi:** `src/db/pg-compat.test.ts` PGlite'ni PostgreSQL protokoli orqali ochib, haqiqiy
  `pg` drayveri bilan butun xarid oqimini tekshiradi.
- **Mahsulot rasmi:** brauzerda 1600 px gacha kichraytiriladi, serverda kontent bo'yicha tekshirilib WebP'ga o'tkaziladi.
- **Mahsulot yaratish:** doim qoralama; chop etish uchun kamida bitta rasm kerak (forma shu tartibda ishlaydi).
- **CSRF:** refresh cookie `SameSite=Strict`; yozuvchi so'rovlarda `Origin` tekshiriladi.

## Sharh va shikoyat

- **Sharh:** faqat buyurtmachi, faqat `delivered` dan keyin, buyurtmaga bir marta (DB'da unique `order_id`
  va buyurtma qatori qulflanadi, shuning uchun ikki parallel so'rovdan faqat bittasi o'tadi).
- **Reyting:** `workers.rating` va `reviews_count` sharh bilan **bir tranzaksiyada** yangilanadi:
  `(joriy reyting × soni + yangi baho) / (soni + 1)`, 2 xonagacha yaxlitlanadi. Hunarmand qatori
  qulflanadi. Qayta hisoblash emas, o'sish usuli tanlandi: shunda mavjud reyting asosi saqlanadi.
- **Shikoyat:** buyurtmaning ikkala tomoni yoza oladi, boshqalarga 404. Holati `open`; bitta foydalanuvchi
  bitta buyurtmada faqat bitta ochiq shikoyat qoldira oladi (qisman unique indeks). Shikoyatni faqat
  yozgan odam o'z buyurtmasida ko'radi.
- **Ochiq qolgani:** sharhni yashirish (moderatsiya) va shikoyatni hal qilish admin paneliga bog'liq (TODO.md).

## Mahsulot qarorlari

- **Hunarmand tasdig'i:** admin paneli yo'q, shuning uchun MVP'da har bir hunarmand darhol
  mahsulot joylay oladi. "Tasdiqlangan" belgisi (`workers.is_verified`) faqat admin qo'lda
  belgilagan hunarmandlarda ko'rinadi (seed'dagi hunarmandlar).
- **SMS:** SMS shlyuzi (Eskiz/Play Mobile) hali ulanmagan. `EXPOSE_SMS_CODE=true` bo'lsa kod API
  javobida qaytadi va kirish formasida ko'rsatiladi (faqat shlyuzsiz ko'rik uchun; xavfsiz emas).
  Real foydalanuvchilar uchun `SmsProvider` adapteri ulanib, bu o'zgaruvchi `false` bo'lishi shart.
- **To'lov:** `internal` provayder. Payme/Click/Uzum adapterlari bo'sh (`NotImplemented`), UI'da
  ular ulangan deb yozilmaydi. Karta ma'lumotlari saqlanmaydi va loglanmaydi.
- **Komissiya:** buyurtma `delivered` bo'lganda `earnings` yoziladi: `commission = round(total*2/100)` (2026-10-10 gacha 5% edi, quyida).

## Kalendar va xizmat buyurtmalari

- **Xizmat narxi:** alohida xizmatlar jadvali yoʻq; hunarmand bir soatlik narxni (`workers.hourly_rate`)
  belgilaydi, xizmat buyurtmasi summasi = narx × soat. Narx boʻsh boʻlsa, xizmat buyurtmasi qabul
  qilinmaydi (`SERVICE_RATE_MISSING`). Buyurtma qatori `order_items` da saqlanadi (miqdor = soat).
- **Boʻsh vaqt:** `availability` jadvali, bir hunarmandning oraliqlari bir-biri bilan kesishmaydi
  (exclusion constraint). Oraliq kelajakda, 16 soatgacha va 60 kun ichida boʻlishi shart.
  Tez tugmalar: Ertalab 08–12, Tushlik 12–15, Kechqurun 17–21 (`QUICK_SLOTS`).
- **Slot tanlash:** buyurtmachi oraliq ichidan soat boshidan boshlanadigan vaqtni tanlaydi; mijoz
  tomonda boʻsh soatlar `bookableStarts` bilan hisoblanadi, server esa har doim qayta tekshiradi
  (oraliqqa sigʻishi, oʻtmishda emasligi, band emasligi).
- **To'qnashuv:** `orders` da `btree_gist` exclusion constraint (13.3-band). Kod oldindan tekshirmaydi:
  ikki parallel buyurtmadan birini baza rad etadi (23P01 → `ORDER_SLOT_TAKEN`).
- **Muddat va rasmlar:** `orders.description`, `orders.deadline` (ixtiyoriy sana), `order_images`
  (≤5). Rasm avval `/api/uploads/order-image` bilan yuklanadi (WebP, kontent tekshiriladi), buyurtma
  faqat platforma oʻzi saqlagan rasm havolalarini qabul qiladi.
- **Toʻlanmagan buyurtma:** 15 daqiqadan keyin `cancelled`, toʻlov `failed`, slot boʻshaydi.
  Server doimiy ishlaydigan joyda (`server.ts`) `JobQueue` (in-process) har daqiqada ishga tushadi;
  Vercel kabi serverless'da bir xil tozalash kiruvchi soʻrovlar bilan (daqiqasiga bir marta) bajariladi
  (`requestDrivenMaintenance`). Slot oʻqilganda va band qilinganda ham eskirgan buyurtmalar oldin
  tozalanadi.
- **24 soatlik qaytarish:** `new` holatida 24 soatdan oshgan buyurtma avtomatik `refunded` boʻladi,
  toʻlov provayder orqali qaytariladi va zaxira tiklanadi (bitta tranzaksiya).

## Brauzer testlari va moslashuvchanlik

- **Playwright:** `pnpm e2e` (oldin `pnpm --filter @barakali/web build`). Web ilovaning production
  build'i (`vite preview`, `/api` proksi) va xotiradagi vaqtinchalik baza (`PGLITE_DATA_DIR=memory`)
  bilan ishlaydi; diskda iz qolmaydi. Playwright versiyasi (1.63) kompyuterda oʻrnatilgan Chromium
  bilan mos tanlandi.
- **Moslashuv tekshiruvi:** `e2e/responsive.spec.ts` 360 / 768 / 1280 px da ommaviy va kirilgan
  sahifalarda gorizontal scroll yoʻqligini va tugma/havolalar kamida 48 px ekanini tekshiradi.
  Tekshiruv sarlavhadagi 1 px chiqib ketishni va kirish sahifasidagi kichik havolani topdi (tuzatildi).

## Admin, materiallar, jamgʻarma, darslar

- **Admin:** `ADMIN_PHONES` dagi raqam har kirishda `admin` rolini oladi; `/api/admin/*` har bir
  endpointda token rolini tekshiradi (`requireAdmin`), `/admin` sahifasi faqat qulaylik uchun.
- **Hunarmand tasdigʻi:** admin `is_verified` ni belgilaydi/olib tashlaydi ("Tasdiqlangan" belgisi).
  Tasdiq buyurtma qabul qilishni **cheklamaydi**: toʻlangan buyurtma tasdiqsiz hunarmandda qolib,
  24 soatdan keyin avtomatik qaytarilib ketishi mumkin edi. Brifdagi "tasdiqlagach buyurtma qabul
  qiladi" talabi keyinroq, tasdiqlash jarayoni ishga tushgach yoqiladi.
- **Sharh moderatsiyasi:** sharh yashirilganda hunarmand reytingi shu sharh baholi olib tashlangandek
  qayta hisoblanadi (`ratingWithout`, `nextRating` ning teskarisi), `reviews_count` kamayadi; qayta
  koʻrsatilganda qaytadi. Holat oʻzgarmasa hech narsa oʻzgarmaydi. Hunarmandning dastlabki (seed)
  reytingi saqlanishi uchun reyting yigʻindidan emas, oʻsish/kamayish usulida yuritiladi.
- **Shikoyat va qaytarish:** admin shikoyatni `resolved`/`dismissed` qiladi (faqat ochiq bolsa).
  Qoʻlda qaytarish faqat toʻlangan va `new/accepted/in_progress/ready` holatdagi buyurtmaga:
  provayder orqali qaytarish, zaxirani tiklash va holat `refunded` bitta tranzaksiyada. Shu bois
  oʻtishlar jadvalida `accepted/in_progress/ready → refunded` bor, lekin hunarmandning `reject`
  amali faqat `new` holatda ishlaydi (serverda tekshiriladi).
- **Materiallar:** katalogni admin boshqaradi; faqat hunarmandlar koʻradi va sotib oladi
  (`material_orders`, `material_order_items`, alohida `material_payments`: mahsulot toʻlovlari
  kodiga tegmaslik uchun). Narx va chegirma serverda hisoblanadi, komissiya olinmaydi, zaxira
  toʻlovda `UPDATE … WHERE stock >= qty` bilan kamayadi, toʻlanmagani 15 daqiqada bekor qilinadi.
  Topshirishni admin belgilaydi.
- **Jamgʻarma:** haqiqiy bank emas. Maqsad (`savings_goals`, har hunarmandga bitta); progress =
  maqsad qoʻyilgandan beri tushgan daromad (komissiya ayirilgan). Maqsad summasini oʻzgartirish
  boshlangʻich sanani saqlaydi; olib tashlab qayta qoʻyish progressni nolga tushiradi.
- **Darslar:** `/darslar` kontenti `lessons.json` (uz/ru) dan, 4 dars; keyin CMS bilan almashtiriladi.
- **Hunarmand sharhlari:** profilda faqat `visible` sharhlar, muallifning ismining birinchi soʻzi bilan.

## Sifat tekshiruvlari (10-bosqich)

- **E2E:** `e2e/flows.spec.ts` — uz va ru da: SMS kod bilan kirish (haqiqiy forma), mahsulot → savat
  → toʻlov → hunarmand holatlarni oʻtkazadi → haridor sharh va shikoyat qoldiradi → hunarmand
  daromadi (komissiya ayirilgan); xizmat buyurtmasi: slot tanlash, toʻlov, band soat boshqa mijozga
  koʻrinmasligi. Test matnlari ilovaning oʻz tarjima fayllaridan olinadi.
- **Axe:** `e2e/accessibility-3d.spec.ts` — WCAG 2.1 A/AA qoidalari bilan 360/768/1280 px da ommaviy
  sahifalar, kirilgan hunarmand/mijoz/admin sahifalari. Topilgan kamchilik (yashirin fayl maydoniga
  yorliq yoʻq) tuzatildi.
- **3D:** headless Chromium'da `--use-gl=swiftshader` bilan haqiqiy WebGL canvas ochiladi (tekshirildi);
  alohida test `getContext('webgl')` ni `null` qilib, rasmlarga qaytishni va sahifa buzilmasligini
  tekshiradi; 3D kodi tab ochilmaguncha tarmoqqa chiqmasligi ham tekshiriladi.
- **Lighthouse:** `e2e/lighthouse.spec.ts` (mobil, simulyatsiya qilingan Slow 4G, 4x CPU): bosh
  sahifa FCP ≈ 2.0 s, LCP ≈ 2.4 s (<3 s), CLS 0.003, performance ≈ 96, accessibility 100, boshlangʻich
  JS ≈ 161 KB gzip (byudjet 200 KB). Bu laboratoriya taxminlari, real foydalanuvchi oʻlchovi emas.
  Tuzatishlar: yuklanayotgan marshrut fallback'i balandligi (footer sakrashi, CLS 0.19 → 0.003),
  hunarmandlar skeleti haqiqiy kartochka balandligida, bosh sahifa asosiy bundle'ga olindi (qoʻshimcha
  chunk soʻrovi yoʻq), Inter uchun oʻlchamga mos zaxira shrift.

## Komissiya 5% → 2% (2026-10-10)

- Stavka `COMMISSION_RATE_PERCENT = 2` (butun foiz, pul hisobi floatsiz; `COMMISSION_RATE = 0.02` undan
  olinadi). Hisob: `round(total × 2 / 100)`, 142 500 soʻm → 2 850 komissiya, 139 650 hunarmandga.
- Har buyurtma oʻz stavkasini saqlaydi: `orders.commission_rate` (numeric) va `orders.commission_amount`
  (eski `commission` ustuni qayta nomlandi, qiymatlar tegilmadi). Migratsiyagacha yozilgan buyurtmalar
  5% bilan hisoblangan edi, shuning uchun ularga `0.05` yoziladi; summalari oʻzgarmaydi.
- API `OrderDto.commissionRate` qaytaradi; buyurtma sahifasi foizni shu maydondan koʻrsatadi (eski buyurtma
  5%, yangisi 2%). Kabinet, daromad va admin statistikasidagi umumiy yozuvlar joriy konstantadan oladi.
- Materiallar doʻkonidan komissiya avvalgidek olinmaydi.
