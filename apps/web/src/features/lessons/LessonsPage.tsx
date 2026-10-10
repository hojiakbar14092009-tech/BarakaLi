import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LESSONS = ['income', 'pricing', 'clients', 'saving'] as const;
const POINTS = ['p1', 'p2', 'p3', 'p4'] as const;

/** Static course content from the translation files; a CMS can replace it later. */
export default function LessonsPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{t('lessons.title')}</h1>
        <p className="text-mocha">{t('lessons.intro')}</p>
      </header>
      <ul className="space-y-4">
        {LESSONS.map((lesson) => (
          <li key={lesson}>
            <article
              aria-labelledby={`lesson-${lesson}`}
              className="space-y-3 rounded-card border border-bisque bg-white/60 p-5"
            >
              <BookOpen className="size-6 text-mocha" aria-hidden="true" strokeWidth={1.5} />
              <h2 id={`lesson-${lesson}`} className="text-xl font-bold">
                {t(`lessons.items.${lesson}.title`)}
              </h2>
              <p className="text-mocha">{t(`lessons.items.${lesson}.summary`)}</p>
              <ol className="list-decimal space-y-2 pl-6">
                {POINTS.map((point) => (
                  <li key={point}>{t(`lessons.items.${lesson}.${point}`)}</li>
                ))}
              </ol>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
