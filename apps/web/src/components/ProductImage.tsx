import { useTranslation } from 'react-i18next';
import { CategoryIcon } from './CategoryIcon';

interface ProductImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Picks the icon shown when the product has no photo yet. */
  categorySlug?: string;
  /** `card`: fixed-height frame for product cards; `square`: galleries, carts and thumbnails. */
  variant?: 'square' | 'card';
}

const INTRINSIC_SIZE = 800;
/**
 * Uploaded product photos are cut out of their backdrop (transparent WebP trimmed to the item), so
 * the whole item is shown (contain) straight on Bisque with a soft shadow under it. Multiply melts
 * the white backdrop of a photo the server could not cut into the same Bisque.
 */
const ITEM = 'object-contain mix-blend-multiply drop-shadow-[0_12px_14px_rgb(57_46_38/0.16)]';
const FRAME = {
  square: `aspect-square bg-bisque p-[8%] ${ITEM}`,
  card: `h-[200px] p-4 lg:h-[240px] ${ITEM}`,
} as const;
const EMPTY_FRAME = {
  square: 'aspect-square bg-bisque',
  card: 'h-[200px] lg:h-[240px]',
} as const;

/** Lazy-loaded product photo with fixed dimensions so the layout never jumps. */
export function ProductImage({
  src,
  alt,
  className = '',
  priority = false,
  categorySlug = '',
  variant = 'square',
}: ProductImageProps) {
  const { t } = useTranslation();
  if (!src) {
    return (
      <div
        role="img"
        aria-label={t('product.noImage')}
        className={`grid w-full place-items-center text-mocha ${EMPTY_FRAME[variant]} ${className}`}
      >
        <CategoryIcon slug={categorySlug} className="size-10" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={INTRINSIC_SIZE}
      height={INTRINSIC_SIZE}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={`w-full ${FRAME[variant]} ${className}`}
    />
  );
}
