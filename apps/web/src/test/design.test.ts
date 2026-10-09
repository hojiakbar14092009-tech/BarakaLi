import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collect(path);
    return /\.(tsx?|css)$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('design rules', () => {
  const files = collect(join(__dirname, '..'));

  it('never uses Wheat for text', () => {
    const offenders = files.filter((file) => /text-wheat/.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('does not use dangerouslySetInnerHTML', () => {
    const offenders = files.filter((file) =>
      /dangerouslySetInnerHTML/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
