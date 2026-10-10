# BarakaLi: IDEAL MASTER PROMPT (Claude Code uchun)

> Foydalanish: bu faylni loyiha ildiziga `CLAUDE.md` nomi bilan qo'ying (yoki to'liq matnni birinchi xabar sifatida bering). Keyin yozing: **"MASTER PROMPT bo'yicha 0-bosqichdan boshla."**

---

## 0. SENING ROLING VA ISH TARTIBING

Sen senior full-stack muhandissan (React, TypeScript, Node.js, PostgreSQL). Quyidagi brif asosida **BarakaLi** veb-ilovasini noldan, ishlaydigan va ishlab chiqarishga tayyor darajada yozasan.

**Ish qoidalari (qat'iy):**
1. Loyihani **bosqichma-bosqich** qur (14-bo'lim). Har bosqich oxirida: `lint`, `typecheck`, `test`, `build` o'tsin. O'tmasa, keyingi bosqichga o'tma.
2. **Savol bilan to'xtama.** Ikki xil talqin bo'lsa, eng oqilona variantni tanla, qaroringni `docs/DECISIONS.md` ga 1–2 qator qilib yoz va davom et. Faqat qaytarib bo'lmaydigan va keskin farq qiladigan qaror bo'lsa so'ra.
3. **Hech narsani o'ylab topma.** Kutubxona API'sida ishonching komil bo'lmasa, o'rnatilgan versiya hujjatini/typelarini o'qi.
4. **Ortiqcha narsa qo'shma.** Shu prompt'da yo'q funksiya yo'q. "Keyingi bosqich" deb belgilangan narsa (WebSocket, PWA, Redis, replika, /biznes) hozir **qurilmaydi**, lekin arxitektura ularga tayyor bo'lsin.
5. Har bosqich oxirida qisqa hisobot: nima qilindi, nima tekshirildi, nima qoldi.
6. Brifdagi ziddiyat yoki noaniqlik 13-bo'limda hal qilingan. O'sha qarorlarga amal qil.

---

## 1. LOYIHA

- **Nomi:** BarakaLi (bitta so'z). UI'da "Baraka" **Espresso Oak #392E26**, "Li" **Mocha #6B5B4D**, ikkalasi bold. Har doim shunday, alohida `<Logo />` komponenti orqali. Matn ichida ham "BarakaLi" ajratilgan holda ko'rsatilsa, shu komponent ishlatilsin.
- **Kod/URL nomi:** `barakali`
- **Tur:** veb-ilova, mobile-first, planshet va kompyuterga moslashgan.
- **Til:** o'zbek lotin (asosiy), rus (qo'shimcha).
- **Muammo:** Ko'p ayollar oilaviy sharoit sabab doimiy ishga bora olmaydi. Ularda tikuvchilik, pishiriq, qo'l mehnati, dizayn kabi mahorat bor, lekin mijoz topish, ish vaqtini moslash, arzon material olish va daromadni hisobga olish qiyin.
- **Yechim:** Platforma uyda ishlaydigan ayollarni (hunarmand) buyurtmachilar bilan bog'laydi. Hunarmand xizmat va **tayyor mahsulotlarini** joylaydi, buyurtma qabul qiladi, ish vaqtini o'zi belgilaydi, materialni chegirma bilan oladi, daromadini ko'radi. Buyurtmachi xizmat yoki mahsulot topadi, **to'lov qiladi**, holatini kuzatadi.
- **Auditoriya:** (1) hunarmand ayollar, asosan telefonda; (2) buyurtmachilar (oddiy mijoz, kafe, kichik biznes); (3) admin.
- **Qadriyatlar:** halol mehnat, oilani qo'llab-quvvatlash, iqtisodiy mustaqillik. Matn ohangi iliq, hurmatli, sodda.

---

## 2. TEXNOLOGIYA (o'zgartirma)

### Frontend
- React 18 + TypeScript (`strict: true`, `noUncheckedIndexedAccess`) + Vite
- React Router: har sahifa `React.lazy` bilan alohida chunk
- TanStack Query: API, kesh, retry
- Zustand: til, kirish holati, kalendar tanlovi, savat
- react-hook-form + zod: formalar (sxemalar frontend va backend uchun **umumiy paketda**)
- Tailwind CSS: ranglar CSS tokenlar sifatida (`--color-sugar`, `--color-bisque`, `--color-wheat`, `--color-pistachio`, `--color-mocha`, `--color-espresso`)
- i18next: `uz` (default), `ru`. **Hech qanday matn kodga qattiq yozilmaydi**, faqat tarjima kalitlari
- Framer Motion: faqat tugma bosilishi va bosh sahifa kirishida, `prefers-reduced-motion` hurmat qilinadi
- Xarita kerak bo'lsa, lazy-load
- 3D ko'rinish: `three` + `@react-three/fiber` + `@react-three/drei` (`OrbitControls`, `useGLTF`, `Environment`). **Faqat mahsulot sahifasida va lazy-load** qilinadi, bosh sahifa va asosiy bundle'ga kirmaydi (6.1-bo'lim)

### Backend
- Node.js 20+ + **Express** + TypeScript, REST, JSON
- Auth: telefon + SMS kod, **parol yo'q**. Access JWT (qisqa) + refresh (httpOnly, Secure, SameSite cookie, aylantiriladigan)
- Har kiruvchi so'rov serverda zod bilan tekshiriladi
- Rasm yuklash: faqat jpeg/png/webp, hajm limiti (masalan 5 MB), `sharp` bilan siqish va WebP'ga o'tkazish, fayl nomi tasodifiy, MIME-ni **kontent bo'yicha** tekshirish
- Navbat (queue): bildirishnoma va hisobotlar uchun. Hozir oddiy in-process navbat, interfeys keyin BullMQ/Redis bilan almashtirishga tayyor
- So'rovlar: **Kysely** (typelangan, parametrlangan) + oddiy `.sql` migratsiya fayllari (`node-pg-migrate`). Xom SQL string birlashtirish **taqiqlangan**
- Fayllar: `StorageProvider` interfeysi (hozir lokal disk, keyin S3-mos adapter). Rasm va 3D fayllar to'g'ri `Content-Type` (3D uchun `model/gltf-binary`) va kesh sarlavhalari bilan beriladi
- Admin: `ADMIN_PHONES` env'dagi telefon raqamlari birinchi kirishda `admin` rolini oladi

### Ma'lumotlar bazasi: PostgreSQL
- Migratsiyalar versiyalanadi, `seed` skripti bor (kategoriyalar, demo hunarmandlar va mahsulotlar, admin)
- Connection pool ishlatiladi
- N+1 yo'q: ro'yxatlar JOIN yoki `IN` bilan bitta so'rovda
- Sahifalash: har ro'yxat 10–20 tadan, cursor yoki limit/offset
- Keshlash: kategoriyalar va tavsiya etilgan hunarmandlar server xotirasida (TTL bilan), keyin Redis'ga o'tish uchun `Cache` interfeysi orqali

### Sifat
ESLint, Prettier, Vitest (unit va integratsiya), Playwright (asosiy oqim e2e: uz va ru, 3 qurilma o'lchami). Husky + lint-staged (commit oldidan lint va typecheck).

---

## 3. LOYIHA TUZILMASI (monorepo, pnpm workspaces)

```
barakali/
  apps/
    web/            # React ilova
    api/            # Express API
  packages/
    shared/         # zod sxemalar, umumiy typelar, konstantalar (komissiya, rollar, holatlar)
  docs/             # DECISIONS.md, API.md
  .env.example
  CLAUDE.md
```

Har papka ichida feature-asosli tuzilma: `features/orders`, `features/products`, `features/calendar` va h.k. (komponent, hook, api, test bir joyda).

---

## 4. CLEAN CODE QOIDALARI (majburiy)

- Bitta funksiya bitta ish qiladi, odatda 30 qatordan oshmaydi. Fayl 250 qatordan oshmaydi.
- Nomlar inglizcha va ma'noli (`calculateCommission`, `OrderStatus`). **UI matni va URL'lar o'zbekcha**, kod inglizcha.
- `any` taqiqlangan. Zarur bo'lsa `unknown` + zod bilan toraytirish.
- Sehrli raqam/satr yo'q: hammasi `packages/shared/constants` da (`COMMISSION_RATE = 0.02`, `MAX_ORDER_IMAGES = 5`).
- Biznes mantiq **servis qatlamida**, controller faqat so'rovni qabul qilib javob qaytaradi. Controller → service → repository.
- Xatolar: yagona `AppError` va markaziy error handler. API **xato kodi** (`ORDER_SLOT_TAKEN`) qaytaradi, frontend uni i18n orqali tushunarli o'zbekcha/ruscha matnga aylantiradi. Serverda to'liq log (maxfiy ma'lumotsiz).
- Takrorlanish yo'q (DRY), lekin erta abstraksiya ham yo'q.
- O'lik kod, `console.log`, izohlangan kod qoldirma. Izoh faqat "nega" ni tushuntirsin.
- Har yangi servis funksiyasi uchun kamida bitta test. Pul va kalendar mantig'i uchun chekka holatlar testlari majburiy.
- Komponentlar kichik, props typelangan, side-effect hooklarda.

---

## 5. PUL VA TO'LOV (aniq talablar)

### 5.1 Pul qoidalari
- Pul **butun son** (so'm) sifatida saqlanadi (`bigint`/`integer`), hech qachon `float`.
- Komissiya: `COMMISSION_RATE = 2%` (yagona konstanta). Hisoblash: `commission = Math.round(total * 2 / 100)`, `workerAmount = total - commission`. Yaxlitlash qoidasi bitta joyda va testlangan. Har buyurtma oʻz stavkasini saqlaydi (`orders.commission_rate`, `commission_amount`): stavka oʻzgarsa eski buyurtmalar oʻzgarmaydi.
- Komissiya **bajarilgan** (to'langan va topshirilgan) buyurtmadan olinadi. Hunarmand ko'radigan daromad **komissiya ayirilgan** summa.
- `earnings` yozuvi, `payments` yozuvi va buyurtma holati o'zgarishi **bitta DB tranzaksiyasida**.

### 5.2 Onlayn to'lov
Ishlaydigan to'liq to'lov oqimini qur. Foydalanuvchi interfeysida **"demo", "sinov", "test"** kabi so'zlar bo'lmasin. To'lov oddiy, real ko'rinishda ishlaydi.

Arxitektura:
- `PaymentProvider` interfeysi: `createPayment(order) → { paymentId, redirectUrl | clientAction }`, `verifyCallback(req)`, `refund(paymentId)`.
- `PAYMENT_PROVIDER` env o'zgaruvchisi orqali adapter tanlanadi. Hozirgi adapter: **`internal`** (platformaning o'z ichki to'lov sahifasi: karta raqami, muddat, CVC formasi → muvaffaqiyatli tasdiq → callback orqali buyurtma "to'langan" holatiga o'tadi). Kartaning real ma'lumotlari **saqlanmaydi va loglanmaydi**.
- Keyingi ulash uchun bo'sh adapter fayllari tayyor tursin: `payme.adapter.ts`, `click.adapter.ts`, `uzum.adapter.ts` (interfeysni implement qiladi, `NotImplemented` tashlaydi).
- To'lov holatlari: `pending → paid → refunded | failed`. Callback **idempotent** (bir callback ikki marta kelsa ham ikki marta hisoblanmaydi). `idempotency_key` ishlatiladi.
- `payments` jadvali: `id, order_id, amount, status, provider, provider_ref, idempotency_key, created_at`.
- To'lov oqimi: buyurtma yaratiladi (`awaiting_payment`) → buyurtmachi to'laydi (`new`) → hunarmand qabul qiladi → bajariladi → topshirildi → `earnings` yoziladi. Rad etish va muddat tugashi (qaytarish): 13-bo'lim, 11-band.
- Production rejimida `PAYMENT_PROVIDER=internal` bo'lsa, server ishga tushganda **logga ogohlantirish** yozsin ("real to'lov provayderi ulanmagan"). Bu faqat server logida, foydalanuvchi interfeysida emas.

---

## 6. HUNARMAND ISHLARI VA SOTUV (donalab va ulgurji)

Hunarmandlar o'z ishlarini platformaga joylay oladi. Ikki turdagi taklif bor:

1. **Xizmat** (masalan "ko'ylak tikib berish"): buyurtma + kalendar vaqti bilan.
2. **Mahsulot** (tayyor ish: pishiriq, kashta, sumka va h.k.): donalab yoki ulgurji sotiladi.

**`products` jadvali:** `id, worker_id, category_id, title, description, retail_price, wholesale_price (nullable), wholesale_min_qty (nullable), stock, status (draft|published|hidden), created_at`
**`product_images`:** `id, product_id, url, position` (kamida 1, ko'pi bilan `MAX_PRODUCT_IMAGES = 8`).
**`order_items`:** `id, order_id, product_id (nullable), title_snapshot, unit_price, quantity, price_type (retail|wholesale)`.

**Narx qoidalari:**
- `quantity >= wholesale_min_qty` bo'lsa **avtomatik ulgurji narx** qo'llanadi; aks holda dona narxi. Hisoblash **faqat serverda** (klient yuborgan narxga ishonma).
- Ulgurji narx dona narxdan past bo'lishi shart (validatsiya).
- `quantity <= stock` tekshiriladi; to'lov muvaffaqiyatli bo'lganda zaxira tranzaksiyada kamayadi (race condition'dan himoya: `UPDATE ... WHERE stock >= qty`).
- Mahsulot kartochkasida ikkala narx va "X dona va undan ko'p: ulgurji" yozuvi aniq ko'rinadi.
- Savat (Zustand + serverda tekshirish): bir hunarmanddan bo'lsa bitta buyurtma, bir necha hunarmanddan bo'lsa har hunarmand uchun alohida buyurtma.

### 6.1 3D ko'rinish (haridor mahsulotni aylantirib ko'ra oladi)

Hunarmand mahsulotiga ixtiyoriy ravishda **3D model** biriktira oladi. Haridor mahsulot sahifasida uni **barmog'i bilan (telefon/planshet) yoki sichqoncha bilan** aylantirib, yaqinlashtirib ko'radi.

**Ma'lumotlar:** `product_models` jadvali: `id, product_id (unique), file_url, file_size, poster_url, created_at`. Mahsulotda 3D model **ixtiyoriy**; bo'lmasa sahifa oddiy rasmlar bilan ishlaydi.

**Format va yuklash:**
- Faqat **`.glb`** (binary glTF 2.0). Hajm limiti **10 MB**.
- Server tekshiruvi (`@gltf-transform/core` bilan o'qib): magic bytes (`glTF`), versiya 2.0, **tashqi URI yo'q** (barcha buffer va rasm GLB ichida), tekstura ≤ 2048×2048, uchburchaklar ≤ 200 000, faqat ruxsat etilgan kengaytmalar (`KHR_materials_*`, `KHR_texture_transform`, `KHR_draco_mesh_compression`, `EXT_meshopt_compression`). Kengaytma va MIME'ga ishonma. Buzilgan yoki limitdan oshgan model rad etiladi. Yuklangan fayl nomi tasodifiy.
- Draco/meshopt dekoderlari tashqi CDN'dan emas, o'z domenimizdan xizmat qilinadi.
- Poster rasm: hunarmand mahsulotning birinchi rasmi avtomatik `poster_url` bo'ladi (3D yuklanguncha ko'rsatiladi).
- Hunarmand uchun forma oddiy: "3D model qo'shish (ixtiyoriy)", yonida qisqa tushuntirish: nima bu, qanday tayyorlanadi (masalan, telefon ilovalari bilan 3D skan qilib `.glb` saqlash). Xato matni tushunarli ("Fayl 10 MB dan katta", "Bu fayl formati mos emas").

**Haridor tomoni (`<Product3DViewer />` komponenti):**
- Mahsulot galereyasida rasmlar bilan bir qatorda **"3D" yorlig'i**li tab/tugma. Bosilganda viewer ochiladi.
- Boshqaruv: bir barmoq/sichqoncha chap tugma bilan aylantirish; ikki barmoq chimchilash yoki g'ildirak bilan yaqinlashtirish; pan o'chirilgan (oddiy bo'lsin). `OrbitControls` bilan, burchak va masofa cheklangan (mahsulot ko'zdan yo'qolmasin).
- Telefonda sahifa scroll'i bilan **to'qnashmasin**: canvas'da `touch-action: none` (barmoq aylantirishga ishlaydi), viewer balandligi ko'pi bilan `60dvh`, uning ostida va ustida scroll qilinadigan bo'sh joy qoladi (foydalanuvchi sahifada "qamalib" qolmasin). Birinchi marta ochilganda qisqa ko'rsatma ("Barmog'ingiz bilan aylantiring"), keyin yo'qoladi.
- Yoritish: yumshoq, tabiiy (`Environment` + yengil ambient). Fon: Sugar yoki Bisque.
- Yuklanayotganda poster rasm va progress ko'rsatiladi. Yuklash xatosi bo'lsa yoki **WebGL qo'llab-quvvatlanmasa**, avtomatik oddiy rasm galereyasiga qaytadi va xabar chiqadi, sahifa buzilmaydi.
- `prefers-reduced-motion` bo'lsa avtomatik aylanish o'chiq. Aylanish tugmalari ham bor (chap/o'ng/yaqinlash/asl holat), klaviatura (strelka tugmalari) bilan boshqarish va `aria-label` ta'minlanadi.
- **Tezlik:** `three` va model faqat 3D tab ochilganda yuklanadi (dynamic `import()`), `Suspense` bilan. Mahsulot sahifasining dastlabki yuklanishiga 3D ta'sir qilmaydi. Past quvvatli telefonda `dpr` cheklanadi (`[1, 2]`), model ko'rinmay qolsa (tab yopilsa) render to'xtaydi (`frameloop="demand"`), komponent unmount bo'lganda GPU resurslari (`dispose`) bo'shatiladi.
- Foydalanuvchi matni va model ichidagi metama'lumotlar sahifaga HTML sifatida chiqarilmaydi.

**Testlar:** model yuklash validatsiyasi (noto'g'ri format, katta fayl, buzilgan glTF), viewer fallback (WebGL yo'q holat), 3D tab bo'lmagan mahsulot sahifasi, e2e'da 3D tab ochilishi (headless Chromium'da WebGL uchun `--use-gl=swiftshader` yoqiladi; imkonsiz bo'lsa fallback yo'li testlanadi va sabab `DECISIONS.md` ga yoziladi).

**Hunarmand kabinetida:** "Mening ishlarim" bo'limi: qo'shish, tahrirlash, yashirish, zaxirani yangilash; rasm yuklash (telefon kamerasidan ham). Forma qisqa va oddiy bo'lsin (nom, rasm, narx, ulgurji shartlar, zaxira).

Yangi sahifalar: `/ishlar` (hunarmandning ishlari boshqaruvi), `/mahsulot/:id`, `/savat`, `/tolov/:orderId`.

---

## 7. QURILMA VA MOSLASHUVCHANLIK (eng muhim)

- **Mobile-first**: dizayn 360–430 px uchun, keyin kengaytiriladi.
- Breakpointlar: telefon `< 640`, planshet `640–1023`, kompyuter `≥ 1024`.
- Planshet: 2 ustun, yon navigatsiya yoki pastki panel. Kompyuter: kengroq layout, lekin oqim telefondagidek sodda; **hech bir funksiya faqat kompyuterda emas**.
- Gorizontal scroll **yo'q**. Yon chekinish 16 px. Barcha interaktiv elementlar kamida **48 px** balandlikda.
- iOS safe-area (`env(safe-area-inset-*)`), klaviatura ochilganda forma/tugma yopilmaydi (`100dvh`, `scrollIntoView`).
- Pastki navigatsiya (telefon): Bosh sahifa · Buyurtmalar · Kalendar · Daromad · Profil. Planshet/kompyuterda yon panelga aylanadi.

---

## 8. RANGLAR VA DIZAYN

| Nom | HEX | Qo'llanish |
|---|---|---|
| Sugar | #FCF8F0 | Asosiy fon, kartochkalar |
| Bisque | #E2D9CD | Ikkinchi fon, chegara, bo'limlar |
| Wheat | #B6A593 | Dekor, nofaol holat. **Matn uchun emas** |
| Pistachio | #B5BDAC | Muvaffaqiyat holati, "Tasdiqlangan" belgisi. **Matn uchun emas** |
| Mocha | #6B5B4D | Asosiy tugma, faol holat, ikonka, "Li" |
| Espresso Oak | #392E26 | Asosiy matn, sarlavha, "Baraka" |

- Matn faqat Espresso Oak yoki Mocha. Asosiy tugma: Mocha fon + Sugar matn. Ikkinchi darajali: Bisque fon + Espresso Oak matn.
- WCAG AA kontrast; fokus halqasi aniq ko'rinadi (Mocha, 2 px).
- Dark mode **yo'q**.
- Uslub: "luxury, timeless, earthy": keng bo'shliq, 16–24 px burchak, nozik soyalar, sodda chiziqli ikonkalar (Mocha).
- Shrift: Inter (o'zbek `ʻ` va `ʼ` belgilari to'g'ri ko'rinishi **tekshirilsin**), asosiy matn ≥ 16 px.
- Rasmlar: `loading="lazy"`, WebP, `width/height` berilgan (layout sakramasin), `alt` matnlari bor.
- Animatsiya minimal: faqat holat o'zgarishida.

---

## 9. SAHIFALAR (marshrutlar)

```
/                           Bosh sahifa
/xizmatlar/:kategoriya      Kategoriya bo'yicha hunarmand va mahsulotlar
/hunarmand/panel            Hunarmand kabineti          (rol: worker)
/hunarmand/kalendar         Ish kalendari               (rol: worker)
/hunarmand/:id              Hunarmand profili           (ommaviy)
/ishlar                     Mening ishlarim (CRUD)      (rol: worker)
/mahsulot/:id               Mahsulot sahifasi
/savat                      Savat
/tolov/:orderId             To'lov
/buyurtma/yangi             Xizmat buyurtmasi           (kirish talab qilinadi)
/buyurtmalar                Mening buyurtmalarim
/buyurtmalar/:id            Holat va baholash
/materiallar                Materiallar do'koni
/daromad                    Daromad tarixi va jamg'arma (rol: worker)
/darslar                    Moliyaviy savodxonlik va tadbirkorlik
/kirish, /royxatdan-otish   Kirish va ro'yxatdan o'tish
/profil                     Sozlamalar, til, telefon
/admin                      Tasdiqlash, buyurtmalar, moderatsiya, statistika (rol: admin)
*                           404
```

**Muhim:** `/hunarmand/panel` va `/hunarmand/kalendar` marshrutlari `/hunarmand/:id` dan **oldin** e'lon qilinsin. Himoyalangan yo'llar (`/buyurtma*`, `/hunarmand/panel`, `/hunarmand/kalendar`, `/ishlar`, `/daromad`, `/profil`, `/admin`, `/savat` dan to'lovga o'tish) faqat kirgan va roli mos foydalanuvchiga ochiladi. Frontend himoyasi qulaylik uchun, **haqiqiy himoya serverda** (har endpointda rol tekshiruvi).

---

## 10. BOSH SAHIFA

Yuqoridan pastga: Header (logotip, UZ/RU, "Kirish") → katta qidiruv ("Nima tikish yoki pishirish kerak?") → kategoriyalar (rasmli katta tugmalar: Tikuvchilik, Pishiriq, Qo'l mehnati, Dizayn) → "Hunarmand bo'lish" (katta, Mocha) → tavsiya etilgan hunarmandlar (3–4 kartochka: rasm, ism, kategoriya, reyting, "dan narx", "Buyurtma berish") → "Qanday ishlaydi" (Tanlang → Buyurtma bering → Oling) → Darslar (2–3 kartochka) → Footer.

Telefonda birinchi ekranda faqat 1–4 bandlar ko'rinadi. Birinchi ekran **3 soniyadan tez** yuklansin.

---

## 11. HUNARMAND KABINETI

Ochilganda 4 ta katta kartochka:
1. **Bugungi buyurtmalar**: yangi va qabul qilinganlar soni.
2. **Ish kalendari**: bo'sh vaqtni belgilash (masalan 10:00–14:00), tez tugmalar: Ertalab, Tushlik, Kechqurun. Buyurtmalar faqat shu vaqtga tushadi.
3. **Materiallar**: ip, mato, un, chegirma bilan.
4. **Bu oy daromadi**: katta raqam, so'mda, **komissiya (2%) ayirilgan**.

Qo'shimcha kirish: "Mening ishlarim" (6-bo'lim).

---

## 12. ASOSIY OQIMLAR, ISHONCH, XAVFSIZLIK

**Buyurtmachi (xizmat):** kategoriya → hunarmand profili → "Buyurtma berish" (tavsif, muddat, ≤5 rasm) → hunarmandning bo'sh vaqtidan tanlash → to'lov → hunarmand qabul qiladi → holat: `yangi → qabul qilingan → bajarilmoqda → tayyor → topshirildi` → 1–5 yulduz baho.
**Buyurtmachi (mahsulot):** mahsulot → dona yoki ulgurji miqdor → savat → to'lov → hunarmand tasdiqlaydi → holat kuzatuvi → baho.
**Hunarmand:** telefon + SMS → 3 qadamli tanishtiruv (Kalendar, Buyurtma, Daromad) → ism, telefon, kategoriya → profil → **admin tasdiqlagach** buyurtma qabul qiladi.
**Admin:** hunarmandlarni tasdiqlaydi, buyurtmalarni ko'radi, sharhlarni moderatsiya qiladi, statistika.

**Ishonch:**
- "Tasdiqlangan" belgisi (Pistachio fon, **matn Espresso Oak**).
- Telefon raqami faqat buyurtma qabul qilingandan keyin ko'rinadi (serverda filtrlanadi, API javobida umuman chiqmaydi).
- Sharh buyurtma tugagach, bir marta (DB'da unique `order_id`).
- Har buyurtmada "Shikoyat" tugmasi.
- Foydalanuvchi matni **oddiy matn** sifatida chiqadi. `dangerouslySetInnerHTML` ishlatilmaydi.

**Xavfsizlik:**
- Parametrlangan so'rovlar, CORS cheklangan (faqat ruxsat etilgan origin), `helmet`.
- Rate limit: umumiy, kirish va **SMS uchun qattiqroq** (telefon va IP bo'yicha), SMS kod 5 daqiqa amal qiladi, 5 urinishdan keyin bloklanadi, kod hash holida saqlanadi.
- Sirlar faqat serverda `.env` da; `.env.example` bor, `.env` gitga tushmaydi. Brauzerga DB kaliti yoki to'lov siri chiqmaydi.
- IDOR himoyasi: foydalanuvchi faqat o'z buyurtma/mahsuloti/daromadiga kira oladi (har so'rovda egalik tekshiruvi).
- SMS: development'da kod konsolga chiqadi; production uchun `SmsProvider` interfeysi (Eskiz/Play Mobile adapteri uchun joy).

---

## 13. BRIFDAGI NOANIQLIKLAR UCHUN QABUL QILINGAN QARORLAR

1. Backend: **Express + TypeScript** (brifda "Express yoki Fastify" deyilgan edi).
2. DB ustun nomlari **inglizcha snake_case** (`category_id`, `start_time`), UI va URL o'zbekcha.
3. **Kalendar to'qnashuvi** PostgreSQL **exclusion constraint** bilan: `btree_gist` kengaytmasi + `EXCLUDE USING gist (worker_id WITH =, tstzrange(start_time, end_time) WITH &&) WHERE (status IN ('awaiting_payment','new','accepted','in_progress'))` (faqat xizmat buyurtmalari, ya'ni `start_time` bor qatorlar; slot to'lovgacha ham ushlab turiladi, 10-band). Konstraint buzilsa, foydalanuvchiga "Bu vaqt band, boshqasini tanlang" ko'rsatiladi. Testi yoziladi.
4. Vaqt zonasi: DB'da UTC (`timestamptz`), UI'da `Asia/Tashkent`.
5. Rollar: `customer`, `worker`, `admin`. Bir foydalanuvchi bir rolda (oddiy yechim), hunarmand bo'lish uchun alohida ro'yxat.
6. Narx va to'lov valyutasi: so'm (UZS), ko'rinishi `120 000 so'm`.
7. Brifdagi "Eslatma": Wheat matnda ishlatilmaydi. Kodda lint-qoida yoki dizayn tokenlarida `text-wheat` klassi umuman yaratilmasin.
8. **Buyurtma holatlari (kod):** `awaiting_payment → new → accepted → in_progress → ready → delivered`, chetga chiqish: `cancelled`, `refunded`. UI nomlari: yangi → qabul qilingan → bajarilmoqda → tayyor → topshirildi. Ruxsat etilgan o'tishlar `packages/shared` da **bitta jadvalda**, boshqa o'tish rad etiladi.
9. **Buyurtma turlari:** `orders.type` = `service | product`. `start_time/end_time` faqat xizmat uchun (mahsulot buyurtmasida kalendar yo'q). Mahsulot buyurtmasida `fulfillment` (`pickup | delivery`) va `delivery_address` (matn). Yetkazib berishni platforma tashkil qilmaydi: hunarmand va haridor telefon orqali kelishadi (raqam qabul qilingach ochiladi).
10. **Slot ushlab turish:** to'lovdan oldin ham slot band bo'ladi (13.3-band). To'lanmagan buyurtma 15 daqiqada navbat vazifasi bilan `cancelled` qilinadi va slot bo'shaydi.
11. **Qabul muddati va qaytarish:** hunarmand to'langan buyurtmani 24 soat ichida qabul qilmasa yoki rad etsa, to'lov avtomatik qaytariladi (`refund` → `refunded`), haridorga xabar boradi. Shikoyat bo'yicha admin qo'lda qaytarishni boshlay oladi.
12. **Sharh va reyting:** sharh buyurtmaga bog'liq (`order_id` unique), hunarmand reytingiga ta'sir qiladi. `workers.rating` va `reviews_count` sharh saqlanganda **bir tranzaksiyada** yangilanadi. Sharhda `status` (`visible | hidden`) moderatsiya uchun.
13. **Kirish va ro'yxatdan o'tish:** birinchi SMS tasdiqlashda foydalanuvchi avtomatik yaratiladi. `/royxatdan-otish` shu oqim + rol tanlash (`?rol=hunarmand`). Refresh cookie `SameSite=Strict`, `Origin` sarlavhasi tekshiriladi.
14. **Materiallar do'koni:** admin boshqaradigan katalog (`materials`: nomi, narx, chegirma foizi, zaxira). Hunarmand uni xuddi shu savat va to'lov oqimi bilan oladi (`material_orders`, `material_order_items`). Chegirmali narx ko'rinadi. Materiallardan komissiya olinmaydi.
15. **Jamg'arma va darslar:** jamg'arma haqiqiy bank emas: `/daromad` da daromad tarixi, oylik jami va hunarmand belgilagan maqsad summasi bilan progress (`savings_goals`). `/darslar` kontenti hozircha statik (markdown/i18n fayllari), keyinroq CMS.
16. **Qidiruv:** PostgreSQL `pg_trgm` + indeks. O'zbekcha apostrof variantlari (`'`, `ʻ`, `ʼ`, `’`) qidiruvda bitta ko'rinishga keltiriladi, lotin/kirill farqi hozircha yo'q.
17. **Maxfiylik:** shaxsiy ma'lumotlarni mamlakat ichidagi serverda saqlash talab qilinishi mumkin. Hosting `docs/DEPLOY.md` da qayd etiladi, kod konkret provayderga bog'lanmaydi.
18. **Soatlik narx yo'q:** hunarmandning soatlik narxi (`workers.hourly_rate`) olib tashlangan. Xizmat so'rovi bepul va to'lovsiz; narx va to'lov faqat mahsulot buyurtmasida.
19. **Admin tasdiqlash:** yangi hunarmand arizasi `pending` holatida boshlanadi, profil ommaviy emas va buyurtma qabul qilmaydi. Admin `/admin/hunarmandlar` da `approved` yoki `rejected` qiladi; tekshiruv serverda (`workers.status`).
20. **Kontakt qoidasi:** hunarmandning telefoni va Telegram nomi (`workers.telegram_username`, ixtiyoriy) faqat buyurtma `accepted` va undan keyingi holatda, faqat shu buyurtmaning buyurtmachisiga, API javobining o'zida qaytadi. Boshqa hunarmand yoki begona foydalanuvchi buyurtmani umuman ko'rmaydi (404).
21. **Toifalar: 4 ta.** `tikuvchilik`, `pishiriq`, `qol-mehnati`, `dizayn`. "Masofaviy ishlar" olib tashlandi: DB qatori o'chirilmagan, `categories.is_active = false` (katalog, tanlov va tavsiyada ko'rinmaydi, eski `/xizmatlar/masofaviy-ishlar` havolasi "Barcha ishlar" ga yo'naltiriladi).
22. **Catering yo'q:** catering bo'limi (sahifa, forma, API, xizmat turlari, rasmlar) olib tashlangan. Bosh sahifa: katalog, tavsiya etilgan hunarmandlar, "Hunarmand bo'ling", "Qanday ishlaydi", "Darslar". `catering_requests` jadvali faqat bo'sh bo'lsa migratsiya bilan o'chiriladi.

---

## 14. BOSQICHLAR (har birida qabul mezoni)

**0. Poydevor.** Monorepo, TS strict, ESLint/Prettier/Husky, Tailwind tokenlari, i18n, `.env.example`, CI skripti. *Mezon:* `pnpm lint && pnpm typecheck && pnpm test && pnpm build` o'tadi.
**1. Ma'lumotlar bazasi.** Barcha jadvallar: `users, workers, categories, availability, orders, order_items, reviews, earnings, products, product_images, product_models, payments, complaints, materials, material_orders, material_order_items, savings_goals, sms_codes, refresh_tokens`; brifdagi indekslar + `orders(type)`, `products(worker_id, status)`, qidiruv uchun trigram indeks, exclusion constraint, migratsiya, seed. *Mezon:* kalendar to'qnashuvi testi o'tadi.
**2. Auth.** SMS kod, JWT/refresh, rollar, rate limit. *Mezon:* auth integratsiya testlari.
**3. Katalog.** Kategoriyalar, hunarmandlar, mahsulotlar, qidiruv, filtr, sahifalash, kesh. *Mezon:* ro'yxat endpointlarida N+1 yo'q (so'rovlar soni testda tekshiriladi).
**4. Hunarmand ishlari.** Mahsulot/xizmat CRUD, rasm yuklash va siqish, **`.glb` 3D model yuklash va server validatsiyasi (6.1)**. *Mezon:* faqat egasi tahrirlay oladi; noto'g'ri yoki 10 MB dan katta model rad etiladi.
**5. Kalendar va buyurtma.** Bo'sh vaqt, buyurtma yaratish, holatlar, ≤5 rasm. *Mezon:* holat o'tishlari faqat ruxsat etilgan ketma-ketlikda.
**6. Savat, donalab/ulgurji, to'lov, komissiya, daromad.** 5 va 6-bo'lim. *Mezon:* narx/komissiya/idempotentlik/zaxira testlari o'tadi.
**7. Frontend: dizayn tizimi va bosh sahifa.** Logo, tugmalar, kartochkalar, layout, navigatsiya. *Mezon:* 360, 768, 1280 px da gorizontal scroll yo'q.
**8. Frontend: barcha sahifalar** (9-bo'lim) ulanadi, loading/xato/bo'sh holatlar; **`<Product3DViewer />` (6.1)**: lazy-load, touch/sichqoncha aylantirish, WebGL fallback. *Mezon:* 3D yuklanmagan holatda mahsulot sahifasi bundle'iga `three` kirmaydi.
**9. Admin, sharh va moderatsiya, shikoyat, materiallar do'koni (13.14), jamg'arma va darslar (13.15), qabul muddati/qaytarish navbat vazifalari (13.10–13.11).** *Mezon:* 24 soatda qabul qilinmagan buyurtma avtomatik qaytariladi (testda vaqt sun'iy siljitiladi).
**10. Sifat.** Playwright e2e (buyurtmachi: mahsulot → savat → to'lov → holat → baho; hunarmand: kirish → kalendar → buyurtma qabul → daromad), uz/ru, 3 o'lcham; accessibility tekshiruvi (axe); Lighthouse (mobil) birinchi ekran < 3 s.
**11. Yakun.** `README.md` (o'rnatish, ishga tushirish, env), `docs/API.md`, `docs/DECISIONS.md`, xavfsizlik ro'yxatini qayta ko'rib chiqish.

---

## 15. TUGALLASH MEZONI (Definition of Done)

- [ ] Barcha marshrutlar (9-bo'lim) ishlaydi, himoyalangan yo'llar serverda ham himoyalangan
- [ ] Hech qanday qattiq yozilgan matn yo'q; uz va ru to'liq tarjima qilingan
- [ ] 360 / 768 / 1280 px da gorizontal scroll yo'q, tugmalar ≥ 48 px
- [ ] Kontrast WCAG AA, fokus ko'rinadi, klaviatura bilan boshqariladi, `aria-label` bor
- [ ] Komissiya 2%, pul butun son, har buyurtmada stavka saqlanadi, testlangan
- [ ] Donalab/ulgurji narx serverda hisoblanadi, zaxira race-condition'dan himoyalangan
- [ ] 3D model: hunarmand `.glb` yuklay oladi, haridor telefonda barmoq bilan va kompyuterda sichqoncha bilan aylantira oladi; WebGL yo'q bo'lsa rasmlarga qaytadi; `three` faqat 3D tab ochilganda yuklanadi
- [ ] To'lov oqimi boshidan oxirigacha ishlaydi, callback idempotent
- [ ] Kalendar to'qnashuvi DB darajasida bloklanadi
- [ ] Telefon raqami qabul qilishgacha API javobida yo'q
- [ ] `any`, `console.log`, o'lik kod, `dangerouslySetInnerHTML` yo'q
- [ ] `lint`, `typecheck`, unit, integratsiya, e2e testlar yashil
- [ ] Birinchi ekran < 3 s: Lighthouse mobil, Slow 4G profili; bosh sahifa boshlang'ich JS ≤ 200 KB (gzip), `three` unga kirmaydi
- [ ] To'lanmagan buyurtma slotni 15 daqiqadan keyin bo'shatadi; rad etilgan yoki muddati o'tgan buyurtma puli qaytariladi
- [ ] `README.md` bo'yicha yangi odam loyihani 10 daqiqada ishga tushira oladi

---

**Boshlash buyrug'i:** 0-bosqichdan boshla. Har bosqichni tugatgach qisqa hisobot ber va keyingisiga o'z-o'zidan o't.