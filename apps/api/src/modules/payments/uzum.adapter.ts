import {
  NotImplementedError,
  type CallbackResult,
  type CreatedPayment,
  type PaymentProvider,
} from './payment-provider.js';

export class UzumPaymentProvider implements PaymentProvider {
  readonly name = 'uzum' as const;

  async createPayment(): Promise<CreatedPayment> {
    throw new NotImplementedError('uzum');
  }

  async verifyCallback(): Promise<CallbackResult> {
    throw new NotImplementedError('uzum');
  }

  async refund(): Promise<void> {
    throw new NotImplementedError('uzum');
  }
}
