import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));

interface Rewrite {
  source: string;
  destination: string;
}

const config = JSON.parse(readFileSync(`${root}vercel.json`, 'utf8')) as {
  rewrites: Rewrite[];
  functions: Record<string, unknown>;
};

describe('vercel.json routing', () => {
  it('sends /api/* to the Express function before the SPA fallback', () => {
    const apiIndex = config.rewrites.findIndex((rule) => rule.source === '/api/(.*)');
    const spaIndex = config.rewrites.findIndex((rule) => rule.destination === '/index.html');

    expect(apiIndex).toBeGreaterThanOrEqual(0);
    expect(config.rewrites[apiIndex]?.destination).toBe('/api');
    expect(spaIndex).toBeGreaterThan(apiIndex);
  });

  it('keeps the SPA fallback from swallowing API paths', () => {
    const spa = config.rewrites.find((rule) => rule.destination === '/index.html');
    const matches = (path: string) => new RegExp(`^${spa?.source}$`).test(path);

    expect(matches('/mahsulot/abc')).toBe(true);
    expect(matches('/assets/app.js')).toBe(false);
  });

  it('ships the bundled function the rewrite points at', () => {
    expect(existsSync(`${root}api/index.js`)).toBe(true);
    expect(Object.keys(config.functions)).toContain('api/index.js');
    const pkg = JSON.parse(readFileSync(`${root}api/package.json`, 'utf8')) as { type: string };
    expect(pkg.type).toBe('commonjs');
  });
});
