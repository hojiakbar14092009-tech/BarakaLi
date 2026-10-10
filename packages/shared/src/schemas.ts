import { z } from 'zod';
import {
  FULFILLMENT_TYPES,
  MAX_ADDRESS_LENGTH,
  MAX_CART_ITEMS,
  MAX_DESCRIPTION_LENGTH,
  MAX_ITEM_QUANTITY,
  MAX_NAME_LENGTH,
  MAX_COMPLAINT_REASON_LENGTH,
  MAX_PAGE_SIZE,
  MAX_REVIEW_COMMENT_LENGTH,
  MAX_REVIEW_RATING,
  MIN_COMPLAINT_REASON_LENGTH,
  MIN_REVIEW_RATING,
  MAX_PRICE_SOM,
  MAX_TITLE_LENGTH,
  MIN_NAME_LENGTH,
  PRODUCT_STATUSES,
  SMS_CODE_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_DISCOUNT_PERCENT,
  MAX_REJECT_REASON_LENGTH,
  MIN_REJECT_REASON_LENGTH,
  MAX_MATERIAL_NAME_LENGTH,
  MAX_ORDER_DESCRIPTION_LENGTH,
  MAX_ORDER_IMAGES,
  REVIEW_STATUSES,
  MAX_SERVICE_HOURS,
} from './constants.js';
import { normalizePhone } from './phone.js';

export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'INVALID_PHONE' });
      return z.NEVER;
    }
    return normalized;
  });

const nameSchema = z.string().trim().min(MIN_NAME_LENGTH).max(MAX_NAME_LENGTH);
const moneySchema = z.number().int().positive().max(MAX_PRICE_SOM);

export const requestCodeSchema = z.object({ phone: phoneSchema });
export type RequestCodeInput = z.infer<typeof requestCodeSchema>;

export const verifyCodeSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(new RegExp(`^\\d{${SMS_CODE_LENGTH}}$`), 'INVALID_CODE'),
  role: z.enum(['customer', 'worker']).optional(),
  name: nameSchema.optional(),
});
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

export const updateProfileSchema = z.object({
  name: nameSchema,
  language: z.enum(['uz', 'ru']).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const becomeWorkerSchema = z.object({
  displayName: nameSchema,
  categoryId: z.string().uuid(),
  bio: z.string().trim().max(MAX_DESCRIPTION_LENGTH).optional(),
});
export type BecomeWorkerInput = z.infer<typeof becomeWorkerSchema>;

export const productInputSchema = z
  .object({
    title: z.string().trim().min(MIN_NAME_LENGTH).max(MAX_TITLE_LENGTH),
    description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).default(''),
    categoryId: z.string().uuid(),
    retailPrice: moneySchema,
    wholesalePrice: moneySchema.nullable().default(null),
    wholesaleMinQty: z.number().int().min(2).max(MAX_ITEM_QUANTITY).nullable().default(null),
    stock: z.number().int().min(0).max(MAX_ITEM_QUANTITY),
    status: z.enum(PRODUCT_STATUSES).default('draft'),
  })
  .superRefine((value, ctx) => {
    const hasPrice = value.wholesalePrice !== null;
    const hasQty = value.wholesaleMinQty !== null;
    if (hasPrice !== hasQty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [hasPrice ? 'wholesaleMinQty' : 'wholesalePrice'],
        message: 'WHOLESALE_INCOMPLETE',
      });
    }
    if (value.wholesalePrice !== null && value.wholesalePrice >= value.retailPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wholesalePrice'],
        message: 'WHOLESALE_NOT_LOWER',
      });
    }
  });
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductInputRaw = z.input<typeof productInputSchema>;

export const stockUpdateSchema = z.object({
  stock: z.number().int().min(0).max(MAX_ITEM_QUANTITY),
});

