'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { adminFetch, adminFetchEnvelope } from '../../lib/api/catalog';
import { allergenSchema } from '../../lib/catalog/schemas';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import { ErrorState, LoadingState } from '../shared/async-state';
import { adminInputClass, adminPrimaryButtonClass } from '../shared/admin-form-controls';
import { AllergensStatsBar } from './allergens-stats-bar';
import { AllergenDetailModal } from './allergen-detail-modal';
import { AllergenFormSheet } from './allergen-form-sheet';

type Form = z.input<typeof allergenSchema>;

export interface AllergenResponse {
  id: string;
  name: string;
  deletedAt?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
  productCount?: number | undefined;
  icon?: string;
}

const emptyForm: Form = { name: '' };

function getAllergenIcon(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('gluten')) return '🌾';
  if (lowerName.includes('süt') || lowerName.includes('laktoz')) return '🥛';
  if (lowerName.includes('yumurta')) return '🥚';
  if (lowerName.includes('fındık')) return '🌰';
  if (lowerName.includes('fıstık')) return '🥜';
  if (lowerName.includes('ceviz')) return '🌳';
  if (lowerName.includes('susam')) return '🫘';
  if (lowerName.includes('soya')) return '🫘';
  if (lowerName.includes('balık')) return '🐟';
  if (lowerName.includes('kabuk')) return '🦐';
  return '⚠️';
}

export function AllergensManager({ permissions }: { permissions: string[] }): JSX.Element {
  const [rows, setRows] = useState<AllergenResponse[]>([]);
  const [selected, setSelected] = useState<AllergenResponse | null>(null);
  const [editing, setEditing] = useState<AllergenResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const form = useForm<Form>({ resolver: zodResolver(allergenSchema), defaultValues: emptyForm });

  // API currently guards allergen mutations via `permissions.manage`.
  const canManage = can(permissions, ['permissions.manage']);
  const canCreate = canManage;
  const canEdit = canManage;

  async function load(): Promise<void> {
    try {
      setError(null);
      interface AllergenItem {
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        deletedAt?: string | null;
        productCount?: number;
      }
      const response = await adminFetchEnvelope<AllergenItem[]>('/allergens?limit=100');
      setRows(
        response.data.map((a) => ({
          id: a.id,
          name: a.name,
          icon: getAllergenIcon(a.name),
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          deletedAt: a.deletedAt,
          productCount: a.productCount,
        })),
      );
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Alerjenler yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(values: Form): Promise<void> {
    try {
      setError(null);
      await adminFetch(`/allergens${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(values),
      });
      setEditing(null);
      setFormOpen(false);
      form.reset(emptyForm);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Alerjen kaydedilemedi.'));
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (!window.confirm('Bu alerjeni silmek istediğinize emin misiniz?')) return;
    try {
      setError(null);
      await adminFetch(`/allergens/${id}`, { method: 'DELETE' });
      setSelected(null);
      await load();
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Alerjen silinemedi.'));
    }
  }

  function openCreate(): void {
    setEditing(null);
    form.reset(emptyForm);
    setFormOpen(true);
  }

  function openEdit(allergen: AllergenResponse): void {
    setSelected(null);
    setEditing(allergen);
    form.reset({ name: allergen.name });
    setFormOpen(true);
  }

  function closeForm(): void {
    setFormOpen(false);
    setEditing(null);
    form.reset(emptyForm);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((a) => a.name.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <section className="space-y-stack-md">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">Alerjenler</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-on-surface-variant">
          Ürünlerde bulunan alerjen ve allerji bilgilerini yönetin.
        </p>
      </header>

      {loading ? (
        <LoadingState label="Alerjen verileri yükleniyor…" />
      ) : error && rows.length === 0 ? (
        <ErrorState message={error} />
      ) : (
        <div className="space-y-stack-md">
          {error ? <ErrorState message={error} /> : null}

          <AllergensStatsBar allergens={rows} />

          <div className="flex flex-col gap-3 rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery lg:flex-row lg:items-end lg:justify-between">
            <label className="block grow space-y-1.5 text-sm font-medium text-on-surface">
              <span className="text-on-surface-variant">Ara</span>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">search</span>
                <input
                  className={`${adminInputClass} pl-10`}
                  placeholder="Alerjen adı…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </label>
            {canCreate ? (
              <button type="button" className={`${adminPrimaryButtonClass} shrink-0`} onClick={openCreate}>
                <span className="material-symbols-outlined text-[20px]">add</span>
                Yeni alerjen
              </button>
            ) : null}
          </div>

          <p className="text-sm text-on-surface-variant">
            {filtered.length === rows.length
              ? `${rows.length} alerjen`
              : `${filtered.length} / ${rows.length} alerjen (filtreli)`}
          </p>

          <div className="overflow-hidden rounded-card border border-outline-variant/35 bg-surface-container-lowest shadow-bakery">
            <div className="-mx-gutter overflow-x-auto px-gutter">
              <table className="w-full min-w-[480px] border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/35">
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Alerjen</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Durum</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Ürün</th>
                    {canEdit && <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant">İşlem</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15 text-[15px]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 4 : 3} className="px-4 py-12 text-center">
                        <span className="material-symbols-outlined text-[40px] text-outline">no_meals</span>
                        <p className="mt-2 text-on-surface-variant">Alerjen bulunamadı</p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((allergen) => {
                      const sel = selected?.id === allergen.id;
                      return (
                        <tr
                          key={allergen.id}
                          className={`cursor-pointer transition ${sel ? 'bg-secondary-container/25' : 'hover:bg-surface-variant/35'}`}
                          onClick={() => setSelected(allergen)}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{allergen.icon ?? getAllergenIcon(allergen.name)}</span>
                              <span className="font-semibold text-on-surface">{allergen.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="rounded-full border border-tertiary/25 bg-tertiary-container px-2.5 py-0.5 text-xs font-semibold text-tertiary">Aktif</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-secondary">
                              {allergen.productCount ?? 0}
                            </span>
                          </td>
                          {canEdit && (
                            <td className="px-4 py-4 text-center">
                              <button
                                type="button"
                                className="inline-flex rounded-full p-1.5 text-on-surface-variant transition hover:bg-surface-container hover:text-secondary"
                                onClick={(e) => { e.stopPropagation(); openEdit(allergen); }}
                                aria-label={`${allergen.name} düzenle`}
                              >
                                <span className="material-symbols-outlined text-[22px]">edit</span>
                              </button>
                              <button
                                type="button"
                                className="ml-1 inline-flex rounded-full p-1.5 text-on-surface-variant transition hover:bg-error-container hover:text-error"
                                onClick={(e) => { e.stopPropagation(); handleDelete(allergen.id); }}
                                aria-label={`${allergen.name} sil`}
                              >
                                <span className="material-symbols-outlined text-[22px]">delete</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AllergenDetailModal
        allergen={selected}
        onEdit={() => {
          if (!selected) return;
          const a = selected;
          setSelected(null);
          openEdit(a);
        }}
        onClose={() => setSelected(null)}
      />

      {canEdit ? (
        <AllergenFormSheet
          open={formOpen}
          editing={editing}
          form={form}
          onClose={closeForm}
          onSubmit={submit}
        />
      ) : null}
    </section>
  );
}