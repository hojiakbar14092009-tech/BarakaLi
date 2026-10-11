# TODO (MVP'dan keyin)

Bu ro'yxat `CLAUDE.md` dagi bosqichlardan MVP'ga kirmagan qismlarni o'z ichiga oladi.

## Joriy qoidalar (bajarilgan)

- [x] Komissiya 2%: har buyurtma oʻz stavkasini saqlaydi (`orders.commission_rate`, `commission_amount`); eski buyurtmalar 5% bilan qoldi
- [x] Soatlik narx olib tashlandi: xizmat soʻrovi bepul, toʻlovsiz
- [x] Hunarmand arizasi admin tasdiqlagach faollashadi (`pending` / `approved` / `rejected`, `/admin/hunarmandlar`)
- [x] Kontakt (telefon, Telegram) faqat buyurtma qabul qilingach, faqat buyurtmachiga; boshqa hunarmand buyurtmani koʻrmaydi
- [x] Playwright e2e: admin tasdiqlaydi → mahsulot → buyurtma → qabul → kontakt; raqib hunarmand koʻrmaydi; 360 px da scroll va 48 px tekshiruvi
- [x] `vercel.json`: `/api/(.*)` → `/api` (SPA fallbackdan oldin), testi `vercel-config.test.ts`

## Catering olib tashlandi (2026-10-10)

- [x] Sahifa, forma, API, konfiguratsiya, rasmlar va testlar olib tashlandi (`docs/DECISIONS.md`)
- [ ] Production bazasida `catering_requests` da qator bor-yoʻqligini tekshirish: boʻsh boʻlsa migratsiya
      jadvalni oʻzi oʻchiradi, qator boʻlsa jadval qoladi va qatorlar eksport qilinadi

## "Masofaviy ishlar" toifasi olib tashlandi (2026-10-10)

- Qaror: `categories` qatori **oʻchirilmadi**. Migratsiya `1760000900000` `categories.is_active` qoʻshdi va
  `masofaviy-ishlar` ni `false` qildi. Nofaol toifa `/api/categories` da qaytmaydi, yangi hunarmand yoki
  mahsulot uni tanlay olmaydi (`categoryId: NOT_FOUND`), shu toifadagi mahsulotlar ommaviy katalogda va
  tavsiya etilgan hunarmandlar roʻyxatida koʻrinmaydi. Buyurtma tarixi va `category_id` oʻzgarmaydi.
- Namuna maʼlumotda (seed) bu toifada mahsulot ham, hunarmand ham yoʻq. Production bazasiga bu muhitdan
  ulanilmagan, shuning uchun u yerdagi soni nomaʼlum. Tekshirish:

  ```sql
  SELECT 'workers' AS kind, count(*) FROM workers w JOIN categories c ON c.id = w.category_id
    WHERE c.slug = 'masofaviy-ishlar'
  UNION ALL
  SELECT 'products', count(*) FROM products p JOIN categories c ON c.id = p.category_id
    WHERE c.slug = 'masofaviy-ishlar';
  ```

- [ ] Natijani shu yerga yozish (faqat soni va id, ism/telefon emas)
- [ ] Shu toifadagi hunarmandlarga boshqa toifani tanlash imkonini berish (hozir profil sahifasi ochiladi,
      lekin toifa nomi koʻrsatilmaydi)

## Admin tizimi (2026-10-10)

- [x] `ADMIN_PHONES` bilan rol, audit jurnali, 403 sahifasi, admin `/admin` ga yoʻnaltiriladi
- [x] Admin qobigʻi, panel, hunarmandlarni tasdiqlash/rad etish/toʻxtatish, mahsulot, buyurtma, foydalanuvchi boshqaruvi
- [x] Sharh, shikoyat, xizmat turlari, sozlamalar; toast, dialoglar, boʻsh holatlar
- [x] e2e: oddiy foydalanuvchi 403, admin kirishi, tasdiqlash, ommaviy koʻrinish; axe va 48 px tekshiruvi
- [ ] Vercelʼda `ADMIN_PHONES=+998772105388` qoʻyish (foydalanuvchi qiladi)
- [ ] Real SMS provayderi: hozir administrator kodini olishning yagona yoʻli hosting sozlamasiga bogʻliq
- [ ] Production bazasida `catering_requests` jadvali boʻsh boʻlsa migratsiya uni oʻchirgan, qator boʻlsa qolgan — tekshirish
- [ ] Admin roʻyxatlarida (buyurtma, mahsulot) sana oraligʻi filtri

## 8-bosqich: frontend qoldig'i

