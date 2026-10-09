# TODO (MVP'dan keyin)

Bu ro'yxat `CLAUDE.md` dagi bosqichlardan MVP'ga kirmagan qismlarni o'z ichiga oladi.

## 5-bosqich: kalendar va xizmat buyurtmalari

- [ ] `availability` jadvali, bo'sh vaqt belgilash (Ertalab / Tushlik / Kechqurun tez tugmalari)
- [ ] `/hunarmand/kalendar`, `/buyurtma/yangi` (tavsif, muddat, ≤5 rasm, slot tanlash)
- [ ] `orders` uchun exclusion constraint (`btree_gist`, 13.3-band) va uning testi
- [ ] To'lanmagan buyurtmani 15 daqiqada bekor qiluvchi navbat vazifasi (13.10)

## 9-bosqich: admin, sharh, shikoyat, materiallar, jamg'arma, darslar

- [ ] `/admin`: hunarmandlarni tasdiqlash, buyurtmalar, sharh moderatsiyasi, statistika
- [ ] `reviews` (`order_id` unique, reyting yangilash bir tranzaksiyada), `complaints`
- [ ] Materiallar do'koni (`materials`, `material_orders`, `material_order_items`), `/materiallar`
- [ ] `/daromad` da jamg'arma maqsadi (`savings_goals`), `/darslar` kontenti
- [ ] 24 soat ichida qabul qilinmagan to'langan buyurtmani avtomatik qaytarish (13.11)

## Integratsiyalar

- [ ] Real SMS provayderi (Eskiz yoki Play Mobile) va `EXPOSE_SMS_CODE=false`
- [ ] Payme / Click / Uzum adapterlari (`PaymentProvider` interfeysi tayyor)
- [ ] S3-mos `StorageProvider` (10 MB `.glb` va to'liq rasm hajmi uchun Vercel limitini chetlab o'tish)
- [ ] BullMQ/Redis navbati va keshi (interfeyslar tayyor), WebSocket, PWA, `/biznes`

## Sifat (10–11-bosqich)

- [ ] Playwright e2e (uz va ru, 360 / 768 / 1280 px), axe tekshiruvi, Lighthouse (mobil)
- [ ] `docs/API.md`, `docs/DEPLOY.md` (mamlakat ichidagi hosting talabi, 13.17-band)
- [ ] Husky pre-commit tezlashtirish (faqat o'zgargan paketlarni tekshirish)
