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

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
    <section className="rounded-[2rem] border border-amber-200/70 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Hesabım</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold">Merhaba, {profile.firstName}</h1><p className="mt-2 text-sm text-stone-600">Profil, sipariş, adres, puan ve bildirim bilgilerinizi buradan takip edebilirsiniz.</p></div><span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">{customerAccountStatusLabel(profile.status)}</span></div>
    </section>

    <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Profil özeti</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-stone-500">Ad Soyad</dt><dd className="font-medium">{profile.firstName} {profile.lastName}</dd></div><div><dt className="text-stone-500">Telefon</dt><dd className="font-medium">{profile.phone}</dd></div><div><dt className="text-stone-500">E-posta</dt><dd className="font-medium">{profile.email ?? 'Eklenmemiş'}</dd></div><div><dt className="text-stone-500">Telefon doğrulama</dt><dd className="font-medium">{profile.isPhoneVerified ? 'Doğrulandı' : 'Doğrulanmadı'}</dd></div></dl></div>
      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Hızlı bağlantılar</h2><div className="mt-4 grid gap-2 text-sm"><Link className="rounded-2xl border px-4 py-3 hover:bg-amber-50" href="/siparisler">Siparişlerim</Link><Link className="rounded-2xl border px-4 py-3 hover:bg-amber-50" href="/adresler">Adreslerim</Link><Link className="rounded-2xl border px-4 py-3 hover:bg-amber-50" href="/sepet">Sepetim</Link><Link className="rounded-2xl border px-4 py-3 hover:bg-amber-50" href="/odeme">Ödeme</Link></div></div>
    </section>

    <ProfileForms profile={profile} />

    <section className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Puanlarım</h2><span className="text-2xl font-semibold">{loyalty?.points ?? 0}</span></div><p className="mt-2 break-all text-xs text-stone-500">QR: {loyalty?.qrCode ?? 'Henüz yok'}</p><div className="mt-4 space-y-2">{recentMovements.length ? recentMovements.map(movement => <div className="rounded-2xl bg-stone-50 px-3 py-2 text-sm" key={movement.id}><div className="flex justify-between gap-3"><span>{loyaltyMovementLabel(movement.type)}</span><span className="font-medium">{movement.points > 0 ? '+' : ''}{movement.points}</span></div><p className="mt-1 text-xs text-stone-500">Bakiye: {movement.balanceAfter} · {new Date(movement.createdAt).toLocaleDateString('tr-TR')}{movement.note ? ` · ${movement.note}` : ''}</p></div>) : <p className="text-sm text-stone-600">Henüz puan hareketi yok.</p>}</div></div>
      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Adres özeti</h2><Link className="text-sm font-medium text-amber-800" href="/adresler">Yönet</Link></div>{defaultAddress ? <div className="mt-4 text-sm text-stone-700"><p className="font-medium">{defaultAddress.title}{defaultAddress.isDefault ? ' · Varsayılan' : ''}</p><p className="mt-2">{defaultAddress.fullAddress}</p><p className="mt-1 text-stone-500">{defaultAddress.district} / {defaultAddress.city}</p></div> : <p className="mt-4 text-sm text-stone-600">Kayıtlı adresiniz yok.</p>}</div>
      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Bildirimler</h2><div className="mt-4 space-y-2">{recentNotifications.length ? recentNotifications.map(item => <div className="rounded-2xl bg-stone-50 px-3 py-2 text-sm" key={item.id}><div className="flex justify-between gap-3"><p className="font-medium">{item.title}</p><span className="text-xs text-stone-500">{item.readAt ? 'Okundu' : 'Yeni'}</span></div><p className="mt-1 text-stone-600">{item.body}</p><p className="mt-1 text-xs text-stone-500">{new Date(item.createdAt).toLocaleString('tr-TR')}</p></div>) : <p className="text-sm text-stone-600">Henüz bildiriminiz yok.</p>}</div></div>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Son siparişler</h2><Link className="text-sm font-medium text-amber-800" href="/siparisler">Tümünü gör</Link></div><div className="mt-4 space-y-3">{recentOrders.length ? recentOrders.map(order => <Link className="block rounded-2xl border px-4 py-3 hover:bg-amber-50" href={`/siparisler/${order.id}`} key={order.id}><div className="flex justify-between gap-3"><span className="font-medium">{order.orderNumber}</span><span>{formatTry(order.grandTotal)}</span></div><p className="mt-1 text-sm text-stone-600">{statusLabel(order.status)} · {paymentStatusLabel(order.payments?.[0]?.status)}</p></Link>) : <p className="text-sm text-stone-600">Henüz siparişiniz yok.</p>}</div></div>
      <div className="rounded-[2rem] border border-amber-200/70 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Yorumlarım</h2><div className="mt-4 space-y-3">{recentReviews.length ? recentReviews.map(review => <div className="rounded-2xl border px-4 py-3 text-sm" key={review.id}><div className="flex justify-between gap-3"><Link className="font-medium text-stone-950 hover:text-amber-800" href={review.product?.slug ? `/urun/${review.product.slug}` : '#'}>{review.product?.name ?? 'Ürün'}</Link><span>{reviewStatus(review.status)}</span></div><p className="mt-1 text-stone-600">{review.rating}/5 {review.comment ? `· ${review.comment}` : ''}</p><p className="mt-1 text-xs text-stone-500">{new Date(review.createdAt).toLocaleDateString('tr-TR')}</p></div>) : <p className="text-sm text-stone-600">Henüz yorumunuz yok.</p>}</div></div>
    </section>
  </main>;
}
