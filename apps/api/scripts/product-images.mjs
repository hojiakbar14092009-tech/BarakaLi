// Converts the sample product photos to WebP for apps/web/public/products/.
// Usage: pnpm --filter @barakali/api product:images <sourceDir>
// sourceDir holds <key>.jpg|jpeg|png|webp; only the WebP output is committed, never the originals.
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const outDir = join(root, 'apps/web/public/products');
const srcDir = resolve(process.argv[2] ?? outDir);

const KEYS = [
  'toqilgan-savat',
  'suzani-yostiq-jildi',
  'sopol-vaza',
  'baklava',
  'asal-tort',
  'bolalar-kombinezon',
  'kashta-sumka',
  'ikat-xalat',
];
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const WIDTH = 800;
const MAX_BYTES = 200 * 1024;
const QUALITIES = [80, 72, 64, 56, 48];

function findSource(key) {
  for (const ext of EXTENSIONS) {
    const path = join(srcDir, `${key}.${ext}`);
    if (existsSync(path)) return path;
  }
  return undefined;
}

/** Exactly 800 px wide: narrower originals are scaled up so every card gets the same sharpness floor. */
async function convert(key) {
  const source = findSource(key);
  if (!source) {
    process.stdout.write(`skip ${key}: no source\n`);
    return;
  }
  const path = join(outDir, `${key}.webp`);
  for (const quality of QUALITIES) {
    await sharp(source).resize({ width: WIDTH }).webp({ quality }).toFile(path);
    const size = statSync(path).size;
    if (size <= MAX_BYTES) {
      process.stdout.write(`${key}.webp ${Math.round(size / 1024)} KB (q${quality})\n`);
      return;
    }
  }
  throw new Error(`${key}.webp stays above ${MAX_BYTES} bytes`);
}

mkdirSync(outDir, { recursive: true });
for (const key of KEYS) await convert(key);
