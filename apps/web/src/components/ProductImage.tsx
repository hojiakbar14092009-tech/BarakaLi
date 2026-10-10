import { useTranslation } from 'react-i18next';
import { CategoryIcon } from './CategoryIcon';

interface ProductImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  /** Picks the icon shown when the product has no photo yet. */
  categorySlug?: string;
}

const INTRINSIC_SIZE = 800;

/** Square, lazy-loaded image with fixed dimensions so the layout never jumps. */
export function ProductImage({
  src,
  alt,
  className = '',
  priority = false,
  categorySlug = '',
}: ProductImageProps) {
  const { t } = useTranslation();
  if (!src) {
    return (
      <div
        role="img"
        aria-label={t('product.noImage')}
        className={`grid aspect-square place-items-center bg-gradient-to-br from-wheat to-bisque text-mocha ${className}`}
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
      className={`aspect-square w-full bg-bisque object-cover ${className}`}
    />
  );
}
