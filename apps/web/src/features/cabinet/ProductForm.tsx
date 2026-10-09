import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { productInputSchema, type ProductDto } from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field, SelectField, TextAreaField } from '../../components/Field';
import { LoadingState } from '../../components/StateViews';
import { errorMessage, validationMessage } from '../../lib/errors';
import { useCategories } from '../catalog/api';
import { useMyProducts, useSaveProduct, useSetStatus } from './api';
import { ProductMedia } from './ProductMedia';

interface ProductFormProps {
  product: ProductDto | null;
  onClose: () => void;
  onSaved: (product: ProductDto) => void;
}

interface FormState {
  title: string;
  description: string;
  categoryId: string;
  retailPrice: string;
  wholesalePrice: string;
  wholesaleMinQty: string;
  stock: string;
}

const toNumber = (value: string): number | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
};

function initialState(product: ProductDto | null, fallbackCategory: string): FormState {
  return {
    title: product?.title ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? fallbackCategory,
    retailPrice: product ? String(product.retailPrice) : '',
    wholesalePrice: product?.wholesalePrice != null ? String(product.wholesalePrice) : '',
    wholesaleMinQty: product?.wholesaleMinQty != null ? String(product.wholesaleMinQty) : '',
    stock: product ? String(product.stock) : '1',
  };
}

export function ProductForm({ product, onClose, onSaved }: ProductFormProps) {
  const { t, i18n } = useTranslation();
  const categories = useCategories();
  const save = useSaveProduct();
  const setStatus = useSetStatus();
  const mine = useMyProducts();
  const [snapshot, setSnapshot] = useState<ProductDto | null>(product);
  // The list query is the live source, so uploads and removals show up immediately.
  const saved = mine.data?.find((item) => item.id === snapshot?.id) ?? snapshot;
  const [state, setState] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  if (categories.isPending) return <LoadingState />;
  const form = state ?? initialState(saved, categories.data?.[0]?.id ?? '');
  const update = (key: keyof FormState) => (value: string) => setState({ ...form, [key]: value });

  const submit = async (event: FormEvent, publish: boolean) => {
    event.preventDefault();
    setNotice(null);
    const parsed = productInputSchema.safeParse({
      title: form.title,
      description: form.description,
      categoryId: form.categoryId,
      retailPrice: toNumber(form.retailPrice),
      wholesalePrice: toNumber(form.wholesalePrice),
      wholesaleMinQty: toNumber(form.wholesaleMinQty),
      stock: toNumber(form.stock),
      status: saved?.status ?? 'draft',
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] ??= validationMessage(issue.message, t) ?? '';
      }
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      let result = await save.mutateAsync({ id: saved?.id, input: parsed.data });
      if (publish) result = await setStatus.mutateAsync({ id: result.id, status: 'published' });
      setSnapshot(result);
      setState(null);
      setNotice(t('cabinet.form.saved'));
      onSaved(result);
    } catch {
      /* the mutation error is shown below */
    }
  };

  const failure = save.error ?? setStatus.error;
  const options = (categories.data ?? []).map((category) => ({
    value: category.id,
    label: i18n.language === 'ru' ? category.name.ru : category.name.uz,
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">
          {saved ? t('cabinet.form.editTitle') : t('cabinet.form.newTitle')}
        </h2>
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
        </Button>
      </header>

      <form onSubmit={(event) => void submit(event, false)} className="space-y-4" noValidate>
        <Field
          label={t('cabinet.form.title')}
          value={form.title}
          onChange={(event) => update('title')(event.target.value)}
          error={errors.title}
        />
        <TextAreaField
          label={t('cabinet.form.description')}
          value={form.description}
          onChange={(event) => update('description')(event.target.value)}
        />
        <SelectField
          label={t('cabinet.form.category')}
          options={options}
          value={form.categoryId}
          onChange={(event) => update('categoryId')(event.target.value)}
          error={errors.categoryId}
        />
        <Field
          label={t('cabinet.form.retailPrice')}
          inputMode="numeric"
          value={form.retailPrice}
          onChange={(event) => update('retailPrice')(event.target.value.replace(/\D/g, ''))}
          error={errors.retailPrice}
        />
        <fieldset className="space-y-3 rounded-card border border-bisque p-4">
          <legend className="px-1 font-semibold">{t('cabinet.form.wholesaleSection')}</legend>
          <p className="text-sm text-mocha">{t('cabinet.form.wholesaleHint')}</p>
          <Field
            label={t('cabinet.form.wholesalePrice')}
            inputMode="numeric"
            value={form.wholesalePrice}
            onChange={(event) => update('wholesalePrice')(event.target.value.replace(/\D/g, ''))}
            error={errors.wholesalePrice}
          />
          <Field
            label={t('cabinet.form.wholesaleMinQty')}
            inputMode="numeric"
            value={form.wholesaleMinQty}
            onChange={(event) => update('wholesaleMinQty')(event.target.value.replace(/\D/g, ''))}
            error={errors.wholesaleMinQty}
          />
        </fieldset>
        <Field
          label={t('cabinet.form.stock')}
          inputMode="numeric"
          value={form.stock}
          onChange={(event) => update('stock')(event.target.value.replace(/\D/g, ''))}
          error={errors.stock}
        />

        {failure && (
          <p role="alert" className="font-medium">
            {errors.images ?? errorMessage(failure, t)}
          </p>
        )}
        {notice && (
          <p role="status" className="font-medium">
            {notice}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" size="lg" disabled={save.isPending} className="flex-1">
            {t('cabinet.form.saveDraft')}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            disabled={save.isPending || setStatus.isPending}
            onClick={(event) => void submit(event as unknown as FormEvent, true)}
          >
            {t('cabinet.form.saveAndPublish')}
          </Button>
        </div>
      </form>

      {saved ? (
        <ProductMedia product={saved} />
      ) : (
        <p className="rounded-field bg-bisque px-4 py-3">{t('cabinet.form.saveFirst')}</p>
      )}
    </div>
  );
}
