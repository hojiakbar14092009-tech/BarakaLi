import type { ReactNode } from 'react';

interface ToolButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

/** Round 48 px viewer control; the label is announced and shown as a tooltip. */
export function ToolButton({ label, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-12 place-items-center rounded-full bg-mocha text-sugar shadow-soft active:scale-95"
    >
      {children}
    </button>
  );
}
