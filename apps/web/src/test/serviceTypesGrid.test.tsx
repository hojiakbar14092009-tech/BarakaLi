import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import '../i18n';
import { useRequestSelection } from '../features/catering/requestSelection';
import { ServiceTypesGrid } from '../features/catering/ServiceTypesGrid';
import { useLanguageStore } from '../stores/language';

function renderGrid() {
  return render(
    <MemoryRouter>
      <ServiceTypesGrid />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  useLanguageStore.getState().setLanguage('uz');
  useRequestSelection.setState({ serviceTypeId: null });
});

describe('ServiceTypesGrid', () => {
  it('shows the four service types with a photo, title and request link each', () => {
    renderGrid();
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Tikuvchilik',
      'Pishiriq va tort',
      'Qoʻl mehnati',
      'Dizayn',
    ]);
    for (const card of cards) expect(within(card).getByRole('img')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dizayn: soʻrov yuborish' })).toHaveAttribute(
      'href',
      '/#catering-sorov',
    );
  });

  it('remembers the picked service for the request form', () => {
    renderGrid();
    fireEvent.click(screen.getByRole('link', { name: 'Pishiriq va tort: soʻrov yuborish' }));
    expect(useRequestSelection.getState().serviceTypeId).toBe('pishiriq');
  });

  it('switches titles to Russian', () => {
    useLanguageStore.getState().setLanguage('ru');
    renderGrid();
    expect(screen.getByRole('heading', { name: 'Выпечка и торты' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Шитьё: отправить заявку' })).toBeInTheDocument();
  });
});
