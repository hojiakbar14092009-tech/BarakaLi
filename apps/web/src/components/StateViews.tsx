import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-mocha">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-espresso">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-wheat py-12 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {hint && <p className="max-w-md px-4 text-mocha">{hint}</p>}
      {action}
    </div>
  );
}
