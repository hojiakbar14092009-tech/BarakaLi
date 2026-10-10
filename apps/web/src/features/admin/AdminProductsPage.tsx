import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { PRODUCT_STATUSES, type AdminProductDto } from '@barakali/shared';
import { Button } from '../../components/Button';
import { SelectField } from '../../components/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { useCategories } from '../catalog/api';
import { Pagination } from '../catalog/Pagination';
import { useAdminProducts } from './api';
import { ProductRow } from './ProductRow';
import { SectionPage } from './SectionPage';

export default function AdminProductsPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const workerId = params.get('hunarmand') ?? undefined;
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const categories = useCategories();
  const products = useAdminProducts({
    page,
    status: status || undefined,
    q: q || undefined,
    workerId,
    categoryId: categoryId || undefined,
  });
  const lang = i18n.language === 'ru' ? 'ru' : 'uz';

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setQ(draft.trim());
    setPage(1);
  };

  return (
    <SectionPage titleKey="products">
      <div className="space-y-4">
        {workerId && (
          <p className="flex flex-wrap items-center gap-3 rounded-field bg-bisque/60 px-4 py-2">
            <span>{t('admin.products.workerFilter')}</span>
            <Link
              to={`/admin/hunarmandlar/${workerId}`}
              className="font-semibold underline underline-offset-4"
            >
              {t('admin.products.openWorker')}
            </Link>
            <button
              type="button"
              onClick={() => setParams({})}
              className="min-h-12 font-semibold text-mocha underline underline-offset-4"
            >
              {t('admin.products.clearFilter')}
            </button>
          </p>
        )}
        <form role="search" onSubmit={onSearch} className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="product-search" className="sr-only">
              {t('admin.products.search')}
            </label>
            <input
              id="product-search"
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('admin.products.searchPlaceholder')}
              className="min-h-12 w-full rounded-field border border-wheat bg-white/70 px-4 text-base text-espresso placeholder:text-mocha/70"
            />
          </div>
          <Button type="submit" variant="secondary">
            {t('admin.workers.search.button')}
          </Button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label={t('admin.products.status')}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: t('common.all') },
              ...PRODUCT_STATUSES.map((value) => ({
                value,
                label: t(`admin.products.statuses.${value}`),
              })),
            ]}
          />
          <SelectField
            label={t('admin.products.category')}
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: t('common.all') },
              ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name[lang] })),
            ]}
          />
        </div>
        {products.isPending && <LoadingState />}
        {products.isError && (
          <ErrorState
            message={errorMessage(products.error, t)}
            onRetry={() => void products.refetch()}
          />
        )}
        {products.data && products.data.items.length === 0 && (
          <EmptyState
            title={t('admin.products.empty')}
            hint={t('admin.products.emptyHint')}
            action={
              q || status || categoryId || workerId ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDraft('');
                    setQ('');
                    setStatus('');
                    setCategoryId('');
                    setParams({});
                    setPage(1);
                  }}
                >
                  {t('admin.emptyActions.clearFilters')}
                </Button>
              ) : undefined
            }
          />
        )}
        <ul className="space-y-2">
          {products.data?.items.map((product: AdminProductDto) => (
            <ProductRow key={product.id} product={product} categories={categories.data ?? []} />
          ))}
        </ul>
        {products.data && (
          <Pagination
            page={products.data.page}
            pageSize={products.data.pageSize}
            total={products.data.total}
            onChange={setPage}
          />
        )}
      </div>
    </SectionPage>
  );
}
