import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoadingState } from '../../components/StateViews';
import { useAuthStore } from '../../stores/auth';
import { requestAdminCode } from './api';
import { CodeStep } from './CodeStep';
import { PhoneStep } from './PhoneStep';

/**
 * Administrator sign-in. The server decides everything from ADMIN_PHONES: other numbers get no
 * code, and the number itself only travels in a POST body, never in the URL.
 */
export default function AdminLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const [phone, setPhone] = useState<string | null>(null);
  const [exposedCode, setExposedCode] = useState<string | undefined>();

  if (status !== 'ready') return <LoadingState />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  return (
    <section className="mx-auto w-full max-w-md space-y-6 py-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('auth.admin.title')}</h1>
        <p className="text-mocha">{t('auth.admin.intro')}</p>
      </header>
      {phone === null ? (
        <PhoneStep
          initialPhone=""
          send={requestAdminCode}
          onSent={(digits, code) => {
            setPhone(digits);
            setExposedCode(code);
          }}
        />
      ) : (
        <CodeStep
          phone={phone}
          exposedCode={exposedCode}
          askName={false}
          send={requestAdminCode}
          onChangePhone={() => setPhone(null)}
          onResent={setExposedCode}
          onVerified={() => navigate('/admin', { replace: true })}
        />
      )}
    </section>
  );
}
