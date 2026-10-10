import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import { Toaster } from '../components/ui/Toaster';
import { TOAST_TTL_MS, useToastStore } from '../stores/toast';

beforeEach(() => {
  vi.useFakeTimers();
  useToastStore.setState({ toasts: [] });
});
afterEach(() => vi.useRealTimers());

describe('Toaster', () => {
  it('announces a success politely, can be closed, and goes away on its own', () => {
    render(<Toaster />);
    act(() => useToastStore.getState().push('approved'));
    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Hunarmand tasdiqlandi.');
    expect(toast.parentElement).toHaveAttribute('aria-live', 'polite');

    act(() => useToastStore.getState().push('saved'));
    expect(screen.getAllByRole('status')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Yopish' })[0] as HTMLElement);
    expect(screen.getAllByRole('status')).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(TOAST_TTL_MS + 10);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
