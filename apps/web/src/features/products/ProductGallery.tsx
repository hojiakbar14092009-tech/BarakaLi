import { lazy, Suspense, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductDto } from '@barakali/shared';
import { ProductImage } from '../../components/ProductImage';
import { LoadingState } from '../../components/StateViews';
import { GalleryTabs, type GalleryTab } from './GalleryTabs';
import { RotateViewer } from './viewer/RotateViewer';
import { isWebGLAvailable } from './viewer/webgl';

// Loaded only after the shopper opens the 3D tab, so product pages stay light.
const Product3DViewer = lazy(() =>
  import('./viewer/Product3DViewer').then((module) => ({ default: module.Product3DViewer })),
);

const PANEL_ID = 'gallery-panel';

/**
 * Photos, plus one viewer tab: the 3D model when there is one and the device can draw it,
 * otherwise the photo-based rotate view. A model that fails to load quietly gives way to it.
 */
export function ProductGallery({ product }: { product: ProductDto }) {
  const { t } = useTranslation();
  const [webgl] = useState(isWebGLAvailable);
  const [modelFailed, setModelFailed] = useState(false);
  const [tab, setTab] = useState<GalleryTab>('photos');
  const [selected, setSelected] = useState(0);

  const handleFallback = useCallback(() => {
    setModelFailed(true);
    setTab('photos');
  }, []);

  const model = product.model && webgl && !modelFailed ? product.model : null;
  const current = product.images[selected] ?? product.images[0];
  const viewer: GalleryTab | null = model ? 'model' : current ? 'rotate' : null;
  const tabs: GalleryTab[] = viewer ? ['photos', viewer] : ['photos'];
  const active = tabs.includes(tab) ? tab : 'photos';

  return (
    <div className="space-y-3" aria-label={t('product.gallery')} role="region">
      {viewer && <GalleryTabs tabs={tabs} active={active} onSelect={setTab} panelId={PANEL_ID} />}
      <div
        id={PANEL_ID}
        role={viewer ? 'tabpanel' : undefined}
        aria-labelledby={viewer ? `gallery-tab-${active}` : undefined}
      >
        {active === 'model' && model && (
          <Suspense fallback={<LoadingState label={t('product.viewer.loading')} />}>
            <Product3DViewer
              modelUrl={model.fileUrl}
              posterUrl={model.posterUrl}
              title={product.title}
              onFallback={handleFallback}
            />
          </Suspense>
        )}
        {active === 'rotate' && current && <RotateViewer src={current.url} title={product.title} />}
        {active === 'photos' && (
          <div className="space-y-3">
            <ProductImage
              src={current?.url}
              alt={product.title}
              categorySlug={product.categorySlug}
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
