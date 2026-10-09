import { Box, Image as ImageIcon } from 'lucide-react';
import { lazy, Suspense, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductDto } from '@barakali/shared';
import { ProductImage } from '../../components/ProductImage';
import { LoadingState } from '../../components/StateViews';
import type { ViewerFailure } from './viewer/Product3DViewer';

// Loaded only after the shopper opens the 3D tab, so product pages stay light.
const Product3DViewer = lazy(() =>
  import('./viewer/Product3DViewer').then((module) => ({ default: module.Product3DViewer })),
);

type Tab = 'photos' | '3d';

export function ProductGallery({ product }: { product: ProductDto }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('photos');
  const [selected, setSelected] = useState(0);
  const [failure, setFailure] = useState<ViewerFailure | null>(null);

  const handleFallback = useCallback((reason: ViewerFailure) => {
    setFailure(reason);
    setTab('photos');
  }, []);

  const model = failure ? null : product.model;
  const current = product.images[selected] ?? product.images[0];

  return (
    <div className="space-y-3" aria-label={t('product.gallery')} role="region">
      {model && (
        <div role="tablist" aria-label={t('product.gallery')} className="flex gap-2">
          <TabButton
            active={tab === 'photos'}
            onClick={() => setTab('photos')}
            controls="gallery-panel"
          >
            <ImageIcon className="size-5" aria-hidden="true" />
            {t('product.tabPhotos')}
          </TabButton>
          <TabButton active={tab === '3d'} onClick={() => setTab('3d')} controls="gallery-panel">
            <Box className="size-5" aria-hidden="true" />
            {t('product.tab3d')}
          </TabButton>
        </div>
      )}
      {failure && (
        <p role="status" className="rounded-field bg-bisque px-4 py-3 text-espresso">
          {t(failure === 'noWebgl' ? 'product.viewer.noWebgl' : 'product.viewer.failed')}
        </p>
      )}

      <div id="gallery-panel" role="tabpanel">
        {tab === '3d' && model ? (
          <Suspense fallback={<LoadingState label={t('product.viewer.loading')} />}>
            <Product3DViewer
              modelUrl={model.fileUrl}
              posterUrl={model.posterUrl}
              title={product.title}
              onFallback={handleFallback}
            />
          </Suspense>
        ) : (
          <div className="space-y-3">
            <ProductImage
              src={current?.url}
              alt={product.title}
              priority
              className="rounded-card"
            />
            {product.images.length > 1 && (
              <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {product.images.map((image, index) => (
                  <li key={image.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(index)}
                      aria-label={`${product.title} ${index + 1}`}
                      aria-current={index === selected}
                      className={`block min-h-12 w-full overflow-hidden rounded-field border-2 ${
                        index === selected ? 'border-mocha' : 'border-transparent'
                      }`}
                    >
                      <ProductImage src={image.url} alt="" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  controls: string;
  children: React.ReactNode;
}

function TabButton({ active, onClick, controls, children }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 font-semibold ${
        active ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
      }`}
    >
      {children}
    </button>
  );
}
