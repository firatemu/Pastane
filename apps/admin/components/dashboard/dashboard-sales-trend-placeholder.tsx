import type { JSX } from 'react';

/** Static bar chart motif from Stitch dashboard — illustrative only (no fabricated sales numbers). */

const DAY_LABELS = ['Pzt', 'Sal', 'Çrş', 'Per', 'Cum', 'Cmt', 'Paz'] as const;
const BAR_HEIGHT_PERCENT = ['40%', '65%', '85%', '50%', '70%', '90%', '60%'];

export function DashboardSalesTrendPlaceholder(): JSX.Element {
  return (
    <section className="flex flex-col rounded-card bg-surface-container-lowest p-6 shadow-bakery">
      <h3 className="mb-stack-md font-display text-2xl font-semibold tracking-tight text-on-surface">Günlük satış görünümü</h3>
      <div className="text-sm text-on-surface-variant mb-6">Gerçek rapor grafikleri için Raporlar bölümü kullanılacak; bu alan Stitch görsel dilini sürdürür.</div>

      <div className="relative flex min-h-[220px] flex-1 flex-col pb-10 pl-2 pt-12">
        <div className="absolute bottom-12 left-[6px] right-0 border-b border-l border-outline-variant/45" />

        {/* y-axis cues */}
        <span className="absolute left-[-4px] top-24 text-[10px] text-outline">100</span>
        <span className="absolute bottom-36 left-[2px] text-[10px] text-outline">50</span>
        <span className="absolute bottom-12 left-1 text-[10px] text-outline">0</span>

        <div className="flex h-40 flex-1 items-end gap-2 lg:gap-3">
          {DAY_LABELS.map((day, idx) => {
            const highlighted = idx === 2 || idx === 5;
            return (
              <div className="group flex flex-1 flex-col items-center" key={day}>
                <div
                  className={`relative w-full rounded-t-sm transition group-hover:bg-secondary/90 ${
                    highlighted ? 'bg-secondary shadow-[0_-4px_10px_rgba(112,90,76,0.28)]' : 'bg-secondary-container/55'
                  }`}
                  style={{ height: BAR_HEIGHT_PERCENT[idx] }}
                >
                  <span className={`absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded bg-surface px-2 py-0.5 text-[10px] font-semibold text-secondary shadow-sm ${highlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {day}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-between rounded-xl border border-outline-variant/25 bg-surface p-4">
        <span className="text-sm text-on-surface-variant">Haftanın zirvesi</span>
        <span className="text-sm font-semibold text-on-surface">Cumartesi (örnek görsel dil)</span>
      </div>
    </section>
  );
}
