// Converts the catering photos to WebP for apps/web/public/catering/.
// Usage: pnpm --filter @barakali/api catering:images [sourceDir]
// sourceDir (default apps/web/public/catering) holds <key>.jpg|jpeg|png|webp; only the WebP output
// and the size manifest are committed, never the originals.
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const outDir = join(root, 'apps/web/public/catering');
const manifestPath = join(root, 'apps/web/src/features/catering/image-manifest.json');
const srcDir = resolve(process.argv[2] ?? outDir);

const KEYS = ['tikuvchilik', 'pishiriq', 'qolmehnat', 'dizayn'];
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const WIDTHS = [800, 1600];
const MAX_BYTES = 200 * 1024;
const QUALITIES = [78, 70, 62, 55, 48];

// Third-party brand marks in the source photo (x, y, width, height in source pixels) that must not
// be published: the seals on each cake and the printed name on each doily.
const BLUR_REGIONS = {
  pishiriq: [
    [270, 320, 100, 95],
    [1210, 200, 95, 95],
    [790, 825, 120, 110],
    [198, 1142, 90, 90],
    [1105, 1283, 100, 95],
    [250, 605, 140, 70],
    [1090, 330, 150, 80],
    [780, 1098, 140, 65],
    [205, 1348, 135, 70],
    [1085, 1503, 135, 75],
  ],
};

function findSource(key) {
  for (const ext of EXTENSIONS) {
    const path = join(srcDir, `${key}.${ext}`);
    if (existsSync(path)) return path;
  }
  return undefined;
}

const FEATHER = 24;

// An oval mask with soft edges, so the blurred patch fades into the photo instead of showing a box.
async function ovalMask(width, height) {
  const svg = `<svg width="${width}" height="${height}"><ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2 - FEATHER}" ry="${height / 2 - FEATHER}" fill="#fff"/></svg>`;
  return sharp(Buffer.from(svg))
    .blur(FEATHER / 2)
    .png()
    .toBuffer();
}

async function blurRegions(input, regions) {
  const { width: imageWidth, height: imageHeight } = await sharp(input).metadata();
  const patches = await Promise.all(
    regions.map(async ([x, y, w, h]) => {
      const left = Math.max(0, x - FEATHER);
      const top = Math.max(0, y - FEATHER);
      const width = Math.min(imageWidth - left, w + FEATHER * 2);
      const height = Math.min(imageHeight - top, h + FEATHER * 2);
      const patch = await sharp(input)
        .extract({ left, top, width, height })
        .blur(14)
        .ensureAlpha()
        .composite([{ input: await ovalMask(width, height), blend: 'dest-in' }])
        .png()
        .toBuffer();
      return { input: patch, left, top };
    }),
  );
  return sharp(input).composite(patches).toBuffer();
}

async function writeVariant(input, key, width) {
  const path = join(outDir, `${key}-${width}.webp`);
  for (const quality of QUALITIES) {
    const info = await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toFile(path);
    if (statSync(path).size <= MAX_BYTES) return { width: info.width, height: info.height };
  }
  throw new Error(`${key}-${width}.webp stays above ${MAX_BYTES} bytes`);
}

async function convert(key) {
  const source = findSource(key);
  if (!source) throw new Error(`Missing ${key}.(${EXTENSIONS.join('|')}) in ${srcDir}`);
  const regions = BLUR_REGIONS[key];
  const input = regions ? await blurRegions(source, regions) : source;
  const variants = [];
  for (const width of WIDTHS) variants.push(await writeVariant(input, key, width));
  return variants;
}

mkdirSync(outDir, { recursive: true });
const manifest = {};
for (const key of KEYS) manifest[key] = await convert(key);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`Wrote ${KEYS.length} images to ${outDir}\n`);
