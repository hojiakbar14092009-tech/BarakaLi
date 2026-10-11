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

- **Xizmat narxi:** _(bekor qilingan, pastdagi "Xizmat buyurtmasi to'lovsiz" bo'limiga qarang)_ dastlab
  hunarmand soatlik narxni belgilagan edi.
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

## Xizmat buyurtmasi to'lovsiz (2026-10-10)

- **Soatlik narx olib tashlandi:** `workers.hourly_rate` ustuni (migratsiya `1760000500000`), `PUT
/my/hourly-rate`, `hourlyRate` maydonlari, `SERVICE_RATE_MISSING` kodi va kalendardagi narx formasi
  yoʻq. Kalendar faqat boʻsh vaqtni (kun, dan, gacha) belgilaydi.
- **Pul yechilmaydi:** xizmat buyurtmasi `new` holatda yaratiladi (`total = 0`, komissiya 0, `order_items`
  va `payments` yozuvi yoʻq). Slot yaratilgan zahoti band boʻladi (exclusion constraint `new` ni ham
  qamraydi). Buyurtma faqat vaqt va aloqa uchun: hunarmand qabul qilgach telefon ochiladi, ish va narx
  telefon orqali kelishiladi.
- **Holatlar:** `new → accepted → in_progress → ready → delivered` oʻzgarmadi. Hunarmand rad etsa yoki
  24 soatda javob bermasa xizmat buyurtmasi `cancelled` boʻladi (qaytariladigan pul yoʻq, slot boʻshaydi);
  mahsulot buyurtmalari avvalgidek `refunded`. Topshirilganda daromad yozuvi yaratilmaydi.
- **Eski ma'lumotlar:** narx bilan yaratilgan xizmat buyurtmalari oʻz summasi, toʻlovi va daromadi bilan
  oʻzgarmasdan qoladi (toʻlangan eski buyurtma muddati oʻtsa hamon qaytariladi).

## Buyurtma egasi kafolati va bildirishnoma (2026-10-10)

- **Tekshiruv natijasi:** savat → `POST /orders` → `order_items` oqimi hunarmandni har doim
  `products.worker_id` dan oladi (savat faqat `productId` va miqdor yuboradi, mijoz yuborgan
  `workerId` e'tiborga olinmaydi). Takrorlash testi (`order-routing.test.ts`: namuna hunarmandlar
  - yangi "Hojiakbar", aralash savat) **shu kodda xatoni topmadi**. Shuning uchun production'dagi
    holat ("Hojiakbar mahsuloti → Dilfuza") kodning oddiy yoʻlidan emas; eng ehtimolli sabab —
    mahsulot aslida namuna raqam (`+998 90 000 00 01`, SMS kodi ekranda koʻringani uchun istalgan
    kishi kira oladi) bilan kirilgan Dilfuza hisobi ostida yaratilgan, keyin esa boshqa raqam bilan
    yangi "Hojiakbar" hisobi ochilgan. Buni production bazasida `pnpm db:audit-orders` va
    mahsulot egasi boʻyicha tekshirish kerak (TODO.md).
- **Qattiq kafolat (DB):** `order_items_owner_matches` triggeri — mahsulot qatori faqat shu
  mahsulot egasiga yozilgan buyurtmaga kira oladi, aks holda `check_violation`. Mavjud qatorlar
  tekshirilmaydi va oʻzgartirilmaydi.
- **Kafolat (servis):** `insertOrder` tranzaksiya ichida mahsulot egalarini `FOR SHARE` bilan qayta
  oʻqib, sarlavhadagi hunarmand bilan solishtiradi; mos kelmasa `ORDER_WORKER_MISMATCH` (409) va
  buyurtma yaratilmaydi.
- **Audit:** `pnpm db:audit-orders` (`db/audit.ts`) — faqat oʻqiydi, buyurtma id, holat, sana va
  ikkala hunarmand id'sini chiqaradi (ism/telefon yoʻq). Noto'g'ri buyurtmalar migratsiyada
  tuzatilmaydi.
- **Bir kishi — bir ism:** `PATCH /me` hunarmandning ommaviy `display_name` ini ham yangilaydi;
  `UserDto.workerName` kabinetda "Hunarmand profili: …" sifatida koʻrsatiladi, shunda hisob
  qaysi hunarmand profiliga bogʻlangani darhol koʻrinadi.
- **Bildirishnoma:** `notifications` jadvali; buyurtma `new` boʻlgan tranzaksiyada (toʻlov
  tasdigʻi yoki xizmat soʻrovi) hunarmandga `order_new` yoziladi. Commitdan keyin `SmsProvider`
  ga qisqa SMS beriladi (shlyuz ulanmagan: faqat interfeys). UI: navigatsiyada oʻqilmaganlar
  soni, kabinetda eslatma, buyurtma ochilganda oʻqilgan deb belgilanadi.
- **Loglar:** `ConsoleSmsProvider` telefonni maskalab yozadi (`+998*******67`); telefon URL
  parametrlarida ishlatilmaydi.

## Hunarmand arizasi va admin tasdiqlash (2026-10-10)

- **Holat:** `workers.status` = `pending | approved | rejected`, `reviewed_by`, `reviewed_at`,
  `reject_reason`. Yangi ariza `pending`. Rad etish uchun sabab (≥ 10 belgi) DB constraint bilan ham,
  zod bilan ham majburiy. Har qaror (holat, kim, qachon, xabar) bitta tranzaksiyada.
- **Belgi:** `is_verified` ustuni olib tashlandi; "Tasdiqlangan" `status = approved` dan hisoblanadi.
  Qoʻlda belgilash yoʻli yoʻq.
- **Mavjud hunarmandlar [QAROR]:** migratsiya vaqtida mavjud barcha hunarmandlar (haqiqiy ham, namuna
  ham) `approved` qilindi: ular katalogdan yoʻqolmasin. Faqat migratsiyadan keyingi arizalar
  `pending`. Buni oʻzgartirish kerak boʻlsa (masalan, tasdiqlanmagan haqiqiy hunarmandlarni
  `pending` qilish) admin sahifasidan "Rad etish"/qayta koʻrib chiqish yoki alohida migratsiya kerak.
- **Server filtri:** ommaviy roʻyxatlar (katalog, tavsiya, mahsulot, profil, kalendar, sharhlar)
  faqat `approved`; pending/rejected javobda umuman chiqmaydi. Buyurtma (mahsulot va xizmat)
  `approved` egasi uchungina yaratiladi, `accept` esa `WORKER_NOT_APPROVED` (403) qaytaradi.
  Hunarmand oʻz mahsulotlarini tasdiqdan oldin ham yaratib qoʻya oladi (egasiga koʻrinadi).
- **Admin:** `ADMIN_PHONES` mexanizmi oʻzgarmadi; rolni server har soʻrovda tekshiradi.
  `POST /admin/workers/:id/approve|reject`; sahifa `/admin/hunarmandlar` (filtr: kutilmoqda,
  tasdiqlangan, rad etilgan). Qayta koʻrib chiqish: rad etilgan arizani tasdiqlash va tasdiqlanganni
  rad etish mumkin, har safar `reviewed_*` yangilanadi.
- **Xabarlar:** `worker_application_received`, `worker_approved`, `worker_rejected` (sabab bilan)
  `notifications` ga yoziladi, kabinetda "Ariza holati" boʻlimida koʻrinadi. SMS nusxasi yoʻq
  (shlyuz ulanmagan).
- **Ochiq masala:** rad etilgan hunarmand qayta ariza topshira olmaydi (yangi ariza oqimi yoʻq).

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

## Hunarmand va buyurtmachi aloqasi (2026-10-10)

- Hunarmandning telefoni alohida ustun emas: `users.phone` (kirish raqami, `+998XXXXXXXXX`,
  har doim bor) aloqa uchun ishlatiladi — bu allaqachon shunday edi.
- `workers.telegram_username` (ixtiyoriy): `@` belgisiz saqlanadi, DB CHECK va umumiy zod sxemasi
  bilan 5–32 belgi, faqat `A-Za-z0-9_`. `PATCH /me/worker` orqali hunarmand oʻzi belgilaydi
  (`@` yozsa avtomatik olib tashlanadi); faqat ommaviy profilda emas, faqat shu endpoint orqali.
- Kontakt (telefon **va** telegram) faqat `PHONE_VISIBLE_STATUSES` (accepted/in_progress/ready/
  delivered) holatda `OrderDto.counterpart` da qaytadi — serverda, API javobining oʻzida; UI
  yashirish emas. Undan oldin ikkalasi ham `null`, javob matnida ham umuman koʻrinmaydi (test
  bilan tekshirilgan: `JSON.stringify` natijasida handle/telefon yoʻqligi).
- `telegramUsername` faqat hunarmand tomoni uchun bor: buyurtmachi profilida bu maydon yoʻq,
  shuning uchun hunarmand `counterpart.telegramUsername` doim `null` koʻradi.
- Buyurtma sahifasida: telefon `tel:` havolasi (avvalgidek), handle boʻlsa yonida "Telegramda
  yozish" tugmasi `https://t.me/<username>` ga ochiladi; boʻlmasa tugma koʻrinmaydi.

## Catering boʻlimi olib tashlandi (2026-10-10)

- Foydalanuvchi qarori: catering sahifasi, uning formasi, xizmat turlari bloki, platforma imkoniyatlari
  bloki, `/catering`, `POST /api/catering-requests`, umumiy konfiguratsiya va rasmlar butunlay olib
  tashlandi (`git log` da oldingi commitlar bor).
- Bosh sahifada faqat katalog, tavsiya etilgan hunarmandlar, "Hunarmand boʻling", "Qanday ishlaydi" va
  "Darslar" qoldi. "Darslar" bloki catering bilan bogʻliq emas edi, shuning uchun saqlandi.
- `catering_requests` jadvali migratsiya `1760001100000` bilan faqat **boʻsh** boʻlsa oʻchiriladi;
  qator boʻlsa tegilmaydi (`RAISE NOTICE`) va jamoa avval eksport qiladi. Ikkala holat testlangan.
- `categories.is_active` va "Masofaviy ishlar" qarori oʻzgarmadi.

## Admin roli va audit jurnali (2026-10-10)

- Admin roli faqat `ADMIN_PHONES` dan keladi (vergul bilan ajratilgan `+998` raqamlar, zod bilan
  tekshiriladi, notoʻgʻri qiymatda server ishga tushmaydi). Har kirishda: roʻyxatdagi raqam `admin`
  boʻladi, roʻyxatdan chiqqan raqam `customer`/`worker` ga qaytadi, boʻsh roʻyxat = admin yoʻq.
  Qiymatni hosting muhitida foydalanuvchi oʻzi qoʻyadi; `.env.example` da faqat `+998XXXXXXXXX`.
- Admin hisobida ism boʻlmasa `ADMIN_NAME` (standart "Hojiakbar") beriladi; mavjud ism oʻzgartirilmaydi.
- `audit_log` (`admin_user_id, action, target_type, target_id, details jsonb, created_at`): har admin
  amali yoziladi, oʻzgarish bilan bitta tranzaksiyada (tasdiqlash/rad etish, sharh, shikoyat, qaytarish);
  `details` da faqat holat, sabab va id — telefon, kod yoki token hech qachon yoʻq. `GET /admin/audit`.
- Himoya: `assertCanActOnAdmin` — admin oʻziga nisbatan amal bajara olmaydi (`CANNOT_ACT_ON_SELF`),
  oxirgi adminni olib tashlab boʻlmaydi (`LAST_ADMIN`). Bloklash endpointi keyingi bosqichda shu
  tekshiruvdan oʻtadi.
- Oddiy foydalanuvchi `/admin` ga kirsa 403 sahifasi va "Bosh sahifaga qaytish" tugmasi; admin kirgach
  `next` boʻlmasa `/admin` ga yoʻnaltiriladi. Haqiqiy himoya serverda (`requireAdmin`, `/api/admin/*`).

## Admin qobigʻi (2026-10-10)

- `/admin` endi tablar emas, alohida sahifalar: kompyuterda chap sidebar, telefon/planshetda yuqoridan
  ochiladigan drawer (fokus ichkariga oʻtadi, Esc yopadi, fokus tugmaga qaytadi). Joriy sahifa
  `aria-current="page"`.
- Sidebarda brifdagi 9 boʻlimdan tashqari **Materiallar** ham bor: materiallar doʻkoni admin boshqaradigan
  ishlayotgan funksiya, uni yoʻqotmaslik uchun qoldirildi.
- Boshqaruv paneli kartalari (`/admin/stats`): kutilayotgan arizalar, bugungi buyurtmalar (Toshkent
  kuni boʻyicha, `ordersToday`), jami buyurtma hajmi, komissiya jami (2%), ochiq shikoyatlar; har
  kartada tegishli boʻlimga havola. Maʼlumot yoʻq boʻlsa bitta yoʻl-yoʻriqli boʻsh holat.
- Mahsulotlar, Foydalanuvchilar, Xizmat turlari, Sozlamalar sahifalari hozircha "Bu boʻlim hali tayyor
  emas" holatini koʻrsatadi (keyingi bosqichlarda toʻldiriladi); havolalar buzilmaydi.

## Hunarmandlarni tasdiqlash oqimi (2026-10-10)

- Holatlar: `pending → approved | rejected`, `approved → suspended`, `rejected | suspended → approved`
  (tasdiqlash qayta faollashtiradi). `suspended` migratsiya `1760001300000` bilan qoʻshildi; namuna va
  mavjud hunarmandlar `approved` boʻlib qoladi.
- Toʻxtatilgan hunarmand: katalog/tavsiya/profil 404, yangi buyurtma 404, `accept` 403; `start/ready/deliver`
  ishlaydi, mavjud buyurtmalar tugaydi. Sabab (`reject_reason` ustuni rad etish va toʻxtatish uchun umumiy)
  hunarmandga `worker_suspended` bildirishnomasi va kabinetdagi holat matni bilan koʻrsatiladi.
- Roʻyxat: 4 filtr, standart "Kutilmoqda" eng eskisi birinchi; qidiruv ism yoki telefon oxiridagi raqamlar
  (`q`), toʻliq raqam yozish shart emas. Tafsilot sahifasida Telegram (admin uchun), mahsulotlar soni va
  havolasi, ariza sanasi, kim va qachon koʻrib chiqqani.
- Har amal `ConfirmDialog` orqali: nomi aniq ("Hunarmandni tasdiqlash / rad etish / toʻxtatish"), rad etish
  va toʻxtatishda sabab (≥10 belgi) majburiy; fokus dialog ichida, Esc yopadi, fokus tugmaga qaytadi.
- "Tasdiqlangan" belgisi faqat `status === 'approved'` da (`isVerified` serverdan).

## Mahsulot, buyurtma va foydalanuvchi boshqaruvi (2026-10-10)

- Mahsulot oʻchirish yumshoq: `products.deleted_at` (migratsiya `1760001400000`); barcha soʻrovlar uni chetlab
  oʻtadi. Buyurtmada uchragan mahsulot oʻchirilmaydi (409 `PRODUCT_HAS_ORDERS`), faqat yashiriladi — buyurtma
  tarixi buzilmasin.
- Admin buyurtma holatini faqat `ORDER_STATUS_TRANSITIONS` boʻyicha oʻzgartiradi (409 aks holda);
  `refunded` ga faqat qaytarish amali orqali oʻtiladi. `delivered` da hunarmand oqimidagidek `earnings`
  yoziladi.
- Qaytarish ledger bilan: `refunds` jadvali (`amount`, `commission_reversed`, `reason`, `admin_user_id`),
  hammasi bitta tranzaksiyada. Daromad allaqachon yozilgan boʻlsa `earnings` ga manfiy qator qoʻshiladi
  (komissiya teskari). Summa klientdan emas, `payments.amount` dan, butun soʻm. Yetkazilgan buyurtma
  (`delivered`) hech kim uchun qaytarilmaydi — bu oldingi qoida saqlandi.
- Bloklash: `users.blocked_at/block_reason`; bloklashda refresh tokenlar bekor qilinadi, har soʻrovda
  `blocked_at` tekshiriladi (stateless JWT muddati tugaguncha ham rad etilsin), kirishda 403
  `USER_BLOCKED`. `assertCanActOnAdmin` bloklashga ulandi.
- Admin buyurtma tafsilotida ikkala tomonning telefoni koʻrinadi (admin uchun ruxsat etilgan); audit
  `details` va URL'larda telefon yoʻq.

## Sharh, shikoyat, xizmat turlari va sozlamalar (2026-10-10)

- Shikoyat holatlari: `open` (Yangi) → `in_review` (Koʻrib chiqilmoqda) → `resolved` | `dismissed`; admin
  izohi `complaints.admin_note`. Bir buyurtma boʻyicha ochiq yoki koʻrib chiqilayotgan shikoyat bitta.
  Pulni qaytarish shikoyat sahifasidan emas, buyurtma tafsilotidan (sabab bilan) bajariladi.
- Sharhni yashirish sababsiz boʻlmaydi (`reviews.moderation_reason`, audit); qayta koʻrsatishda sabab
  tozalanadi. Reyting avvalgidek bir tranzaksiyada qayta hisoblanadi.
- Toifa nomlari (`uz`/`ru`) endi bazadan: katalog va chiplar `GET /categories` dan oladi, i18n matni faqat
  yuklanguncha zaxira. Toifalar qoʻshilmaydi/oʻchirilmaydi, faqat tahrirlanadi va yoqib-oʻchiriladi
  (`is_active`): oʻchirilganda mavjud mahsulotlar saqlanadi, yangisi va yangi ariza rad etiladi.
- `platform_settings` (bitta qator): arizalarni qabul qilish bayrogʻi va bosh sahifa eʼloni (`uz`/`ru`,
  ixtiyoriy, ≤300). Komissiya bu yerda saqlanmaydi: paneldagi 2% faqat oʻqish uchun, kod konstantasi.
  Ommaviy `GET /settings` 60 soniya keshlanadi; saqlashda kesh tozalanadi.

## Bosh sahifa: hero, hikoya va katalog (2026-10-11)

- Foydalanuvchi qarori: hero, animatsion fon va "Nega aynan BarakaLi" hikoyasi **faqat kompyuterda**
  (≥ 1024 px, alohida lazy chunk `HomeLanding`). Telefon va planshet avvalgi bosh sahifani oladi (qidiruv,
  toifalar, "Hunarmand boʻling" kartasi, tavsiya etilgan hunarmandlar); motion kodi ularga yuklanmaydi.
  Kompyuterda tartib: hero → hikoya (muammo 2 gap, yechim 1 gap) → katalog (`#katalog`) → "Qanday
  ishlaydi" → "Darslar". CLAUDE.md 7-boʻlimdagi "faqat kompyuterda funksiya yoʻq" qoidasi bu yerda
  bezak uchun chetlab oʻtildi: katalog va barcha amallar hamma qurilmada bor.
- Hero rasmlari avvalgi catering bosh sahifasidan qayta tiklandi (`apps/web/public/home/`), catering
  soʻzlari va soʻrov formasi qaytarilmadi: asosiy tugma "Hunarmand boʻlish", ikkinchisi katalogga oʻtadi.
- Fon: ikki yumshoq Bisque nur va sekin suzuvchi hunar ikonkalari (lucide, faqat bezak, `aria-hidden`);
  `prefers-reduced-motion` da harakat yoʻq. Telefonda faqat chekkadagi ikonkalar koʻrinadi, matn ustiga tushmaydi.

## Mahsulot rasmlari: fon olib tashlanadi (2026-10-11)

- Hunarmand yuklagan har bir mahsulot rasmi serverda (`apps/api/src/modules/uploads/cutout/`) fonidan
  ajratiladi: chekkadan boshlab bir xil rangli fon "toʻldiriladi", qolgan buyum shaffof WebP sifatida
  buyumga qirqiladi (4 % chekka). Kartochka va mahsulot sahifasida buyum toʻgʻridan-toʻgʻri Bisque
  fonida, yumshoq soya bilan koʻrinadi (namuna: "Kashta ilingan sumka").
- Fon oddiy boʻlmasa (devor + stol, naqshli fon, buyumning rangi fonga yaqin) natija ishonchsiz: fon
  bir tekis (rang tarqalishi ≤ 15), chekkasi tekis (≤ 12) va buyum kadrning 4–90 % ini egallashi shart.
  Aks holda asl rasm saqlanadi (buzilgan qirqimdan koʻra toʻliq rasm yaxshi). Tayyor namuna rasmlar
  `pnpm --filter @barakali/api product:images` bilan, koʻz bilan tekshirilib (`reviewed`, vaza uchun
  chizilgan kontur) yaratiladi.
- Buyurtma rasmlari (haridorning namunalari) qirqilmaydi: ular maʼlumot uchun, vitrina uchun emas.
