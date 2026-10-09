import type { AppConfig } from '../../config.js';
import { ClickPaymentProvider } from './click.adapter.js';
import { InternalPaymentProvider } from './internal.adapter.js';
import type { PaymentProvider } from './payment-provider.js';
import { PaymePaymentProvider } from './payme.adapter.js';
import { UzumPaymentProvider } from './uzum.adapter.js';

export function createPaymentProvider(config: AppConfig): PaymentProvider {
  switch (config.paymentProvider) {
    case 'internal':
      return new InternalPaymentProvider();
    case 'payme':
      return new PaymePaymentProvider();
    case 'click':
      return new ClickPaymentProvider();
    case 'uzum':
      return new UzumPaymentProvider();
  }
}
