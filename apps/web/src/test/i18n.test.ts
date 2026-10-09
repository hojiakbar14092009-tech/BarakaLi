import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@barakali/shared';
import i18n from '../i18n';

const SRC = join(__dirname, '..');

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collect(path);
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

const bundle = (lang: 'uz' | 'ru') =>
  i18n.getResourceBundle(lang, 'translation') as Record<string, unknown>;

describe('translations', () => {
  it('has the same keys in uz and ru', () => {
    expect(flatten(bundle('ru')).sort()).toEqual(flatten(bundle('uz')).sort());
  });

  it('translates every API error code in both languages', () => {
    for (const lang of ['uz', 'ru'] as const) {
      for (const code of ERROR_CODES) {
        expect(i18n.exists(`errors.${code}`, { lng: lang }), `${lang}:${code}`).toBe(true);
      }
    }
  });

  it('resolves every literal key used in the source', () => {
    const missing: string[] = [];
    for (const file of collect(SRC)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/\bt\(\s*'([\w.]+)'/g)) {
        const key = match[1] as string;
        if (!i18n.exists(key, { lng: 'uz' })) missing.push(`${file}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('never mentions demo or test mode in the interface', () => {
    for (const lang of ['uz', 'ru'] as const) {
      const text = JSON.stringify(bundle(lang));
      expect(text).not.toMatch(/\b(demo|test|sinov|тест|демо|тестов)/i);
    }
  });

  it('does not tell users that unconnected payment providers are connected', () => {
    for (const lang of ['uz', 'ru'] as const) {
      expect(JSON.stringify(bundle(lang))).not.toMatch(
        /b(payme|click|uzum|visa|mastercard|humo)b/i,
      );
    }
  });
});
