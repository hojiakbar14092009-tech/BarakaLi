import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { CAPABILITIES } from '../config/capabilities';
import { PlatformCapabilities } from '../features/catering/PlatformCapabilities';

const UNBACKED = [/payme|click|uzum/i, /\bsms\b/i, /karta|карт/i, /kafolat|гарант/i, /100\s*%/];

describe('platform capabilities', () => {
  it('renders every capability from the single config, in order', () => {
    render(<PlatformCapabilities />);
    const titles = within(screen.getByRole('list'))
      .getAllByRole('heading')
      .map((h) => h.textContent);
    expect(titles).toEqual(
      CAPABILITIES.map((c) => i18n.t(`catering.capabilities.items.${c.key}.title`)),
    );
  });

  it.each(['uz', 'ru'] as const)(
    'has text for each capability and no unbacked claim (%s)',
    (lng) => {
      for (const { key } of CAPABILITIES) {
        for (const part of ['title', 'text']) {
          const id = `catering.capabilities.items.${key}.${part}`;
          expect(i18n.exists(id, { lng }), `${lng}:${id}`).toBe(true);
          for (const pattern of UNBACKED) expect(i18n.t(id, { lng })).not.toMatch(pattern);
        }
      }
    },
  );
});
