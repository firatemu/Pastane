import Image from 'next/image';
import type { JSX } from 'react';

type AdminBrandTone = 'surface' | 'inverse' | 'sidebar';
type AdminBrandSize = 'sm' | 'md';

const SIZE_STYLES: Record<
  AdminBrandSize,
  {
    container: string;
    frame: string;
    imageSize: number;
    eyebrow: string;
    title: string;
    subtitle: string;
  }
> = {
  sm: {
    container: 'gap-2.5',
    frame: 'h-9 w-9 rounded-xl',
    imageSize: 36,
    eyebrow: 'text-[9px] tracking-[0.18em]',
    title: 'text-[13px]',
    subtitle: 'text-xs',
  },
  md: {
    container: 'gap-3',
    frame: 'h-11 w-11 rounded-[1.05rem]',
    imageSize: 44,
    eyebrow: 'text-[10px] tracking-[0.2em]',
    title: 'text-[14px]',
    subtitle: 'text-[13px]',
  },
};

const TONE_STYLES: Record<
  AdminBrandTone,
  {
    frame: string;
    eyebrow: string;
    title: string;
    subtitle: string;
  }
> = {
  surface: {
    frame: 'border border-outline-variant/60 bg-white shadow-sm',
    eyebrow: 'text-on-surface-variant/80',
    title: 'text-on-surface',
    subtitle: 'text-on-surface-variant',
  },
  inverse: {
    frame: 'border border-white/12 bg-white/95 shadow-[0_12px_26px_rgba(15,23,42,0.18)]',
    eyebrow: 'text-white/70',
    title: 'text-white',
    subtitle: 'text-white/74',
  },
  sidebar: {
    frame: 'border border-sidebar-border bg-white shadow-sm',
    eyebrow: 'text-sidebar-muted/90',
    title: 'text-sidebar-foreground',
    subtitle: 'text-sidebar-muted',
  },
};

export function AdminBrand({
  eyebrow,
  title,
  subtitle,
  tone = 'surface',
  size = 'md',
  className = '',
  priority = false,
}: Readonly<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: AdminBrandTone;
  size?: AdminBrandSize;
  className?: string;
  priority?: boolean;
}>): JSX.Element {
  const sizeStyles = SIZE_STYLES[size];
  const toneStyles = TONE_STYLES[tone];

  return (
    <div className={`flex items-center ${sizeStyles.container} ${className}`.trim()}>
      <div className={`flex shrink-0 items-center justify-center overflow-hidden ${sizeStyles.frame} ${toneStyles.frame}`.trim()}>
        <Image
          alt="Azem Yazılım logosu"
          className="h-full w-full object-contain"
          height={sizeStyles.imageSize}
          priority={priority}
          src="/brand/azem-yazilim-logo.jpeg"
          width={sizeStyles.imageSize}
        />
      </div>
      <div className="min-w-0">
        {eyebrow ? (
          <p className={`font-semibold uppercase ${sizeStyles.eyebrow} ${toneStyles.eyebrow}`.trim()}>{eyebrow}</p>
        ) : null}
        <p className={`truncate font-semibold tracking-[0.04em] ${sizeStyles.title} ${toneStyles.title}`.trim()}>{title}</p>
        {subtitle ? <p className={`mt-0.5 truncate ${sizeStyles.subtitle} ${toneStyles.subtitle}`.trim()}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
