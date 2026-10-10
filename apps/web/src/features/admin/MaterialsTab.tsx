import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAX_DISCOUNT_PERCENT,
  materialInputSchema,
  type MaterialDto,
  type MaterialInputRaw,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import {
  useAdminMaterialOrders,
  useAdminMaterials,
  useDeliverMaterialOrder,
  useSaveMaterial,
} from './api';

interface Draft {
  id?: string;
  name: string;
  description: string;
  price: string;
  discountPercent: string;
  stock: string;
  isActive: boolean;
}

const EMPTY: Draft = {
  name: '',
  description: '',
  price: '',
  discountPercent: '0',
  stock: '',
  isActive: true,
};

function toDraft(material: MaterialDto): Draft {
  return {
    id: material.id,
    name: material.name,
    description: material.description,
    price: String(material.price),
    discountPercent: String(material.discountPercent),
    stock: String(material.stock),
    isActive: material.isActive,
  };
}

function MaterialForm({ draft, onDone }: { draft: Draft; onDone: () => void }) {
  const { t } = useTranslation();
  const [values, setValues] = useState(draft);
  const save = useSaveMaterial();
  const input: MaterialInputRaw = {
    name: values.name,
    description: values.description,
    price: Number(values.price),
    discountPercent: Number(values.discountPercent),
    stock: Number(values.stock),
    isActive: values.isActive,
  };
  const valid = materialInputSchema.safeParse(input).success;
  const set = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const digits = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value.replace(/\D/g, '') }));

  return (
    <form
      className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) save.mutate({ id: values.id, input }, { onSuccess: onDone });
      }}
    >
      <Field label={t('admin.materials.name')} value={values.name} onChange={set('name')} />
      <Field
        label={t('admin.materials.description')}
        value={values.description}
        onChange={set('description')}
      />
      <div className="grid grid-cols-3 gap-3">
        <Field
          label={t('admin.materials.price')}
          inputMode="numeric"
          value={values.price}
          onChange={digits('price')}
        />
        <Field
          label={t('admin.materials.discount', { max: MAX_DISCOUNT_PERCENT })}
          inputMode="numeric"
          value={values.discountPercent}
          onChange={digits('discountPercent')}
        />
        <Field
          label={t('admin.materials.stock')}
          inputMode="numeric"
          value={values.stock}
          onChange={digits('stock')}
        />
      </div>
      <label className="flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          className="size-6 accent-mocha"
          checked={values.isActive}
          onChange={(event) => setValues((c) => ({ ...c, isActive: event.target.checked }))}
        />
        {t('admin.materials.active')}
      </label>
      {save.isError && <p role="alert">{errorMessage(save.error, t)}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={!valid || save.isPending}>
          {t('common.save')}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

export function MaterialsTab() {
  const { t } = useTranslation();
  const materials = useAdminMaterials();
  const orders = useAdminMaterialOrders();
  const deliver = useDeliverMaterialOrder();
  const [editing, setEditing] = useState<Draft | null>(null);
  const currency = t('common.currency');

  if (materials.isPending) return <LoadingState />;
  if (materials.isError) {
    return (
      <ErrorState
        message={errorMessage(materials.error, t)}
        onRetry={() => void materials.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="admin-materials" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="admin-materials" className="text-lg font-bold">
            {t('admin.materials.catalog')}
          </h2>
          {!editing && (
            <Button onClick={() => setEditing(EMPTY)}>{t('admin.materials.add')}</Button>
          )}
        </div>
        {editing && (
          <MaterialForm key={editing.id ?? 'new'} draft={editing} onDone={() => setEditing(null)} />
        )}
        <ul className="space-y-2">
          {materials.data.map((material) => (
            <li
              key={material.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bisque bg-white/60 p-4"
            >
              <div>
                <p className="font-semibold">
                  {material.name}
                  {!material.isActive && (
                    <span className="ml-2 text-sm text-mocha">({t('admin.materials.hidden')})</span>
                  )}
                </p>
                <p className="text-sm text-mocha">
                  {formatPrice(material.unitPrice, currency)}
                  {material.discountPercent > 0 &&
                    ` (−${material.discountPercent}%, ${formatPrice(material.price, currency)})`}
                  {' · '}
                  {t('admin.materials.stockLine', { count: material.stock })}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setEditing(toDraft(material))}>
                {t('common.edit')}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="admin-material-orders" className="space-y-3">
        <h2 id="admin-material-orders" className="text-lg font-bold">
          {t('admin.materials.orders')}
        </h2>
        {orders.data?.length === 0 && <p className="text-mocha">{t('admin.materials.noOrders')}</p>}
        <ul className="space-y-2">
          {orders.data?.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bisque bg-white/60 p-4"
            >
              <div>
                <p className="font-semibold">{order.workerName}</p>
                <p className="text-sm text-mocha">
                  {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
                </p>
                <p className="text-sm font-semibold">{formatPrice(order.total, currency)}</p>
              </div>
              {order.status === 'paid' ? (
                <Button disabled={deliver.isPending} onClick={() => deliver.mutate(order.id)}>
                  {t('admin.materials.deliver')}
                </Button>
              ) : (
                <span className="font-medium">{t(`materials.status.${order.status}`)}</span>
              )}
            </li>
          ))}
        </ul>
        {deliver.isError && <p role="alert">{errorMessage(deliver.error, t)}</p>}
      </section>
    </div>
  );
}
