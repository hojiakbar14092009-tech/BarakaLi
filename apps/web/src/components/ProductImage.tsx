import { useTranslation } from 'react-i18next';
import { CategoryIcon } from './CategoryIcon';

interface ProductImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Picks the icon shown when the product has no photo yet. */
  categorySlug?: string;
  /** `card`: fixed-height frame that shows the whole item (contain) instead of a square crop. */
  variant?: 'square' | 'card';
}

const INTRINSIC_SIZE = 800;
const FRAME = {
  square: 'aspect-square bg-bisque object-cover',
  // Multiply lets a photo's white backdrop melt into the Bisque frame.
  card: 'h-[180px] object-contain mix-blend-multiply lg:h-[220px]',
} as const;

/** Square, lazy-loaded image with fixed dimensions so the layout never jumps. */
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
        className={`grid w-full ${FRAME[variant]} place-items-center bg-gradient-to-br from-wheat to-bisque text-mocha ${className}`}
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
