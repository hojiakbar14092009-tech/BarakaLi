import { Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';
import { useCreateMaterialOrder, useMaterialOrders, useMaterials } from './api';

function Stepper({
  value,
  max,
  label,
  onChange,
}: {
  value: number;
  max: number;
  label: string;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      <button
        type="button"
        aria-label={t('materials.less')}
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
        className="grid size-12 place-items-center rounded-field bg-bisque text-espresso disabled:opacity-40"
      >
        <Minus className="size-5" aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center text-lg font-semibold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={t('materials.more')}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="grid size-12 place-items-center rounded-field bg-mocha text-sugar disabled:opacity-40"
      >
        <Plus className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function MaterialsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const materials = useMaterials();
  const orders = useMaterialOrders();
  const create = useCreateMaterialOrder();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const currency = t('common.currency');

  const picked = useMemo(
    () =>
      (materials.data ?? [])
        .map((material) => ({ material, quantity: quantities[material.id] ?? 0 }))
        .filter((line) => line.quantity > 0),
    [materials.data, quantities],
  );
  const total = picked.reduce((sum, line) => sum + line.material.unitPrice * line.quantity, 0);

  const submit = () =>
    create.mutate(
      { items: picked.map((line) => ({ materialId: line.material.id, quantity: line.quantity })) },
      { onSuccess: (order) => void navigate(`/materiallar/tolov/${order.id}`) },
    );

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
    <div className="space-y-5 pb-28 sm:pb-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('materials.title')}</h1>
        <p className="text-mocha">{t('materials.intro')}</p>
      </header>

      {materials.data.length === 0 ? (
        <EmptyState title={t('materials.empty')} hint={t('materials.emptyHint')} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {materials.data.map((material) => (
            <li
              key={material.id}
              className="flex flex-col justify-between gap-3 rounded-card border border-bisque bg-white/60 p-4"
            >
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{material.name}</h2>
                {material.description && <p className="text-mocha">{material.description}</p>}
                <p className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xl font-bold">
                    {formatPrice(material.unitPrice, currency)}
                  </span>
                  {material.discountPercent > 0 && (
                    <>
                      <span className="text-mocha line-through">
                        {formatPrice(material.price, currency)}
                      </span>
                      <span className="rounded-full bg-pistachio px-2 py-0.5 text-sm font-semibold text-espresso">
                        −{material.discountPercent}%
                      </span>
                    </>
                  )}
                </p>
                <p className="text-sm text-mocha">
                  {material.stock > 0
                    ? t('materials.inStock', { count: material.stock })
                    : t('materials.soldOut')}
                </p>
              </div>
              <Stepper
                label={material.name}
                value={quantities[material.id] ?? 0}
                max={material.stock}
                onChange={(next) =>
                  setQuantities((current) => ({ ...current, [material.id]: next }))
                }
              />
            </li>
          ))}
        </ul>
      )}

      {picked.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-bisque bg-sugar p-3 sm:static sm:rounded-card sm:border">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <p className="font-bold">
              {t('materials.total')}: {formatPrice(total, currency)}
            </p>
            <Button size="lg" disabled={create.isPending} onClick={submit}>
              {t('materials.order')}
            </Button>
          </div>
          {create.isError && (
            <p role="alert" className="pt-2 text-center">
              {errorMessage(create.error, t)}
            </p>
          )}
        </div>
      )}

      {orders.data && orders.data.length > 0 && (
        <section aria-labelledby="mat-orders" className="space-y-3">
          <h2 id="mat-orders" className="text-xl font-bold">
            {t('materials.myOrders')}
          </h2>
          <ul className="space-y-2">
            {orders.data.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bisque bg-white/60 p-4"
              >
                <div>
                  <p className="font-semibold">
                    {order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
                  </p>
                  <p className="text-sm text-mocha">
                    {t(`materials.status.${order.status}`)} · {formatPrice(order.total, currency)}
                  </p>
                </div>
                {order.status === 'awaiting_payment' && (
                  <Link
                    to={`/materiallar/tolov/${order.id}`}
                    className="inline-flex min-h-12 items-center rounded-field bg-mocha px-5 font-semibold text-sugar"
                  >
                    {t('orders.payNow')}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
