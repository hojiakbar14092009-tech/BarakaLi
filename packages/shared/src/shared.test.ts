import { describe, expect, it } from 'vitest';
import {
  calculateCommission,
  canTransition,
  cardPaymentSchema,
  isValidCardNumber,
  normalizePhone,
  productInputSchema,
  resolveLinePrice,
  splitOrderAmount,
} from './index.js';

describe('commission', () => {
  it('takes 5% rounded to a whole som', () => {
    expect(calculateCommission(100_000)).toBe(5_000);
    expect(calculateCommission(10)).toBe(1);
    expect(calculateCommission(9)).toBe(0);
    expect(calculateCommission(0)).toBe(0);
  });

  it('rounds half up and keeps commission + worker amount equal to total', () => {
    for (const total of [1, 10, 11, 29, 30, 99_999, 123_457]) {
      const split = splitOrderAmount(total);
      expect(Number.isInteger(split.commission)).toBe(true);
      expect(split.commission + split.workerAmount).toBe(total);
    }
    expect(calculateCommission(30)).toBe(2);
  });
});

describe('resolveLinePrice', () => {
  const product = { retailPrice: 10_000, wholesalePrice: 8_000, wholesaleMinQty: 10 };

  it('uses retail below the wholesale threshold', () => {
    expect(resolveLinePrice(product, 9)).toEqual({
      unitPrice: 10_000,
      priceType: 'retail',
      lineTotal: 90_000,
    });
  });

  it('switches to wholesale at exactly the threshold', () => {
    expect(resolveLinePrice(product, 10)).toEqual({
      unitPrice: 8_000,
      priceType: 'wholesale',
      lineTotal: 80_000,
    });
  });

  it('stays retail when the product has no wholesale terms', () => {
    const plain = { retailPrice: 5_000, wholesalePrice: null, wholesaleMinQty: null };
    expect(resolveLinePrice(plain, 500).priceType).toBe('retail');
  });
});

describe('order status transitions', () => {
  it('allows only the documented sequence', () => {
    expect(canTransition('awaiting_payment', 'new')).toBe(true);
    expect(canTransition('new', 'accepted')).toBe(true);
    expect(canTransition('new', 'delivered')).toBe(false);
    expect(canTransition('delivered', 'new')).toBe(false);
    expect(canTransition('ready', 'in_progress')).toBe(false);
    expect(canTransition('cancelled', 'new')).toBe(false);
  });
});

describe('phone', () => {
  it('normalizes accepted formats', () => {
    expect(normalizePhone('90 123 45 67')).toBe('+998901234567');
    expect(normalizePhone('+998 (90) 123-45-67')).toBe('+998901234567');
    expect(normalizePhone('998901234567')).toBe('+998901234567');
  });

  it('rejects malformed numbers', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('+7 900 123 45 67')).toBeNull();
  });
});

describe('productInputSchema', () => {
  const base = {
    title: 'Kashta sumka',
    categoryId: '6f1f7a0e-7a9b-4c11-9d6e-0a7d3d6f2b11',
    retailPrice: 50_000,
    stock: 10,
  };

  it('rejects a wholesale price that is not lower than retail', () => {
    const result = productInputSchema.safeParse({
      ...base,
      wholesalePrice: 50_000,
      wholesaleMinQty: 5,
    });
    expect(result.success).toBe(false);
  });

  it('requires both wholesale fields together', () => {
    expect(productInputSchema.safeParse({ ...base, wholesalePrice: 40_000 }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, wholesaleMinQty: 5 }).success).toBe(false);
  });

  it('rejects non-integer prices', () => {
    expect(productInputSchema.safeParse({ ...base, retailPrice: 10.5 }).success).toBe(false);
  });

  it('accepts valid wholesale terms', () => {
    const result = productInputSchema.safeParse({
      ...base,
      wholesalePrice: 40_000,
      wholesaleMinQty: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe('card validation', () => {
  it('passes Luhn for a valid number and fails for an invalid one', () => {
    expect(isValidCardNumber('4242424242424242')).toBe(true);
    expect(isValidCardNumber('4242424242424241')).toBe(false);
  });

  it('strips spaces from the card number', () => {
    const parsed = cardPaymentSchema.parse({
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/30',
      cvc: '123',
    });
    expect(parsed.cardNumber).toBe('4242424242424242');
  });
});
