import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_ANNOUNCEMENT_LENGTH } from '@barakali/shared';
import { Button } from '../../components/Button';
import { TextAreaField } from '../../components/Field';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { errorMessage } from '../../lib/errors';
import { useAdminSettings, useSaveSettings } from './api';
import { SectionPage } from './SectionPage';

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const settings = useAdminSettings();
  const save = useSaveSettings();
  const [accept, setAccept] = useState(true);
  const [uz, setUz] = useState('');
  const [ru, setRu] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setAccept(settings.data.acceptApplications);
    setUz(settings.data.announcement?.uz ?? '');
    setRu(settings.data.announcement?.ru ?? '');
  }, [settings.data]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    save.mutate(
      { acceptApplications: accept, announcementUz: uz.trim(), announcementRu: ru.trim() },
      { onSuccess: () => setSaved(true) },
    );
  };

  return (
    <SectionPage titleKey="settings">
      {settings.isPending && <LoadingState />}
      {settings.isError && (
        <ErrorState
          message={errorMessage(settings.error, t)}
          onRetry={() => void settings.refetch()}
        />
      )}
      {settings.data && (
        <form onSubmit={submit} className="max-w-2xl space-y-6">
          <section className="space-y-3 rounded-card border border-bisque bg-sugar p-5">
            <h2 className="text-xl font-bold">{t('admin.settings.applicationsTitle')}</h2>
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={accept}
                onChange={(event) => setAccept(event.target.checked)}
                className="size-6 accent-mocha"
              />
              <span>{t('admin.settings.acceptApplications')}</span>
            </label>
            <p className="text-sm text-mocha">{t('admin.settings.applicationsHint')}</p>
          </section>

          <section className="space-y-3 rounded-card border border-bisque bg-sugar p-5">
            <h2 className="text-xl font-bold">{t('admin.settings.announcementTitle')}</h2>
            <p className="text-sm text-mocha">{t('admin.settings.announcementHint')}</p>
            <TextAreaField
              label={t('admin.settings.announcementUz')}
              rows={2}
              maxLength={MAX_ANNOUNCEMENT_LENGTH}
              value={uz}
              onChange={(event) => setUz(event.target.value)}
            />
            <TextAreaField
              label={t('admin.settings.announcementRu')}
              rows={2}
              maxLength={MAX_ANNOUNCEMENT_LENGTH}
              value={ru}
              onChange={(event) => setRu(event.target.value)}
            />
          </section>

          <section className="space-y-2 rounded-card border border-bisque bg-bisque/40 p-5">
            <h2 className="text-xl font-bold">{t('admin.settings.commissionTitle')}</h2>
            <p className="text-3xl font-bold tabular-nums">{settings.data.commissionPercent}%</p>
            <p className="text-sm text-mocha">{t('admin.settings.commissionHint')}</p>
          </section>

          {save.isError && (
            <p role="alert" className="font-medium">
              {errorMessage(save.error, t)}
            </p>
          )}
          {saved && !save.isPending && (
            <p role="status" className="rounded-field bg-pistachio px-4 py-3 font-medium">
              {t('admin.settings.saved')}
            </p>
          )}
          <Button type="submit" size="lg" disabled={save.isPending}>
            {save.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </form>
      )}
    </SectionPage>
  );
}
