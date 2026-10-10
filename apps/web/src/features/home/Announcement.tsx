import { Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePublicSettings } from '../catalog/api';

/** The notice an administrator sets in settings; nothing renders when it is empty. */
export function Announcement() {
  const { i18n } = useTranslation();
  const settings = usePublicSettings();
  const lang = i18n.language === 'ru' ? 'ru' : 'uz';
  const text = settings.data?.announcement?.[lang]?.trim();
  if (!text) return null;
  return (
    <p
      role="note"
      className="flex items-start gap-3 rounded-card border border-bisque bg-bisque/60 px-4 py-3 text-espresso"
    >
      <Megaphone
        className="mt-0.5 size-5 shrink-0 text-mocha"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="whitespace-pre-line break-words">{text}</span>
    </p>
  );
}
