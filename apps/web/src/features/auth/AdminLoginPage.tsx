import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoadingState } from '../../components/StateViews';
import { useAuthStore } from '../../stores/auth';
import { adminLogin } from './api';
import { PhoneLoginForm } from './PhoneLoginForm';

/**
 * Administrator sign-in by phone number. The server decides everything from ADMIN_PHONES: other
 * numbers get no session, and the number itself only travels in a POST body, never in the URL.
 */
export default function AdminLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status !== 'ready') return <LoadingState />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  return (
    <section className="mx-auto w-full max-w-md space-y-6 py-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('auth.admin.title')}</h1>
        <p className="text-mocha">{t('auth.admin.intro')}</p>
      </header>
      <PhoneLoginForm
        askName={false}
        submit={adminLogin}
        onSignedIn={() => navigate('/admin', { replace: true })}
      />
    </section>
  );
}
