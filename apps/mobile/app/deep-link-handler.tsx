import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Handles `pastahane://payment-result?...` from cold start / background / foreground. */
export function PaymentDeepLinkHandler(): React.JSX.Element {
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    function consume(url: string | null): void {
      if (!url || !url.startsWith('pastahane://payment-result')) return;
      const { queryParams } = Linking.parse(url);
      const oid = queryParams?.orderId;
      const st = queryParams?.status;
      const orderId = typeof oid === 'string' ? oid : Array.isArray(oid) ? oid[0] : undefined;
      if (!orderId) return;
      router.replace({
        pathname: '/payment-result',
        params: { orderId, status: typeof st === 'string' ? st : '' },
      } as never);
    }

    void Linking.getInitialURL().then(consume);

    const linkSub = Linking.addEventListener('url', (event) => {
      consume(event.url);
    });

    const stateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        void Linking.getInitialURL().then(consume);
      }
      appState.current = next;
    });

    return () => {
      linkSub.remove();
      stateSub.remove();
    };
  }, [router]);

  return <></>;
}
