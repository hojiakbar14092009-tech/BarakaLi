import { Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { ProductDto } from '@barakali/shared';
import { ProductImage } from '../../components/ProductImage';
import { PriceBlock } from '../products/PriceBlock';

export function ProductCard({ product }: { product: ProductDto }) {
  const { t } = useTranslation();
  return (
    <li className="overflow-hidden rounded-card border border-bisque bg-white/60 shadow-soft">
      <Link to={`/mahsulot/${product.id}`} className="block">
        <div className="relative">
          <ProductImage src={product.images[0]?.url} alt={product.title} />
          {product.model && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-sugar/95 px-2.5 py-1 text-xs font-bold text-espresso">
              <Box className="size-3.5" aria-hidden="true" />
              {t('product.tab3d')}
            </span>
          )}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 font-semibold leading-snug">{product.title}</h3>
          <p className="truncate text-sm text-mocha">{product.worker.displayName}</p>
          <PriceBlock product={product} />
        </div>
      </Link>
    </li>
  );
}
