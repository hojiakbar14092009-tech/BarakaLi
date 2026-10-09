import { useTranslation } from 'react-i18next';
import type { ProductDto } from '@barakali/shared';
import { formatPrice } from '../../lib/format';

type PricedProduct = Pick<ProductDto, 'retailPrice' | 'wholesalePrice' | 'wholesaleMinQty'>;

interface PriceBlockProps {
  product: PricedProduct;
  size?: 'sm' | 'lg';
}

/** Shows both prices: retail, and the wholesale tier with its minimum quantity. */
export function PriceBlock({ product, size = 'sm' }: PriceBlockProps) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  return (
    <div className="space-y-0.5">
      <p className={size === 'lg' ? 'text-3xl font-bold' : 'text-lg font-bold'}>
        {formatPrice(product.retailPrice, currency)}
      </p>
      {product.wholesalePrice !== null && product.wholesaleMinQty !== null && (
        <p className={size === 'lg' ? 'text-base text-mocha' : 'text-sm text-mocha'}>
          {t('product.wholesaleNote', { qty: product.wholesaleMinQty })}:{' '}
          <span className="font-semibold text-espresso">
            {formatPrice(product.wholesalePrice, currency)}
          </span>
        </p>
      )}
    </div>
  );
}
