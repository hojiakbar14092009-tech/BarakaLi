# API

Barcha yo'llar `/api` ostida, JSON qabul qiladi va qaytaradi (rasm/model yuklash: `multipart/form-data`).
Sxemalar `packages/shared/src/schemas.ts` (so'rov, zod) va `packages/shared/src/types.ts` (javob) da —
quyidagi tavsif ularning aynan nusxasi. Pul — butun so'm. Vaqt — ISO 8601 (UTC), UI'da `Asia/Tashkent`.

## Umumiy qoidalar

**Autentifikatsiya.** `Authorization: Bearer <accessToken>` (15 daqiqa). Refresh token — `httpOnly`,
`SameSite=Strict`, productionda `Secure` cookie (`/api/auth` yo'lida), har ishlatilganda aylantiriladi;
eski token qayta ishlatilsa foydalanuvchining hamma tokenlari bekor qilinadi.

**Rollar.** `customer`, `worker`, `admin`. Jadvaldagi "Kim" ustuni:
`hamma` — kirish shart emas; `kirgan` — istalgan foydalanuvchi; `hunarmand` — hunarmand profili bor
(aks holda 403 `WORKER_REQUIRED`); `admin` — faqat `ADMIN_PHONES` dagi raqamlar (aks holda 403 `FORBIDDEN`).
Egalik har so'rovda serverda tekshiriladi; begona resurs uchun 404 (id'larni sinab ko'rib bo'lmasligi uchun).

**Xatolar.**

```jsonc
{ "error": { "code": "ORDER_SLOT_TAKEN", "details": { "startTime": ["..."] } } } // details faqat VALIDATION_ERROR da
```

Kodlar ro'yxati: `packages/shared/src/error-codes.ts`; frontend har birini i18n (uz/ru) orqali tarjima qiladi.
Holat kodlari: 400 validatsiya, 401 `UNAUTHENTICATED`, 402 `PAYMENT_DECLINED`, 403 `FORBIDDEN`/`WORKER_REQUIRED`,
404 `NOT_FOUND`, 409 holat to'qnashuvi, 413 fayl katta, 429 `RATE_LIMITED`, 500 `INTERNAL_ERROR`.

**Sahifalash.** `Page<T> = { items: T[]; page: number; pageSize: number; total: number }`.

**Cheklovlar.** Umumiy: 600 so'rov / 15 daqiqa / IP; kirish: 30; SMS kod: 8 (telefon + IP).
Yozuvchi so'rovlarda `Origin` boshqa domendan bo'lsa 403.

## Kirish

| Yo'l                      | Kim    | So'rov                                                                 | Javob                                      |
| ------------------------- | ------ | ---------------------------------------------------------------------- | ------------------------------------------ |
| `POST /auth/request-code` | hamma  | `{ phone }` — `+998XXXXXXXXX`, `90 123 45 67` kabi variantlar          | `{ expiresInSeconds, code? }` ¹            |
| `POST /auth/verify`       | hamma  | `{ phone, code (6 raqam), role?: 'customer'\|'worker', name? (2–80) }` | `AuthResponse`, refresh cookie o'rnatiladi |
| `POST /auth/refresh`      | cookie | —                                                                      | `AuthResponse`, yangi refresh cookie       |
| `POST /auth/logout`       | cookie | —                                                                      | 204                                        |
| `GET /me`                 | kirgan | —                                                                      | `UserDto`                                  |
| `PATCH /me`               | kirgan | `{ name (2–80), language?: 'uz'\|'ru' }`                               | `UserDto`                                  |
| `POST /me/worker`         | kirgan | `{ displayName (2–80), categoryId (uuid), bio? (≤2000) }`              | 201 `UserDto` (`workerId` to'ldirilgan)    |

¹ `code` faqat `EXPOSE_SMS_CODE=true` bo'lsa va raqam `ADMIN_PHONES` da bo'lmasa qaytadi. Kod 5 daqiqa
amal qiladi, 5 noto'g'ri urinishdan keyin bloklanadi, bazada hash holida saqlanadi.

```ts
interface AuthResponse {
  accessToken: string;
  user: UserDto;
}
interface UserDto {
  id: string;
  phone: string;
  name: string | null;
  role: 'customer' | 'worker' | 'admin';
  language: 'uz' | 'ru';
  workerId: string | null;
}
```

## Katalog (ommaviy)

| Yo'l                                                   | Javob                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `GET /categories`                                      | `CategoryDto[]` (keshlangan)                                |
| `GET /workers/featured`                                | `WorkerSummaryDto[]` (3–4 ta, keshlangan)                   |
| `GET /workers/:id`                                     | `WorkerSummaryDto`                                          |
| `GET /workers/:id/reviews?page`                        | `Page<PublicReviewDto>` (faqat `visible`, 10 tadan)         |
| `GET /workers/:id/availability`                        | `AvailabilityDto`                                           |
| `GET /products?q&category&workerId&sort&page&pageSize` | `Page<ProductDto>` (faqat chop etilganlar)                  |
| `GET /products/:id`                                    | `ProductDto` (qoralama faqat egasiga)                       |
| `GET /files/:name`                                     | bayt: `image/webp` yoki `model/gltf-binary`, immutable kesh |

`sort`: `new` \| `price_asc` \| `price_desc`; `pageSize` ≤ 20 (standart 12); `q` ≤ 100 (apostrof variantlari
`' ʻ ʼ ’` bir xil qidiriladi).

```ts
interface CategoryDto {
  id: string;
  slug: string;
  name: { uz: string; ru: string };
}
interface WorkerSummaryDto {
  id: string;
  displayName: string;
  bio: string | null;
  categorySlug: string;
  avatarUrl: string | null;
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  hourlyRate: number | null; // xizmat buyurtmasi narxi (soatiga), null — xizmat qabul qilinmaydi
  minPrice: number | null;
  productsCount: number;
}
interface ProductDto {
  id: string;
  worker: { id: string; displayName: string; isVerified: boolean };
  categorySlug: string;
  categoryId: string;
  title: string;
  description: string;
  retailPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
  stock: number;
  status: 'draft' | 'published' | 'hidden';
  images: { id: string; url: string; position: number }[];
  model: { fileUrl: string; fileSize: number; posterUrl: string | null } | null;
  createdAt: string;
}
interface PublicReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string | null;
  createdAt: string;
}
interface AvailabilityDto {
  windows: { id: string; startTime: string; endTime: string }[]; // bo'sh oraliqlar (kelajak, 60 kungacha)
  booked: { startTime: string; endTime: string }[]; // ular ichidagi band soatlar (mijoz ma'lumotisiz)
}
```

## Hunarmand: mahsulotlar

Hammasi `hunarmand`; faqat o'z mahsuloti (aks holda 404).

| Yo'l                                      | So'rov                        | Javob                                      |
| ----------------------------------------- | ----------------------------- | ------------------------------------------ |
| `GET /my/products`                        | —                             | `ProductDto[]`                             |
| `POST /my/products`                       | `ProductInput`                | 201 `ProductDto` (har doim qoralama)       |
| `PUT /my/products/:id`                    | `ProductInput`                | `ProductDto`                               |
| `PATCH /my/products/:id/stock`            | `{ stock: 0..10000 }`         | `ProductDto`                               |
| `PATCH /my/products/:id/status`           | `{ status }`                  | `ProductDto` (chop etish uchun ≥ 1 rasm)   |
| `DELETE /my/products/:id`                 | —                             | 204                                        |
| `POST /my/products/:id/images`            | `multipart`: `image`          | 201 `ProductDto` (≤ 8 ta, ≤ 5 MB, WebP)    |
| `DELETE /my/products/:id/images/:imageId` | —                             | `ProductDto`                               |
| `PUT /my/products/:id/model`              | `multipart`: `model` (`.glb`) | `ProductDto` (≤ 10 MB, server validatsiya) |
| `DELETE /my/products/:id/model`           | —                             | `ProductDto`                               |

```ts
interface ProductInput {
  title: string; // 2–120
  description?: string; // ≤ 2000, standart ''
  categoryId: string; // uuid
  retailPrice: number; // butun, 1..1_000_000_000
  wholesalePrice?: number | null; // retailPrice dan past; wholesaleMinQty bilan birga
  wholesaleMinQty?: number | null; // 2..10000
  stock: number; // 0..10000
  status?: 'draft' | 'published' | 'hidden';
}
```

Model validatsiyasi: GLB magic bytes, glTF 2.0, tashqi URI yo'q, tekstura ≤ 2048×2048, ≤ 200 000 uchburchak,
faqat ruxsat etilgan kengaytmalar. Xato kodlari: `MODEL_TOO_LARGE`, `MODEL_INVALID_FORMAT`,
`MODEL_INVALID_CONTENT`, `MODEL_LIMIT_EXCEEDED`; rasm: `IMAGE_TOO_LARGE`, `IMAGE_INVALID_FORMAT`,
`IMAGE_LIMIT_REACHED`.

## Hunarmand: kalendar va xizmat narxi

| Yo'l                          | So'rov                           | Javob                                              |
| ----------------------------- | -------------------------------- | -------------------------------------------------- |
| `GET /my/availability`        | —                                | `AvailabilityDto & { hourlyRate: number \| null }` |
| `POST /my/availability`       | `{ startTime, endTime }` (ISO)   | 201 `{ id, startTime, endTime }`                   |
| `DELETE /my/availability/:id` | —                                | 204 (mavjud buyurtmalarga ta'sir qilmaydi)         |
| `PUT /my/hourly-rate`         | `{ hourlyRate: number \| null }` | `{ hourlyRate }`                                   |

Oraliq kelajakda, ≤ 16 soat, ≤ 60 kun ichida bo'lishi shart (`AVAILABILITY_INVALID`); bir hunarmandning
oraliqlari kesishmaydi (409 `AVAILABILITY_OVERLAP`, DB exclusion constraint).

## Buyurtmalar

| Yo'l                               | Kim         | So'rov                                                        | Javob                                          |
| ---------------------------------- | ----------- | ------------------------------------------------------------- | ---------------------------------------------- |
| `POST /orders`                     | kirgan      | `CreateOrders` — mahsulotlar                                  | 201 `OrderDto[]` (hunarmand bo'yicha bittadan) |
| `POST /orders/service`             | kirgan      | `CreateServiceOrder` — xizmat                                 | 201 `OrderDto`                                 |
| `POST /uploads/order-image`        | kirgan      | `multipart`: `image` (≤ 5 MB)                                 | 201 `{ url }`                                  |
| `GET /orders?as=customer\|worker`  | tomonlar    | —                                                             | `OrderDto[]` (50 tagacha)                      |
| `GET /orders/:id`                  | tomonlar    | —                                                             | `OrderDto`                                     |
| `POST /orders/:id/actions`         | hunarmand   | `{ action: 'accept'\|'reject'\|'start'\|'ready'\|'deliver' }` | `OrderDto`                                     |
| `POST /orders/:id/payment`         | buyurtmachi | —                                                             | `PaymentSessionDto` (idempotent)               |
| `POST /orders/:id/payment/confirm` | buyurtmachi | `{ cardNumber (16), expiry 'MM/YY', cvc (3) }`                | `OrderDto`                                     |
| `POST /orders/:id/review`          | buyurtmachi | `{ rating: 1..5, comment?: ≤1000 }`                           | 201 `ReviewDto`                                |
| `POST /orders/:id/complaint`       | tomonlar    | `{ reason: 5..1000 }`                                         | 201 `ComplaintDto`                             |
| `GET /earnings`                    | hunarmand   | —                                                             | `EarningsDto`                                  |

```ts
interface CreateOrders {
  items: { productId: string; quantity: number }[]; // 1..30 qator, miqdor 1..10000
  fulfillment: 'pickup' | 'delivery';
  deliveryAddress?: string; // delivery bo'lsa majburiy, ≤ 300
}
interface CreateServiceOrder {
  workerId: string; // uuid
  description: string; // 2..1000
  deadline?: string | null; // 'YYYY-MM-DD'
  startTime: string; // ISO; hunarmandning bo'sh oralig'i ichida, kelajakda
  hours: number; // 1..8
  imageUrls?: string[]; // ≤ 5, faqat /api/uploads/order-image qaytargan havolalar
}
interface OrderDto {
  id: string;
  type: 'service' | 'product';
  status:
    | 'awaiting_payment'
    | 'new'
    | 'accepted'
    | 'in_progress'
    | 'ready'
    | 'delivered'
    | 'cancelled'
    | 'refunded';
  viewerRole: 'customer' | 'worker';
  total: number;
  commission: number;
  workerAmount: number; // commission = round(total × 5%)
  fulfillment: 'pickup' | 'delivery';
  deliveryAddress: string | null;
  items: {
    id: string;
    productId: string | null;
    title: string;
    unitPrice: number;
    quantity: number;
    priceType: 'retail' | 'wholesale';
  }[];
  counterpart: { name: string | null; phone: string | null }; // phone: accepted/in_progress/ready/delivered da
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed' | null;
  review: ReviewDto | null;
  complaint: ComplaintDto | null;
  startTime: string | null;
  endTime: string | null; // faqat xizmat
  description: string | null;
  deadline: string | null;
  images: string[];
  createdAt: string;
}
interface PaymentSessionDto {
  paymentId: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  redirectUrl: string;
}
interface ReviewDto {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  status: 'visible' | 'hidden';
  createdAt: string;
}
interface ComplaintDto {
  id: string;
  orderId: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}
interface EarningsDto {
  monthTotal: number;
  allTimeTotal: number;
  history: { orderId: string; amount: number; commission: number; createdAt: string }[];
}
```

**Holatlar jadvali** (`packages/shared/src/order-status.ts`, boshqa o'tish 409 `ORDER_INVALID_TRANSITION`):
`awaiting_payment → new | cancelled`, `new → accepted | refunded`, `accepted → in_progress | refunded`,
`in_progress → ready | refunded`, `ready → delivered | refunded`. Hunarmand `reject` faqat `new` dan;
qolgan `→ refunded` o'tishlari faqat admin qaytarishi orqali.

**Narx va to'lov.** Narx faqat serverda: `quantity ≥ wholesaleMinQty` bo'lsa ulgurji narx. Zaxira
to'lov tasdiqlanganda `UPDATE … WHERE stock >= qty` bilan kamayadi (409 `INSUFFICIENT_STOCK`).
`payment/confirm` idempotent: takroriy chaqiruv qayta hisoblamaydi. Karta ma'lumotlari saqlanmaydi va
loglanmaydi. To'lanmagan buyurtma 15 daqiqada `cancelled`; hunarmand 24 soatda qabul qilmasa — avtomatik
qaytarish (`refunded`).

**Xizmat buyurtmasi xatolari.** `ORDER_SLOT_TAKEN` (409, DB constraint), `SLOT_OUTSIDE_AVAILABILITY` (409),
`SLOT_IN_PAST` (400), `SERVICE_RATE_MISSING` (400), `OWN_SERVICE` (400), `ORDER_IMAGE_INVALID` (400).

## Hunarmand: materiallar va jamg'arma

| Yo'l                                        | So'rov                                          | Javob                              |
| ------------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| `GET /materials`                            | —                                               | `MaterialDto[]` (faqat faol)       |
| `POST /material-orders`                     | `{ items: { materialId, quantity }[] }` (1..30) | 201 `MaterialOrderDto`             |
| `GET /material-orders`                      | —                                               | `MaterialOrderDto[]` (30 tagacha)  |
| `GET /material-orders/:id`                  | —                                               | `MaterialOrderDto`                 |
| `POST /material-orders/:id/payment`         | —                                               | `PaymentSessionDto`                |
| `POST /material-orders/:id/payment/confirm` | karta (yuqoridagi kabi)                         | `MaterialOrderDto`                 |
| `GET /my/savings-goal`                      | —                                               | `{ goal: SavingsGoalDto \| null }` |
| `PUT /my/savings-goal`                      | `{ targetAmount: 1..1_000_000_000 }`            | `{ goal: SavingsGoalDto }`         |
| `DELETE /my/savings-goal`                   | —                                               | 204                                |

```ts
interface MaterialDto {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercent: number; // 0..90
  unitPrice: number; // chegirmadan keyingi narx (≥ 1)
  stock: number;
  isActive: boolean;
}
interface MaterialOrderDto {
  id: string;
  status: 'awaiting_payment' | 'paid' | 'delivered' | 'cancelled';
  total: number; // komissiyasiz
  items: {
    id: string;
    materialId: string | null;
    name: string;
    unitPrice: number;
    quantity: number;
  }[];
  createdAt: string;
}
interface SavingsGoalDto {
  targetAmount: number;
  saved: number;
  createdAt: string;
} // saved: maqsad qo'yilgandan beri daromad
```

Xatolar: `MATERIAL_UNAVAILABLE` (404/409), `INSUFFICIENT_STOCK` (409), `MATERIAL_ORDER_NOT_PAYABLE` (409),
`PAYMENT_DECLINED` (402).

## Admin (`/admin/*`, faqat `admin`)

Ro'yxatlar `?page` (20 tadan) va `?status` qabul qiladi.

| Yo'l                                                | So'rov                                | Javob / ta'siri                                                                             |
| --------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /admin/stats`                                  | —                                     | `AdminStatsDto`                                                                             |
| `GET /admin/workers?status=pending\|verified`       | —                                     | `Page<AdminWorkerDto>` (telefon bilan)                                                      |
| `PATCH /admin/workers/:id/verification`             | `{ verified: boolean }`               | 204                                                                                         |
| `GET /admin/orders?status`                          | —                                     | `Page<AdminOrderDto>`                                                                       |
| `POST /admin/orders/:id/refund`                     | —                                     | 204; faqat to'langan `new/accepted/in_progress/ready`, aks holda 409 `ORDER_NOT_REFUNDABLE` |
| `GET /admin/reviews?status=visible\|hidden`         | —                                     | `Page<AdminReviewDto>`                                                                      |
| `PATCH /admin/reviews/:id`                          | `{ status: 'visible'\|'hidden' }`     | 204; hunarmand reytingi bir tranzaksiyada qayta hisoblanadi                                 |
| `GET /admin/complaints?status`                      | —                                     | `Page<AdminComplaintDto>`                                                                   |
| `PATCH /admin/complaints/:id`                       | `{ status: 'resolved'\|'dismissed' }` | 204; ochiq bo'lmasa 409 `COMPLAINT_NOT_OPEN`                                                |
| `GET /admin/materials`                              | —                                     | `MaterialDto[]` (yashirinlari ham)                                                          |
| `POST /admin/materials`, `PUT /admin/materials/:id` | `MaterialInput`                       | `MaterialDto`                                                                               |
| `GET /admin/material-orders`                        | —                                     | `(MaterialOrderDto & { workerName })[]` (toʻlanganlar)                                      |
| `POST /admin/material-orders/:id/deliver`           | —                                     | 204; faqat `paid` dan                                                                       |

```ts
interface MaterialInput {
  name: string /*2..120*/;
  description?: string;
  price: number;
  discountPercent?: number /*0..90*/;
  stock: number;
  isActive?: boolean;
}
interface AdminStatsDto {
  users: number;
  workers: number;
  verifiedWorkers: number;
  pendingWorkers: number;
  ordersByStatus: Record<string, number>;
  turnover: number;
  commission: number;
  openComplaints: number;
  hiddenReviews: number;
}
interface AdminWorkerDto {
  id: string;
  displayName: string;
  phone: string;
  categorySlug: string;
  isVerified: boolean;
  rating: number;
  reviewsCount: number;
  createdAt: string;
}
interface AdminOrderDto {
  id: string;
  type: 'service' | 'product';
  status: OrderStatus;
  total: number;
  commission: number;
  customerName: string | null;
  workerName: string;
  paymentStatus: PaymentStatus | null;
  createdAt: string;
}
interface AdminReviewDto {
  id: string;
  orderId: string;
  workerName: string;
  authorName: string | null;
  rating: number;
  comment: string | null;
  status: 'visible' | 'hidden';
  createdAt: string;
}
interface AdminComplaintDto {
  id: string;
  orderId: string;
  authorName: string | null;
  authorRole: 'customer' | 'worker';
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus | null;
  createdAt: string;
}
```

## Salomatlik

`GET /health` → `{ "status": "ok" }` (migratsiyani kutmaydi).
