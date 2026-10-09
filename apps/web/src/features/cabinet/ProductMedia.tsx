import { Box, Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_MODEL_BYTES, MAX_PRODUCT_IMAGES, type ProductDto } from '@barakali/shared';
import { Button } from '../../components/Button';
import { ProductImage } from '../../components/ProductImage';
import { ApiError } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { resizeImage } from '../../lib/resizeImage';
import { useDeleteImage, useDeleteModel, useUploadImage, useUploadModel } from './api';

const MB = 1024 * 1024;

export function ProductMedia({ product }: { product: ProductDto }) {
  const { t } = useTranslation();
  const photoInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const uploadImage = useUploadImage(product.id);
  const deleteImage = useDeleteImage(product.id);
  const uploadModel = useUploadModel(product.id);
  const deleteModel = useDeleteModel(product.id);

  const onPhotos = async (files: FileList | null) => {
    for (const file of Array.from(files ?? []).slice(
      0,
      MAX_PRODUCT_IMAGES - product.images.length,
    )) {
      await uploadImage.mutateAsync(await resizeImage(file)).catch(() => undefined);
    }
    if (photoInput.current) photoInput.current.value = '';
  };

  const onModel = (file: File | undefined) => {
    setModelError(null);
    if (modelInput.current) modelInput.current.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb'))
      return setModelError(t('errors.MODEL_INVALID_FORMAT'));
    if (file.size > MAX_MODEL_BYTES) return setModelError(t('errors.MODEL_TOO_LARGE'));
    uploadModel.mutate(file);
  };

  const failure = uploadImage.error ?? deleteImage.error ?? uploadModel.error ?? deleteModel.error;

  return (
    <div className="space-y-6">
      <section aria-labelledby="media-images" className="space-y-3">
        <h3 id="media-images" className="font-bold">
          {t('cabinet.form.images')}
        </h3>
        <p className="text-sm text-mocha">{t('cabinet.form.imagesHint')}</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {product.images.map((image) => (
            <li key={image.id} className="relative">
              <ProductImage src={image.url} alt={product.title} className="rounded-field" />
              <button
                type="button"
                aria-label={t('cabinet.form.removePhoto')}
                onClick={() => deleteImage.mutate(image.id)}
                className="absolute right-1 top-1 grid size-12 place-items-center rounded-full bg-sugar/95 text-espresso"
              >
                <Trash2 className="size-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {product.images.length < MAX_PRODUCT_IMAGES && (
          <>
            <input
              ref={photoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              id="photo-input"
              onChange={(event) => void onPhotos(event.target.files)}
            />
            <Button
              variant="secondary"
              disabled={uploadImage.isPending}
              onClick={() => photoInput.current?.click()}
            >
              <Camera className="size-5" aria-hidden="true" />
              {uploadImage.isPending ? t('cabinet.form.uploading') : t('cabinet.form.addPhoto')}
            </Button>
          </>
        )}
      </section>

      <section aria-labelledby="media-model" className="space-y-3 rounded-card bg-bisque/50 p-4">
        <h3 id="media-model" className="flex items-center gap-2 font-bold">
          <Box className="size-5" aria-hidden="true" />
          {t('cabinet.form.model')}
        </h3>
        <p className="text-sm text-mocha">{t('cabinet.form.modelHelp')}</p>
        {product.model && (
          <p className="font-medium">
            {t('cabinet.form.currentModel', {
              size: `${(product.model.fileSize / MB).toFixed(1)} MB`,
            })}
          </p>
        )}
        <input
          ref={modelInput}
          type="file"
          accept=".glb,model/gltf-binary"
          className="sr-only"
          id="model-input"
          onChange={(event) => onModel(event.target.files?.[0])}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={uploadModel.isPending}
            onClick={() => modelInput.current?.click()}
          >
            {uploadModel.isPending ? t('cabinet.form.uploading') : t('cabinet.form.chooseModel')}
          </Button>
          {product.model && (
            <Button variant="ghost" onClick={() => deleteModel.mutate()}>
              {t('cabinet.form.removeModel')}
            </Button>
          )}
        </div>
        {modelError && (
          <p role="alert" className="font-medium">
            {modelError}
          </p>
        )}
      </section>

      {failure && (
        <p role="alert" className="font-medium">
          {errorMessage(failure instanceof ApiError ? failure : new Error(), t)}
        </p>
      )}
    </div>
  );
}
