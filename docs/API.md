# API (qisqacha)

Hamma yo'llar `/api` ostida, JSON. Xatolar: `{ "error": { "code": "ORDER_SLOT_TAKEN", "details"?: {...} } }`;
frontend kodni i18n orqali tarjima qiladi (`packages/shared/src/error-codes.ts`).
Himoyalangan yo'llar `Authorization: Bearer <accessToken>` talab qiladi.

| Metod va yo'l                                          | Kim         | Izoh                                                                                                        |
| ------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /health`                                          | hamma       |                                                                                                             |
| `POST /auth/request-code` `{phone}`                    | hamma       | SMS kod (5 daqiqa, 5 urinish, hash saqlanadi)                                                               |
| `POST /auth/verify` `{phone,code,name?}`               | hamma       | Foydalanuvchi birinchi marta avtomatik yaratiladi                                                           |
| `POST /auth/refresh`, `POST /auth/logout`              | cookie      | Refresh token aylantiriladi, qayta ishlatilsa hammasi bekor                                                 |
| `GET/PATCH /me`, `POST /me/worker`                     | kirgan      | Profil, hunarmand bo'lish                                                                                   |
| `GET /categories`                                      | hamma       | Keshlangan                                                                                                  |
| `GET /workers/featured`, `GET /workers/:id`            | hamma       |                                                                                                             |
| `GET /products?q&category&workerId&sort&page&pageSize` | hamma       | Faqat chop etilganlar, 5 ta so'rov (N+1 yo'q)                                                               |
| `GET /products/:id`                                    | hamma       | Qoralama faqat egasiga                                                                                      |
| `GET/POST /my/products`, `PUT/DELETE /my/products/:id` | hunarmand   | Faqat o'z mahsulotlari (aks holda 403)                                                                      |
| `PATCH /my/products/:id/stock`, `.../status`           | hunarmand   | Chop etish uchun kamida 1 rasm                                                                              |
| `POST /my/products/:id/images` (`image`)               | hunarmand   | ≤ 8 ta, JPEG/PNG/WebP → WebP, ≤ 5 MB                                                                        |
| `PUT/DELETE /my/products/:id/model` (`model`)          | hunarmand   | `.glb`, ≤ 10 MB, server validatsiyasi                                                                       |
| `POST /orders` `{items,fulfillment,deliveryAddress?}`  | kirgan      | Narx serverda; hunarmand bo'yicha alohida buyurtma                                                          |
| `GET /orders?as=customer\|worker`, `GET /orders/:id`   | tomonlar    | Telefon qabul qilingach ochiladi                                                                            |
| `POST /orders/:id/review` `{rating,comment?}`          | buyurtmachi | Faqat `delivered` dan keyin, bir marta (409 `REVIEW_ALREADY_EXISTS`); reyting shu tranzaksiyada yangilanadi |
| `POST /orders/:id/complaint` `{reason}`                | tomonlar    | Holati `open`; bir foydalanuvchida bitta ochiq shikoyat (409 `COMPLAINT_ALREADY_OPEN`)                      |
| `POST /orders/:id/actions` `{action}`                  | hunarmand   | accept, reject, start, ready, deliver                                                                       |
| `POST /orders/:id/payment`                             | buyurtmachi | To'lov sessiyasi (idempotent)                                                                               |
| `POST /orders/:id/payment/confirm`                     | buyurtmachi | Karta formasi; callback idempotent, zaxira shu yerda kamayadi                                               |
| `GET /earnings`                                        | hunarmand   | Oy va jami (komissiya ayirilgan), tarix                                                                     |
| `GET /files/:name`                                     | hamma       | Rasm (`image/webp`) va 3D (`model/gltf-binary`), immutable kesh                                             |
