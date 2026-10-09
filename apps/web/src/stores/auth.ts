import { create } from 'zustand';
import type { AuthResponse, UserDto } from '@barakali/shared';
import { apiRequest, configureApiAuth } from '../lib/api';

type Status = 'idle' | 'loading' | 'ready';

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  status: Status;
  /** Restores the session from the httpOnly refresh cookie. Safe to call more than once. */
  init: () => Promise<void>;
  setSession: (session: AuthResponse) => void;
  setUser: (user: UserDto) => void;
  signOut: () => Promise<void>;
}

let refreshInFlight: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: 'idle',

  init: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    const token = await refreshSession();
    if (!token) set({ status: 'ready' });
  },

  setSession: (session) =>
    set({ user: session.user, accessToken: session.accessToken, status: 'ready' }),

  setUser: (user) => set({ user }),

  signOut: async () => {
    try {
      await apiRequest<void>('/auth/logout', { method: 'POST' });
    } finally {
      set({ user: null, accessToken: null, status: 'ready' });
    }
  },
}));

/** Single-flight refresh so parallel 401s do not rotate the cookie twice. */
function refreshSession(): Promise<string | null> {
  refreshInFlight ??= apiRequest<AuthResponse>('/auth/refresh', { method: 'POST' })
    .then((session) => {
      useAuthStore.getState().setSession(session);
      return session.accessToken;
    })
    .catch(() => {
      useAuthStore.setState({ user: null, accessToken: null, status: 'ready' });
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

configureApiAuth(() => useAuthStore.getState().accessToken, refreshSession);
