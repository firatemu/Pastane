import { AppState } from 'react-native';
import { useEffect, useRef } from 'react';

/** Same semantics as `@pastane/ui` browser hook: pause in background / offline, backoff on errors. */
export type MobileAdaptivePollOutcome = 'ok' | 'error';

export function useMobileAdaptivePolling({
  poll,
  enabled = true,
  immediate = false,
  baseIntervalMs = 15_000,
  maxIntervalMs = 60_000,
}: {
  poll: () => Promise<MobileAdaptivePollOutcome>;
  enabled?: boolean;
  immediate?: boolean;
  baseIntervalMs?: number;
  maxIntervalMs?: number;
}): void {
  const pollRef = useRef(poll);
  pollRef.current = poll;

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let currentDelay = baseIntervalMs;

    const disarm = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const arm = (): void => {
      if (cancelled || !enabled) return;
      if (AppState.currentState !== 'active') return;
      timer = setTimeout(() => void run(), currentDelay);
    };

    const run = async (): Promise<void> => {
      if (cancelled) return;
      disarm();
      if (AppState.currentState !== 'active') {
        arm();
        return;
      }

      let outcome: MobileAdaptivePollOutcome = 'ok';
      try {
        outcome = await pollRef.current();
      } catch {
        outcome = 'error';
      }
      if (cancelled) return;
      if (outcome === 'ok') currentDelay = baseIntervalMs;
      else currentDelay = Math.min(currentDelay * 2, maxIntervalMs);
      arm();
    };

    const onAppStateChange = (state: typeof AppState.currentState): void => {
      if (state !== 'active' || cancelled) return;
      currentDelay = baseIntervalMs;
      disarm();
      void run();
    };

    const sub = AppState.addEventListener('change', onAppStateChange);

    if (immediate) {
      queueMicrotask(() => void run());
    } else {
      arm();
    }

    return () => {
      cancelled = true;
      disarm();
      sub.remove();
    };
  }, [enabled, immediate, baseIntervalMs, maxIntervalMs]);
}
