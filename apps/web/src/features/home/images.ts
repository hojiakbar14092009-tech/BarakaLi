export type HeroImageKey = 'tikuvchilik' | 'pishiriq';

export interface ImageSource {
  src: string;
  srcSet: string;
  width: number;
  height: number;
}

interface Variant {
  /** Width in the file name; the real pixel size can be smaller when the original was. */
  requested: 800 | 1600;
  width: number;
  height: number;
}

// Served as static files from apps/web/public/home/<key>-<requested>.webp.
const VARIANTS: Record<HeroImageKey, Variant[]> = {
  tikuvchilik: [
    { requested: 800, width: 800, height: 533 },
    { requested: 1600, width: 1600, height: 1066 },
  ],
  pishiriq: [
    { requested: 800, width: 800, height: 896 },
    { requested: 1600, width: 1500, height: 1680 },
  ],
};

const url = (key: HeroImageKey, variant: Variant) => `/home/${key}-${variant.requested}.webp`;

/** srcSet and intrinsic size of a hero photo, so the layout never jumps while it loads. */
export function imageSource(key: HeroImageKey): ImageSource {
  const variants = VARIANTS[key];
  const first = variants[0];
  const largest = variants[variants.length - 1] ?? first;
  return {
    src: first ? url(key, first) : '',
    srcSet: variants.map((variant) => `${url(key, variant)} ${variant.width}w`).join(', '),
    width: largest?.width ?? 0,
    height: largest?.height ?? 0,
  };
}
