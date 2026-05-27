import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProfileForms } from '../../../components/account/profile-forms';
import { formatTry } from '../../../components/shared/price';
import type { Address, CustomerReview, LoyaltyAccount, LoyaltyMovement, Notification, Profile } from '../../../lib/account/types';
import { apiFetch } from '../../../lib/api/client';
import { getCookieNames } from '../../../lib/auth/session';
import { customerAccountStatusLabel, loyaltyMovementLabel } from '../../../lib/account/display-labels';
import { paymentStatusLabel, statusLabel } from '../../../lib/orders/status';
import type { Order } from '../../../lib/orders/types';

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> { try { return await promise; } catch { return fallback; } }
function authHeaders(token: string): { Authorization: string } { return { Authorization: `Bearer ${token}` }; }
function reviewStatus(status: string): string { return status === 'APPROVED' ? 'Yayında' : status === 'REJECTED' ? 'Reddedildi' : 'Onay bekliyor'; }

export default async function AccountPage(): Promise<React.JSX.Element> {
  const token = (await cookies()).get(getCookieNames().access)?.value ?? '';
  if (!token) redirect('/giris?neden=oturum');
  const headers = authHeaders(token);
  const [profile, addresses, orders, loyalty, movements, reviews, notifications] = await Promise.all([
    apiFetch<Profile>('/api/v1/users/me', { headers }),
    safe(apiFetch<Address[]>('/api/v1/addresses', { headers }), []),
    safe(apiFetch<Order[]>('/api/v1/orders/my', { headers }), []),
    safe(apiFetch<LoyaltyAccount | null>('/api/v1/loyalty/me', { headers }), null),
    safe(apiFetch<LoyaltyMovement[]>('/api/v1/loyalty/me/movements', { headers }), []),
    safe(apiFetch<CustomerReview[]>('/api/v1/reviews/me', { headers }), []),
    safe(apiFetch<Notification[]>('/api/v1/notifications/me', { headers }), []),
  ]);
  const recentOrders = orders.slice(0, 3);
  const defaultAddress = addresses.find(address => address.isDefault) ?? addresses[0];
  const recentMovements = movements.slice(0, 4);
  const recentReviews = reviews.slice(0, 4);
  const recentNotifications = notifications.slice(0, 4);

  return (
    <main className="stitch-container py-10 sm:py-12">
      <section className="overflow-hidden rounded-[2rem] bg-primary text-white shadow-ambient">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Hesap merkezi</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Merhaba, {profile.firstName}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75">Profil bilgilerinizi güncelleyin, adreslerinizi yönetin ve sipariş süreçlerinize güvenli şekilde ulaşın.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white">{customerAccountStatusLabel(profile.status)}</span>
            <span className="rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white">{profile.isPhoneVerified ? 'Telefon doğrulandı' : 'Telefon doğrulanmadı'}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
          <div className="stitch-panel rounded-3xl p-5">
            <p className="stitch-eyebrow">Hızlı işlem</p>
            <nav className="mt-4 grid gap-2 text-sm font-semibold">
              <Link className="rounded-2xl bg-surface-low px-4 py-3 text-primary hover:bg-primary hover:text-white" href="/siparisler">Siparişlerim</Link>
              <Link className="rounded-2xl bg-surface-low px-4 py-3 text-primary hover:bg-primary hover:text-white" href="/adresler">Adreslerim</Link>
              <Link className="rounded-2xl bg-surface-low px-4 py-3 text-primary hover:bg-primary hover:text-white" href="/sepet">Sepetim</Link>
              <Link className="rounded-2xl bg-honey px-4 py-3 text-primary hover:bg-gold" href="/shop">Yeni sipariş ver</Link>
            </nav>
          </div>

          <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Profil özeti</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-muted">Ad Soyad</dt><dd className="font-semibold text-primary">{profile.firstName} {profile.lastName}</dd></div>
              <div><dt className="text-muted">Telefon</dt><dd className="font-semibold text-primary">{profile.phone}</dd></div>
              <div><dt className="text-muted">E-posta</dt><dd className="font-semibold text-primary">{profile.email ?? 'Eklenmemiş'}</dd></div>
            </dl>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-3">
            <Link className="rounded-3xl border border-amber-100 bg-amber-50 p-5 transition hover:-translate-y-0.5 hover:border-honey" href="/siparisler">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Siparişler</p>
              <h2 className="mt-2 text-xl font-semibold text-primary">Sipariş geçmişi</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Geçmiş ve güncel siparişlerinizi güvenli alanda inceleyin.</p>
            </Link>
            <Link className="rounded-3xl border border-sky-100 bg-sky-50 p-5 transition hover:-translate-y-0.5 hover:border-sky-200" href="/adresler">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Teslimat</p>
              <h2 className="mt-2 text-xl font-semibold text-primary">Adres yönetimi</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Teslimat adreslerinizi ekleyin, düzenleyin veya varsayılan adresi seçin.</p>
            </Link>
            <Link className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 transition hover:-translate-y-0.5 hover:border-emerald-200" href="/shop">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Alışveriş</p>
              <h2 className="mt-2 text-xl font-semibold text-primary">Yeni sipariş</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Taze pasta, tatlı ve içecek seçeneklerine hızlıca ulaşın.</p>
            </Link>
          </section>

          <ProfileForms profile={profile} />

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="stitch-panel rounded-3xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div><p className="stitch-eyebrow">Operasyon</p><h2 className="mt-2 text-xl font-semibold text-primary">Son siparişler</h2></div>
                <Link className="rounded-full border border-outline-soft/60 px-4 py-2 text-sm font-semibold text-primary hover:border-primary" href="/siparisler">Tümünü gör</Link>
              </div>
              <div className="mt-5 space-y-3">{recentOrders.length ? recentOrders.map(order => <Link className="block rounded-2xl border border-outline-soft/50 bg-gradient-to-r from-amber-50/80 to-white px-4 py-3 hover:border-honey" href={`/siparisler/${order.id}`} key={order.id}><div className="flex justify-between gap-3"><span className="font-semibold text-primary">{order.orderNumber}</span><span className="font-semibold text-primary">{formatTry(order.grandTotal)}</span></div><p className="mt-1 text-sm text-muted">{statusLabel(order.status)} · {paymentStatusLabel(order.payments?.[0]?.status)}</p></Link>) : <p className="rounded-2xl bg-surface-low px-4 py-3 text-sm text-muted">Henüz siparişiniz yok.</p>}</div>
            </div>

            <div className="stitch-panel rounded-3xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div><p className="stitch-eyebrow">Teslimat</p><h2 className="mt-2 text-xl font-semibold text-primary">Varsayılan adres</h2></div>
                <Link className="rounded-full border border-outline-soft/60 px-4 py-2 text-sm font-semibold text-primary hover:border-primary" href="/adresler">Yönet</Link>
              </div>
              {defaultAddress ? <div className="mt-5 rounded-2xl bg-surface-low p-4 text-sm text-muted"><p className="font-semibold text-primary">{defaultAddress.title}{defaultAddress.isDefault ? ' · Varsayılan' : ''}</p><p className="mt-2 leading-6">{defaultAddress.fullAddress}</p><p className="mt-1">{defaultAddress.district} / {defaultAddress.city}</p></div> : <p className="mt-5 rounded-2xl bg-surface-low px-4 py-3 text-sm text-muted">Kayıtlı adresiniz yok.</p>}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <div className="stitch-panel rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3"><div><p className="stitch-eyebrow">Sadakat</p><h2 className="mt-2 text-xl font-semibold text-primary">Puan hareketleri</h2></div><span className="rounded-full bg-honey px-4 py-2 text-sm font-semibold text-primary">{loyalty?.points ?? 0}</span></div>
              <p className="mt-3 break-all text-xs text-muted">QR: {loyalty?.qrCode ?? 'Henüz yok'}</p>
              <div className="mt-4 space-y-2">{recentMovements.length ? recentMovements.map(movement => <div className="rounded-2xl bg-surface-low px-3 py-2 text-sm" key={movement.id}><div className="flex justify-between gap-3"><span className="font-semibold text-primary">{loyaltyMovementLabel(movement.type)}</span><span className="font-semibold text-secondary">{movement.points > 0 ? '+' : ''}{movement.points}</span></div><p className="mt-1 text-xs text-muted">Bakiye: {movement.balanceAfter} · {new Date(movement.createdAt).toLocaleDateString('tr-TR')}{movement.note ? ` · ${movement.note}` : ''}</p></div>) : <p className="text-sm text-muted">Henüz puan hareketi yok.</p>}</div>
            </div>

            <div className="stitch-panel rounded-3xl p-6">
              <p className="stitch-eyebrow">Bildirim merkezi</p>
              <h2 className="mt-2 text-xl font-semibold text-primary">Bildirimler</h2>
              <div className="mt-4 space-y-2">{recentNotifications.length ? recentNotifications.map(item => <div className="rounded-2xl bg-surface-low px-3 py-2 text-sm" key={item.id}><div className="flex justify-between gap-3"><p className="font-semibold text-primary">{item.title}</p><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.readAt ? 'bg-white text-muted' : 'bg-emerald-100 text-emerald-800'}`}>{item.readAt ? 'Okundu' : 'Yeni'}</span></div><p className="mt-1 text-muted">{item.body}</p><p className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString('tr-TR')}</p></div>) : <p className="text-sm text-muted">Henüz bildiriminiz yok.</p>}</div>
            </div>

            <div className="stitch-panel rounded-3xl p-6">
              <p className="stitch-eyebrow">Deneyim</p>
              <h2 className="mt-2 text-xl font-semibold text-primary">Yorumlarım</h2>
              <div className="mt-4 space-y-3">{recentReviews.length ? recentReviews.map(review => <div className="rounded-2xl border border-outline-soft/50 px-4 py-3 text-sm" key={review.id}><div className="flex justify-between gap-3"><Link className="font-semibold text-primary hover:text-secondary" href={review.product?.slug ? `/urun/${review.product.slug}` : '#'}>{review.product?.name ?? 'Ürün'}</Link><span className="text-xs font-semibold text-secondary">{reviewStatus(review.status)}</span></div><p className="mt-1 text-muted">{review.rating}/5 {review.comment ? `· ${review.comment}` : ''}</p><p className="mt-1 text-xs text-muted">{new Date(review.createdAt).toLocaleDateString('tr-TR')}</p></div>) : <p className="text-sm text-muted">Henüz yorumunuz yok.</p>}</div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
