import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import '../i18n';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

function Harness({ onConfirm = vi.fn() }: { onConfirm?: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ochish
      </button>
      <ConfirmDialog
        open={open}
        title="Hunarmandni rad etish"
        description="Dilfuza arizasi rad etiladi."
        confirmLabel="Hunarmandni rad etish"
        reason={{
          label: 'Rad etish sababi',
          hint: 'Kamida 10 ta belgi',
          minLength: 10,
          maxLength: 300,
        }}
        destructive
        onConfirm={(reason) => {
          onConfirm(reason);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('moves focus inside, traps Tab, closes on Escape and returns focus', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Ochish' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Hunarmandni rad etish' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const reason = screen.getByLabelText('Rad etish sababi');
    expect(reason).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Bekor qilish' })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('needs a reason of the minimum length before confirming, and passes it trimmed', () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ochish' }));
    const confirm = screen.getByRole('button', { name: 'Hunarmandni rad etish' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Rad etish sababi'), { target: { value: 'qisqa' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Rad etish sababi'), {
      target: { value: '  Hujjatlar yetarli emas  ' },
    });
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('Hujjatlar yetarli emas');
  });

  it('closes on a backdrop click but not on a click inside', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Ochish' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
