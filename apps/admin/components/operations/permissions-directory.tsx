'use client';

import { useEffect, useMemo, useState } from 'react';

import { adminFetch } from '../../lib/api/catalog';
import { adminMessageFromUnknownError } from '../../lib/messages/admin-facing-errors';
import { can } from '../../lib/permissions/can';
import {
  actionLabel,
  moduleIcon,
  moduleLabel,
  permissionActionName,
  permissionLabel,
  permissionModuleName,
  roleHint,
  roleIcon,
  roleLabel,
  roleSortIndex,
} from '../../lib/permissions/presentation';
import type {
  AdminPermissionDefinition,
  AdminPermissionRoleAssignment,
  AdminPermissionsManagementPayload,
} from '../../lib/permissions/types';
import {
  adminInputClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from '../shared/admin-form-controls';
import { ErrorState, LoadingState } from '../shared/async-state';
import { PageSection } from '../shared/page-section';

type PermissionGroup = {
  moduleName: string;
  permissions: AdminPermissionDefinition[];
};

export function PermissionsDirectory({
  permissions: grantedPermissions,
}: Readonly<{ permissions: string[] }>): React.JSX.Element {
  const [data, setData] = useState<AdminPermissionsManagementPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [draftPermissionIds, setDraftPermissionIds] = useState<string[]>([]);

  const canManage = can(grantedPermissions, ['permissions.manage']);

  async function load(preferredRoleName?: string): Promise<void> {
    try {
      setError(null);
      const next = await adminFetch<AdminPermissionsManagementPayload>('/permissions/management');
      setData(next);
      setSelectedRoleName((currentRoleName) =>
        pickSelectedRoleName(next.roles, preferredRoleName ?? currentRoleName, canManage),
      );
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'İzin matrisi yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [canManage]);

  const sortedRoles = useMemo(
    () =>
      [...(data?.roles ?? [])].sort((a, b) => {
        const aIndex = roleSortIndex(a.name);
        const bIndex = roleSortIndex(b.name);

        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }

        return roleLabel(a.name).localeCompare(roleLabel(b.name), 'tr', { sensitivity: 'base' });
      }),
    [data?.roles],
  );

  const selectedRole = useMemo(
    () => sortedRoles.find((role) => role.name === selectedRoleName) ?? sortedRoles[0] ?? null,
    [selectedRoleName, sortedRoles],
  );

  useEffect(() => {
    setSelectedRoleName((currentRoleName) =>
      pickSelectedRoleName(sortedRoles, currentRoleName, canManage),
    );
  }, [canManage, sortedRoles]);

  useEffect(() => {
    setDraftPermissionIds(selectedRole?.permissionIds ?? []);
  }, [selectedRole?.id, selectedRole?.permissionIds]);

  const permissionList = data?.permissions ?? [];
  const permissionById = useMemo(
    () => new Map(permissionList.map((permission) => [permission.id, permission])),
    [permissionList],
  );
  const draftPermissionSet = useMemo(() => new Set(draftPermissionIds), [draftPermissionIds]);
  const originalPermissionSet = useMemo(
    () => new Set(selectedRole?.permissionIds ?? []),
    [selectedRole?.permissionIds],
  );

  const permissionGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    const groups = new Map<string, AdminPermissionDefinition[]>();

    for (const permission of permissionList) {
      const moduleName = permissionModuleName(permission.code);
      const searchable = [
        permission.code,
        moduleLabel(moduleName),
        actionLabel(permissionActionName(permission.code)),
        permissionLabel(permission.code),
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      if (query && !searchable.includes(query)) {
        continue;
      }

      const items = groups.get(moduleName) ?? [];
      items.push(permission);
      groups.set(moduleName, items);
    }

    return [...groups.entries()]
      .map(([moduleName, permissions]) => ({
        moduleName,
        permissions: [...permissions].sort((a, b) =>
          permissionLabel(a.code).localeCompare(permissionLabel(b.code), 'tr', {
            sensitivity: 'base',
          }),
        ),
      }))
      .sort((a, b) =>
        moduleLabel(a.moduleName).localeCompare(moduleLabel(b.moduleName), 'tr', {
          sensitivity: 'base',
        }),
      );
  }, [permissionList, search]);

  const moduleCount = useMemo(
    () => new Set(permissionList.map((permission) => permissionModuleName(permission.code))).size,
    [permissionList],
  );

  const dirty = useMemo(
    () => !sameMembers(draftPermissionIds, selectedRole?.permissionIds ?? []),
    [draftPermissionIds, selectedRole?.permissionIds],
  );

  const addedPermissions = useMemo(
    () =>
      draftPermissionIds
        .filter((permissionId) => !originalPermissionSet.has(permissionId))
        .map((permissionId) => permissionById.get(permissionId))
        .filter((permission): permission is AdminPermissionDefinition => Boolean(permission)),
    [draftPermissionIds, originalPermissionSet, permissionById],
  );

  const removedPermissions = useMemo(
    () =>
      (selectedRole?.permissionIds ?? [])
        .filter((permissionId) => !draftPermissionSet.has(permissionId))
        .map((permissionId) => permissionById.get(permissionId))
        .filter((permission): permission is AdminPermissionDefinition => Boolean(permission)),
    [draftPermissionSet, permissionById, selectedRole?.permissionIds],
  );

  const editableRoles = sortedRoles.filter((role) => role.editable).length;
  const effectiveEditable = Boolean(canManage && selectedRole?.editable);

  async function saveSelectedRole(): Promise<void> {
    if (!selectedRole || !effectiveEditable || !dirty) {
      return;
    }

    const confirmed = window.confirm(
      `${roleLabel(selectedRole.name)} rolü için ${draftPermissionIds.length} izin kaydedilecek. Değişiklik uygulansın mı?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setInfo(null);
      await adminFetch(`/permissions/roles/${selectedRole.name}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissionIds: draftPermissionIds }),
      });
      setInfo(`${roleLabel(selectedRole.name)} rolünün izinleri güncellendi.`);
      await load(selectedRole.name);
    } catch (caught) {
      setError(adminMessageFromUnknownError(caught, 'Rol izinleri güncellenemedi.'));
    } finally {
      setSaving(false);
    }
  }

  function handleRoleSelect(roleName: string): void {
    if (roleName === selectedRole?.name) {
      return;
    }

    if (
      dirty &&
      !window.confirm(
        'Kaydedilmemiş değişiklikleriniz var. Başka role geçerseniz mevcut taslak silinecek. Devam edilsin mi?',
      )
    ) {
      return;
    }

    setInfo(null);
    setSelectedRoleName(roleName);
  }

  function resetDraft(): void {
    if (!selectedRole) {
      return;
    }

    setDraftPermissionIds(selectedRole.permissionIds);
    setInfo(null);
  }

  function updateDraft(updater: (currentIds: Set<string>) => Set<string>): void {
    setDraftPermissionIds((currentIds) =>
      sortPermissionIds([...updater(new Set(currentIds))], permissionById),
    );
  }

  function togglePermission(permissionId: string): void {
    updateDraft((currentIds) => {
      if (currentIds.has(permissionId)) {
        currentIds.delete(permissionId);
      } else {
        currentIds.add(permissionId);
      }
      return currentIds;
    });
  }

  function setModulePermissions(group: PermissionGroup, shouldSelect: boolean): void {
    updateDraft((currentIds) => {
      for (const permission of group.permissions) {
        if (shouldSelect) {
          currentIds.add(permission.id);
        } else {
          currentIds.delete(permission.id);
        }
      }
      return currentIds;
    });
  }

  return (
    <PageSection
      title="İzin Yönetimi"
      description="Rollerin erişim kapsamını modül bazında yönetin. İzin kodları korunur, değişiklikler taslakta hazırlanır ve açık onayla uygulanır."
    >
      {loading ? <LoadingState label="İzin matrisi yükleniyor…" /> : null}
      {!loading && error && !data ? <ErrorState message={error} /> : null}
      {!loading && data ? (
        <div className="space-y-6">
          {error ? <ErrorState message={error} /> : null}
          {info ? (
            <div className="rounded-xl border border-tertiary/25 bg-tertiary-container px-4 py-3 text-sm font-medium text-tertiary">
              {info}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile icon="verified_user" label="Tanımlı izin" value={permissionList.length} />
            <SummaryTile icon="apps" label="Modül" value={moduleCount} />
            <SummaryTile icon="admin_panel_settings" label="Rol" value={sortedRoles.length} />
            <SummaryTile icon="edit_square" label="Düzenlenebilir rol" value={editableRoles} />
          </div>

          <section className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-chocolate">
                    rule_settings
                  </span>
                  <h2 className="font-display text-xl font-semibold text-on-surface">
                    Güvenli yönetim çerçevesi
                  </h2>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">
                  Bu ekran yeni izin kodu üretmez; mevcut kodları rollere atar. Böylece veri modeli
                  korunur, erişim değişiklikleri ise operasyon ekibi tarafından kontrollü biçimde
                  yönetilebilir.
                </p>
              </div>
              <span className="w-fit rounded-full border border-outline-variant/50 bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
                {canManage ? 'Kaydetmeli düzenleme açık' : 'Salt okunur görünüm'}
              </span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <InfoTile
                icon="shield_locked"
                title="Sistem yöneticisi kilitli"
                description="Yanlışlıkla tam yönetim erişimi kaybedilmesin diye ADMIN rolü bu ekrandan değiştirilemez."
              />
              <InfoTile
                icon="draft_orders"
                title="Önce taslak, sonra kaydet"
                description="İşaretlemeler anında uygulanmaz. Değişiklikler yalnızca Kaydet ile API'ye gönderilir."
              />
              <InfoTile
                icon="travel_explore"
                title="Türkçe ve aranabilir sözlük"
                description="Her izin modül ve işlem adıyla gruplanır; hem kodla hem Türkçe açıklamayla aranabilir."
              />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-on-surface">Rol seçimi</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Hangi rolün erişim kapsamını düzenleyeceğinizi seçin.
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                    {sortedRoles.length} rol
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {sortedRoles.map((role) => {
                    const isSelected = selectedRole?.name === role.name;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                          isSelected
                            ? 'border-secondary/50 bg-secondary-container/45 shadow-bakery'
                            : 'border-outline-variant/35 bg-surface-container-low hover:bg-surface-container'
                        }`}
                        onClick={() => handleRoleSelect(role.name)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[20px] text-secondary">
                                {roleIcon(role.name)}
                              </span>
                              <span className="font-semibold text-on-surface">
                                {roleLabel(role.name)}
                              </span>
                            </div>
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-outline">
                              {role.name}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              role.editable
                                ? 'bg-tertiary-container text-tertiary'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {role.editable ? 'Düzenlenebilir' : 'Kilitli'}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                          {role.description ?? roleHint(role.name)}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs font-medium text-on-surface-variant">
                          <span>{role.permissionIds.length} izin</span>
                          <span>{new Set(role.permissionIds).size} aktif</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {selectedRole ? (
                <section className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-chocolate">
                      pending_actions
                    </span>
                    <h2 className="text-lg font-semibold text-on-surface">Seçili rol özeti</h2>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
                    <p>
                      <span className="font-semibold text-on-surface">
                        {roleLabel(selectedRole.name)}
                      </span>{' '}
                      için taslakta{' '}
                      <span className="font-semibold text-on-surface">
                        {draftPermissionIds.length}
                      </span>{' '}
                      izin açık.
                    </p>
                    <p>
                      Eklenen: <span className="font-semibold text-tertiary">{addedPermissions.length}</span>
                    </p>
                    <p>
                      Kaldırılan:{' '}
                      <span className="font-semibold text-error">{removedPermissions.length}</span>
                    </p>
                    <p>
                      Durum:{' '}
                      <span className="font-semibold text-on-surface">
                        {dirty ? 'Kaydedilmemiş değişiklik var' : 'Taslak güncel'}
                      </span>
                    </p>
                  </div>
                </section>
              ) : null}
            </aside>

            <section className="space-y-4">
              {selectedRole ? (
                <div className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery">
                  <div className="flex flex-col gap-4 border-b border-outline-variant/35 pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="material-symbols-outlined text-[22px] text-secondary">
                          {roleIcon(selectedRole.name)}
                        </span>
                        <h2 className="font-display text-xl font-semibold text-on-surface">
                          {roleLabel(selectedRole.name)}
                        </h2>
                        <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                          {selectedRole.name}
                        </span>
                      </div>
                      <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">
                        {selectedRole.description ?? roleHint(selectedRole.name)}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        effectiveEditable
                          ? 'bg-tertiary-container text-tertiary'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {effectiveEditable ? 'Bu rol düzenlenebilir' : 'Bu rolde düzenleme kapalı'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <label className="block space-y-1.5 text-sm font-medium text-on-surface">
                      <span className="text-on-surface-variant">İzin ara</span>
                      <div className="relative">
                        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                          search
                        </span>
                        <input
                          className={`${adminInputClass} pl-10`}
                          placeholder="Modül, işlem adı veya izin kodu…"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                        />
                      </div>
                    </label>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        className={adminSecondaryButtonClass}
                        disabled={!dirty || saving}
                        onClick={resetDraft}
                      >
                        <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                        Taslağı geri al
                      </button>
                      <button
                        type="button"
                        className={adminPrimaryButtonClass}
                        disabled={!effectiveEditable || !dirty || saving}
                        onClick={() => void saveSelectedRole()}
                      >
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        {saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
                      </button>
                    </div>
                  </div>

                  {!canManage ? (
                    <NoticePanel message="Bu görünümde rol yetkilerini inceleyebilirsiniz. Düzenleme yapmak için permissions.manage yetkisi gerekir." />
                  ) : null}
                  {canManage && !selectedRole.editable ? (
                    <NoticePanel message="Bu rol güvenlik nedeniyle kilitlidir. Yanlışlıkla tam yönetim erişimini bozmayı önlemek için panelden değiştirilemez." />
                  ) : null}
                  {dirty ? (
                    <div className="mt-4 rounded-2xl border border-secondary/20 bg-secondary-container/40 p-4">
                      <p className="text-sm font-semibold text-on-surface">Kaydedilmemiş taslak</p>
                      <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                        {addedPermissions.length} izin eklendi, {removedPermissions.length} izin kaldırıldı.
                      </p>
                      {addedPermissions.length > 0 ? (
                        <p className="mt-2 text-sm text-on-surface-variant">
                          Eklenenler: {summarizePermissions(addedPermissions)}
                        </p>
                      ) : null}
                      {removedPermissions.length > 0 ? (
                        <p className="mt-1 text-sm text-on-surface-variant">
                          Kaldırılanlar: {summarizePermissions(removedPermissions)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {permissionGroups.length === 0 ? (
                <div className="rounded-card border border-dashed border-outline-variant/50 bg-surface-container-lowest px-5 py-8 text-sm text-on-surface-variant">
                  Arama ölçütünüzle eşleşen izin bulunamadı.
                </div>
              ) : (
                <div className="space-y-4">
                  {permissionGroups.map((group) => {
                    const selectedCount = group.permissions.filter((permission) =>
                      draftPermissionSet.has(permission.id),
                    ).length;
                    const hasModuleChanges = group.permissions.some(
                      (permission) =>
                        draftPermissionSet.has(permission.id) !== originalPermissionSet.has(permission.id),
                    );
                    const allSelected = selectedCount === group.permissions.length;

                    return (
                      <article
                        key={group.moduleName}
                        className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-5 shadow-bakery"
                      >
                        <div className="flex flex-col gap-3 border-b border-outline-variant/35 pb-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="material-symbols-outlined text-[20px] text-secondary">
                                {moduleIcon(group.moduleName)}
                              </span>
                              <h3 className="text-lg font-semibold text-on-surface">
                                {moduleLabel(group.moduleName)}
                              </h3>
                              <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                                {selectedCount} / {group.permissions.length} seçili
                              </span>
                              {hasModuleChanges ? (
                                <span className="rounded-full bg-secondary-container px-2.5 py-1 text-xs font-semibold text-secondary">
                                  Taslak değişti
                                </span>
                              ) : null}
                            </div>
                            <p className="text-sm leading-6 text-on-surface-variant">
                              {moduleLabel(group.moduleName)} modülündeki erişimleri rol bazında açıp
                              kapatın.
                            </p>
                          </div>

                          {effectiveEditable ? (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                className={adminSecondaryButtonClass}
                                onClick={() => setModulePermissions(group, true)}
                              >
                                Tümünü seç
                              </button>
                              <button
                                type="button"
                                className={adminSecondaryButtonClass}
                                disabled={selectedCount === 0 && !allSelected}
                                onClick={() => setModulePermissions(group, false)}
                              >
                                Modülü temizle
                              </button>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                          {group.permissions.map((permission) => {
                            const checked = draftPermissionSet.has(permission.id);
                            const changed = checked !== originalPermissionSet.has(permission.id);
                            return (
                              <label
                                key={permission.id}
                                className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition ${
                                  changed
                                    ? 'border-secondary/40 bg-secondary-container/35'
                                    : 'border-outline-variant/35 bg-surface-container-low'
                                } ${effectiveEditable ? 'cursor-pointer hover:bg-surface-container' : 'cursor-default'}`}
                              >
                                <span className="space-y-2">
                                  <span className="block font-semibold text-on-surface">
                                    {actionLabel(permissionActionName(permission.code))}
                                  </span>
                                  <span className="block font-mono text-xs text-on-surface-variant">
                                    {permission.code}
                                  </span>
                                  {permission.description ? (
                                    <span className="block text-xs leading-5 text-on-surface-variant">
                                      {permission.description}
                                    </span>
                                  ) : null}
                                </span>
                                <div className="flex shrink-0 items-center gap-3">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                      checked
                                        ? 'bg-tertiary-container text-tertiary'
                                        : 'bg-surface-container-high text-on-surface-variant'
                                    }`}
                                  >
                                    {checked ? 'Açık' : 'Kapalı'}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!effectiveEditable}
                                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-outline-variant/60 text-chocolate focus:ring-secondary/50 disabled:cursor-not-allowed disabled:opacity-60"
                                    onChange={() => togglePermission(permission.id)}
                                  />
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </PageSection>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: string | number }>): React.JSX.Element {
  return (
    <div className="rounded-card border border-outline-variant/35 bg-surface-container-lowest p-4 shadow-bakery">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-on-surface-variant">{label}</span>
        <span className="material-symbols-outlined text-[22px] text-secondary">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-on-surface">{value}</p>
    </div>
  );
}

function InfoTile({
  icon,
  title,
  description,
}: Readonly<{ icon: string; title: string; description: string }>): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-secondary">{icon}</span>
        <p className="font-semibold text-on-surface">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
    </div>
  );
}

function NoticePanel({ message }: Readonly<{ message: string }>): React.JSX.Element {
  return (
    <div className="mt-4 rounded-2xl border border-outline-variant/35 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
      {message}
    </div>
  );
}

function pickSelectedRoleName(
  roles: AdminPermissionRoleAssignment[],
  preferredRoleName: string,
  canManage: boolean,
): string {
  if (preferredRoleName && roles.some((role) => role.name === preferredRoleName)) {
    return preferredRoleName;
  }

  if (canManage) {
    return roles.find((role) => role.editable)?.name ?? roles[0]?.name ?? '';
  }

  return roles[0]?.name ?? '';
}

function sameMembers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function sortPermissionIds(
  permissionIds: string[],
  permissionById: Map<string, AdminPermissionDefinition>,
): string[] {
  return [...new Set(permissionIds)].sort((a, b) => {
    const aCode = permissionById.get(a)?.code ?? a;
    const bCode = permissionById.get(b)?.code ?? b;
    return aCode.localeCompare(bCode, 'tr', { sensitivity: 'base' });
  });
}

function summarizePermissions(permissions: AdminPermissionDefinition[]): string {
  const visible = permissions.slice(0, 4).map((permission) => permissionLabel(permission.code));
  const summary = visible.join(', ');
  return permissions.length > 4 ? `${summary} ve ${permissions.length - 4} izin daha` : summary;
}
