import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingState } from '../../components/StateViews';
import { useAuthStore } from '../../stores/auth';
import { CodeStep } from './CodeStep';
import { PhoneStep } from './PhoneStep';
import { WorkerStep } from './WorkerStep';

type Step = 'phone' | 'code' | 'worker';

interface AuthPageProps {
  mode: 'signin' | 'signup';
}

function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function AuthPage({ mode }: AuthPageProps) {
  const status = useAuthStore((s) => s.status);
  if (status !== 'ready') return <LoadingState />;
  return <AuthFlow mode={mode} />;
}

/** Mounted once the session is restored, so the signed-in state at mount decides the first step. */
function AuthFlow({ mode }: AuthPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const wantsWorker = params.get('rol') === 'hunarmand';
  const next = safeNext(params.get('next'));
  const initialUser = useRef(useAuthStore.getState().user).current;
  const needsWorkerOnly = Boolean(initialUser && wantsWorker && !initialUser.workerId);

  const [step, setStep] = useState<Step>(needsWorkerOnly ? 'worker' : 'phone');
  const [phone, setPhone] = useState('');
  const [exposedCode, setExposedCode] = useState<string | undefined>();
  const [name, setName] = useState(initialUser?.name ?? '');

  if (initialUser && !needsWorkerOnly) return <Navigate to={next} replace />;

  const title = wantsWorker
    ? t('auth.workerSignUpTitle')
    : mode === 'signup'
      ? t('auth.signUpTitle')
      : t('auth.signInTitle');

  return (
    <section className="mx-auto w-full max-w-md space-y-6 py-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{step === 'worker' ? t('auth.workerTitle') : title}</h1>
        <p className="text-mocha">{step === 'worker' ? t('auth.workerIntro') : t('auth.intro')}</p>
      </header>

      {step === 'phone' && (
        <PhoneStep
          initialPhone={phone}
          onSent={(digits, code) => {
            setPhone(digits);
            setExposedCode(code);
            setStep('code');
          }}
        />
      )}
      {step === 'code' && (
        <CodeStep
          phone={phone}
          exposedCode={exposedCode}
          askName={mode === 'signup' || wantsWorker}
          onChangePhone={() => setStep('phone')}
          onResent={setExposedCode}
          onVerified={(verifiedName, hasWorker) => {
            setName(verifiedName);
            if (wantsWorker && !hasWorker) setStep('worker');
            else navigate(next, { replace: true });
          }}
        />
      )}
      {step === 'worker' && (
        <WorkerStep
          defaultName={name}
          onDone={() => navigate('/hunarmand/panel', { replace: true })}
        />
      )}

      {step !== 'worker' && (
        <p className="text-center text-mocha">
          {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
          <Link
            to={mode === 'signin' ? '/royxatdan-otish' : '/kirish'}
            className="inline-flex min-h-12 items-center font-semibold text-espresso underline"
          >
            {mode === 'signin' ? t('auth.toSignUp') : t('auth.toSignIn')}
          </Link>
        </p>
      )}
    </section>
  );
}
