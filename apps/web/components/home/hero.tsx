'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { HomeBanner } from '../../lib/catalog/types';

function StaticHeroFallback(): React.JSX.Element {
  return (
    <section className="grid gap-8 rounded-[2rem] border border-amber-200/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(120,53,15,0.08)] sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Günlük taze üretim</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Pastalar, tatlılar ve fırından yeni çıkan lezzetler.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
          Her ürün sayfasında içerik, alerjenler ve özelleştirme seçenekleri açıkça görünür. Sepetten ödemeye tek akışla ilerleyebilir, sipariş durumunu hesabından takip edebilirsin.
        </p>
      </div>
      <div className="rounded-[2rem] bg-gradient-to-br from-amber-100 via-rose-50 to-orange-100 p-6">
        <div className="rounded-[1.5rem] border border-white/80 bg-white/75 p-5 shadow-sm">
          <p className="text-sm font-medium text-stone-500">Vitrin sözü</p>
          <p className="mt-3 text-2xl font-semibold text-stone-950">Sıcak, taze, net.</p>
        </div>
      </div>
    </section>
  );
}

function BannerMedia({ banner }: { banner: HomeBanner }): React.JSX.Element {
  const imageAlt = banner.title ? `${banner.title} — vitrin görseli` : 'Vitrin görseli';
  if (banner.mediaType === 'VIDEO') {
    return (
      <div className="relative min-h-[220px] w-full overflow-hidden rounded-[2rem] sm:min-h-[280px]">
        <video
          className="hidden h-full w-full object-cover sm:block"
          src={banner.desktopMediaUrl}
          title={banner.title}
          muted
          playsInline
          autoPlay
          loop
        />
        <video
          className="h-full w-full object-cover sm:hidden"
          src={banner.mobileMediaUrl}
          title={banner.title}
          muted
          playsInline
          autoPlay
          loop
        />
      </div>
    );
  }
  return (
    <div className="relative min-h-[220px] w-full overflow-hidden rounded-[2rem] sm:min-h-[280px]">
      <picture>
        <source media="(max-width: 639px)" srcSet={banner.mobileMediaUrl} />
        <img src={banner.desktopMediaUrl} alt={imageAlt} className="h-full w-full object-cover" />
      </picture>
    </div>
  );
}

function HomeHeroCarousel({ banners }: { banners: HomeBanner[] }): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const safe = useMemo(() => banners.filter(Boolean), [banners]);
  useEffect(() => {
    if (safe.length <= 1) return undefined;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % safe.length);
    }, 6500);
    return () => window.clearInterval(t);
  }, [safe.length]);
  const current = safe[index]!;
  const goPrev = (): void => setIndex((i) => (i - 1 + safe.length) % safe.length);
  const goNext = (): void => setIndex((i) => (i + 1) % safe.length);
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
    if (safe.length <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };
  return (
    <section
      className="overflow-hidden rounded-[2rem] border border-amber-200/70 bg-stone-950/5 shadow-[0_20px_80px_rgba(120,53,15,0.08)] outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      role="region"
      aria-roledescription="carousel"
      aria-label="Vitrin bannerları"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Slayt {index + 1} / {safe.length}: {current.title}
      </p>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="order-2 flex flex-col justify-center p-6 sm:p-10 lg:order-1">
          {safe.length > 1 ? (
            <div className="mb-4 flex gap-2" aria-label="Banner seçimi">
              {safe.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-current={i === index ? 'true' : undefined}
                  aria-label={`Slayt ${i + 1} / ${safe.length}: ${b.title}`}
                  className={`h-2 flex-1 rounded-full transition ${i === index ? 'bg-amber-600' : 'bg-stone-300'}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          ) : null}
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Günlük taze üretim</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl lg:text-5xl">{current.title}</h1>
          {current.subtitle ? <p className="mt-3 text-lg text-amber-800">{current.subtitle}</p> : null}
          {current.description ? <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">{current.description}</p> : null}
          {current.buttonText && current.buttonUrl ? (
            <Link
              className="mt-6 inline-flex w-fit rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              href={current.buttonUrl}
            >
              {current.buttonText}
            </Link>
          ) : null}
        </div>
        <div className="order-1 lg:order-2">
          <BannerMedia banner={current} />
        </div>
      </div>
    </section>
  );
}

export function HomeHero({ banners }: { banners: HomeBanner[] }): React.JSX.Element {
  if (!banners.length) return <StaticHeroFallback />;
  return <HomeHeroCarousel banners={banners} />;
}
