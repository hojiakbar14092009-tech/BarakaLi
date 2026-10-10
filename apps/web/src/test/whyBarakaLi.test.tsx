import { COMMISSION_RATE_PERCENT } from '@barakali/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import '../i18n';
import { WhyBarakaLi } from '../features/catering/WhyBarakaLi';

const FORBIDDEN = [
  /100\s*%/,
  /kafolat/i,
  /гарант/i,
  /10\s?000/,
  /karta bilan/i,
  /картой/i,
  /payme|click|uzum/i,
  /sms/i,
  /eng yaxshi/i,
  /лучш/i,
  /demo|sinov|namuna|\btest/i,
];

function whyTexts(lang: 'uz' | 'ru'): string {
  const file = join(__dirname, `../i18n/locales/${lang}/catering.json`);
  const json = JSON.parse(readFileSync(file, 'utf8')) as { why: unknown };
  return JSON.stringify(json.why);
}

describe('WhyBarakaLi', () => {
  it('starts on the customers tab with six reasons', () => {
    render(<WhyBarakaLi />);
    const customers = screen.getByRole('tab', { name: 'Mijozlar uchun' });
    expect(customers).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', customers.id);
    expect(within(panel).getAllByRole('listitem')).toHaveLength(6);
  });

  it('switches to the workers tab and shows the commission from the shared constant', () => {
    render(<WhyBarakaLi />);
    fireEvent.click(screen.getByRole('tab', { name: 'Hunarmandlar uchun' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getAllByRole('listitem')).toHaveLength(5);
    expect(panel).toHaveTextContent(`Komissiya atigi ${COMMISSION_RATE_PERCENT}%.`);
  });

  it('moves selection and focus with the arrow, Home and End keys', () => {
    render(<WhyBarakaLi />);
    const customers = screen.getByRole('tab', { name: 'Mijozlar uchun' });
    const workers = screen.getByRole('tab', { name: 'Hunarmandlar uchun' });
    customers.focus();
    fireEvent.keyDown(customers, { key: 'ArrowRight' });
    expect(workers).toHaveAttribute('aria-selected', 'true');
    expect(workers).toHaveFocus();
    expect(customers).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(workers, { key: 'Home' });
    expect(customers).toHaveFocus();
    fireEvent.keyDown(customers, { key: 'End' });
    expect(workers).toHaveFocus();
    fireEvent.keyDown(workers, { key: 'ArrowRight' });
    expect(customers).toHaveAttribute('aria-selected', 'true');
  });

  it.each(['uz', 'ru'] as const)('makes no claim the platform cannot back (%s)', (lang) => {
    const text = whyTexts(lang);
    for (const pattern of FORBIDDEN) expect(text, String(pattern)).not.toMatch(pattern);
  });
});
