import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ALL_CATEGORIES_SLUG, CATEGORY_SLUGS, type ListQuery } from '@barakali/shared';
import { SelectField } from '../../components/Field';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { Pagination } from './Pagination';
import { ProductCard } from './ProductCard';
import { useProducts } from './api';
import { useCategoryNames } from './useCategoryNames';

const SORTS: ListQuery['sort'][] = ['new', 'price_asc', 'price_desc'];

function isKnownCategory(slug: string): boolean {
  return slug === ALL_CATEGORIES_SLUG || (CATEGORY_SLUGS as readonly string[]).includes(slug);
}

/** Unknown or retired categories (old links included) open the full catalog instead. */
export default function CategoryPage() {
  const { kategoriya = ALL_CATEGORIES_SLUG } = useParams();
  const { search } = useLocation();
  if (!isKnownCategory(kategoriya)) {
    return <Navigate to={`/xizmatlar/${ALL_CATEGORIES_SLUG}${search}`} replace />;
  }
  return <CategoryListing kategoriya={kategoriya} />;
}

function CategoryListing({ kategoriya }: { kategoriya: string }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const sort = SORTS.find((value) => value === params.get('sort')) ?? 'new';
  const [draft, setDraft] = useState(q);
  const categories = useCategoryNames();

  const products = useProducts({
    q: q || undefined,
    category: kategoriya === ALL_CATEGORIES_SLUG ? undefined : kategoriya,
    sort,
    page,
  });

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    update({ q: draft.trim() || undefined, page: undefined });
  };

  const title =
    kategoriya === ALL_CATEGORIES_SLUG
      ? t(`categories.${kategoriya}`)
      : (categories.find((c) => c.slug === kategoriya)?.name ?? t(`categories.${kategoriya}`));

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{title}</h1>

      <ul className="flex flex-wrap gap-2" aria-label={t('home.categoriesTitle')}>
        {[
          { slug: ALL_CATEGORIES_SLUG, name: t(`categories.${ALL_CATEGORIES_SLUG}`) },
          ...categories,
        ].map(({ slug, name }) => (
          <li key={slug}>
            <Link
              to={`/xizmatlar/${slug}`}
              aria-current={slug === kategoriya ? 'page' : undefined}
              className={`inline-flex min-h-12 items-center rounded-full px-4 font-medium ${
                slug === kategoriya ? 'bg-mocha text-sugar' : 'bg-bisque text-espresso'
              }`}
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <form onSubmit={onSearch} role="search" className="relative">
          <label htmlFor="catalog-search" className="sr-only">
            {t('catalog.searchLabel')}
          </label>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mocha"
            aria-hidden="true"
          />
          <input
            id="catalog-search"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('catalog.searchPlaceholder')}
            enterKeyHint="search"
            className="min-h-12 w-full rounded-field border border-wheat bg-white/70 pl-12 pr-4"
          />
        </form>
        <SelectField
          label={t('catalog.sortLabel')}
          value={sort}
          onChange={(event) => update({ sort: event.target.value, page: undefined })}
          options={SORTS.map((value) => ({ value, label: t(`catalog.sort.${value}`) }))}
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
        <EmptyState title={t('catalog.empty')} hint={t('catalog.emptyHint')} />
      )}
      {products.data && products.data.items.length > 0 && (
        <>
          <p className="text-mocha">{t('catalog.results', { count: products.data.total })}</p>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
          <Pagination
            page={products.data.page}
            pageSize={products.data.pageSize}
            total={products.data.total}
            onChange={(next) => update({ page: next > 1 ? String(next) : undefined })}
          />
        </>
      )}
    </div>
  );
}
