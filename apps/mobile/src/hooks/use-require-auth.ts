import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import type { AuthState } from '@/types';

/** Redirects unauthenticated users to `/login`. Returns `ready` when auth is resolved. */
export function useRequireAuth(): { auth: AuthState | null; ready: boolean } {
  const { auth, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !auth) {
      router.replace('/login');
    }
  }, [auth, loading, router]);

  return { auth, ready: !loading && !!auth };
}
