import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MAX_REJECT_REASON_LENGTH,
  MIN_REJECT_REASON_LENGTH,
  type AdminWorkerDto,
} from '@barakali/shared';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { errorMessage } from '../../lib/errors';
import { useApproveWorker, useRejectWorker, useSuspendWorker } from './api';

type Decision = 'approve' | 'reject' | 'suspend';

const DECISIONS: Record<AdminWorkerDto['status'], Decision[]> = {
  pending: ['approve', 'reject'],
  approved: ['suspend'],
  rejected: ['approve'],
  suspended: ['approve'],
};

/** The approve / reject / suspend buttons for one worker, each behind a confirmation dialog. */
export function WorkerActions({ worker }: { worker: AdminWorkerDto }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Decision | null>(null);
  const approve = useApproveWorker();
  const reject = useRejectWorker();
  const suspend = useSuspendWorker();
  const mutations = { approve, reject, suspend };
  const active = open ? mutations[open] : null;

  const confirm = (reason: string) => {
    if (!open) return;
    const done = { onSuccess: () => setOpen(null) };
    if (open === 'approve') approve.mutate(worker.id, done);
    else mutations[open].mutate({ id: worker.id, reason }, done);
  };

  const reasonField = (key: 'reject' | 'suspend') => ({
    label: t(`admin.workers.dialog.${key}.reasonLabel`),
    hint: t('admin.workers.reasonHint', { min: MIN_REJECT_REASON_LENGTH }),
    minLength: MIN_REJECT_REASON_LENGTH,
    maxLength: MAX_REJECT_REASON_LENGTH,
  });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {DECISIONS[worker.status].map((decision) => (
          <Button
            key={decision}
            variant={decision === 'approve' ? 'primary' : 'secondary'}
            onClick={() => setOpen(decision)}
            aria-label={`${t(`admin.workers.${decision}`)}: ${worker.displayName}`}
          >
            {t(`admin.workers.${decision}`)}
          </Button>
        ))}
      </div>
      {open && (
        <ConfirmDialog
          open
          title={t(`admin.workers.dialog.${open}.title`)}
          description={t(`admin.workers.dialog.${open}.text`, { name: worker.displayName })}
          confirmLabel={t(`admin.workers.dialog.${open}.confirm`)}
          reason={open === 'approve' ? undefined : reasonField(open)}
          destructive={open !== 'approve'}
          pending={active?.isPending}
          error={active?.isError ? errorMessage(active.error, t) : undefined}
          onConfirm={confirm}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
