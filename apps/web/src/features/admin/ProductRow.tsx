import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { AdminProductDto, CategoryDto } from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field, SelectField, TextAreaField } from '../../components/Field';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useDeleteProduct, useSetProductVisible, useUpdateProduct } from './api';

interface EditFormProps {
  product: AdminProductDto;
  categories: CategoryDto[];
  onDone: () => void;
}

function EditForm({ product, categories, onDone }: EditFormProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'ru' ? 'ru' : 'uz';
  const update = useUpdateProduct();
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(String(product.retailPrice));
  const [categoryId, setCategoryId] = useState(product.categoryId);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(
      {
        id: product.id,
        input: { title: title.trim(), description, retailPrice: Number(price), categoryId },
      },
      { onSuccess: onDone },
    );
  };

  return (
    <form onSubmit={submit} className="w-full space-y-3 rounded-field bg-bisque/50 p-4">
      <Field
        label={t('admin.products.form.title')}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <TextAreaField
        label={t('admin.products.form.description')}
        rows={3}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <Field
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        label={t('admin.products.form.price')}
        value={price}
        onChange={(event) => setPrice(event.target.value.replace(/\D/g, ''))}
        required
      />
      <SelectField
        label={t('admin.products.category')}
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        options={categories.map((c) => ({ value: c.id, label: c.name[lang] }))}
      />
      {update.isError && (
        <p role="alert" className="font-medium">
          {errorMessage(update.error, t)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={update.isPending}>
          {t('common.save')}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

export function ProductRow({
  product,
  categories,
}: {
  product: AdminProductDto;
  categories: CategoryDto[];
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<'hide' | 'show' | 'delete' | null>(null);
  const visibility = useSetProductVisible();
  const remove = useDeleteProduct();
  const active = dialog === 'delete' ? remove : visibility;
  const currency = t('common.currency');

  const confirm = () => {
    const done = { onSuccess: () => setDialog(null) };
    if (dialog === 'delete') remove.mutate(product.id, done);
    else if (dialog) visibility.mutate({ id: product.id, visible: dialog === 'show' }, done);
  };

  return (
    <li className="flex flex-wrap items-start gap-4 rounded-card border border-bisque bg-white/60 p-4">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          className="size-16 shrink-0 rounded-field object-cover"
        />
      ) : (
        <div aria-hidden="true" className="size-16 shrink-0 rounded-field bg-bisque" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold">
          <Link
            to={`/mahsulot/${product.id}`}
            className="inline-flex min-h-12 items-center underline-offset-4 hover:underline"
          >
            {product.title}
          </Link>
        </p>
        <p className="text-sm text-mocha">
          <Link
            to={`/admin/hunarmandlar/${product.workerId}`}
            className="inline-flex min-h-12 items-center underline-offset-4 hover:underline"
          >
            {product.workerName}
          </Link>{' '}
          · {t(`categories.${product.categorySlug}`, { defaultValue: product.categorySlug })} ·{' '}
          {formatPrice(product.retailPrice, currency)} ·{' '}
          {t('admin.products.stock', { count: product.stock })}
        </p>
        <p className="text-sm text-mocha">
          {t(`admin.products.statuses.${product.status}`)} ·{' '}
          {t('admin.products.ordersCount', { count: product.ordersCount })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => setEditing((value) => !value)}
          aria-label={`${t('common.edit')}: ${product.title}`}
        >
          {t('common.edit')}
        </Button>
        {product.status === 'published' ? (
          <Button
            variant="secondary"
            onClick={() => setDialog('hide')}
            aria-label={`${t('admin.products.hide')}: ${product.title}`}
          >
            {t('admin.products.hide')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setDialog('show')}
            aria-label={`${t('admin.products.show')}: ${product.title}`}
          >
            {t('admin.products.show')}
          </Button>
        )}
        {product.ordersCount === 0 && (
          <Button
            variant="secondary"
            onClick={() => setDialog('delete')}
            aria-label={`${t('common.delete')}: ${product.title}`}
          >
            {t('common.delete')}
          </Button>
        )}
      </div>
      {product.ordersCount > 0 && (
        <p className="w-full text-sm text-mocha">{t('admin.products.hasOrders')}</p>
      )}
      {editing && (
        <EditForm product={product} categories={categories} onDone={() => setEditing(false)} />
      )}
      {dialog && (
        <ConfirmDialog
          open
          title={t(`admin.products.dialog.${dialog}.title`)}
          description={t(`admin.products.dialog.${dialog}.text`, { title: product.title })}
          confirmLabel={t(`admin.products.dialog.${dialog}.confirm`)}
          destructive={dialog !== 'show'}
          pending={active.isPending}
          error={active.isError ? errorMessage(active.error, t) : undefined}
          onConfirm={confirm}
          onClose={() => setDialog(null)}
        />
      )}
    </li>
  );
}
