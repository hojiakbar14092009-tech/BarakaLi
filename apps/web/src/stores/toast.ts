import { create } from 'zustand';

export interface Toast {
  id: number;
  /** i18n key under `toast.` */
  messageKey: string;
}

interface ToastState {
  toasts: Toast[];
  push: (messageKey: string) => void;
  dismiss: (id: number) => void;
}

export const TOAST_TTL_MS = 4000;
let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (messageKey) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, messageKey }] }));
    setTimeout(
      () => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      TOAST_TTL_MS,
    );
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