- [x] Hunarmand kalendar sahifasi (boʻsh vaqt, band vaqtlar)
- [x] Buyurtma sahifasida xizmat tafsilotlari (vaqt, tavsif, muddat, rasmlar), toʻlov muddati va bekor/qaytarilgan eslatmalari
- [x] 360 / 768 / 1280 px da gorizontal scroll va 48 px tekshiruvi (Playwright)

## 5-bosqich: kalendar va xizmat buyurtmalari

- [x] `availability` jadvali, boʻsh vaqt belgilash (Ertalab / Tushlik / Kechqurun tez tugmalari)
- [x] `/hunarmand/kalendar`, `/buyurtma/yangi` (tavsif, muddat, ≤5 rasm, slot tanlash)
- [x] `orders` uchun exclusion constraint (`btree_gist`, 13.3-band) va uning testi
- [x] Toʻlanmagan buyurtmani 15 daqiqada bekor qiluvchi navbat vazifasi (13.10)
- [x] 24 soatda qabul qilinmagan buyurtmani avtomatik qaytarish (13.11, shu bosqichda)

## 9-bosqich: admin, sharh, shikoyat, materiallar, jamgʻarma, darslar

- [x] `/admin`: hunarmandlarni tasdiqlash, buyurtmalar, sharh moderatsiyasi, shikoyatlar, materiallar, statistika
- [x] `reviews` va `complaints`: yozish API'si va buyurtma sahifasidagi forma/tugma
- [x] Sharhni yashirish (`hidden`, reytingni qayta hisoblash) va shikoyatlarni ko'rib chiqish (qoʻlda qaytarish bilan)
- [x] Hunarmand profilida sharhlar roʻyxati
- [x] Materiallar doʻkoni (`materials`, `material_orders`, `material_order_items`), `/materiallar`
- [x] `/daromad` da jamgʻarma maqsadi (`savings_goals`), `/darslar` kontenti
- [x] 24 soat ichida qabul qilinmagan toʻlangan buyurtmani avtomatik qaytarish (13.11, 5-bosqichda)
- [x] Tasdiqlanmagan hunarmand buyurtma qabul qilishini cheklash (4-bosqich: `workers.status`)
- [ ] Rad etilgan hunarmand qayta ariza topshirishi uchun oqim

## Noto'g'ri hunarmandga tushgan buyurtmalar (3-bosqich)

Kod oqimi testda to'g'ri ishlaydi; endi DB triggeri va servis tekshiruvi yangi xatoni bloklaydi.
Oldin yaratilgan buyurtmalar **o'zgartirilmagan**. Ro'yxatni production bazasida olish:

```bash
pnpm db:audit-orders
```

- [ ] Natijani shu yerga yozish (buyurtma id, holat, sana; ism va telefon emas). Bu muhitdan production
      bazasiga ulanilmagani uchun hozircha bo'sh.
- [ ] "Hojiakbar" mahsuloti qaysi hunarmand profili ostida yaratilganini tekshirish (`products.worker_id`
      → `workers.user_id` → kirishda ishlatilgan raqam). Namuna raqam bilan kirilgan bo'lsa, mahsulotni
      to'g'ri hisobga ko'chirish admin tomonidan qo'lda hal qilinadi.

## Integratsiyalar

- [ ] Real SMS provayderi (Eskiz yoki Play Mobile): faqat buyurtma xabarlari uchun (kirishda SMS kod yoʻq)
- [ ] Payme / Click / Uzum adapterlari (`PaymentProvider` interfeysi tayyor)
- [ ] S3-mos `StorageProvider` (10 MB `.glb` va to'liq rasm hajmi uchun Vercel limitini chetlab o'tish)
- [ ] BullMQ/Redis navbati va keshi (interfeyslar tayyor), WebSocket, PWA, `/biznes`

## Sifat (10–11-bosqich)

- [x] Playwright e2e (uz va ru, 360 / 768 / 1280 px), axe tekshiruvi, Lighthouse (mobil), WebGL yoʻq holat testi (10-bosqich)
- [x] `docs/API.md` toʻliq sxemalar bilan; `docs/DEPLOY.md` da mamlakat ichidagi hosting; `docs/SECURITY.md` (11-bosqich)
- [ ] Biriktirilmagan buyurtma rasmlarini (`/uploads/order-image`) davriy tozalash
- [ ] `pnpm audit` ni CI'ga qoʻshish
- [ ] Husky pre-commit tezlashtirish (faqat oʻzgargan paketlarni tekshirish)

