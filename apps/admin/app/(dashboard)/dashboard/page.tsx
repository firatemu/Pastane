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
    <section className="flex flex-col gap-stack-lg pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Yönetim paneli • Genel görünüm</p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-on-surface md:text-5xl">Özet</h1>
            <time className="text-[15px] font-semibold text-on-surface-variant" dateTime={new Date().toISOString()} suppressHydrationWarning>
              {now}
            </time>
          </div>
          <p className="mt-3 max-w-2xl text-base text-on-surface-variant">
            Digital Bakery tasarım diline uygun sıcak krem yüzey, Playfair başlıklar ve Artisanal pastel tonları ile operasyonu tek ekranda izleyin.
          </p>
        </div>
      </header>

      {canMetrics ? (
        <>
          <DashboardLiveMetrics />

          <div className="grid grid-cols-1 gap-gutter xl:grid-cols-5">
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
        <p className="rounded-card border border-outline-variant bg-surface-container-low px-6 py-6 text-[15px] text-on-surface-variant">
          Bu rol için canlı gösterge paneli metrikleri görünür değil. Erişiminiz olduğundan emin değilseniz bir süper yönetici ile iletişime geçin.
        </p>
      )}
    </section>
  );
}
