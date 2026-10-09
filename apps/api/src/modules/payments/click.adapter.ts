import {
  NotImplementedError,
  type CallbackResult,
  type CreatedPayment,
  type PaymentProvider,
} from './payment-provider.js';

export class ClickPaymentProvider implements PaymentProvider {
  readonly name = 'click' as const;

  async createPayment(): Promise<CreatedPayment> {
    throw new NotImplementedError('click');
  }

  async verifyCallback(): Promise<CallbackResult> {
    throw new NotImplementedError('click');
  }

  async refund(): Promise<void> {
    throw new NotImplementedError('click');
  }
}
