'use client';

import { useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { Product } from '../../lib/catalog/types';
import { adminInputClass, adminPrimaryButtonClass } from '../shared/admin-form-controls';
import { ErrorState } from '../shared/async-state';

export function ProductMediaPanel({
  product,
  onChanged,
  embedded = false,
  readOnly = false,
}: Readonly<{
  product: Product;
  onChanged: () => Promise<void>;
  embedded?: boolean;
  readOnly?: boolean;
}>): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [primary, setPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(): Promise<void> {
    if (!file) return;
    try {
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
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Görsel yüklenemedi.'));
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      setError(null);
      await adminFetch(`/media/${id}`, { method: 'DELETE' });
      await onChanged();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Görsel silinemedi.'));
    }
  }

  const shell = embedded ? 'space-y-4' : 'space-y-4 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-6 shadow-bakery';

  return (
    <section className={shell}>
      {embedded ? null : <h2 className="font-display text-lg font-semibold text-on-surface">Ürün görselleri</h2>}
      {error ? <ErrorState message={error} /> : null}

      {!readOnly ? (
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

      {product.images.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Görsel eklenmemiş.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {product.images.map((image) => (
            <article className="rounded-2xl border border-outline-variant/35 p-3" key={image.id}>
              <img className="h-28 w-full rounded-xl object-cover" src={image.url} alt={image.altText ?? product.name} />
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">{image.isPrimary ? 'Birincil' : 'Görsel'}</span>
                {!readOnly ? (
                  <button type="button" className="font-semibold text-error" onClick={() => remove(image.id)}>
                    Sil
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
