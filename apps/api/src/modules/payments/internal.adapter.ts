import { randomUUID } from 'node:crypto';
import { isValidCardNumber, type CardPaymentInput } from '@barakali/shared';
import type {
  CallbackResult,
  CreatedPayment,
  PaymentOrderRef,
  PaymentProvider,
} from './payment-provider.js';

function isExpired(expiry: string, now: Date): boolean {
  const [monthPart, yearPart] = expiry.split('/');
  const month = Number(monthPart);
  const year = 2000 + Number(yearPart);
  const endOfMonth = new Date(Date.UTC(year, month, 1));
  return endOfMonth.getTime() <= now.getTime();
}

/** The platform's own payment page: validates the card form and confirms the payment. */
export class InternalPaymentProvider implements PaymentProvider {
  readonly name = 'internal' as const;

  constructor(private readonly now: () => Date = () => new Date()) {}

  async createPayment(order: PaymentOrderRef): Promise<CreatedPayment> {
    return { providerRef: `int_${randomUUID()}`, redirectUrl: `/tolov/${order.orderId}` };
  }

  async verifyCallback(payload: CardPaymentInput): Promise<CallbackResult> {
    if (!isValidCardNumber(payload.cardNumber) || isExpired(payload.expiry, this.now())) {
      return { status: 'failed', reason: 'card_invalid' };
    }
    return { status: 'paid', providerRef: `int_${randomUUID()}` };
  }

  async refund(): Promise<void> {
    // Funds are held on the platform ledger, so a refund only changes the payment status.
  }
}
