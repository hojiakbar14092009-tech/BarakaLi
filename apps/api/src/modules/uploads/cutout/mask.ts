/**
 * Pixel work for product cutouts on raw RGBA buffers. The backdrop is flood-filled from the image
 * border: a pixel joins it when it is close to the neighbour it was reached from (so soft gradients
 * and shadows are followed) and close to one of the border colours (so the fill stops at the
 * product's edge). 255 in a mask means product, 0 means backdrop.
 */

export interface Raster {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface MaskTolerances {
  /** Max colour distance between neighbouring backdrop pixels. */
  step: number;
  /** Max colour distance between a backdrop pixel and the nearest border colour. */
  border: number;
}

type Rgb = [number, number, number];

const BORDER_SAMPLES_PER_SIDE = 60;

function colourDistanceSq(data: Uint8Array, a: number, b: number): number {
  const dr = (data[a] ?? 0) - (data[b] ?? 0);
  const dg = (data[a + 1] ?? 0) - (data[b + 1] ?? 0);
  const db = (data[a + 2] ?? 0) - (data[b + 2] ?? 0);
  return dr * dr + dg * dg + db * db;
}

/** Every pixel index on the outer frame of the image. */
export function borderPixels(width: number, height: number): number[] {
  const pixels: number[] = [];
  for (let x = 0; x < width; x += 1) pixels.push(x, (height - 1) * width + x);
  for (let y = 1; y < height - 1; y += 1) pixels.push(y * width, y * width + width - 1);
  return pixels;
}

function borderPalette({ data, width, height }: Raster): Rgb[] {
  const all = borderPixels(width, height);
  const step = Math.max(1, Math.floor(all.length / (BORDER_SAMPLES_PER_SIDE * 4)));
  const palette: Rgb[] = [];
  for (let i = 0; i < all.length; i += step) {
    const p = (all[i] ?? 0) * 4;
    palette.push([data[p] ?? 0, data[p + 1] ?? 0, data[p + 2] ?? 0]);
  }
  return palette;
}

function nearPalette(data: Uint8Array, offset: number, palette: Rgb[], tolerance: number): boolean {
  const limit = tolerance * tolerance;
  for (const [r, g, b] of palette) {
    const dr = (data[offset] ?? 0) - r;
    const dg = (data[offset + 1] ?? 0) - g;
    const db = (data[offset + 2] ?? 0) - b;
    if (dr * dr + dg * dg + db * db <= limit) return true;
  }
  return false;
}

function neighbours(p: number, width: number, size: number): number[] {
  const x = p % width;
  const result: number[] = [];
  if (x > 0) result.push(p - 1);
  if (x < width - 1) result.push(p + 1);
  if (p >= width) result.push(p - width);
  if (p + width < size) result.push(p + width);
  return result;
}

export function backdropMask(raster: Raster, tolerances: MaskTolerances): Uint8Array {
  const { data, width, height } = raster;
  const size = width * height;
  const palette = borderPalette(raster);
  const mask = new Uint8Array(size).fill(255);
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  const stepLimit = tolerances.step * tolerances.step;

  for (const p of borderPixels(width, height)) {
    if (mask[p] === 0 || !nearPalette(data, p * 4, palette, tolerances.border)) continue;
    mask[p] = 0;
    queue[tail++] = p;
  }
  while (head < tail) {
    const p = queue[head++] ?? 0;
    for (const n of neighbours(p, width, size)) {
      if (mask[n] === 0) continue;
      if (colourDistanceSq(data, p * 4, n * 4) > stepLimit) continue;
      if (!nearPalette(data, n * 4, palette, tolerances.border)) continue;
      mask[n] = 0;
      queue[tail++] = n;
    }
  }
  return mask;
}

/** Clears product specks: connected product regions smaller than `minArea` become backdrop. */
export function dropSmallRegions(mask: Uint8Array, width: number, minArea: number): void {
  const seen = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || seen[start]) continue;
    const region: number[] = [];
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const p = stack[--top] ?? 0;
      region.push(p);
      for (const n of neighbours(p, width, mask.length)) {
        if (seen[n] || mask[n] === 0) continue;
        seen[n] = 1;
        stack[top++] = n;
      }
    }
    if (region.length < minArea) for (const p of region) mask[p] = 0;
  }
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Smallest box holding every pixel whose alpha reaches `threshold`; null when there is none. */
export function boundingBox(alpha: Uint8Array, width: number, threshold = 24): Box | null {
  const height = alpha.length / width;
  let [left, top, right, bottom] = [width, height, -1, -1];
  for (let p = 0; p < alpha.length; p += 1) {
    if ((alpha[p] ?? 0) < threshold) continue;
    const x = p % width;
    const y = (p - x) / width;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return right < 0 ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * Colour spread (RMS distance from the mean) of everything the mask calls backdrop. A real studio
 * backdrop is near-uniform; a large spread means the fill swallowed parts of the scene or the item.
 */
export function backdropSpread({ data }: Raster, mask: Uint8Array): number {
  let count = 0;
  const sum = [0, 0, 0];
  const squares = [0, 0, 0];
  for (let p = 0; p < mask.length; p += 1) {
    if (mask[p] !== 0) continue;
    count += 1;
    for (let c = 0; c < 3; c += 1) {
      const value = data[p * 4 + c] ?? 0;
      sum[c] = (sum[c] ?? 0) + value;
      squares[c] = (squares[c] ?? 0) + value * value;
    }
  }
  if (count === 0) return Infinity;
  let variance = 0;
  for (let c = 0; c < 3; c += 1)
    variance += (squares[c] ?? 0) / count - ((sum[c] ?? 0) / count) ** 2;
  return Math.sqrt(variance / 3);
}

/**
 * Edge length of the product relative to its size (edge pixels / sqrt(area)). A clean silhouette
 * scores low; a fill that ate into the item leaves a frayed, high-scoring edge.
 */
export function raggedness(mask: Uint8Array, width: number): number {
  let edge = 0;
  let area = 0;
  for (let p = 0; p < mask.length; p += 1) {
    if (mask[p] === 0) continue;
    area += 1;
    if (neighbours(p, width, mask.length).some((n) => mask[n] === 0)) edge += 1;
  }
  return area === 0 ? Infinity : edge / Math.sqrt(area);
}

/** Share of the whole frame that the mask keeps as product. */
export function productShare(mask: Uint8Array): number {
  let product = 0;
  for (const value of mask) if (value !== 0) product += 1;
  return mask.length === 0 ? 0 : product / mask.length;
}

/** Share of pixels in `pixels` that the mask marks as backdrop. */
export function backdropShare(mask: Uint8Array, pixels: number[]): number {
  if (pixels.length === 0) return 0;
  let backdrop = 0;
  for (const p of pixels) if (mask[p] === 0) backdrop += 1;
  return backdrop / pixels.length;
}
