import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav
      aria-label={t('catalog.page', { page, pages })}
      className="flex items-center justify-between gap-3 py-4"
    >
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {t('catalog.prev')}
      </Button>
      <span className="font-medium text-mocha">{t('catalog.page', { page, pages })}</span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        {t('catalog.next')}
      </Button>
    </nav>
  );
}
