# Xavfsizlik ro'yxati

CLAUDE.md 12-bo'limidagi talablar kod bo'yicha qayta ko'rib chiqildi (11-bosqich). Har band uchun
qayerda amalga oshirilgani va qanday tekshirilgani ko'rsatilgan. Qolgan xavflar oxirida.

| Talab                                            | Holat | Qayerda / qanday tekshiriladi                                                                                                                                                                            |
| ------------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parametrlangan so'rovlar, SQL birlashtirish yo'q | ✅    | Hamma so'rov Kysely orqali. Xom `sql` faqat `db/migrator.ts` da (qiymatlar parametr, `sql.raw` faqat o'z migratsiya fayllari uchun)                                                                      |
| Server tomonida zod bilan validatsiya            | ✅    | Har endpoint `packages/shared` sxemasi bilan `parse` qiladi; noto'g'ri tana → 400 `VALIDATION_ERROR`                                                                                                     |
| CORS cheklangan, `helmet`                        | ✅    | `app.ts`: faqat `ALLOWED_ORIGINS`, `helmet`, `x-powered-by` o'chirilgan                                                                                                                                  |
| CSRF                                             | ✅    | Refresh cookie `httpOnly`, `SameSite=Strict`, productionda `Secure`; yozuvchi so'rovlarda begona `Origin` → 403 (`middleware/origin.ts`)                                                                 |
| Parolsiz kirish, kod hash holida                 | ✅    | SMS kod HMAC bilan hash, 5 daqiqa, 5 urinish, bir martalik (`auth.service.ts`)                                                                                                                           |
| Rate limit: umumiy, kirish, SMS                  | ✅    | `middleware/rate-limit.ts`: 600 / 30 / 8 (telefon va IP bo'yicha); SMS kodlari DB orqali ham cheklanadi                                                                                                  |
| Refresh token aylanishi                          | ✅    | Har ishlatilganda yangilanadi; qayta ishlatilsa foydalanuvchining hamma tokenlari bekor qilinadi (`auth.test.ts`)                                                                                        |
| Sirlar faqat serverda                            | ✅    | `.env` gitga tushmaydi (`.gitignore`), `.env.example` bor; JWT sirlari productionda majburiy; brauzerga faqat `VITE_API_URL`                                                                             |
| IDOR himoyasi                                    | ✅    | Buyurtma/to'lov/material/kalendar/jamg'arma/mahsulot egaligi har so'rovda; begonaga 404. Testlar: `order`, `product`, `calendar`, `material`, `feedback`                                                 |
| Rol tekshiruvi serverda                          | ✅    | `requireWorker` / `requireAdmin` har endpointda; `/admin/*` uchun `admin.test.ts` anonim, mijoz va hunarmandni rad etishini tekshiradi                                                                   |
| Telefon raqami qabul qilishgacha yashirin        | ✅    | `OrderRepository.findDtos`: faqat `accepted/in_progress/ready/delivered` da; API javobida umuman yo'q (test)                                                                                             |
| Foydalanuvchi matni oddiy matn                   | ✅    | `dangerouslySetInnerHTML` ESLint qoidasi bilan taqiqlangan; `orderView.test.tsx` markup chiqmasligini tekshiradi                                                                                         |
| Rasm yuklash                                     | ✅    | Format kontent bo'yicha (`sharp.metadata`), metadata olib tashlanadi, WebP, tasodifiy nom, 5 MB                                                                                                          |
| 3D model yuklash                                 | ✅    | `.glb` kontent bo'yicha, tashqi URI yo'q, tekstura/uchburchak limiti, kengaytmalar ro'yxati, 10 MB (`uploads/glb.ts`, testlar)                                                                           |
| Karta ma'lumotlari                               | ✅    | Saqlanmaydi, loglanmaydi: `verifyCallback` qiymatni faqat tekshiradi; `errorHandler` so'rov tanasini logga yozmaydi                                                                                      |
| Pul to'liq sonlarda, komissiya bir joyda         | ✅    | `bigint`, `splitOrderAmount` (testlangan); earnings/payments/status bitta tranzaksiyada                                                                                                                  |
| Poyga holatlari (race)                           | ✅    | Zaxira `UPDATE … WHERE stock >= qty`; slot DB exclusion constraint; sharh `unique(order_id)` + qator qulfi; to'lov callback idempotent                                                                   |
| Admin kirishi                                    | ✅    | `ADMIN_PHONES` + SMS tasdig'i. **Yangi:** `EXPOSE_SMS_CODE=true` rejimida ham admin raqami kodi javobda qaytmaydi (aks holda istalgan kishi admin bo'lardi); kod server logiga yoziladi (`auth.test.ts`) |
| Bog'liqliklarni ko'rib chiqish                   | ⚠️    | `pnpm audit` CI'da yo'q; qo'lda ishga tushirish tavsiya etiladi                                                                                                                                          |

## Qolgan xavflar va ochiq masalalar

1. **SMS shlyuzi va to'lov provayderlari ulanmagan.** `EXPOSE_SMS_CODE=true` bo'lsa, oddiy
   foydalanuvchining kodi API javobida qaytadi: bu raqamga egalikni **isbotlamaydi** (istalgan kishi
   istalgan raqam bilan kira oladi). Faqat ko'rik uchun. Real foydalanuvchilar uchun `SmsProvider`
   adapteri ulanib, bu o'zgaruvchi `false` bo'lishi shart.
2. **Admin kodi server logida.** Shlyuz bo'lmaganda admin bir martalik kodni Vercel loglaridan oladi
   (5 daqiqa, bir marta ishlaydi, bazada hash). Loglarga kirish huquqi loyiha egalarida bo'lishi kerak.
3. **Rate limit xotirada** (instansiya bo'yicha): serverlessda umumiy cheklov kuchsizroq. Redis
   (`Cache`/`JobQueue` interfeyslari tayyor) bilan almashtiriladi.
4. **Yetim fayllar.** `/uploads/order-image` bilan yuklangan, lekin buyurtmaga biriktirilmagan rasmlar
   `files` jadvalida qoladi (har biri ≤ 5 MB, umumiy limit ostida). Tozalash vazifasi TODO'da.
5. **Tasdiqlanmagan hunarmand** buyurtma qabul qila oladi (DECISIONS.md): belgi faqat ishonch uchun.
6. **Zaxira (backup) va log rotatsiyasi** hosting tomonida.
