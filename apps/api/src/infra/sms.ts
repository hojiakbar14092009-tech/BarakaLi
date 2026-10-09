import { logger } from '../logger.js';

export interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

/**
 * Development sender: prints the message to the server console.
 * In production without a gateway nothing sensitive is logged.
 */
export class ConsoleSmsProvider implements SmsProvider {
  constructor(private readonly verbose: boolean) {}

  async send(phone: string, message: string): Promise<void> {
    if (this.verbose) logger.info('SMS', { phone, message });
  }
}
