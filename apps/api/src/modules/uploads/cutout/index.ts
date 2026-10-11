import {
  backdropMask,
  backdropShare,
  backdropSpread,
  borderPixels,
  boundingBox,
  dropSmallRegions,
  productShare,
  raggedness,
  type Box,
  type MaskTolerances,
  type Raster,
} from './mask.js';

/** Longest side the cutout works at; product photos are shown far smaller than this. */
export const CUTOUT_MAX_SIDE = 1000;
const DEFAULT_TOLERANCES: MaskTolerances = { step: 14, border: 58 };
const FEATHER_SIGMA = 1.2;
const MARGIN = 0.04;
const SPECK_AREA = 0.002;
/**
 * A cut is trusted only on a plain backdrop: it runs round nearly the whole border, the backdrop
 * is near-uniform, the silhouette is clean and the product keeps a sensible share of the frame.
 * Anything else (a styled scene, an item the fill ate into) keeps its original photo. Thresholds
 * come from studio shots (spread 3-11, raggedness 5-9) against failed cuts (spread 20+,
 * raggedness ~20).
 */
const MIN_BORDER_BACKDROP = 0.9;
const MAX_BACKDROP_SPREAD = 15;
const MAX_RAGGEDNESS = 12;
const MIN_PRODUCT_SHARE = 0.04;
const MAX_PRODUCT_SHARE = 0.9;

export interface CutoutOptions {
  tolerances?: Partial<MaskTolerances>;
  /** Skips the quality checks; only for curated photos whose result was reviewed by eye. */
  reviewed?: boolean;
  /**
   * A traced SVG outline of the product (coordinates on the image scaled to CUTOUT_MAX_SIDE) used
   * as the exact edge instead of the colour fill; for curated photos where item and surface share a
   * colour, e.g. a white vase on a white tablecloth.
   */
  outline?: string;
}

async function loadRaster(input: Buffer): Promise<Raster> {
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: CUTOUT_MAX_SIDE, height: CUTOUT_MAX_SIDE, fit: 'inside' })
    .removeAlpha()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

/** Rasterises a traced outline: 255 inside (product), 0 outside, with the SVG's own anti-aliasing. */
async function outlineMask(width: number, height: number, shapes: string): Promise<Uint8Array> {
  const { default: sharp } = await import('sharp');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g fill="#fff">${shapes}</g></svg>`;
  const mask = await sharp(Buffer.from(svg))
    .resize(width, height)
    .extractChannel(0)
    .raw()
    .toBuffer();
  return new Uint8Array(mask);
}

async function productMask(raster: Raster, options: CutoutOptions): Promise<Uint8Array | null> {
  const { width, height } = raster;
  if (options.outline) return outlineMask(width, height, options.outline);
  const mask = backdropMask(raster, { ...DEFAULT_TOLERANCES, ...options.tolerances });
  dropSmallRegions(mask, width, Math.round(width * height * SPECK_AREA));
  return options.reviewed || isTrustworthy(raster, mask) ? mask : null;
}

function isTrustworthy(raster: Raster, mask: Uint8Array): boolean {
  const { width, height } = raster;
  const share = productShare(mask);
  return (
    backdropShare(mask, borderPixels(width, height)) >= MIN_BORDER_BACKDROP &&
    share >= MIN_PRODUCT_SHARE &&
    share <= MAX_PRODUCT_SHARE &&
    backdropSpread(raster, mask) <= MAX_BACKDROP_SPREAD &&
    raggedness(mask, width) <= MAX_RAGGEDNESS
  );
}

async function featherAlpha(mask: Uint8Array, width: number, height: number): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  return sharp(Buffer.from(mask), { raw: { width, height, channels: 1 } })
    .blur(FEATHER_SIGMA)
    .extractChannel(0)
    .raw()
    .toBuffer();
}

async function trimmedPng(raster: Raster, box: Box): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  const pad = Math.round(Math.max(box.width, box.height) * MARGIN);
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
  return sharp(Buffer.from(raster.data), {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .extract(box)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: transparent })
    .png()
    .toBuffer();
}

/**
 * Lifts a product off its photo backdrop: a transparent PNG trimmed to the item with an even
 * margin, or null when the backdrop is too busy to cut reliably (the caller keeps the photo).
 */
export async function cutoutProduct(
  input: Buffer,
  options: CutoutOptions = {},
): Promise<Buffer | null> {
  const raster = await loadRaster(input);
  const { width, height } = raster;
  const mask = await productMask(raster, options);
  if (!mask) return null;

  const alpha = await featherAlpha(mask, width, height);
  for (let p = 0; p < width * height; p += 1) raster.data[p * 4 + 3] = alpha[p] ?? 0;
  const box = boundingBox(new Uint8Array(alpha), width);
  return box ? trimmedPng(raster, box) : null;
}
