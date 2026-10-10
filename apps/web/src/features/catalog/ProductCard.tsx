import { Box } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ProductDto } from '@barakali/shared';
import { ProductImage } from '../../components/ProductImage';
import { BENTO_COLUMNS, REVEAL_STAGGER_MS, cardShape } from '../../config/shapes';
import { useReveal } from '../../hooks/useReveal';
import { formatPrice } from '../../lib/format';

interface ProductCardProps {
  product: ProductDto;
  /** Position in the grid: picks the desktop bento shape and the reveal delay. */
  index?: number;
}

/** Compact, fully clickable card: every text line is a single line, so cards in a row align. */
export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { t } = useTranslation();
  const reveal = useReveal<HTMLLIElement>();
  const shape = cardShape(index);
  const currency = t('common.currency');
  const wholesale =
    product.wholesalePrice !== null && product.wholesaleMinQty !== null
      ? t('product.wholesaleCompact', {
          qty: product.wholesaleMinQty,
          price: formatPrice(product.wholesalePrice, currency),
        })
      : null;
  return (
    <li
      ref={reveal}
      data-shape={shape.name}
      className={`reveal ${shape.span}`}
      style={
        { '--reveal-delay': `${(index % BENTO_COLUMNS) * REVEAL_STAGGER_MS}ms` } as CSSProperties
      }
    >
      <Link
        to={`/mahsulot/${product.id}`}
        className="block h-full overflow-hidden rounded-2xl bg-white/70 shadow-soft transition duration-200 xl:p-3 xl:hover:-translate-y-1 xl:hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <div
          data-frame
          className={`relative overflow-hidden bg-bisque xl:flex xl:h-[300px] xl:items-center xl:justify-center ${shape.frame}`}
        >
          <ProductImage
            src={product.images[0]?.url}
            alt={product.title}
            categorySlug={product.categorySlug}
            variant="card"
            className="xl:h-full"
          />
          {product.model && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-sugar/95 px-2.5 py-1 text-xs font-bold text-espresso">
              <Box className="size-3.5" aria-hidden="true" />
              {t('product.tab3d')}
            </span>
          )}
        </div>
        <div className="space-y-0.5 p-4">
          <h3 className="truncate font-semibold" title={product.title}>
            {product.title}
          </h3>
          <p className="truncate text-sm text-mocha">{product.worker.displayName}</p>
          <p className="truncate font-bold">{formatPrice(product.retailPrice, currency)}</p>
          {wholesale && <p className="line-clamp-2 text-xs text-mocha">{wholesale}</p>}
        </div>
      </Link>
    </li>
  );
}
