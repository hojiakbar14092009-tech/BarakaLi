// Builds the sample product photos in apps/web/public/products/ with the same cutout uploads get.
// Usage: pnpm --filter @barakali/api product:images <sourceDir>
// sourceDir holds <key>.jpg|jpeg|png|webp; only the WebP output is committed, never the originals.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { cutoutProduct, type CutoutOptions } from '../src/modules/uploads/cutout/index.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const outDir = join(root, 'apps/web/public/products');
const srcDir = resolve(process.argv[2] ?? outDir);

// Curated photos that need a hand (each result checked by eye): the cake's plates sit on a grey of
// nearly the same tone, and the vase is white on a white tablecloth, so it is traced (coordinates
// on the 1000 px working copy).
const PHOTOS: Record<string, CutoutOptions> = {
  'toqilgan-savat': {},
  'suzani-yostiq-jildi': {},
  'sopol-vaza': {
    outline:
      '<path d="M378 322 L628 322 L614 350 C623 354 653 364 670 376 C687 389 703 398 715 425 C727 452 738 503 740 540 C742 578 733 623 725 650 C717 677 705 682 690 702 C675 722 649 755 636 770 C626 782 622 792 600 795 C560 799 455 799 415 795 C393 792 389 782 379 770 C366 755 338 722 322 702 C307 682 295 677 286 650 C277 623 265 578 266 540 C267 503 279 452 291 425 C303 398 323 389 340 376 C357 364 383 354 392 350 Z"/>',
  },
  // The marble board goes with the backdrop on purpose: the pastry is the product.
  baklava: { reviewed: true },
  'asal-tort': { tolerances: { step: 6, border: 30 }, reviewed: true },
  'bolalar-kombinezon': {},
  'kashta-sumka': {},
  'ikat-xalat': {},
};
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_SIDE = 800;
const MAX_BYTES = 200 * 1024;
const QUALITIES = [82, 74, 66, 58, 50];

function findSource(key: string): string | undefined {
  return EXTENSIONS.map((ext) => join(srcDir, `${key}.${ext}`)).find((path) => existsSync(path));
}

async function encode(png: Buffer, path: string): Promise<number> {
  for (const quality of QUALITIES) {
    const webp = await sharp(png)
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside' })
      .webp({ quality, alphaQuality: 90 })
      .toBuffer();
    if (webp.length <= MAX_BYTES) {
      writeFileSync(path, webp);
      return quality;
    }
  }
  throw new Error(`${path} stays above ${MAX_BYTES} bytes`);
}

async function convert(key: string, options: CutoutOptions): Promise<void> {
  const source = findSource(key);
  if (!source) {
    process.stdout.write(`skip ${key}: no source\n`);
    return;
  }
  const cut = await cutoutProduct(readFileSync(source), options);
  if (!cut) throw new Error(`${key}: backdrop too busy to cut, add an outline or tolerances`);
  const path = join(outDir, `${key}.webp`);
  const quality = await encode(cut, path);
  process.stdout.write(`${key}.webp ${Math.round(statSync(path).size / 1024)} KB (q${quality})\n`);
}

mkdirSync(outDir, { recursive: true });
for (const [key, options] of Object.entries(PHOTOS)) await convert(key, options);
