import { formatSom } from '@barakali/shared';

export function formatPrice(amount: number, suffix: string): string {
  return `${formatSom(amount)} ${suffix}`;
}
