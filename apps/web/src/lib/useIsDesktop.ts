import { useSyncExternalStore } from 'react';

/** Laptops and desktops; matches Tailwind's `lg` breakpoint. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

function query(): MediaQueryList | undefined {
  return typeof window === 'undefined' ? undefined : window.matchMedia?.(DESKTOP_QUERY);
}

function subscribe(onChange: () => void): () => void {
  const list = query();
  list?.addEventListener('change', onChange);
  return () => list?.removeEventListener('change', onChange);
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false);
}