## Mahsulot rasmlari va somsa (2026-10-10)

- [x] Pishiriqdan somsa olib tashlandi: migratsiya `1760001600000_hide_somsa` nomi `samsa`/`somsa` boʻlgan
      pishiriq mahsulotlarini `status='hidden'` qiladi (oʻchirmaydi, buyurtma tarixi saqlanadi); seed'dan ham olindi
- [x] Rasmlar `apps/web/public/products/*.webp` (800 px eni, har biri < 200 KB). Konvertatsiya:
      `pnpm --filter @barakali/api product:images <manba-papka>`; asl jpg/png gitga tushmaydi
- Nom mosligi (eng yaqini tanlandi): `ikat-xalat` → "Ikat adras koʻylak", `asal-tort` → "Medovik tort",
  `baklava` → "Yongʻoqli pakhlava"
- Kichik asllar 800 px gacha kattalashtirildi (sifat biroz past): `baklava` (500 px), `kashta-sumka` (570 px),
  `suzani-yostiq-jildi` (700 px), `ikat-xalat` (713 px). [ ] Kattaroq asl rasmlar kutilmoqda
- [ ] **Taklifnoma rasmi huquqi tekshirilsin.** Yuborilgan taklifnoma rasmi commit qilinmadi;
      `toy-taklifnomalari.webp` boshqa (yuborilgan 2-rasm) manbadan. Rasmlar egasining roziligi tasdiqlansin
- [ ] Production bazasidagi eski namuna rasmlari `SEED_SAMPLE_DATA=true` bilan seed ishga tushganda
      (`syncSamplePhotos`) yangilanadi; aks holda eski rasmlar qoladi
- [ ] Rasmi yoʻq mahsulot: Wheat→Bisque gradient + toifa ikonkasi koʻrsatiladi (rasmlar kutilmoqda boʻlganlar uchun)

## Ochiq savol: catering hero (desktop)

- [ ] Promptdagi "CATERING HERO: FAQAT DESKTOP UCHUN" bloki avvalgi "catering toʻliq olib tashlansin" qaroriga
      zid. Qayta qoʻshilmadi; tasdiqlansa alohida bosqich sifatida qilinadi

## Mahsulot sahifasi: koʻrish tablari (2026-10-10)

- [x] "Rasmlar" + bitta koʻrish tabi: `.glb` boʻlsa va qurilma WebGL qoʻllasa "3D koʻrinish", aks holda rasm asosidagi
      "Aylantirib koʻrish" (perspektiva + soya, WebGL'siz). Model yuklanmasa xatosiz rasmlarga qaytadi
- Qaror: rasmi yoʻq mahsulotda (hozir "Toʻy taklifnomalari", rasm kutilmoqda) aylantiradigan narsa yoʻq, shuning uchun
  koʻrish tabi chiqmaydi; rasm qoʻshilishi bilan avtomatik paydo boʻladi

## Mahsulot formasi: rasmlar va 3D (2026-10-10)

- [x] Rasm 1–5 ta (majburiy: chop etilgan mahsulotning oxirgi rasmini oʻchirib boʻlmaydi), har biri 8 MB gacha,
      JPG/PNG/WebP (server kontent boʻyicha tekshiradi); `.glb` ixtiyoriy, 10 MB gacha. Xato matnida yechim bor
- [x] Formada "Haridor shunday koʻradi" oldindan koʻrinishi: rasm qoʻshilsa "Aylantirib koʻrish", `.glb` qoʻshilsa
      "3D koʻrinish" oʻzi chiqadi
- [ ] Vercel funksiyasi soʻrov tanasini ~4.5 MB bilan cheklaydi: brauzer rasmni yuklashdan oldin siqadi (odatda < 1 MB),
      lekin 4.5–8 MB oraligʻidagi fayl va katta `.glb` Vercel'da oʻtmasligi mumkin. Toʻliq 8/10 MB uchun fayllarni
      toʻgʻridan-toʻgʻri obyekt xotirasiga (S3-mos, imzolangan URL) yuklash kerak; hozir ulanmagan

## Admin kirish (2026-10-10)

- [x] Navbarda "Kirish" yonida "Admin" (ikkalasi 48 px). Telefonda joy yetmagani uchun Admin 48 px ikonka
      (`aria-label="Admin"`), til almashtirgich bitta tugma; 640 px dan matnli koʻrinish
- [x] `/admin-kirish`: raqamlar faqat `ADMIN_PHONES` env'dan (kodda raqam yoʻq). Roʻyxatdagi raqamga kod shu sahifada
      chiqadi va SMS yuborilmaydi; roʻyxatda boʻlmasa kod berilmaydi ("Bu raqam admin emas"); roʻyxat boʻsh boʻlsa
      "Admin kirish sozlanmagan". Raqam faqat POST tanasida, URL'da emas; kod va raqam loglanmaydi
      (avvalgi "Administrator sign-in code issued" log qatori olib tashlandi)
- Qaror: admin kodi sahifada faqat `EXPOSE_SMS_CODE=true` boʻlganda koʻrsatiladi (`/kirish` bilan bir xil qoida).
  `false` boʻlsa kod SMS provayderiga beriladi, u hozir ulanmagan (konsol), demak admin kira olmaydi
- (2026-10-11) Yuqoridagi kod qoidalari eskirdi: kirishda SMS kod butunlay olib tashlandi, quyidagi boʻlimga qarang

## Mahsulot rasmlari: avtomatik fon olib tashlash (2026-10-11)

- [x] Yangi yuklangan mahsulot rasmlari serverda fonidan ajratiladi; fon murakkab boʻlsa asl rasm qoladi
- [ ] Production'da shu oʻzgarishdan **oldin** yuklangan hunarmand rasmlari qayta ishlanmagan (eski rasmlar
      oʻz fonida koʻrinadi). Kerak boʻlsa: rasmni qayta yuklash yoki bir martalik qayta ishlash skripti
