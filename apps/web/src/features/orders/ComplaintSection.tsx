import { Flag } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAX_COMPLAINT_REASON_LENGTH,
  MIN_COMPLAINT_REASON_LENGTH,
  type OrderDto,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { TextAreaField } from '../../components/Field';
import { errorMessage } from '../../lib/errors';
import { useCreateComplaint } from './api';

function ComplaintForm({ orderId, onCancel }: { orderId: string; onCancel: () => void }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const mutation = useCreateComplaint(orderId);
  const tooShort = reason.trim().length < MIN_COMPLAINT_REASON_LENGTH;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!tooShort) mutation.mutate({ reason: reason.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <TextAreaField
        label={t('orders.complaint.reasonLabel')}
        placeholder={t('orders.complaint.reasonPlaceholder')}
        hint={t('orders.complaint.hint')}
        maxLength={MAX_COMPLAINT_REASON_LENGTH}
        rows={4}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {mutation.isError && (
        <p role="alert" className="font-medium">
          {errorMessage(mutation.error, t)}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={tooShort || mutation.isPending}
        >
          {t('orders.complaint.submit')}
        </Button>
        <Button variant="secondary" size="lg" className="flex-1" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

/** Either side of an order can file a complaint; an open one is shown as a status note. */
export function ComplaintSection({ order }: { order: OrderDto }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const active = order.complaint?.status === 'open' ? order.complaint : null;

  return (
    <section
      aria-labelledby="order-complaint"
      className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
    >
      <h2 id="order-complaint" className="font-bold">
        {t('orders.complaint.title')}
      </h2>
      {active ? (
        <div className="space-y-1" role="status">
          <p className="font-medium">{t('orders.complaint.sent')}</p>
          <p className="whitespace-pre-line text-mocha">{active.reason}</p>
          <p className="text-sm text-mocha">
            {t('orders.complaint.statusLabel')}: {t(`orders.complaint.status.${active.status}`)}
          </p>
        </div>
      ) : open ? (
        <ComplaintForm orderId={order.id} onCancel={() => setOpen(false)} />
      ) : (
        <Button variant="secondary" size="lg" className="w-full" onClick={() => setOpen(true)}>
          <Flag className="size-5" aria-hidden="true" />
          {t('orders.complaint.button')}
        </Button>
      )}
    </section>
  );
}
