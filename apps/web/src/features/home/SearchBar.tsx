import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ALL_CATEGORIES_SLUG } from '@barakali/shared';
import { SearchInput } from '../../components/ui/SearchInput';

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
    <form onSubmit={handleSubmit} role="search">
      <SearchInput
        id="home-search"
        label={t('home.searchLabel')}
        value={query}
        onChange={setQuery}
        placeholder={t('home.searchPlaceholder')}
      />
    </form>
  );
}
