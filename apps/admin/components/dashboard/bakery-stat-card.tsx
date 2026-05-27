import type { JSX } from 'react';

/** Dashboard stat tile for the compact enterprise admin surface. */
export type BakeryStatAccent = 'secondary' | 'tertiary' | 'surface' | 'alert';

export function BakeryStatCard({
  label,
  value,
  subtitle,
  subtitleTone = 'tertiary',
  iconGoogle,
  accent,
  emphasized = false,
  size = 'default',
}: Readonly<{
  label: string;
  value: string;
  subtitle?: string;
  subtitleTone?: 'tertiary' | 'muted' | 'danger';
  iconGoogle: string;
  accent: BakeryStatAccent;
  emphasized?: boolean;
  size?: 'default' | 'compact' | 'minimal';
}>): JSX.Element {
  const halo = haloClass(accent);
  const sub =
    subtitleTone === 'muted'
      ? 'text-on-surface-variant'
      : subtitleTone === 'danger'
        ? 'text-error'
        : 'text-tertiary';
  const borderCls = emphasized ? 'border border-error/25 bg-error-container/35' : 'border border-outline-variant/70';

  if (size === 'minimal') {
    return (
      <article
        className={`flex items-center justify-between gap-3 overflow-hidden rounded-xl bg-surface-container-lowest px-3 py-2 shadow-sm ${borderCls}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${halo}`}>
            <span className="material-symbols-outlined text-[18px] text-[inherit]">{iconGoogle}</span>
          </div>
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">{label}</span>
        </div>
        <span className="shrink-0 text-base font-semibold tracking-tight text-on-surface">{value}</span>
      </article>
    );
  }

  const pad = size === 'compact' ? 'p-4' : 'p-5';
  const labelCls = size === 'compact' ? 'text-[10px]' : 'text-[11px]';
  const valueCls = size === 'compact' ? 'text-[1.65rem]' : 'text-[2rem]';
  const iconWrap = size === 'compact' ? 'h-9 w-9' : 'h-10 w-10';
  const iconSize = size === 'compact' ? 'text-[18px]' : 'text-[20px]';
  const gap = size === 'compact' ? 'gap-3' : 'gap-4';

  return (
    <article
      className={`flex flex-col ${gap} rounded-card bg-surface-container-lowest ${pad} shadow-bakery transition hover:border-outline hover:shadow-[0_10px_24px_rgba(24,32,43,0.08)] ${borderCls}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`${labelCls} font-semibold uppercase tracking-[0.12em] text-on-surface-variant`}>{label}</span>
        <div className={`flex ${iconWrap} shrink-0 items-center justify-center rounded-lg ${halo}`}>
          <span className={`material-symbols-outlined ${iconSize} text-[inherit]`}>{iconGoogle}</span>
        </div>
      </div>
      <div>
        <p className={`${valueCls} font-semibold tracking-[-0.03em] text-on-surface`}>{value}</p>
        {subtitle ? <p className={`mt-1 flex items-center gap-1 text-[12px] font-medium leading-5 ${sub}`}>{subtitle}</p> : null}
      </div>
    </article>
  );
}

function haloClass(accent: BakeryStatAccent): string {
  switch (accent) {
    case 'tertiary':
      return 'bg-tertiary-container text-tertiary';
    case 'surface':
      return 'bg-primary-container text-primary';
    case 'alert':
      return 'bg-error-container text-error';
    default:
      return 'bg-secondary-container text-secondary';
  }
}
