import type { JSX } from 'react';
import { DashboardLiveMetrics } from '../../../components/dashboard/dashboard-live-metrics';
import { DashboardRecentOrders } from '../../../components/dashboard/dashboard-recent-orders';
import { DashboardSalesTrendPlaceholder } from '../../../components/dashboard/dashboard-sales-trend-placeholder';
import { requireAdminSession } from '../../../lib/auth/session';
import { can } from '../../../lib/permissions/can';

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await requireAdminSession();
  const canMetrics = can(session.permissions, ['reports.sales']);
  const showRecentOrders = can(session.permissions, ['orders.viewAll']);
  const now = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <section className="flex flex-col gap-6 pb-10">
      <header className="rounded-card border border-outline-variant/70 bg-surface-container-lowest/90 p-4 shadow-bakery">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-secondary/15 bg-secondary-container px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">
                Yönetim paneli
              </span>
              <span className="rounded-full border border-outline-variant/60 bg-surface-container-low px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                Canlı operasyon özeti
              </span>
            </div>
            <h1 className="mt-4 text-[1.75rem] font-semibold tracking-[-0.03em] text-on-surface md:text-[2rem]">Operasyon özeti</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Sipariş kuyruğu, katalog sağlığı ve teslimat akışı için kritik sinyalleri tek bakışta izleyin.
            </p>
          </div>
          <div className="rounded-card border border-outline-variant/60 bg-surface-container-low px-4 py-3 xl:max-w-xs">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Bugün</p>
            <time className="mt-2 block text-sm font-semibold text-on-surface" dateTime={new Date().toISOString()} suppressHydrationWarning>
              {now}
            </time>
            <p className="mt-2 text-xs leading-5 text-on-surface-variant">
              Öncelikli takip alanı: bekleyen aksiyonlar, kurye atamaları ve katalog görünürlüğü.
            </p>
          </div>
        </div>
      </header>

      {canMetrics ? (
        <>
          <DashboardLiveMetrics />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            {showRecentOrders ? (
              <>
                <div className="xl:col-span-3">
                  <DashboardRecentOrders />
                </div>
                <div className="xl:col-span-2">
                  <DashboardSalesTrendPlaceholder />
                </div>
              </>
            ) : (
              <div className="xl:col-span-5">
                <DashboardSalesTrendPlaceholder />
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="rounded-card border border-outline-variant/60 bg-surface-container-lowest px-4 py-4 text-sm text-on-surface-variant shadow-bakery">
          Bu rol için canlı gösterge paneli metrikleri görünür değil. Erişiminiz olduğundan emin değilseniz bir süper yönetici ile iletişime geçin.
        </p>
      )}
    </section>
  );
}
