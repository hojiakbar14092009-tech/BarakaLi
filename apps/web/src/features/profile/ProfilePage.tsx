import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { telegramUsernameSchema } from '@barakali/shared';
import { Button, buttonClasses } from '../../components/Button';
import { Field } from '../../components/Field';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { errorMessage } from '../../lib/errors';
import { useAuthStore } from '../../stores/auth';
import { updateProfile, updateWorkerProfile } from '../auth/api';

function TelegramField({ current }: { current: string | null }) {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const [value, setValue] = useState(current ?? '');
  const mutation = useMutation({ mutationFn: updateWorkerProfile, onSuccess: setUser });
  const trimmed = value.trim();
  const parsed =
    trimmed === ''
      ? { success: true as const, data: null }
      : telegramUsernameSchema.safeParse(value);

  return (
    <form
      className="space-y-3 rounded-card border border-bisque p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (parsed.success) mutation.mutate({ telegramUsername: parsed.data });
      }}
    >
      <Field
        label={t('profile.telegramLabel')}
        hint={t('profile.telegramHint')}
        placeholder="@username"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        error={!parsed.success ? t('validation.INVALID_TELEGRAM_USERNAME') : undefined}
      />
      {mutation.isError && (
        <p role="alert" className="font-medium">
          {errorMessage(mutation.error, t)}
        </p>
      )}
      {mutation.isSuccess && <p role="status">{t('profile.saved')}</p>}
      <Button
        type="submit"
        variant="secondary"
        className="w-full"
        disabled={!parsed.success || mutation.isPending}
      >
        {t('profile.save')}
      </Button>
    </form>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const signOut = useAuthStore((s) => s.signOut);
  const [name, setName] = useState(user?.name ?? '');
  const mutation = useMutation({ mutationFn: updateProfile, onSuccess: setUser });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-md space-y-6 pb-6">
      <h1 className="text-3xl font-bold">{t('profile.title')}</h1>

      <dl className="space-y-1 rounded-card bg-bisque/60 p-4">
        <div className="flex justify-between gap-3">
          <dt className="text-mocha">{t('profile.phone')}</dt>
          <dd className="font-semibold">{user.phone}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-mocha">{t('profile.roleLabel')}</dt>
          <dd className="font-semibold">{t(`profile.role.${user.role}`)}</dd>
        </div>
      </dl>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim().length >= 2) mutation.mutate({ name: name.trim() });
        }}
      >
        <Field
          label={t('profile.nameLabel')}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
        />
        {mutation.isError && (
          <p role="alert" className="font-medium">
            {errorMessage(mutation.error, t)}
          </p>
        )}
        {mutation.isSuccess && <p role="status">{t('profile.saved')}</p>}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {t('profile.save')}
        </Button>
      </form>

      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{t('profile.language')}</span>
        <LanguageSwitch />
      </div>

      {user.workerId ? (
        <>
          <TelegramField current={user.workerTelegramUsername} />
          <Link to="/hunarmand/panel" className={buttonClasses('secondary', 'md', 'w-full')}>
            {t('profile.openCabinet')}
          </Link>
        </>
      ) : (
        <div className="space-y-2 rounded-card border border-bisque p-4">
          <p>{t('profile.becomeWorkerText')}</p>
          <Link
            to="/royxatdan-otish?rol=hunarmand"
            className={buttonClasses('secondary', 'md', 'w-full')}
          >
            {t('profile.becomeWorker')}
          </Link>
        </div>
      )}

      <Button
        variant="ghost"
        className="w-full"
        onClick={() => {
          void signOut().then(() => navigate('/', { replace: true }));
        }}
      >
        {t('profile.signOut')}
      </Button>
    </div>
  );
}
