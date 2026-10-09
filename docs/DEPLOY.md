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
   | `EXPOSE_SMS_CODE`    | `true` (SMS shlyuzi ulanmaguncha; real foydalanuvchilar uchun `false`)  |
   | `SEED_SAMPLE_DATA`   | `true` (birinchi ochilishda namuna hunarmand va mahsulotlar qo'shiladi) |
   | `ADMIN_PHONES`       | ixtiyoriy: `+998901234567`                                              |

   `DATABASE_URL` Neon integratsiyasidan keladi. `NODE_ENV` ni Vercel o'zi `production` qiladi.

4. **Deploy**. Birinchi so'rov (masalan bosh sahifa ochilishi) migratsiya va namuna ma'lumotlarni yaratadi,
   shuning uchun u 3–5 soniya sekinroq bo'lishi mumkin.

## 3. Tekshiruv

- `https://<loyiha>.vercel.app/api/health` → `{"status":"ok"}`
- Bosh sahifada 4 ta hunarmand ko'rinishi kerak (`SEED_SAMPLE_DATA=true` bo'lsa).
- `/kirish`: raqam kiriting, kod ekranda chiqadi.

## Ma'lum cheklovlar

- Funksiya so'rov tanasi 4,5 MB bilan cheklangan (Vercel). Rasmlar brauzerda kichraytirilib yuboriladi;
  `.glb` fayl amalda 4,5 MB gacha. S3-mos `StorageProvider` (to'g'ridan-to'g'ri yuklash) TODO'da.
- Rate limit xotirada (har instansiya alohida); SMS kodi so'rovlari esa DB orqali ham cheklanadi.
- Maxfiylik: shaxsiy ma'lumotlarni mamlakat ichidagi serverda saqlash talab qilinishi mumkin. Kod
  konkret provayderga bog'lanmagan (faqat `DATABASE_URL`), shuning uchun bazani boshqa hostingga ko'chirish mumkin.
