import type { ProductDto } from '@barakali/shared';
import { ProductCard } from './ProductCard';

/** Plain 2/3/4-column grid; at ≥1280 px it becomes a dense 4-column bento (see config/shapes). */
export function ProductGrid({ products }: { products: ProductDto[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-flow-row-dense xl:gap-6">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </ul>
  );
}
