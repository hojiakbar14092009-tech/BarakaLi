import { Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ALL_CATEGORIES_SLUG } from '@barakali/shared';

export function SearchBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(`/xizmatlar/${ALL_CATEGORIES_SLUG}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  return (
    <form onSubmit={handleSubmit} role="search" className="relative">
      <label htmlFor="home-search" className="sr-only">
        {t('home.searchLabel')}
      </label>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mocha"
        aria-hidden="true"
      />
      <input
        id="home-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('home.searchPlaceholder')}
        enterKeyHint="search"
        autoComplete="off"
        className="min-h-14 w-full rounded-card border border-bisque bg-white/60 pl-12 pr-4 text-base text-espresso shadow-soft placeholder:text-mocha/80"
      />
    </form>
  );
}
