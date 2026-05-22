'use client';

import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { DashboardSummary } from '../../lib/operations/types';
import { BakeryStatCard } from './bakery-stat-card';
import { PollingNote } from '../shared/polling-note';
import { ErrorState, LoadingState } from '../shared/async-state';

type TileConfig = ReadonlyArray<{
  label: string;
  key: keyof DashboardSummary;
  icon: string;
  accent: 'secondary' | 'tertiary' | 'surface' | 'alert';
  subtitle: (value: number) => string | undefined;
  subtitleTone?: 'tertiary' | 'muted' | 'danger';
  emphasizeWhenPositive?: boolean;
}>;

const TILES: TileConfig = [
  {
    label: 'Aksiyon bekleyen',
    key: 'awaitingAction',
    icon: 'pending_actions',
    accent: 'alert',
    emphasizeWhenPositive: true,
    subtitle: (value) =>
      value > 0 ? 'Öncelikli müdahale önerilir' : 'Şu an tüm sıra akıcı görünüyor',
  },
  {
    label: 'Mutfakta hazırlanan',
    key: 'inPreparation',
    icon: 'restaurant',
    accent: 'secondary',
    subtitle: (value) => (value === 1 ? `1 iş emri aktif` : `${value} iş emri aktif`),
  },
  {
    label: 'Kuryeye hazır bekleyen',
    key: 'readyForAssignment',
    icon: 'local_shipping',
    accent: 'tertiary',
    subtitle: (value) => (value === 1 ? `${value} rota oluşturmaya hazır` : `${value} rota bekliyor`),
  },
  {
    label: 'Yayında değil',
    key: 'unpublishedProducts',
    accent: 'alert',
    icon: 'visibility_off',
    emphasizeWhenPositive: true,
    subtitle: (value) => (value === 0 ? undefined : `${value} ürün vitrinde tükendi görünür`),
    subtitleTone: 'danger',
  },
  {
    label: 'Bekleyen yorumlar',
    key: 'pendingReviews',
    icon: 'rate_review',
    accent: 'tertiary',
    subtitle: (value) => (value === 1 ? `${value} yorum doğrulanmayı bekliyor` : `${value} yorum sırasında`),
  },
];

export function DashboardLiveMetrics(): JSX.Element {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    try {
      setError(null);
      setData(await adminFetch<DashboardSummary>('/reports/dashboard-summary'));
    } catch (e) {
      setError(adminMessageFromUnknownError(e, 'Gösterge paneli yüklenemedi.'));
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 20000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-stack-md">
      <PollingNote seconds={20} />
      {error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <LoadingState label="Operasyon özeti güncelleniyor…" />
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
          {TILES.map((cfg) => {
            const numeric = Number(data[cfg.key] ?? 0);
            const sub = cfg.subtitle(numeric);
            const mutedWhenClear = numeric === 0 && cfg.emphasizeWhenPositive;
            const subtitleToneResolved =
              mutedWhenClear ? 'muted' : cfg.emphasizeWhenPositive && numeric > 0 ? (cfg.subtitleTone ?? 'danger') : (cfg.subtitleTone ?? 'tertiary');

            const cardProps = {
              accent: cfg.accent,
              emphasized: Boolean(cfg.emphasizeWhenPositive && numeric > 0),
              iconGoogle: cfg.icon,
              label: cfg.label,
              value: String(numeric),
              subtitleTone: subtitleToneResolved,
            };

            return sub !== undefined ? (
              <BakeryStatCard key={cfg.key} {...cardProps} subtitle={sub} />
            ) : (
              <BakeryStatCard key={cfg.key} {...cardProps} />
            );
          })}
        </div>
      )}
    </div>
  );
}
