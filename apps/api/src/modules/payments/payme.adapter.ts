import {
  NotImplementedError,
  type CallbackResult,
  type CreatedPayment,
  type PaymentProvider,
} from './payment-provider.js';

export class PaymePaymentProvider implements PaymentProvider {
  readonly name = 'payme' as const;

  async createPayment(): Promise<CreatedPayment> {
    throw new NotImplementedError('payme');
  }

  async verifyCallback(): Promise<CallbackResult> {
    throw new NotImplementedError('payme');
  }

  async refund(): Promise<void> {
    throw new NotImplementedError('payme');
  }
}
