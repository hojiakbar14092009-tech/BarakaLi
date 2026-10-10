# TODO (MVP'dan keyin)

Bu ro'yxat `CLAUDE.md` dagi bosqichlardan MVP'ga kirmagan qismlarni o'z ichiga oladi.

## 8-bosqich: frontend qoldig'i

- [x] Hunarmand kalendar sahifasi (boʻsh vaqt, band vaqtlar, soatlik narx)
- [x] Buyurtma sahifasida xizmat tafsilotlari (vaqt, tavsif, muddat, rasmlar), toʻlov muddati va bekor/qaytarilgan eslatmalari
- [x] 360 / 768 / 1280 px da gorizontal scroll va 48 px tekshiruvi (Playwright)

## 5-bosqich: kalendar va xizmat buyurtmalari

- [x] `availability` jadvali, boʻsh vaqt belgilash (Ertalab / Tushlik / Kechqurun tez tugmalari)
- [x] `/hunarmand/kalendar`, `/buyurtma/yangi` (tavsif, muddat, ≤5 rasm, slot tanlash)
- [x] `orders` uchun exclusion constraint (`btree_gist`, 13.3-band) va uning testi
- [x] Toʻlanmagan buyurtmani 15 daqiqada bekor qiluvchi navbat vazifasi (13.10)
- [x] 24 soatda qabul qilinmagan buyurtmani avtomatik qaytarish (13.11, shu bosqichda)

## 9-bosqich: admin, sharh, shikoyat, materiallar, jamg'arma, darslar

- [ ] `/admin`: hunarmandlarni tasdiqlash, buyurtmalar, sharh moderatsiyasi, statistika
- [x] `reviews` va `complaints`: yozish API'si va buyurtma sahifasidagi forma/tugma (tayyor)
- [ ] Sharhni yashirish (`hidden`, reytingni qayta hisoblash) va shikoyatlarni ko'rib chiqish: admin paneli bilan birga
- [ ] Hunarmand profilida sharhlar ro'yxati (hozir faqat umumiy reyting ko'rinadi)
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
- [ ] `docs/API.md` ni to'liq sxemalar bilan kengaytirish; `docs/DEPLOY.md` ga mamlakat ichidagi hosting variantini yozish (13.17-band)
- [ ] Husky pre-commit tezlashtirish (faqat o'zgargan paketlarni tekshirish)
