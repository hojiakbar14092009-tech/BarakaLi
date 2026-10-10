import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PiggyBank } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { savingsGoalSchema, type SavingsGoalDto } from '@barakali/shared';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { apiRequest } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatPrice } from '../../lib/format';

const KEY = ['savings-goal'] as const;

interface GoalResponse {
  goal: SavingsGoalDto | null;
}

function useSavingsGoal() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiRequest<GoalResponse>('/my/savings-goal', { auth: true }),
  });
}

function useSetGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (targetAmount: number) =>
      apiRequest<GoalResponse>('/my/savings-goal', {
        method: 'PUT',
        body: { targetAmount },
        auth: true,
      }),
    onSuccess: (data) => client.setQueryData(KEY, data),
  });
}

function useClearGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<void>('/my/savings-goal', { method: 'DELETE', auth: true }),
    onSuccess: () => client.setQueryData<GoalResponse>(KEY, { goal: null }),
  });
}

/** The goal is a personal tracker, not a bank account: progress is earnings since it was set. */
export function SavingsGoal() {
  const { t } = useTranslation();
  const query = useSavingsGoal();
  const set = useSetGoal();
  const clear = useClearGoal();
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(false);
  const currency = t('common.currency');
  const goal = query.data?.goal ?? null;
  const parsed = savingsGoalSchema.safeParse({ targetAmount: Number(value) });
  const percent = goal ? Math.min(100, Math.round((goal.saved / goal.targetAmount) * 100)) : 0;
  const showForm = editing || (!goal && query.isSuccess);

  return (
    <section
      aria-labelledby="savings-title"
      className="space-y-3 rounded-card border border-bisque bg-white/60 p-4"
    >
      <h2 id="savings-title" className="flex items-center gap-2 text-xl font-bold">
        <PiggyBank className="size-6 text-mocha" aria-hidden="true" />
        {t('savings.title')}
      </h2>
      {goal && (
        <div className="space-y-2">
          <p className="text-lg font-semibold">
            {t('savings.progress', {
              saved: formatPrice(goal.saved, currency),
              target: formatPrice(goal.targetAmount, currency),
            })}
          </p>
          <div
            role="progressbar"
            aria-label={t('savings.title')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-4 overflow-hidden rounded-full bg-bisque"
          >
            <div className="h-full rounded-full bg-mocha" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-sm text-mocha">
            {percent >= 100 ? t('savings.reached') : t('savings.percent', { percent })}
          </p>
        </div>
      )}
      {!goal && query.isSuccess && <p className="text-mocha">{t('savings.intro')}</p>}
      {showForm ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (parsed.success) {
              set.mutate(parsed.data.targetAmount, {
                onSuccess: () => {
                  setEditing(false);
                  setValue('');
                },
              });
            }
          }}
        >
          <Field
            label={t('savings.targetLabel')}
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))}
          />
          {set.isError && <p role="alert">{errorMessage(set.error, t)}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={!parsed.success || set.isPending}>
              {t('common.save')}
            </Button>
            {goal && (
              <Button variant="secondary" onClick={() => setEditing(false)}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </form>
      ) : (
        goal && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setValue(String(goal.targetAmount));
                setEditing(true);
              }}
            >
              {t('savings.change')}
            </Button>
            <Button variant="ghost" disabled={clear.isPending} onClick={() => clear.mutate()}>
              {t('savings.remove')}
            </Button>
          </div>
        )
      )}
    </section>
  );
}
