'use client';

import { useCallback, useState, type JSX } from 'react';
import type { Product } from '../../lib/catalog/types';
import { can } from '../../lib/permissions/can';
import { formatTry } from '../../lib/format/format-try';
import { ProductMediaPanel } from './product-media-panel';
import { ProductOptionsPanel } from './product-options-panel';
import { ProductPublicationSummary, ProductSaleBadge, ProductStatusPill } from './product-status-pill';
import { adminSecondaryButtonClass } from '../shared/admin-form-controls';

type TabId = 'overview' | 'media' | 'options';

export function ProductDetailTabs({
  product,
  permissions,
  onEdit,
  onClose,
  onChanged,
  readOnly = false,
}: Readonly<{
  product: Product;
  permissions: string[];
  onEdit: () => void;
  onClose: () => void;
  onChanged: () => Promise<void>;
  readOnly?: boolean;
}>): JSX.Element {
  const [tab, setTab] = useState<TabId>('overview');
  const [headerLightbox, setHeaderLightbox] = useState(false);
  const closeHeaderLightbox = useCallback(() => setHeaderLightbox(false), []);

  const canMedia = readOnly || can(permissions, ['media.view', 'media.upload', 'media.delete', 'media.attach']);
  const canOptions = readOnly || can(permissions, ['products.manageOptions']);

  const tabs = (
    [
      { id: 'overview' as const, label: 'Özet', icon: 'info', show: true },
      { id: 'media' as const, label: 'Görseller', icon: 'photo_library', show: canMedia },
      { id: 'options' as const, label: 'Opsiyonlar', icon: 'tune', show: canOptions },
    ] satisfies Array<{ id: TabId; label: string; icon: string; show: boolean }>
  ).filter((t) => t.show);

  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];
  const hasDiscount = product.discountedPrice != null && Number(product.discountedPrice) > 0;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-surface-container-lowest">
      {readOnly ? (
        <p className="border-b border-outline-variant/25 bg-surface-container-low px-6 py-2 text-center text-xs font-medium text-on-surface-variant">
          İnceleme modu — değişiklik için Düzenle'ye tıklayın
        </p>
      ) : null}
      <header className="flex flex-col gap-4 border-b border-outline-variant/30 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-container text-secondary">
            {primaryImage ? (
              <button
                type="button"
                className="group/header relative h-full w-full"
                onClick={() => setHeaderLightbox(true)}
                aria-label="Görseli büyüt"
              >
                <img src={primaryImage.url} alt={primaryImage.altText ?? product.name} className="h-full w-full object-cover transition group-hover/header:brightness-90" />
                <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 transition group-hover/header:bg-black/30">
                  <span className="material-symbols-outlined text-[24px] text-white opacity-0 transition group-hover/header:opacity-100">zoom_in</span>
                </span>
              </button>
            ) : (
              <span className="material-symbols-outlined text-[36px]">bakery_dining</span>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="product-detail-title" className="font-display text-2xl font-semibold tracking-tight text-on-surface">
                {product.name}
              </h2>
              <ProductStatusPill status={product.status} />
              <ProductSaleBadge product={product} />
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">{product.category.name}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span className="text-lg font-semibold text-secondary">{formatTry(product.discountedPrice!)}</span>
                  <span className="text-sm text-on-surface-variant line-through">{formatTry(product.price)}</span>
                </>
              ) : (
                <span className="text-lg font-semibold text-on-surface">{formatTry(product.price)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {can(permissions, ['products.update']) ? (
            <button type="button" className={adminSecondaryButtonClass} onClick={onEdit}>
              <span className="material-symbols-outlined text-[20px]">edit</span>
              Düzenle
            </button>
          ) : null}
          <button type="button" className={adminSecondaryButtonClass} onClick={onClose} aria-label="Detayı kapat">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-outline-variant/25 px-4" aria-label="Ürün sekmeleri">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={
                active
                  ? 'flex items-center gap-2 border-b-2 border-secondary px-4 py-3 text-sm font-semibold text-secondary'
                  : 'flex items-center gap-2 px-4 py-3 text-sm font-medium text-on-surface-variant transition hover:text-on-surface'
              }
            >
              <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'overview' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Yayın ve satış</h3>
              <div className="mt-2">
                <ProductPublicationSummary product={product} />
              </div>
            </div>
            <OverviewBlock title="Kısa açıklama" body={product.shortDescription} empty="Kısa açıklama eklenmemiş." />
            <OverviewBlock title="Detaylı açıklama" body={product.description} empty="Detaylı açıklama eklenmemiş." />
            <OverviewBlock
              title="Hazırlık"
              body={product.preparationMinutes ? `${product.preparationMinutes} dakika` : null}
              empty="Belirtilmemiş"
            />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Alerjenler</h3>
              {product.allergens.length === 0 ? (
                <p className="mt-2 text-[15px] text-on-surface-variant">Alerjen işaretlenmemiş.</p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {product.allergens.map(({ allergen }) => (
                    <li
                      key={allergen.id}
                      className="rounded-full border border-outline-variant/50 bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface"
                    >
                      {allergen.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
        {tab === 'media' && canMedia ? (
          <ProductMediaPanel product={product} permissions={permissions} onChanged={onChanged} embedded readOnly={readOnly} />
        ) : null}
        {tab === 'options' && canOptions ? (
          <ProductOptionsPanel product={product} onChanged={onChanged} embedded readOnly={readOnly} />
        ) : null}
      </div>

      {/* Header görsel lightbox */}
      {headerLightbox && primaryImage ? (
        <HeaderLightbox
          src={primaryImage.url}
          alt={primaryImage.altText ?? product.name}
          onClose={closeHeaderLightbox}
        />
      ) : null}
    </section>
  );
}

function HeaderLightbox({
  src,
  alt,
  onClose,
}: Readonly<{ src: string; alt: string; onClose: () => void }>): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="absolute -right-3 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-on-surface shadow-lg transition hover:bg-surface-container"
          onClick={onClose}
          aria-label="Kapat"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
        <img src={src} alt={alt} className="max-h-[85vh] rounded-xl object-contain shadow-2xl" />
        <p className="mt-3 text-center text-sm font-medium text-white/80">{alt}</p>
      </div>
    </div>
  );
}

function OverviewBlock({ title, body, empty }: Readonly<{ title: string; body: string | null | undefined; empty: string }>): JSX.Element {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-on-surface">{body?.trim() ? body : empty}</p>
    </div>
  );
}