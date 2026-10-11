# Vercel'ga joylash

Bitta Vercel loyihasi ham veb-ilovani (statik), ham API'ni (`api/index.js` serverless funksiya) beradi,
shuning uchun CORS va cookie muammolari yo'q (hammasi bir domen).

## 1. PostgreSQL

Vercel loyihasida **Storage → Create Database → Neon (Postgres)** ni tanlang. Integratsiya `DATABASE_URL`
(va `POSTGRES_URL`) o'zgaruvchisini avtomatik qo'shadi. Boshqa PostgreSQL ham mos keladi
(`DATABASE_URL=postgres://...`). Jadvallarni qo'lda yaratish shart emas: birinchi so'rovda migratsiya o'zi ishlaydi.

## 2. Loyihani ulash

1. Vercel → **Add New → Project** → GitHub'dagi `hojiakbar14092009-tech/BarakaLi` ni tanlang.
2. Framework Preset: **Other**. Build/Install/Output buyruqlari `vercel.json` dan olinadi, o'zgartirmang.
3. Environment Variables:

   | Nom                  | Qiymat                                                                  |
   | -------------------- | ----------------------------------------------------------------------- |
   | `JWT_ACCESS_SECRET`  | tasodifiy 32+ belgi (`openssl rand -base64 48`)                         |
   | `JWT_REFRESH_SECRET` | boshqa tasodifiy 32+ belgi                                              |
   | `SEED_SAMPLE_DATA`   | `true` (birinchi ochilishda namuna hunarmand va mahsulotlar qo'shiladi) |
   | `ADMIN_PHONES`       | ixtiyoriy: `+998901234567`                                              |

   `DATABASE_URL` Neon integratsiyasidan keladi. `NODE_ENV` ni Vercel o'zi `production` qiladi.

4. **Deploy**. Birinchi so'rov (masalan bosh sahifa ochilishi) migratsiya va namuna ma'lumotlarni yaratadi,
   shuning uchun u 3–5 soniya sekinroq bo'lishi mumkin.

## 3. Admin sifatida kirish

Navbardagi **Kirish → Admin** (`/admin-kirish`) sahifasida `ADMIN_PHONES` dagi raqamni kiriting: SMS kod
yo'q, darhol `/admin` ga o'tasiz. Ro'yxatda bo'lmagan raqamga sessiya berilmaydi. `EXPOSE_SMS_CODE`
o'zgaruvchisi endi ishlatilmaydi: Vercel'da qolsa ham zarari yo'q.

## 4. Tekshiruv

- `https://<loyiha>.vercel.app/api/health` → `{"status":"ok"}`
- Bosh sahifada 4 ta hunarmand ko'rinishi kerak (`SEED_SAMPLE_DATA=true` bo'lsa).
- `/kirish`: raqam kiriting, kod ekranda chiqadi.

## Ma'lum cheklovlar

- Funksiya so'rov tanasi 4,5 MB bilan cheklangan (Vercel). Rasmlar brauzerda kichraytirilib yuboriladi;
  `.glb` fayl amalda 4,5 MB gacha. S3-mos `StorageProvider` (to'g'ridan-to'g'ri yuklash) TODO'da.
- Rate limit xotirada (har instansiya alohida); SMS kodi so'rovlari esa DB orqali ham cheklanadi.
- Maxfiylik: shaxsiy ma'lumotlarni mamlakat ichidagi serverda saqlash talab qilinishi mumkin (quyida).
- Migratsiya `btree_gist` va `pg_trgm` kengaytmalarini yaratadi: ma'lumotlar bazasi foydalanuvchisiga
  `CREATE EXTENSION` ruxsati kerak (Neon, Supabase va oddiy PostgreSQL 13+ da mavjud).

## Mamlakat ichidagi hosting (13.17-band)

Kod konkret provayderga bog'lanmagan: faqat `DATABASE_URL` (PostgreSQL 13+) va Node.js 20+ kerak.
Shaxsiy ma'lumotlar mamlakat ichida turishi shart bo'lsa:

1. Mamlakat ichidagi VPS yoki PaaS'da PostgreSQL 13+ ni ishga tushiring (`btree_gist`, `pg_trgm` yoqilgan).
2. Shu serverda: `pnpm install --frozen-lockfile`, `pnpm --filter @barakali/web build`, so'ng
   `pnpm --filter @barakali/api start` (API va migratsiya; `DATABASE_URL`, JWT sirlari, `ALLOWED_ORIGINS`).
3. `apps/web/dist` papkasini Nginx/Caddy orqali bering va `/api` ni API portiga (3001) yo'naltiring.
   Bu rejimda `JobQueue` doimiy ishlaydi (to'lanmagan buyurtmalarni bekor qilish va qaytarish).
4. Fayllar hozircha bazada saqlanadi (`StorageProvider`), shuning uchun alohida obyekt ombori kerak emas.
