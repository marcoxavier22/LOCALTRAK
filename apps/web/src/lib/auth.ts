import type { AuthResponse, User } from '@/types';

const TOKEN_KEY = 'localtrak.accessToken';
const REFRESH_TOKEN_KEY = 'localtrak.refreshToken';
const USER_KEY = 'localtrak.user';

function clearLegacyPersistentSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function getToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  clearLegacyPersistentSession();
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  clearLegacyPersistentSession();
  const rawUser = window.sessionStorage.getItem(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as User;
  } catch {
    logout();
    return null;
  }
}

export function saveSession(session: AuthResponse) {
  clearLegacyPersistentSession();
  window.sessionStorage.setItem(TOKEN_KEY, session.accessToken);
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function logout() {
  if (typeof window === 'undefined') {
    return;
  }

  clearLegacyPersistentSession();
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}
