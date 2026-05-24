'use client';

import { useEffect, useRef } from 'react';

export type AdaptivePollOutcome = 'ok' | 'error';

export interface UseAdaptivePollingArgs {
  /** Periodic refresh; return `error` to grow the delay (bounded by maxIntervalMs). */
  poll: () => Promise<AdaptivePollOutcome>;
  /** When false, timers are cleared. */
  enabled?: boolean;
  /** Run `poll` once when the hook mounts (single queue microtask). */
  immediate?: boolean;
  /** Default delay after a successful response. */
  baseIntervalMs?: number;
  /** Upper bound after repeated failures. */
  maxIntervalMs?: number;
}

/**
 * Adaptive polling for browser clients: pauses while the tab is hidden or offline,
 * resets delay after success, doubles delay on failure (cap).
 */
export function useAdaptivePolling({
  poll,
  enabled = true,
  immediate = false,
  baseIntervalMs = 15_000,
  maxIntervalMs = 60_000,
}: UseAdaptivePollingArgs): void {
  const pollRef = useRef(poll);
  pollRef.current = poll;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!enabled) return undefined;

    let cancelled = false;
    /** Browser timer id (DOM `setTimeout` → number; avoid Node `Timeout` typings). */
    let timer: number | null = null;
    let currentDelay = baseIntervalMs;

    const arm = (): void => {
      if (cancelled || !enabled) return;
      timer = window.setTimeout(() => void run(), currentDelay);
    };

    const disarm = (): void => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const run = async (): Promise<void> => {
      if (cancelled) return;
      disarm();
      if (document.visibilityState === 'hidden' || !navigator.onLine) {
        arm();
        return;
      }
      let outcome: AdaptivePollOutcome = 'ok';
      try {
        outcome = await pollRef.current();
      } catch {
        outcome = 'error';
      }
      if (cancelled) return;
      if (outcome === 'ok') {
        currentDelay = baseIntervalMs;
      } else {
        currentDelay = Math.min(currentDelay * 2, maxIntervalMs);
      }
      arm();
    };

    const onResume = (): void => {
      if (document.visibilityState === 'hidden' || cancelled) return;
      currentDelay = baseIntervalMs;
      disarm();
      void run();
    };

    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('online', onResume);

    if (immediate) {
      queueMicrotask(() => void run());
    } else {
      arm();
    }

    return () => {
      cancelled = true;
      disarm();
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('online', onResume);
    };
  }, [enabled, immediate, baseIntervalMs, maxIntervalMs]);
}
