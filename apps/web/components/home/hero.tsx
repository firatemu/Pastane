'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Category, HomeBanner, Product } from '../../lib/catalog/types';
import { productLabel } from '../../lib/catalog/product-label';
import { stitchImages } from '../../lib/stitch-design';
import { Price } from '../shared/price';

function StaticHeroFallback({ categories, products }: { categories: Category[]; products: Product[] }): React.JSX.Element {
  return (
    <section className="relative min-h-[calc(100vh-88px)] overflow-hidden">
      <img
        alt="Koyu çikolatalı katmanlı pasta"
        className="absolute inset-0 h-full w-full object-cover"
        src={stitchImages.hero}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,20,17,0.82),rgba(18,20,17,0.45),rgba(18,20,17,0.18))]" />
      <HeroContent categories={categories} products={products} title="Taze pasta, tatlı ve fırın lezzetleri şimdi vitrinde." subtitle="Günlük üretim" description="Pastalar, sütlü tatlılar, dondurma, kurabiye ve sıcak fırın ürünlerini hızlıca seç, tek dokunuşla sepete ekle." buttonText="Vitrine git" buttonUrl="/shop" />
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

function HeroProductRail({ products }: { products: Product[] }): React.JSX.Element | null {
  if (!products.length) return null;
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {products.map((product) => {
        const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
        return (
          <Link className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/15 bg-white/12 p-2 pr-3 text-left text-white shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur transition hover:bg-white/18" href={`/urun/${product.slug}`} key={product.id}>
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/12">
              <img alt={image?.altText ?? product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={image?.url ?? stitchImages.tart} />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-sm font-bold">{productLabel(product)}</span>
              <span className="mt-1 block text-xs text-white/70">{product.category.name}</span>
              <div className="mt-1">
                <Price value={product.discountedPrice ?? product.price} previous={null} size="compact" tone="light" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function HeroCategories({ categories }: { categories: Category[] }): React.JSX.Element | null {
  if (!categories.length) return null;
  return (
    <div className="mt-7 flex gap-2 overflow-x-auto pb-1">
      {categories.slice(0, 7).map((category) => (
        <Link className="shrink-0 rounded-full border border-white/16 bg-white/12 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20" href={`/kategori/${category.slug}`} key={category.id}>
          {category.name}
        </Link>
      ))}
    </div>
  );
}

function HeroContent({
  categories,
  products,
  title,
  subtitle,
  description,
  buttonText,
  buttonUrl,
}: {
  categories: Category[];
  products: Product[];
  title: string;
  subtitle: string | null;
  description: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
}): React.JSX.Element {
  return (
    <div className="stitch-container relative z-10 flex min-h-[calc(100vh-88px)] items-center py-8 text-white">
      <div className="w-full max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{subtitle ?? 'Günlük taze üretim'}</p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.02] sm:text-6xl lg:text-7xl">{title}</h1>
        {description ? <p className="mt-5 max-w-2xl text-base leading-7 text-white/82 sm:text-lg">{description}</p> : null}
        <div className="mt-7 flex flex-wrap gap-3">
          <Link className="stitch-button border border-white/20 bg-honey text-primary hover:bg-gold" href={buttonUrl ?? '/shop'}>{buttonText ?? 'Hemen sipariş ver'}</Link>
          <Link className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white backdrop-blur transition hover:bg-white/18" href="#collections">Çok satanlar</Link>
        </div>
        <HeroCategories categories={categories} />
        <HeroProductRail products={products} />
      </div>
    </div>
  );
}

function HomeHeroCarousel({ banners, categories, products }: { banners: HomeBanner[]; categories: Category[]; products: Product[] }): React.JSX.Element {
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
      className="relative min-h-[calc(100vh-88px)] overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      role="region"
      aria-roledescription="carousel"
      aria-label="Vitrin bannerları"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Slayt {index + 1} / {safe.length}: {current.title}
      </p>
      <div className="absolute inset-0"><BannerMedia banner={current} /></div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,20,17,0.84),rgba(18,20,17,0.52),rgba(18,20,17,0.16))]" />
      <HeroContent categories={categories} products={products} title={current.title} subtitle={current.subtitle} description={current.description} buttonText={current.buttonText} buttonUrl={current.buttonUrl} />
      {safe.length > 1 ? (
        <div className="stitch-container absolute bottom-5 left-0 right-0 z-20 flex max-w-xs gap-2" aria-label="Banner seçimi">
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
    </section>
  );
}

export function HomeHero({ banners, categories, products }: { banners: HomeBanner[]; categories: Category[]; products: Product[] }): React.JSX.Element {
  if (!banners.length) return <StaticHeroFallback categories={categories} products={products} />;
  return <HomeHeroCarousel banners={banners} categories={categories} products={products} />;
}
