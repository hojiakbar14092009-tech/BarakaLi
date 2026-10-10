import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import '../i18n';
import { PhoneInput } from '../components/ui/PhoneInput';
import {
  caretAfterDigits,
  formatLocalDigits,
  formatPhoneDisplay,
  toLocalDigits,
} from '../lib/phone';

function Harness({ initial = '', error }: { initial?: string; error?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <PhoneInput label="Telefon raqami" value={value} onChange={setValue} error={error} />
      <output data-testid="digits">{value}</output>
    </>
  );
}

describe('phone helpers', () => {
  it('keeps at most 9 local digits and drops a pasted country code', () => {
    expect(toLocalDigits('90 123 45 67')).toBe('901234567');
    expect(toLocalDigits('+998 90 123 45 67')).toBe('901234567');
    expect(toLocalDigits('abc 12x')).toBe('12');
    expect(toLocalDigits('9012345678999')).toBe('901234567');
  });

  it('formats as 2-3-2-2 while typing', () => {
    expect(formatLocalDigits('9')).toBe('9');
    expect(formatLocalDigits('90')).toBe('90');
    expect(formatLocalDigits('901')).toBe('90 1');
    expect(formatLocalDigits('9012345')).toBe('90 123 45');
    expect(formatLocalDigits('901234567')).toBe('90 123 45 67');
  });

  it('shows stored numbers with the prefix', () => {
    expect(formatPhoneDisplay('+998901234567')).toBe('+998 90 123 45 67');
    expect(formatPhoneDisplay('+99890')).toBe('+99890');
  });

  it('places the caret after the Nth digit', () => {
    expect(caretAfterDigits('90 123 45 67', 0)).toBe(0);
    expect(caretAfterDigits('90 123 45 67', 2)).toBe(2);
    expect(caretAfterDigits('90 123 45 67', 3)).toBe(4);
    expect(caretAfterDigits('90 123 45 67', 9)).toBe(12);
  });
});

describe('PhoneInput', () => {
  it('keeps the +998 prefix inside the same group as the field', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Telefon raqami');
    const group = input.closest('[data-phone-field]');
    expect(group).toHaveTextContent('+998');
    expect(group).toContainElement(input);
  });

  it('accepts only digits, formats them and reports 9 digits', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Telefon raqami');
    fireEvent.change(input, { target: { value: '90a123b4567' } });
    expect(input).toHaveValue('90 123 45 67');
    expect(screen.getByTestId('digits')).toHaveTextContent('901234567');
  });

  it('turns a pasted +998 number into the 9 local digits', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Telefon raqami'), {
      target: { value: '+998 90 123 45 67' },
    });
    expect(screen.getByTestId('digits')).toHaveTextContent('901234567');
  });

  it('uses a phone keyboard, autocompletes the national number and is described by the prefix', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Telefon raqami');
    expect(input).toHaveAttribute('inputmode', 'tel');
    expect(input).toHaveAttribute('autocomplete', 'tel-national');
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('marks the field invalid and shows the message', () => {
    render(<Harness error="Raqam 9 ta raqamdan iborat boʻlsin." />);
    expect(screen.getByLabelText('Telefon raqami')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Raqam 9 ta raqamdan iborat boʻlsin.');
  });
});
