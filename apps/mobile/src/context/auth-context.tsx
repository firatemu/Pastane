import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import {
  fetchMe,
  loadStoredAuth,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  saveStoredAuth,
  setUnauthorizedHandler,
} from '../api/client';
import type { AuthState, User } from '../types';

interface AuthContextValue {
  auth: AuthState | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (values: { firstName: string; lastName: string; phone: string; email?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function hydrateAuth(stored: AuthState | null): Promise<AuthState | null> {
  if (!stored?.accessToken) return null;
  try {
    const user = await fetchMe();
    return { ...stored, user };
  } catch {
    return stored;
  }
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const stored = await loadStoredAuth();
    setAuth(await hydrateAuth(stored));
  }, []);

  useEffect(() => {
    void loadStoredAuth()
      .then((stored) => hydrateAuth(stored))
      .then(setAuth)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuth(null);
      router.replace('/login');
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  const login = useCallback(async (phone: string, password: string) => {
    const next = await apiLogin(phone, password);
    setAuth(next.user ? next : await hydrateAuth(next));
  }, []);

  const register = useCallback(
    async (values: { firstName: string; lastName: string; phone: string; email?: string; password: string }) => {
      const next = await apiRegister(values);
      setAuth(next.user ? next : await hydrateAuth(next));
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setAuth(null);
  }, []);

  const setUser = useCallback((user: User) => {
    setAuth((prev) => (prev ? { ...prev, user } : prev));
  }, []);

  const value = useMemo(
    () => ({ auth, loading, login, register, logout, refreshSession, setUser }),
    [auth, loading, login, register, logout, refreshSession, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export async function setAuthState(auth: AuthState | null): Promise<void> {
  await saveStoredAuth(auth);
}
