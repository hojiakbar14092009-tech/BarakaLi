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

- [ ] Real SMS provayderi (Eskiz yoki Play Mobile) va `EXPOSE_SMS_CODE=false`
- [ ] Payme / Click / Uzum adapterlari (`PaymentProvider` interfeysi tayyor)
- [ ] S3-mos `StorageProvider` (10 MB `.glb` va to'liq rasm hajmi uchun Vercel limitini chetlab o'tish)
- [ ] BullMQ/Redis navbati va keshi (interfeyslar tayyor), WebSocket, PWA, `/biznes`

## Sifat (10–11-bosqich)

- [x] Playwright e2e (uz va ru, 360 / 768 / 1280 px), axe tekshiruvi, Lighthouse (mobil), WebGL yoʻq holat testi (10-bosqich)
- [x] `docs/API.md` toʻliq sxemalar bilan; `docs/DEPLOY.md` da mamlakat ichidagi hosting; `docs/SECURITY.md` (11-bosqich)
- [ ] Biriktirilmagan buyurtma rasmlarini (`/uploads/order-image`) davriy tozalash
- [ ] `pnpm audit` ni CI'ga qoʻshish
- [ ] Husky pre-commit tezlashtirish (faqat oʻzgargan paketlarni tekshirish)
