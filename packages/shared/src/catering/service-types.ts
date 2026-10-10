export interface CateringServiceType {
  id: string;
  slug: string;
  title_uz: string;
  title_ru: string;
  description_uz: string;
  description_ru: string;
  /** lucide-react icon name; the web app maps it to the component. */
  icon: 'Scissors' | 'CakeSlice' | 'Flower2' | 'PenTool';
  /** File name (without extension) under apps/web/public/catering/. */
  imageKey: string;
}

export const CATERING_SERVICE_TYPES = [
  {
    id: 'tikuvchilik',
    slug: 'tikuvchilik',
    title_uz: 'Tikuvchilik',
    title_ru: 'Шитьё',
    description_uz:
      'Dasturxon, salfetka va bezak matolarini tadbiringiz uslubiga moslab tikib beramiz.',
    description_ru: 'Сошьём скатерти, салфетки и декоративный текстиль в стиле вашего мероприятия.',
    icon: 'Scissors',
    imageKey: 'tikuvchilik',
  },
  {
    id: 'pishiriq',
    slug: 'pishiriq',
    title_uz: 'Pishiriq va tort',
    title_ru: 'Выпечка и торты',
    description_uz: 'Uyda pishirilgan tort, shirinlik va pishiriqlar mehmonlar soniga qarab.',
    description_ru: 'Домашние торты, сладости и выпечка с учётом числа гостей.',
    icon: 'CakeSlice',
    imageKey: 'pishiriq',
  },
  {
    id: 'qolmehnat',
    slug: 'qolmehnat',
    title_uz: 'Qoʻl mehnati',
    title_ru: 'Ручная работа',
    description_uz: 'Makrame, munchoq va qoʻlda yasalgan bezaklar bilan stol va zalni bezash.',
    description_ru: 'Макраме, бусины и украшения ручной работы для столов и зала.',
    icon: 'Flower2',
    imageKey: 'qolmehnat',
  },
  {
    id: 'dizayn',
    slug: 'dizayn',
    title_uz: 'Dizayn',
    title_ru: 'Дизайн',
    description_uz: 'Tadbir uchun rang, bezak va joylashuv gʻoyasini birga tanlaymiz.',
    description_ru: 'Вместе подберём цвета, декор и оформление пространства для события.',
    icon: 'PenTool',
    imageKey: 'dizayn',
  },
] as const satisfies readonly CateringServiceType[];

export const CATERING_OTHER_SERVICE_ID = 'boshqa';

/** Values the request form's select may send: the four types above plus "other". */
export const CATERING_SERVICE_IDS = [
  'tikuvchilik',
  'pishiriq',
  'qolmehnat',
  'dizayn',
  CATERING_OTHER_SERVICE_ID,
] as const;
export type CateringServiceId = (typeof CATERING_SERVICE_IDS)[number];

export const CATERING_REQUEST_STATUSES = ['new', 'contacted', 'closed'] as const;
export type CateringRequestStatus = (typeof CATERING_REQUEST_STATUSES)[number];
