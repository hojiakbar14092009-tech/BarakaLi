import { CATERING_SERVICE_TYPES } from '@barakali/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import {
  CateringImage,
  SCALE_FROM_CARD,
  SCALE_FROM_HERO,
} from '../features/catering/CateringImage';
import { imageSource } from '../features/catering/images';

const reducedMotion = vi.hoisted(() => ({ value: false }));

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => reducedMotion.value,
  LazyMotion: ({ children }: { children: ReactNode }) => children,
}));

const PUBLIC_DIR = join(__dirname, '../../public/catering');
const MAX_BYTES = 200 * 1024;

afterEach(async () => {
  cleanup();
  reducedMotion.value = false;
  await i18n.changeLanguage('uz');
});

describe('catering image files', () => {
  it('ships two WebP sizes under 200 KB for every service type', () => {
    for (const { imageKey } of CATERING_SERVICE_TYPES) {
      for (const width of [800, 1600]) {
        const size = statSync(join(PUBLIC_DIR, `${imageKey}-${width}.webp`)).size;
        expect(size, `${imageKey}-${width}`).toBeLessThanOrEqual(MAX_BYTES);
      }
    }
  });

  it('describes each source by its real pixel width', () => {
    const source = imageSource('dizayn');
    expect(source.srcSet).toBe('/catering/dizayn-800.webp 800w, /catering/dizayn-1600.webp 1024w');
    expect([source.width, source.height]).toEqual([1024, 1024]);
  });
});

describe('CateringImage', () => {
  it('loads a card image lazily, with size, alt text and the card zoom', () => {
    render(<CateringImage imageKey="qolmehnat" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', '1600');
    expect(img).toHaveAttribute('height', '1066');
    expect(img).toHaveAccessibleName(/makrame/i);
    expect(img).toHaveAttribute('data-scale-from', String(SCALE_FROM_CARD));
  });

  it('loads the hero image eagerly with the stronger zoom', () => {
    render(<CateringImage imageKey="tikuvchilik" eager scaleFrom={SCALE_FROM_HERO} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('data-scale-from', String(SCALE_FROM_HERO));
  });

  it('stays at scale 1 when the user prefers reduced motion', () => {
    reducedMotion.value = true;
    render(<CateringImage imageKey="pishiriq" eager scaleFrom={SCALE_FROM_HERO} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('data-scale-from', '1');
    expect(img.style.transform).toMatch(/^(none|)$/);
  });

  it('has Russian alt text', async () => {
    await i18n.changeLanguage('ru');
    render(<CateringImage imageKey="tikuvchilik" />);
    expect(screen.getByRole('img')).toHaveAccessibleName(/швейной машине/);
  });
});
