'use client';

import { useCallback, useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { can } from '../../lib/permissions/can';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { Product } from '../../lib/catalog/types';
import { adminInputClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from '../shared/admin-form-controls';
import { ErrorState } from '../shared/async-state';
import { ProductMediaGalleryDialog } from './product-media-gallery-dialog';

export function ProductMediaPanel({
  product,
  permissions,
  onChanged,
  embedded = false,
  readOnly = false,
}: Readonly<{
  product: Product;
  permissions: string[];
  onChanged: () => Promise<void>;
  embedded?: boolean;
  readOnly?: boolean;
}>): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [primary, setPrimary] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const canUpload = !readOnly && can(permissions, ['media.upload']);
  const canDelete = !readOnly && can(permissions, ['media.delete']);
  const canOpenGallery = !readOnly && can(permissions, ['media.view']) && can(permissions, ['media.attach']);
  const nextSortOrder = product.images.reduce((maxValue, image) => Math.max(maxValue, image.sortOrder), -1) + 1;

  async function upload(): Promise<void> {
    if (!file) return;
    try {
      setInfo(null);
      setError(null);
      const data = new FormData();
      data.set('file', file);
      data.set('productId', product.id);
      data.set('altText', altText);
      data.set('isPrimary', String(primary));
      await adminFetch('/media/upload', { method: 'POST', body: data });
      setFile(null);
      setAltText('');
      setPrimary(false);
      await onChanged();
      setInfo('Görsel başarıyla yüklendi.');
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Görsel yüklenemedi.'));
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      setInfo(null);
      setError(null);
      await adminFetch(`/media/${id}`, { method: 'DELETE' });
      await onChanged();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Görsel silinemedi.'));
    }
  }

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState('');

  const openLightbox = useCallback((src: string, alt: string) => {
    setLightboxSrc(src);
    setLightboxAlt(alt);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxSrc(null);
    setLightboxAlt('');
  }, []);

  const shell = embedded ? 'space-y-4' : 'space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery';

  return (
    <section className={shell}>
      {embedded ? null : <h2 className="font-display text-lg font-semibold text-on-surface">Ürün görselleri</h2>}
      {info ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">{info}</div>
      ) : null}
      {error ? <ErrorState message={error} /> : null}

      {canUpload || canOpenGallery ? (
        <div className="space-y-4 rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Yeni görsel ekle</h3>
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                {canUpload && canOpenGallery
                  ? 'Dosya yükleyin veya galerideki mevcut bir görseli ürüne bağlayın.'
                  : canOpenGallery
                    ? 'Sunucudaki mevcut görseller arasından seçim yapın.'
                    : 'Dosya yükleyerek yeni bir ürün görseli ekleyin.'}
              </p>
            </div>
            {canOpenGallery ? (
              <button
                type="button"
                className={`${adminSecondaryButtonClass} shrink-0`}
                onClick={() => setGalleryOpen(true)}
              >
                <span className="material-symbols-outlined text-[18px]">photo_library</span>
                Galeriden ekle
              </button>
            ) : null}
          </div>

          {canUpload ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-on-surface">
                <span className="text-on-surface-variant">Dosya seç</span>
                <input
                  type="file"
                  accept="image/*"
                  className={`${adminInputClass} mt-1.5 w-full min-w-0`}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <input
                className={adminInputClass}
                placeholder="Alt metin (opsiyonel)"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-on-surface">
                <input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} />
                Birincil görsel
              </label>
              <button type="button" className={`${adminPrimaryButtonClass} w-full`} onClick={upload} disabled={!file}>
                Yükle
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {product.images.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Görsel eklenmemiş.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {product.images.map((image) => (
            <article className="group overflow-hidden rounded-2xl border border-outline-variant/35" key={image.id}>
              <button
                type="button"
                className="relative block w-full cursor-pointer"
                onClick={() => openLightbox(image.url, image.altText ?? product.name)}
              >
                <img
                  className="aspect-[4/3] w-full object-cover transition group-hover:brightness-90"
                  src={image.url}
                  alt={image.altText ?? product.name}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                  <span className="material-symbols-outlined text-[32px] text-white opacity-0 transition group-hover:opacity-100">zoom_in</span>
                </span>
                {image.isPrimary ? (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary-container px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    Birincil
                  </span>
                ) : null}
              </button>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-on-surface-variant">
                  {image.isPrimary ? 'Birincil görsel' : 'Görsel'}
                </span>
                {canDelete ? (
                  <button type="button" className="flex items-center gap-1 text-sm font-semibold text-error transition hover:opacity-80" onClick={() => remove(image.id)}>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Sil
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute -right-3 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-on-surface shadow-lg transition hover:bg-surface-container"
              onClick={closeLightbox}
              aria-label="Kapat"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
            <img src={lightboxSrc} alt={lightboxAlt} className="max-h-[85vh] rounded-xl object-contain shadow-2xl" />
            <p className="mt-3 text-center text-sm font-medium text-white/80">{lightboxAlt}</p>
          </div>
        </div>
      ) : null}

      <ProductMediaGalleryDialog
        open={galleryOpen}
        productId={product.id}
        productName={product.name}
        defaultSortOrder={nextSortOrder}
        onClose={() => setGalleryOpen(false)}
        onAttached={onChanged}
      />
    </section>
  );
}
