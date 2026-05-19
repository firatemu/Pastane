'use client';

import { useState } from 'react';
import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import type { Product } from '../../lib/catalog/types';
import { ErrorState } from '../shared/async-state';

export function ProductMediaPanel({ product, onChanged }: { product: Product; onChanged: () => Promise<void> }): React.JSX.Element {
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

  return (
    <section className="space-y-4 rounded-3xl border bg-white p-5">
      <h2 className="font-semibold">Ürün görselleri</h2>
      {error ? <ErrorState message={error} /> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button className="rounded-2xl bg-stone-900 px-4 py-2 text-white" onClick={upload}>
          Yükle
        </button>
      </div>
      <input className="w-full rounded-2xl border px-3 py-2" placeholder="Alt metin" value={altText} onChange={(event) => setAltText(event.target.value)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} /> Birincil görsel
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {product.images.map((image) => (
          <article className="rounded-2xl border p-3" key={image.id}>
            <img className="h-28 w-full rounded-xl object-cover" src={image.url} alt={image.altText ?? product.name} />
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>{image.isPrimary ? 'Birincil' : 'Görsel'}</span>
              <button className="text-red-700" onClick={() => remove(image.id)}>
                Sil
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
