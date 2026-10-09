import { ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProductImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
}

const INTRINSIC_SIZE = 800;

/** Square, lazy-loaded image with fixed dimensions so the layout never jumps. */
export function ProductImage({ src, alt, className = '', priority = false }: ProductImageProps) {
  const { t } = useTranslation();
  if (!src) {
    return (
      <div
        role="img"
        aria-label={t('product.noImage')}
        className={`grid aspect-square place-items-center bg-bisque text-mocha ${className}`}
      >
        <ImageOff className="size-8" aria-hidden="true" strokeWidth={1.5} />
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
