import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processProductImage } from '../image.js';
import { cutoutProduct } from './index.js';

const BACKDROP = '#d8d4cf';

/** A terracotta "product" block on a plain backdrop with a soft vertical gradient. */
async function studioPhoto(): Promise<Buffer> {
  const gradient = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${BACKDROP}"/><stop offset="1" stop-color="#cdc8c2"/>
      </linearGradient></defs>
      <rect width="400" height="300" fill="url(#g)"/>
      <rect x="150" y="90" width="100" height="120" rx="8" fill="#a0522d"/>
    </svg>`,
  );
  return sharp(gradient).png().toBuffer();
}

/** Random noise everywhere: no plain backdrop to lift the item from. */
async function busyPhoto(): Promise<Buffer> {
  const pixels = Buffer.alloc(200 * 150 * 3);
  for (let i = 0; i < pixels.length; i += 1) pixels[i] = (i * 7919) % 251;
  return sharp(pixels, { raw: { width: 200, height: 150, channels: 3 } })
    .png()
    .toBuffer();
}

async function alphaAt(png: Buffer, x: number, y: number): Promise<number> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * 4 + 3] ?? -1;
}

describe('product cutout', () => {
  it('lifts the item off a plain backdrop and trims to it with a small margin', async () => {
    const cut = await cutoutProduct(await studioPhoto());
    expect(cut).not.toBeNull();
    const png = cut as Buffer;
    const meta = await sharp(png).metadata();
    expect(meta.hasAlpha).toBe(true);
    // 100 x 120 block on a 400 x 300 photo, worked at 1000 px wide: 250 x 300 plus 4 % per side.
    expect(meta.width).toBeGreaterThan(250);
    expect(meta.width).toBeLessThan(290);
    expect(meta.height).toBeGreaterThan(300);
    expect(meta.height).toBeLessThan(340);
    expect(await alphaAt(png, 2, 2)).toBe(0);
    expect(
      await alphaAt(png, Math.floor((meta.width ?? 0) / 2), Math.floor((meta.height ?? 0) / 2)),
    ).toBe(255);
  });

  it('keeps a photo whose backdrop is too busy to cut reliably', async () => {
    expect(await cutoutProduct(await busyPhoto())).toBeNull();
  });

  it('keeps a styled scene: a wall over a table is not a plain backdrop', async () => {
    const scene = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
        <rect width="400" height="300" fill="#e6e1da"/>
        <rect y="190" width="400" height="110" fill="#b9ab98"/>
        <rect x="150" y="90" width="100" height="120" rx="8" fill="#a0522d"/>
      </svg>`,
    );
    expect(await cutoutProduct(await sharp(scene).png().toBuffer())).toBeNull();
  });

  it('uses a traced outline as the exact edge when one is given', async () => {
    const cut = await cutoutProduct(await busyPhoto(), {
      outline: '<circle cx="500" cy="375" r="200"/>',
    });
    const meta = await sharp(cut as Buffer).metadata();
    expect(meta.width).toBeGreaterThan(400);
    expect(meta.width).toBeLessThan(440);
  });
});

describe('processProductImage', () => {
  it('returns a transparent WebP for a studio photo and a plain WebP for a busy one', async () => {
    const studio = await sharp(await processProductImage(await studioPhoto())).metadata();
    expect(studio.format).toBe('webp');
    expect(studio.hasAlpha).toBe(true);
    const busy = await sharp(await processProductImage(await busyPhoto())).metadata();
    expect(busy.format).toBe('webp');
    expect(busy.hasAlpha).toBe(false);
  });
});
