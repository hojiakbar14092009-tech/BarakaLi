import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button';
import { TextAreaField } from '../Field';

export interface ReasonField {
  label: string;
  hint: string;
  minLength: number;
  maxLength: number;
}

interface ConfirmDialogProps {
  open: boolean;
  /** Names the action and its target, e.g. "Hunarmandni rad etish". */
  title: string;
  description?: string;
  confirmLabel: string;
  /** When set, a reason of at least `minLength` characters is required before confirming. */
  reason?: ReasonField;
  destructive?: boolean;
  pending?: boolean;
  error?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

const FOCUSABLE = 'button:not([disabled]), textarea, input, a[href]';

/**
 * Modal confirmation: focus moves inside on open, Tab cycles within, Escape and the backdrop close
 * it, and focus returns to the element that opened it. Only opacity and transform are animated.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  reason,
  destructive,
  pending,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [text, setText] = useState('');
  const trimmed = text.trim();
  const reasonOk = !reason || trimmed.length >= reason.minLength;

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    setText('');
    const first = panel.current?.querySelector<HTMLElement>('textarea, button:not([disabled])');
    first?.focus();
    return () => {
      opener.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-espresso/40 p-4 sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onKeyDown={onKeyDown}
        className="animate-dialog-in w-full max-w-md space-y-4 rounded-card bg-sugar p-6 shadow-soft"
      >
        <h2 id={`${id}-title`} className="text-xl font-bold text-espresso">
          {title}
        </h2>
        {description && (
          <p id={`${id}-desc`} className="text-mocha">
            {description}
          </p>
        )}
        {reason && (
          <TextAreaField
            label={reason.label}
            hint={reason.hint}
            rows={3}
            maxLength={reason.maxLength}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        )}
        {error && (
          <p role="alert" className="font-medium text-espresso">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={destructive ? 'secondary' : 'primary'}
            className={destructive ? 'bg-espresso text-sugar hover:bg-mocha' : ''}
            disabled={!reasonOk || pending}
            onClick={() => onConfirm(trimmed)}
          >
            {pending ? t('common.loading') : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
