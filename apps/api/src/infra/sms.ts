import { logger } from '../logger.js';

export interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

const VISIBLE_SUFFIX = 2;

/** "+998901234567" → "+998*******67": enough to tell numbers apart in a log, never the number itself. */
export function maskPhone(phone: string): string {
  const prefix = phone.startsWith('+') ? phone.slice(0, 4) : '';
  const rest = phone.slice(prefix.length);
  if (rest.length <= VISIBLE_SUFFIX) return `${prefix}${'*'.repeat(rest.length)}`;
  return `${prefix}${'*'.repeat(rest.length - VISIBLE_SUFFIX)}${rest.slice(-VISIBLE_SUFFIX)}`;
}

/**
 * Development sender: prints the message to the server console with the number masked.
 * In production without a gateway nothing is logged at all.
 */
export class ConsoleSmsProvider implements SmsProvider {
  constructor(private readonly verbose: boolean) {}

  async send(phone: string, message: string): Promise<void> {
    if (this.verbose) logger.info('SMS', { phone: maskPhone(phone), message });
  }
}
