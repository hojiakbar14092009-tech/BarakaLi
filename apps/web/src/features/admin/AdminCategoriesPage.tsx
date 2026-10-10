import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminCategoryDto } from '@barakali/shared';
import { Button } from '../../components/Button';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Field } from '../../components/Field';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { errorMessage } from '../../lib/errors';
import { useAdminCategories, useUpdateCategory } from './api';
import { SectionPage } from './SectionPage';

function CategoryRow({ category }: { category: AdminCategoryDto }) {
  const { t } = useTranslation();
  const update = useUpdateCategory();
  const [editing, setEditing] = useState(false);
  const [toggle, setToggle] = useState(false);
  const [nameUz, setNameUz] = useState(category.nameUz);
  const [nameRu, setNameRu] = useState(category.nameRu);
  const nextActive = !category.isActive;

  const save = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(
      {
        id: category.id,
        input: { nameUz: nameUz.trim(), nameRu: nameRu.trim(), isActive: category.isActive },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-card border border-bisque bg-white/60 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-field bg-bisque text-mocha">
        <CategoryIcon slug={category.slug} className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {category.nameUz} <span className="text-mocha">/ {category.nameRu}</span>
        </p>
        <p className="text-sm text-mocha">
          {category.isActive ? t('admin.categories.active') : t('admin.categories.inactive')} ·{' '}
          {t('admin.categories.productsCount', { count: category.productsCount })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => setEditing((value) => !value)}
          aria-label={`${t('common.edit')}: ${category.nameUz}`}
        >
          {t('common.edit')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setToggle(true)}
          aria-label={`${nextActive ? t('admin.categories.enable') : t('admin.categories.disable')}: ${category.nameUz}`}
        >
          {nextActive ? t('admin.categories.enable') : t('admin.categories.disable')}
        </Button>
      </div>
      {editing && (
        <form onSubmit={save} className="w-full space-y-3 rounded-field bg-bisque/50 p-4">
          <Field
            label={t('admin.categories.nameUz')}
            value={nameUz}
            onChange={(event) => setNameUz(event.target.value)}
            required
          />
          <Field
            label={t('admin.categories.nameRu')}
            value={nameRu}
            onChange={(event) => setNameRu(event.target.value)}
            required
          />
          {update.isError && (
            <p role="alert" className="font-medium">
              {errorMessage(update.error, t)}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={update.isPending}>
              {t('common.save')}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}
      {toggle && (
        <ConfirmDialog
          open
          title={t(`admin.categories.dialog.${nextActive ? 'enable' : 'disable'}.title`)}
          description={t(`admin.categories.dialog.${nextActive ? 'enable' : 'disable'}.text`, {
            name: category.nameUz,
          })}
          confirmLabel={nextActive ? t('admin.categories.enable') : t('admin.categories.disable')}
          destructive={!nextActive}
          pending={update.isPending}
          error={update.isError ? errorMessage(update.error, t) : undefined}
          onConfirm={() =>
            update.mutate(
              {
                id: category.id,
                input: { nameUz: category.nameUz, nameRu: category.nameRu, isActive: nextActive },
              },
              { onSuccess: () => setToggle(false) },
            )
          }
          onClose={() => setToggle(false)}
        />
      )}
    </li>
  );
}

export default function AdminCategoriesPage() {
  const { t } = useTranslation();
  const categories = useAdminCategories();
  return (
    <SectionPage titleKey="categories">
      <p className="text-mocha">{t('admin.categories.intro')}</p>
      {categories.isPending && <LoadingState />}
      {categories.isError && (
        <ErrorState
          message={errorMessage(categories.error, t)}
          onRetry={() => void categories.refetch()}
        />
      )}
      <ul className="space-y-2">
        {categories.data?.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </ul>
    </SectionPage>
  );
}
