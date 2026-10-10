import { describe, expect, it } from 'vitest';
import { CATEGORY_SLUGS } from './constants.js';

describe('catalog categories', () => {
  it('offers exactly the four active categories, without remote work', () => {
    expect([...CATEGORY_SLUGS]).toEqual(['tikuvchilik', 'pishiriq', 'qol-mehnati', 'dizayn']);
    expect(CATEGORY_SLUGS as readonly string[]).not.toContain('masofaviy-ishlar');
  });
});
