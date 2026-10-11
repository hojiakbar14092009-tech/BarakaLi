import { ALLOWED_IMAGE_MIME_TYPES } from '@barakali/shared';
import { AppError } from '../../errors.js';
import { cutoutProduct } from './cutout/index.js';

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 80;
const ALPHA_QUALITY = 90;
const FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

async function assertAllowedFormat(input: Buffer): Promise<void> {
  const { default: sharp } = await import('sharp');
  const meta = await sharp(input).metadata();
  const mime = FORMAT_TO_MIME[meta.format ?? ''];
  if (!mime || !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    throw AppError.badRequest('IMAGE_INVALID_FORMAT');
  }
}

/**
 * Product photos: the item is lifted off its backdrop (transparent WebP, trimmed to the item) so
 * every card shows it straight on the Bisque frame. Busy backdrops keep the plain photo.
 */
export async function processProductImage(input: Buffer): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  try {
    await assertAllowedFormat(input);
    const cut = await cutoutProduct(input);
    if (!cut) return await processImage(input);
    return await sharp(cut).webp({ quality: WEBP_QUALITY, alphaQuality: ALPHA_QUALITY }).toBuffer();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.badRequest('IMAGE_INVALID_FORMAT');
  }
}

/**
 * Checks the real format from the file content (not the client's MIME type or extension),
 * strips metadata, bounds the size and re-encodes to WebP.
 */
export async function processImage(input: Buffer): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  try {
    await assertAllowedFormat(input);
    return await sharp(input)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.badRequest('IMAGE_INVALID_FORMAT');
  }
}
