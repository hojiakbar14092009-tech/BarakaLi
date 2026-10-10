import { CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../../stores/toast';

/** Short success notices, announced politely and dismissed on their own; opacity/transform only. */
export function Toaster() {
  const { t } = useTranslation();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="animate-dialog-in pointer-events-auto flex min-h-12 items-center gap-3 rounded-field bg-espresso px-4 py-2 text-sugar shadow-soft"
        >
          <CheckCircle2 className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          <span>{t(`toast.${toast.messageKey}`)}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label={t('common.close')}
            className="grid size-12 shrink-0 place-items-center rounded-field hover:bg-sugar/10"
          >
            <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