export const productStatusSchema = z.object({ status: z.enum(PRODUCT_STATUSES) });

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const createOrdersSchema = z
  .object({
    items: z.array(cartItemSchema).min(1).max(MAX_CART_ITEMS),
    fulfillment: z.enum(FULFILLMENT_TYPES),
    deliveryAddress: z.string().trim().max(MAX_ADDRESS_LENGTH).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.fulfillment === 'delivery' && !value.deliveryAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deliveryAddress'],
        message: 'ADDRESS_REQUIRED',
      });
    }
  });
export type CreateOrdersInput = z.infer<typeof createOrdersSchema>;

export const cardPaymentSchema = z.object({
  cardNumber: z
    .string()
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{16}$/, 'INVALID_CARD')),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'INVALID_EXPIRY'),
  cvc: z.string().regex(/^\d{3}$/, 'INVALID_CVC'),
});
export type CardPaymentInput = z.infer<typeof cardPaymentSchema>;

export const reviewInputSchema = z.object({
  rating: z.number().int().min(MIN_REVIEW_RATING).max(MAX_REVIEW_RATING),
  comment: z.string().trim().max(MAX_REVIEW_COMMENT_LENGTH).optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const complaintInputSchema = z.object({
  reason: z.string().trim().min(MIN_COMPLAINT_REASON_LENGTH).max(MAX_COMPLAINT_REASON_LENGTH),
});
export type ComplaintInput = z.infer<typeof complaintInputSchema>;

const isoInstant = z.string().datetime({ offset: true });

export const availabilityInputSchema = z.object({
  startTime: isoInstant,
  endTime: isoInstant,
});
export type AvailabilityInput = z.infer<typeof availabilityInputSchema>;

export const createServiceOrderSchema = z.object({
  workerId: z.string().uuid(),
  description: z.string().trim().min(MIN_NAME_LENGTH).max(MAX_ORDER_DESCRIPTION_LENGTH),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'INVALID_DATE')
    .nullable()
    .default(null),
  startTime: isoInstant,
  hours: z.number().int().min(1).max(MAX_SERVICE_HOURS),
  imageUrls: z.array(z.string().max(300)).max(MAX_ORDER_IMAGES).default([]),
});
export type CreateServiceOrderInput = z.infer<typeof createServiceOrderSchema>;
export type CreateServiceOrderRaw = z.input<typeof createServiceOrderSchema>;

export const orderActionSchema = z.object({
  action: z.enum(['accept', 'reject', 'start', 'ready', 'deliver']),
});
export type OrderAction = z.infer<typeof orderActionSchema>['action'];

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  workerId: z.string().uuid().optional(),
  sort: z.enum(['new', 'price_asc', 'price_desc']).default('new'),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

/** Luhn check used by the platform's own payment form. */
export function isValidCardNumber(cardNumber: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = Number(cardNumber[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export const materialInputSchema = z.object({
  name: z.string().trim().min(MIN_NAME_LENGTH).max(MAX_MATERIAL_NAME_LENGTH),
  description: z.string().trim().max(MAX_DESCRIPTION_LENGTH).default(''),
  price: moneySchema,
  discountPercent: z.number().int().min(0).max(MAX_DISCOUNT_PERCENT).default(0),
  stock: z.number().int().min(0).max(MAX_ITEM_QUANTITY),
  isActive: z.boolean().default(true),
});
export type MaterialInput = z.infer<typeof materialInputSchema>;
export type MaterialInputRaw = z.input<typeof materialInputSchema>;

export const materialOrderSchema = z.object({
  items: z
    .array(
      z.object({
        materialId: z.string().uuid(),
        quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_CART_ITEMS),
});
export type MaterialOrderInput = z.infer<typeof materialOrderSchema>;

export const savingsGoalSchema = z.object({ targetAmount: moneySchema });
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;

export const workerRejectionSchema = z.object({
  reason: z.string().trim().min(MIN_REJECT_REASON_LENGTH).max(MAX_REJECT_REASON_LENGTH),
});
export const reviewModerationSchema = z.object({ status: z.enum(REVIEW_STATUSES) });
export const complaintResolutionSchema = z.object({ status: z.enum(['resolved', 'dismissed']) });

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  status: z.string().trim().max(30).optional(),
});
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
