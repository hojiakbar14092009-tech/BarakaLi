import type { CardPaymentInput } from '@barakali/shared';

export interface PaymentOrderRef {
  orderId: string;
  amount: number;
}

export interface CreatedPayment {
  providerRef: string;
  /** Path or URL where the customer completes the payment. */
  redirectUrl: string;
}

export type CallbackResult =
  | { status: 'paid'; providerRef: string }
  | { status: 'failed'; reason: 'card_invalid' | 'card_declined' };

export class NotImplementedError extends Error {
  constructor(provider: string) {
    super(`Payment provider "${provider}" is not connected`);
    this.name = 'NotImplementedError';
  }
}

export interface PaymentProvider {
  readonly name: 'internal' | 'payme' | 'click' | 'uzum';
  createPayment(order: PaymentOrderRef): Promise<CreatedPayment>;
  /** Verifies the payer's confirmation and reports the outcome. Card data is never stored or logged. */
  verifyCallback(payload: CardPaymentInput, order: PaymentOrderRef): Promise<CallbackResult>;
  refund(providerRef: string): Promise<void>;
}
