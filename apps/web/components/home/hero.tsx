'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { HomeBanner } from '../../lib/catalog/types';
import { stitchImages } from '../../lib/stitch-design';

function StaticHeroFallback(): React.JSX.Element {
  return (
    <section className="relative -mx-4 flex min-h-[calc(100vh-88px)] items-center justify-center overflow-hidden sm:-mx-6 lg:-mx-12">
      <img
        alt="Koyu çikolatalı katmanlı pasta"
        className="absolute inset-0 h-full w-full object-cover"
        src={stitchImages.hero}
      />
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Rosemary & Wild Honey</p>
        <h1 className="mt-5 font-display text-5xl font-bold leading-tight sm:text-7xl">
          Artisanal decadence, crafted for the discerning.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/85">
          Saf kakao, botanik infüzyonlar ve günlük üretimin sakin lüksüyle tasarlanmış pastane vitrini.
        </p>
        <Link className="stitch-button mt-8 border border-white/20" href="#collections">Koleksiyonları keşfet</Link>
      </div>
    </section>
  );
}

function BannerMedia({ banner }: { banner: HomeBanner }): React.JSX.Element {
  const imageAlt = banner.title ? `${banner.title} — vitrin görseli` : 'Vitrin görseli';
  if (banner.mediaType === 'VIDEO') {
    return (
      <div className="relative h-full w-full overflow-hidden">
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
    <div className="relative h-full w-full overflow-hidden">
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
      className="relative -mx-4 min-h-[calc(100vh-88px)] overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:-mx-6 lg:-mx-12"
      role="region"
      aria-roledescription="carousel"
      aria-label="Vitrin bannerları"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Slayt {index + 1} / {safe.length}: {current.title}
      </p>
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center">
        <div className="max-w-3xl px-6 text-center text-white">
          {safe.length > 1 ? (
            <div className="mx-auto mb-6 flex max-w-xs gap-2" aria-label="Banner seçimi">
              {safe.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-current={i === index ? 'true' : undefined}
                  aria-label={`Slayt ${i + 1} / ${safe.length}: ${b.title}`}
                  className={`h-1.5 flex-1 rounded-full transition ${i === index ? 'bg-gold' : 'bg-white/40'}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          ) : null}
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Günlük taze üretim</p>
          <h1 className="mt-5 font-display text-5xl font-bold leading-tight sm:text-7xl">{current.title}</h1>
          {current.subtitle ? <p className="mt-4 text-lg text-white/85">{current.subtitle}</p> : null}
          {current.description ? <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/80">{current.description}</p> : null}
          {current.buttonText && current.buttonUrl ? (
            <Link
              className="stitch-button mt-8 border border-white/20"
              href={current.buttonUrl}
            >
              {current.buttonText}
            </Link>
          ) : null}
        </div>
        <div className="absolute inset-0 -z-10"><BannerMedia banner={current} /></div>
      </div>
    </section>
  );
}

export function HomeHero({ banners }: { banners: HomeBanner[] }): React.JSX.Element {
  if (!banners.length) return <StaticHeroFallback />;
  return <HomeHeroCarousel banners={banners} />;
}
