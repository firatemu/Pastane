import type { JSX } from 'react';

/** Stat tile mimicking Stitch "Digital Bakery" dashboard cards — soft halo + icons. */
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
  const blur = blurClass(accent);
  const halo = haloClass(accent);
  const sub =
    subtitleTone === 'muted'
      ? 'text-on-surface-variant'
      : subtitleTone === 'danger'
        ? 'text-error'
        : 'text-tertiary';
  const borderCls = emphasized ? 'border border-error-container/55' : 'border border-transparent';

  if (size === 'minimal') {
    return (
      <article
        className={`flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-outline-variant/35 bg-surface-container-lowest px-3 py-2 ${borderCls}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${halo}`}>
            <span className="material-symbols-outlined text-[20px] text-[inherit]">{iconGoogle}</span>
          </div>
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">{label}</span>
        </div>
        <span className="shrink-0 font-display text-lg font-semibold tracking-tight text-on-surface">{value}</span>
      </article>
    );
  }

  const pad = size === 'compact' ? 'p-4' : 'p-6';
  const labelCls = size === 'compact' ? 'text-[11px]' : 'text-sm';
  const valueCls = size === 'compact' ? 'text-2xl' : 'text-3xl';
  const iconWrap = size === 'compact' ? 'h-10 w-10' : 'h-11 w-11';
  const iconSize = size === 'compact' ? 'text-[22px]' : 'text-[24px]';
  const gap = size === 'compact' ? 'gap-3' : 'gap-4';
  const shadow = 'shadow-bakery';

  return (
    <article
      className={`relative flex flex-col ${gap} overflow-hidden rounded-card bg-surface-container-lowest ${pad} ${shadow} transition hover:shadow-[0_8px_16px_rgba(61,43,31,0.08)] ${borderCls}`}
    >
      <div aria-hidden className={`pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full blur-xl ${blur}`} />
      <div className="flex items-start justify-between">
        <span className={`${labelCls} font-semibold uppercase tracking-[0.04em] text-on-surface-variant`}>{label}</span>
        <div className={`flex ${iconWrap} items-center justify-center rounded-full ${halo}`}>
          <span className={`material-symbols-outlined ${iconSize} text-[inherit]`}>{iconGoogle}</span>
        </div>
      </div>
      <div>
        <p className={`font-display ${valueCls} font-semibold tracking-tight text-on-surface`}>{value}</p>
        {subtitle ? <p className={`mt-1 flex items-center gap-1 text-sm font-medium ${sub}`}>{subtitle}</p> : null}
      </div>
    </article>
  );
}

function blurClass(accent: BakeryStatAccent): string {
  switch (accent) {
    case 'tertiary':
      return 'bg-tertiary-container/55';
    case 'surface':
      return 'bg-primary-container';
    case 'alert':
      return 'bg-error-container/40';
    default:
      return 'bg-secondary-container/35';
  }
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
