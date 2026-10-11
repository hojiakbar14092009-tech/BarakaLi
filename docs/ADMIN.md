# Administrator qoʻllanmasi

Qisqa yoʻriqnoma: BarakaLi boshqaruv paneli (`/admin`) bilan ishlash.

## Kirish

- Administrator roli faqat `ADMIN_PHONES` muhit oʻzgaruvchisidan keladi: vergul bilan ajratilgan
  `+998XXXXXXXXX` raqamlar. Qiymatni hosting muhitida (masalan, Vercel) egasi oʻzi qoʻyadi, u
  repozitoriyga yozilmaydi.
- Navbardagi **Kirish** → **Admin** → `/admin-kirish`. Shu raqamni kiriting: `EXPOSE_SMS_CODE=true`
  boʻlsa kod shu sahifada chiqadi (SMS yuborilmaydi); kodni tasdiqlang va `/admin` ga oʻtasiz.
  Roʻyxatda boʻlmagan raqamga kod berilmaydi ("Bu raqam admin emas"); roʻyxat boʻsh boʻlsa sahifa
  "Admin kirish sozlanmagan" deydi. `/kirish` sahifasi admin kodini hech qachon koʻrsatmaydi.
- Roʻyxatdan chiqarilgan raqam keyingi kirishda oddiy foydalanuvchiga qaytadi.
- Oddiy foydalanuvchi `/admin` ga kirsa 403 sahifasi va "Bosh sahifaga qaytish" tugmasi chiqadi.
  Haqiqiy himoya serverda: har `/api/admin/*` soʻrovi rolni tekshiradi.
- **Sinov rejimi.** Ommaviy ishga tushirishdan oldin `EXPOSE_SMS_CODE=false` va real SMS provayder
  ulanishi shart: hozir admin raqamini bilgan har kim kira oladi. SMS provayder hali ulanmagan (TODO.md).

## Hunarmandni tasdiqlash

1. **Hunarmandlar** boʻlimida "Kutilmoqda" filtri ochiq turadi, eng eski ariza birinchi.
2. Ism yoki telefonning oxirgi 4 raqami bilan qidiring; ism ustiga bosib tafsilotni oching
   (Telegram, mahsulotlar soni, ariza sanasi).
3. **Tasdiqlash** — dialogda hunarmand nomi koʻrsatiladi; tasdiqlangach u katalogda koʻrinadi va
   buyurtma qabul qila oladi, unga bildirishnoma boradi.
4. Tasdiqlangunga qadar hunarmand katalogda, tavsiyada va profilda koʻrinmaydi, buyurtma qabul qila
   olmaydi. "Tasdiqlangan" belgisi faqat `approved` holatda chiqadi.

## Rad etish va toʻxtatish

- **Rad etish**: sabab majburiy (kamida 10 belgi), hunarmandga koʻrsatiladi.
- **Toʻxtatish** (tasdiqlangan hunarmand uchun): sabab majburiy. Katalogdan yashiriladi, yangi buyurtma
  qabul qilmaydi; mavjud buyurtmalar tugaguncha ishlaydi.
- Rad etilgan yoki toʻxtatilgan hunarmandni **Tasdiqlash** bilan qayta faollashtirish mumkin.

## Mahsulotni yashirish

**Mahsulotlar** boʻlimida qidiring (nom, hunarmand, toifa, holat). **Yashirish** mahsulotni katalogdan
oladi, **Koʻrsatish** qaytaradi (kamida bitta rasm kerak). **Oʻchirish** yumshoq: buyurtmasi boʻlmagan
mahsulot katalogdan va hunarmand roʻyxatidan yoʻqoladi; buyurtmada uchragan mahsulotni faqat yashirish
mumkin.

## Buyurtma holati va pulni qaytarish

- **Buyurtmalar** → buyurtmani oching: tomonlar, tarkib, toʻlov va keyingi ruxsat etilgan holatlar
  koʻrinadi. Holat faqat `yangi → qabul qilingan → bajarilmoqda → tayyor → topshirildi` tartibida
  (yoki `bekor qilingan`) oʻzgaradi; boshqa oʻtish rad etiladi.
- **Pulni qaytarish**: toʻlangan va hali topshirilmagan buyurtma uchun. Bitta amalda toʻlov qaytariladi,
  zaxira tiklanadi, `refunds` jurnaliga yoziladi (komissiya yozilgan boʻlsa teskari yoziladi) va
  buyurtma yopiladi. Summa toʻlovdan olinadi.

## Foydalanuvchilar, sharhlar, shikoyatlar

- **Bloklash** (sabab bilan): foydalanuvchi kira olmaydi, ochiq sessiyalari yopiladi. Oʻzingizni va
  oxirgi administratorni bloklab boʻlmaydi.
- **Sharhni yashirish** sabab bilan; reyting qayta hisoblanadi.
- **Shikoyat**: Yangi → Koʻrib chiqilmoqda → Hal qilindi / Rad etildi, izoh qoldirish mumkin.

## Xizmat turlari va sozlamalar

- **Xizmat turlari**: nomlarni (uz/ru) tahrirlash, toifani yoqish/oʻchirish. Oʻchirilganda mavjud
  mahsulotlar saqlanadi, yangisi qoʻshilmaydi.
- **Sozlamalar**: "Hunarmand arizalarini qabul qilish" va bosh sahifa eʼloni (uz/ru). Komissiya (2%)
  faqat koʻrsatiladi; uni panel orqali oʻzgartirib boʻlmaydi.

## Audit jurnali

**Audit jurnali** har administrator amalini koʻrsatadi: kim, nima, qachon va (boʻlsa) sabab. Telefon
raqamlari, SMS kodlari va tokenlar jurnalga yozilmaydi.

## Materiallar: yetkazib berish

1. Hunarmand material buyurtmasini manzil bilan beradi va toʻlaydi. Toʻlov tasdiqlangan zahoti har bir
   administratorga xabar boradi: **Materiallar** boʻlimi yonida son chiqadi, buyurtma "Yangi" belgisi bilan
   roʻyxat boshida turadi.
2. Kartochkada hunarmandning telefoni (bosilsa qoʻngʻiroq) va manzil bor: yetkazib beruvchi shu raqam
   orqali hunarmand bilan bogʻlanadi.
3. Materiallarni tayyorlab, **Yoʻlga chiqarish** ni bosing, yetkazib beruvchining ismi va telefonini
   kiriting. Hunarmandga "Buyurtmangiz yoʻlga chiqdi" xabari boradi, u yetkazib beruvchining ismi va
   raqamini koʻradi (bosilsa qoʻngʻiroq).
4. Topshirilgach **Topshirildi** ni bosing. Holatlar faqat shu tartibda: toʻlangan → yoʻlda → yetkazildi.
   Audit jurnaliga faqat yetkazib beruvchining ismi yoziladi, telefon raqami yozilmaydi.