- [ ] Murakkab fonli rasmlar uchun haqiqiy AI segmentatsiya (masalan, alohida servis) — hozir ulanmagan

## Materiallar yetkazib berish (2026-10-11)

- [x] Toʻlangan material buyurtmasi adminlarga ilova ichidagi xabar sifatida boradi (toʻlov tranzaksiyasida)
- [x] Admin yetkazib beruvchining ismi va telefoni bilan "yoʻlga chiqaradi"; hunarmandga xabar boradi, u yetkazib
      beruvchiga qoʻngʻiroq qila oladi; admin va yetkazib beruvchi hunarmandning raqamini koʻradi
- [ ] Adminga SMS yoki Telegram orqali xabar: hozir faqat ilova ichida (SMS provayder ulanmagan)
- [ ] Hunarmandga "yoʻlga chiqdi" SMS nusxasi kodda bor, lekin SMS provayder ulanmaguncha yetib bormaydi
- [ ] Yetkazib berish narxi va hududi hisobga olinmaydi (hozircha bepul, manzil erkin matn)

## Tavsiya etilgan hunarmandlar (2026-10-11)

- [x] Faqat admin tasdiqlagan hunarmandlar tavsiya etiladi; "Tasdiqlangan" belgisi tavsiya kartochkasidan olindi
- [x] Namuna hunarmandlarning chop etilgan ishlari admin tasdiqlagan hunarmandlarga boʻlib berildi (rasmlar saqlandi)
- [ ] Deploy'dan keyin tekshirish: `SELECT count(*) FROM sample_product_reassignments;` — 0 boʻlsa, deploy paytida
      admin tasdiqlagan hunarmand boʻlmagan; unda ishlar namuna hunarmandlarda qoldi
- [ ] Namuna hunarmandlarning oʻzi katalogda (hunarmand sahifasi) hali koʻrinadi; kerak boʻlsa ularni `suspended` qilish

## Navbar: kirish menyusi (2026-10-11)

- [x] Navbardagi "Kirish" tugmasi menyu ochadi: **Mijoz** (`/kirish`), **Hunarmand**
      (`/royxatdan-otish?rol=hunarmand`: yangi hunarmand ariza beradi, mavjudi kiradi), **Admin** (`/admin-kirish`).
      Alohida "Admin" tugmasi shu menyuga koʻchdi (telefonda ham joy yetadi)

## Kirish: faqat telefon raqami (2026-10-11)

- [x] Egasining qarori: SMS kod olib tashlandi; `/kirish`, hunarmand roʻyxati va `/admin-kirish` bir qadamli
- [ ] **XAVFSIZLIK.** Raqamga egalik tekshirilmaydi: birovning raqamini bilgan kishi uning hisobiga, admin
      raqamini bilgan kishi admin paneliga kira oladi. Real foydalanuvchilar bilan ishga tushirishdan oldin
      tasdiqlashni (SMS kod yoki boshqa usul) qaytarish tavsiya etiladi
- [ ] Vercel'dagi `EXPOSE_SMS_CODE` endi ishlatilmaydi; xohlasangiz oʻchirib qoʻying (ixtiyoriy)
