import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadStoredAuth, login as apiLogin, logout as apiLogout, register as apiRegister, saveStoredAuth } from '../api/client';
import type { AuthState } from '../types';

interface AuthContextValue {
  auth: AuthState | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (values: { firstName: string; lastName: string; phone: string; email?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setAuth(await loadStoredAuth());
  }, []);

  useEffect(() => {
    void loadStoredAuth().then((stored) => {
      setAuth(stored);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    const next = await apiLogin(phone, password);
    setAuth(next);
  }, []);

  const register = useCallback(
    async (values: { firstName: string; lastName: string; phone: string; email?: string; password: string }) => {
      const next = await apiRegister(values);
      setAuth(next);
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setAuth(null);
  }, []);

  const value = useMemo(
    () => ({ auth, loading, login, register, logout, refreshSession }),
    [auth, loading, login, register, logout, refreshSession],
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
