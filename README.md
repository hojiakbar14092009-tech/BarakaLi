# BarakaLi

Uyda ishlaydigan hunarmand ayollarni buyurtmachilar bilan bog'laydigan veb-ilova. Hunarmand ishlari va
tayyor mahsulotlarini joylaydi (donalab va ulgurji), 3D modelini yuklaydi; buyurtmachi tanlaydi, to'laydi
va holatini kuzatadi. Platforma har bir bajarilgan buyurtmadan 5% komissiya oladi.

Texnologiya: React 18 + Vite + Tailwind 4 (`apps/web`), Express 5 + Kysely + PostgreSQL (`apps/api`),
umumiy zod sxemalari va konstantalar (`packages/shared`). To'liq reja: [CLAUDE.md](CLAUDE.md).

## Nimalar bor

- Bosh sahifa, kategoriyalar, qidiruv (o'zbekcha apostrof variantlari bir xil), sahifalash
- Mahsulot sahifasi: dona va ulgurji narx (hisoblash serverda), zaxira, 3D ko'rinish (faqat 3D tab ochilganda yuklanadi, WebGL yo'q bo'lsa rasmlarga qaytadi)
- Telefon + SMS kod orqali kirish (parolsiz), aylantiriladigan refresh token
- Hunarmand kabineti: mahsulot qo'shish/tahrirlash, rasm (kameradan ham), `.glb` model, zaxira, daromad va jamg'arma maqsadi
- Ish kalendari: bo'sh vaqt (Ertalab / Tushlik / Kechqurun), soatlik narx; xizmat buyurtmasi (tavsif, muddat, ≤ 5 rasm, slot tanlash). Slot to'qnashuvi DB darajasida bloklanadi
- Savat, buyurtma, to'lov (platformaning o'z to'lov sahifasi), buyurtma holatlari, 5% komissiya va daromad
- To'lanmagan buyurtma 15 daqiqada bekor bo'ladi; 24 soatda qabul qilinmasa pul avtomatik qaytariladi
- Sharh (bir marta, reytingni yangilaydi) va shikoyat; hunarmand profilida sharhlar
- Materiallar do'koni (chegirma bilan), darslar (`/darslar`)
- Admin paneli (`/admin`): hunarmandlarni tasdiqlash, buyurtmalar, sharh moderatsiyasi, shikoyat va qo'lda qaytarish, materiallar, statistika
- uz va ru tillari

Ulanmagan integratsiyalar va keyinga qoldirilganlar: [TODO.md](TODO.md). Qabul qilingan qarorlar:
[docs/DECISIONS.md](docs/DECISIONS.md). API: [docs/API.md](docs/API.md). Xavfsizlik: [docs/SECURITY.md](docs/SECURITY.md).

## Lokal ishga tushirish (10 daqiqa)

Talab: Node.js 20+ va pnpm 12 (`npm i -g pnpm`). Docker yoki alohida PostgreSQL shart emas:
`DATABASE_URL` bo'sh bo'lsa ichki PostgreSQL (PGlite) `.data/` papkasida ishlaydi.

```bash
pnpm install
cp .env.example .env        # lokalda EXPOSE_SMS_CODE=true qo'ying: kod kirish formasida ko'rinadi
pnpm db:seed                # kategoriyalar, 4 hunarmand, 10 mahsulot, 1 ta 3D model
pnpm dev                    # web: http://localhost:5173, api: http://localhost:3001
```

Kirish uchun istalgan raqam yaroqli. Namuna hunarmand: `+998 90 000 00 02` (kod ekranda chiqadi).

## Tekshiruvlar

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # birlik va integratsiya testlari
pnpm e2e                                                 # brauzer testlari (oldin build kerak)
```

`pnpm e2e` Playwright'ni ishga tushiradi: web ilovaning production build'i va xotiradagi vaqtinchalik baza
bilan uz/ru asosiy oqimlar, 360/768/1280 px da gorizontal scroll va 48 px tekshiruvi, axe (WCAG 2.1 AA),
3D va WebGL yo'q holat, Lighthouse (mobil, Slow 4G). Birinchi marta: `npx playwright install chromium`.

`pnpm build` web'ni yig'ib, boshlang'ich JS byudjetini (≤ 200 KB gzip) va `three` faqat 3D chunk'da
ekanini tekshiradi, so'ng `api/index.js` (Vercel funksiyasi) ni qayta yaratadi.

## Muhit o'zgaruvchilari

| Nom                  | Izoh                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL ulanish manzili. Productionda majburiy                                                                    |
| `JWT_ACCESS_SECRET`  | Access token siri, kamida 32 belgi. Productionda majburiy                                                            |
| `JWT_REFRESH_SECRET` | Refresh token va kod hash siri, kamida 32 belgi. Productionda majburiy                                               |
| `ADMIN_PHONES`       | Vergul bilan ajratilgan raqamlar: kirishda `admin` roli. Bu raqamlarning kodi javobda qaytmaydi (serverga loglanadi) |
| `EXPOSE_SMS_CODE`    | `true` bo'lsa kod API javobida qaytadi (SMS shlyuzi ulanmaguncha). Xavfli                                            |
| `SEED_SAMPLE_DATA`   | `true` bo'lsa birinchi so'rovda namuna hunarmand va mahsulotlar qo'shiladi                                           |
| `PAYMENT_PROVIDER`   | `internal` (hozir yagona ishlaydigan)                                                                                |
| `ALLOWED_ORIGINS`    | CORS uchun qo'shimcha originlar (bir domen ichida kerak emas)                                                        |
| `PGLITE_DATA_DIR`    | `memory` bo'lsa ichki baza xotirada (faqat brauzer testlari uchun)                                                   |

## Deploy

Vercel bo'yicha qadamlar: [docs/DEPLOY.md](docs/DEPLOY.md).

## Muhim cheklovlar (halol ro'yxat)

- **SMS shlyuzi ulanmagan.** `EXPOSE_SMS_CODE=true` bo'lmasa, foydalanuvchi kodni ololmaydi.
- **Haqiqiy to'lov provayderi ulanmagan.** To'lov platforma ichida qayd etiladi, kartadan pul yechilmaydi;
  Payme, Click va Uzum adapterlari bo'sh.
- Vercel funksiyasi so'rov tanasini 4,5 MB bilan cheklaydi: amalda `.glb` 4,5 MB gacha (S3 adapteri TODO'da).
