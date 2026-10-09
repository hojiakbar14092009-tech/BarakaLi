import { useTranslation } from 'react-i18next';

const STEPS = ['choose', 'order', 'receive'] as const;

export function HowItWorks() {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="home-how" className="space-y-3">
      <h2 id="home-how" className="text-xl font-bold">
        {t('home.howTitle')}
      </h2>
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-4 rounded-card bg-bisque/60 p-4">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-mocha font-bold text-sugar"
            >
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold">{t(`home.steps.${step}.title`)}</h3>
              <p className="text-mocha">{t(`home.steps.${step}.text`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
