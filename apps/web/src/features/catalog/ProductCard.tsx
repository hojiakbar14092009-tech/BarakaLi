import { Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ProductDto } from '@barakali/shared';
import { ProductImage } from '../../components/ProductImage';
import { formatPrice } from '../../lib/format';

/** Compact, fully clickable card: every text line is a single line, so cards in a row align. */
export function ProductCard({ product }: { product: ProductDto }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const wholesale =
    product.wholesalePrice !== null && product.wholesaleMinQty !== null
      ? t('product.wholesaleCompact', {
          qty: product.wholesaleMinQty,
          price: formatPrice(product.wholesalePrice, currency),
        })
      : null;
  return (
    <li>
      <Link
        to={`/mahsulot/${product.id}`}
        className="block h-full overflow-hidden rounded-2xl bg-white/70 shadow-soft"
      >
        <div className="relative">
          <ProductImage
            src={product.images[0]?.url}
            alt={product.title}
            categorySlug={product.categorySlug}
            variant="card"
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
          {wholesale && (
            <p className="truncate text-xs text-mocha" title={wholesale}>
              {wholesale}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
