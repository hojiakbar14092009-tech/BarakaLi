import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { CateringRequestForm } from '../features/catering/CateringRequestForm';
import {
  firstBookableDate,
  requestFormSchema,
  toRequestPayload,
} from '../features/catering/requestForm';
import { useRequestSelection } from '../features/catering/requestSelection';

const NOW = new Date('2026-10-10T08:00:00Z');

function renderForm(onSent = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CateringRequestForm onSent={onSent} />
    </QueryClientProvider>,
  );
  return onSent;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useRequestSelection.setState({ serviceTypeId: null });
});

describe('request form rules', () => {
  const valid = {
    name: 'Malika',
    phone: '901234567',
    serviceTypeId: 'dizayn',
    eventDate: '2099-05-01',
    guestsCount: 20,
    note: '',
  } as const;

  const codes = (input: Record<string, unknown>) => {
    const result = requestFormSchema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it('gives one message code per broken rule', () => {
    expect(codes(valid)).toEqual([]);
    expect(codes({ ...valid, phone: '9012' })).toEqual(['INVALID_PHONE']);
    expect(codes({ ...valid, guestsCount: 0 })).toEqual(['GUESTS_MIN']);
    expect(codes({ ...valid, guestsCount: Number.NaN })).toEqual(['GUESTS_MIN']);
    expect(codes({ ...valid, serviceTypeId: '' })).toEqual(['SERVICE_REQUIRED']);
    expect(codes({ ...valid, eventDate: '' })).toContain('DATE_REQUIRED');
    expect(codes({ ...valid, eventDate: '2000-01-01' })).toEqual(['DATE_NOT_IN_FUTURE']);
  });

  it('has a translated, non-blaming message for each code in both languages', () => {
    for (const code of [
      'NAME_TOO_SHORT',
      'SERVICE_REQUIRED',
      'DATE_REQUIRED',
      'DATE_NOT_IN_FUTURE',
      'GUESTS_MIN',
      'GUESTS_MAX',
      'NOTE_TOO_LONG',
    ]) {
      for (const lng of ['uz', 'ru']) {
        expect(i18n.exists(`validation.${code}`, { lng }), `${lng}:${code}`).toBe(true);
      }
    }
  });

  it('sends the phone with the +998 prefix', () => {
    expect(toRequestPayload(valid).phone).toBe('+998901234567');
  });

  it('offers tomorrow in Tashkent as the first date', () => {
    expect(firstBookableDate(NOW)).toBe('2026-10-11');
    expect(firstBookableDate(new Date('2026-10-10T20:00:00Z'))).toBe('2026-10-12');
  });
});

describe('CateringRequestForm', () => {
  it('starts with the service picked on a card', () => {
    useRequestSelection.setState({ serviceTypeId: 'qolmehnat' });
    renderForm();
    expect(screen.getByLabelText('Xizmat turi')).toHaveValue('qolmehnat');
  });

  it('explains on blur how to fix the guest count', async () => {
    renderForm();
    const guests = screen.getByLabelText('Mehmonlar soni');
    fireEvent.change(guests, { target: { value: '0' } });
    fireEvent.blur(guests);
    expect(await screen.findByText('Mehmonlar sonini kiriting: kamida 1 kishi.')).toBeVisible();
  });

  it('posts a valid request and reports success', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ id: 'x' }), { status: 201 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const onSent = renderForm();
    fireEvent.change(screen.getByLabelText('Ismingiz'), { target: { value: 'Malika' } });
    fireEvent.change(screen.getByLabelText('Telefon raqami'), {
      target: { value: '90 123 45 67' },
    });
    fireEvent.change(screen.getByLabelText('Xizmat turi'), { target: { value: 'pishiriq' } });
    fireEvent.change(screen.getByLabelText('Tadbir sanasi'), { target: { value: '2099-05-01' } });
    fireEvent.change(screen.getByLabelText('Mehmonlar soni'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /Soʻrov yuborish/ }));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/catering-requests');
    expect(JSON.parse(String(init.body))).toMatchObject({
      phone: '+998901234567',
      serviceTypeId: 'pishiriq',
      guestsCount: 30,
    });
  });

  it('never calls the request an order or a payment in its success text', () => {
    for (const lng of ['uz', 'ru']) {
      const text = `${i18n.t('catering.form.successTitle', { lng })} ${i18n.t('catering.form.successText', { lng })}`;
      expect(text).not.toMatch(/buyurtma berildi|toʻlov qilindi|заказ оформлен|оплат/i);
    }
  });
});
