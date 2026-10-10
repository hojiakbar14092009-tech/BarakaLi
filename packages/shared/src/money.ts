import { COMMISSION_RATE_PERCENT, type PriceType } from './constants.js';

export interface CommissionSplit {
  total: number;
  commission: number;
  workerAmount: number;
}

export function calculateCommission(total: number): number {
  return Math.round((total * COMMISSION_RATE_PERCENT) / 100);
}

export function splitOrderAmount(total: number): CommissionSplit {
  const commission = calculateCommission(total);
  return { total, commission, workerAmount: total - commission };
}

export interface PricedProduct {
  retailPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number | null;
}

export interface LinePrice {
  unitPrice: number;
  priceType: PriceType;
  lineTotal: number;
}

export function resolveLinePrice(product: PricedProduct, quantity: number): LinePrice {
  const isWholesale =
    product.wholesalePrice !== null &&
    product.wholesaleMinQty !== null &&
    quantity >= product.wholesaleMinQty;
  const unitPrice = isWholesale ? (product.wholesalePrice as number) : product.retailPrice;
  return {
    unitPrice,
    priceType: isWholesale ? 'wholesale' : 'retail',
    lineTotal: unitPrice * quantity,
  };
}

/** Groups digits by thousands with a plain space: 120000 -> "120 000". */
export function formatSom(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Price after a percentage discount, rounded to a whole som and never below 1 som. */
export function discountedPrice(price: number, discountPercent: number): number {
  return Math.max(1, Math.round((price * (100 - discountPercent)) / 100));
}
