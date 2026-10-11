/** Platform commission on completed orders. Kept as a whole percent so money maths stays in integers. */
export const COMMISSION_RATE_PERCENT = 2;
export const COMMISSION_RATE = COMMISSION_RATE_PERCENT / 100;

export const MAX_ORDER_IMAGES = 5;
export const MAX_PRODUCT_IMAGES = 5;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const MAX_MODEL_BYTES = 10 * 1024 * 1024;
export const MAX_MODEL_TEXTURE_SIZE = 2048;
export const MAX_MODEL_TRIANGLES = 200_000;
export const ALLOWED_MODEL_EXTENSIONS = [
  'KHR_materials_',
  'KHR_texture_transform',
  'KHR_draco_mesh_compression',
  'EXT_meshopt_compression',
] as const;
export const MODEL_MIME_TYPE = 'model/gltf-binary';

export const USER_ROLES = ['customer', 'worker', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const WORKER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type WorkerStatus = (typeof WORKER_STATUSES)[number];
export const MIN_REJECT_REASON_LENGTH = 10;
export const MAX_REJECT_REASON_LENGTH = 500;

export const PRODUCT_STATUSES = ['draft', 'published', 'hidden'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRICE_TYPES = ['retail', 'wholesale'] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const ORDER_TYPES = ['service', 'product'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const FULFILLMENT_TYPES = ['pickup', 'delivery'] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const CATEGORY_SLUGS = ['tikuvchilik', 'pishiriq', 'qol-mehnati', 'dizayn'] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
export const ALL_CATEGORIES_SLUG = 'barchasi';

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 20;

export const PHONE_COUNTRY_PREFIX = '+998';
export const SMS_CODE_LENGTH = 6;
export const SMS_CODE_TTL_MINUTES = 5;
export const SMS_MAX_ATTEMPTS = 5;

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;

export const UNPAID_ORDER_TTL_MINUTES = 15;
export const WORKER_ACCEPT_TTL_HOURS = 24;

export const REVIEW_STATUSES = ['visible', 'hidden'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export const MIN_REVIEW_RATING = 1;
export const MAX_REVIEW_RATING = 5;
export const MAX_REVIEW_COMMENT_LENGTH = 1000;

export const COMPLAINT_STATUSES = ['open', 'in_review', 'resolved', 'dismissed'] as const;
export const MAX_ADMIN_NOTE_LENGTH = 1000;
export const MAX_ANNOUNCEMENT_LENGTH = 300;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
export const MIN_COMPLAINT_REASON_LENGTH = 5;
export const MAX_COMPLAINT_REASON_LENGTH = 1000;

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 80;
export const MIN_TELEGRAM_USERNAME_LENGTH = 5;
export const MAX_TELEGRAM_USERNAME_LENGTH = 32;
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_ADDRESS_LENGTH = 300;
/** A materials delivery address needs at least a street and a house to be findable. */
export const MIN_ADDRESS_LENGTH = 5;
export const MAX_CART_ITEMS = 30;
export const MAX_ITEM_QUANTITY = 10_000;
export const MAX_PRICE_SOM = 1_000_000_000;

export const TASHKENT_UTC_OFFSET_HOURS = 5;
export const MAX_SERVICE_HOURS = 8;
export const MAX_AVAILABILITY_HOURS = 16;
export const AVAILABILITY_HORIZON_DAYS = 60;
export const MAX_ORDER_DESCRIPTION_LENGTH = 1000;

/** Quick availability buttons: local (Asia/Tashkent) start and end hour of the window. */
export const QUICK_SLOTS = {
  morning: { start: 8, end: 12 },
  noon: { start: 12, end: 15 },
  evening: { start: 17, end: 21 },
} as const;
export type QuickSlot = keyof typeof QUICK_SLOTS;

export const MATERIAL_ORDER_STATUSES = [
  'awaiting_payment',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type MaterialOrderStatus = (typeof MATERIAL_ORDER_STATUSES)[number];
export const MAX_DISCOUNT_PERCENT = 90;
export const MAX_MATERIAL_NAME_LENGTH = 120;
export const ADMIN_PAGE_SIZE = 20;
export const REVIEWS_PAGE_SIZE = 10;
