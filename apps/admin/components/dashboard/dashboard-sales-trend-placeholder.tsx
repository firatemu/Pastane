import type { JSX } from 'react';

/** Static bar chart motif from Stitch dashboard — illustrative only (no fabricated sales numbers). */

const DAY_LABELS = ['Pzt', 'Sal', 'Çrş', 'Per', 'Cum', 'Cmt', 'Paz'] as const;
const BAR_HEIGHT_PERCENT = ['40%', '65%', '85%', '50%', '70%', '90%', '60%'];

export function DashboardSalesTrendPlaceholder(): JSX.Element {
  return (
    <section className="flex flex-col rounded-card border border-outline-variant/70 bg-surface-container-lowest p-4 shadow-bakery">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Gelir görünümü</p>
        <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-on-surface">Günlük satış görünümü</h3>
        <div className="mt-2 text-sm leading-6 text-on-surface-variant">
          Gerçek rapor grafikleri için Raporlar bölümü kullanılacak; bu alan dashboard ritmini koruyan özet bir yer tutucudur.
        </div>
      </div>

      <div className="relative flex min-h-[192px] flex-1 flex-col rounded-card border border-outline-variant/50 bg-surface-container-low px-4 pb-8 pl-8 pt-10">
        <div className="absolute bottom-10 left-[24px] right-4 border-b border-l border-outline-variant/45" />

        {/* y-axis cues */}
        <span className="absolute left-[2px] top-20 text-[10px] font-medium text-outline">100</span>
        <span className="absolute bottom-28 left-[6px] text-[10px] font-medium text-outline">50</span>
        <span className="absolute bottom-10 left-[10px] text-[10px] font-medium text-outline">0</span>

        <div className="flex h-32 flex-1 items-end gap-2 lg:gap-2.5">
          {DAY_LABELS.map((day, idx) => {
            const highlighted = idx === 2 || idx === 5;
            return (
              <div className="group flex flex-1 flex-col items-center" key={day}>
                <div
                  className={`relative w-full rounded-t-[6px] transition group-hover:bg-tertiary/90 ${
                    highlighted ? 'bg-tertiary shadow-[0_-6px_16px_rgba(122,98,88,0.18)]' : 'bg-primary-container'
                  }`}
                  style={{ height: BAR_HEIGHT_PERCENT[idx] }}
                >
                  <span
                    className={`absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-full border border-outline-variant/60 bg-surface-container-lowest px-2 py-1 text-[10px] font-semibold text-tertiary shadow-sm ${
                      highlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {day}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex justify-between rounded-card border border-outline-variant/50 bg-surface-container-low px-3 py-2.5">
        <span className="text-xs text-on-surface-variant">Haftanın zirvesi</span>
        <span className="text-xs font-semibold text-on-surface">Cumartesi (örnek görsel dil)</span>
      </div>
    </section>
  );
}
