import { useTranslation } from 'react-i18next';
import type { ProductDto } from '@barakali/shared';
import { formatPrice } from '../../lib/format';

type PricedProduct = Pick<ProductDto, 'retailPrice' | 'wholesalePrice' | 'wholesaleMinQty'>;

/** Shows both prices: retail, and the wholesale tier with its minimum quantity. */
export function PriceBlock({ product }: { product: PricedProduct }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  return (
    <div className="space-y-0.5">
      <p className="text-3xl font-bold">{formatPrice(product.retailPrice, currency)}</p>
      {product.wholesalePrice !== null && product.wholesaleMinQty !== null && (
        <p className="text-base text-mocha">
          {t('product.wholesaleNote', { qty: product.wholesaleMinQty })}:{' '}
          <span className="font-semibold text-espresso">
            {formatPrice(product.wholesalePrice, currency)}
          </span>
        </p>
      )}
    </div>
  );
}
