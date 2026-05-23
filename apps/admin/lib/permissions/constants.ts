import type { AdminRole } from '../auth/types';
export const ADMIN_APP_ROLES: readonly AdminRole[] = ['ADMIN', 'ORDER_OPERATOR', 'PRODUCT_MANAGER'];
type Nav = {
  label: string;
  href: string;
  permissions: readonly string[];
  enabled: boolean;
  group?: string;
};
export const NAV_ITEMS: readonly Nav[] = [
  { label: 'Gösterge paneli', href: '/dashboard', permissions: [], enabled: true },
  { label: 'Ürünler', href: '/products', permissions: ['products.view'], enabled: true, group: 'Katalog' },
  { label: 'Kategoriler', href: '/categories', permissions: ['categories.view'], enabled: true, group: 'Katalog' },
  { label: 'Alerjenler', href: '/allergens', permissions: ['allergens.view'], enabled: true, group: 'Katalog' },
  { label: 'Birimler', href: '/product-units', permissions: ['productUnits.view'], enabled: true, group: 'Katalog' },
  { label: 'Ana sayfa bannerları', href: '/banners', permissions: ['banners.view'], enabled: true, group: 'İçerik yönetimi' },
  { label: 'Kampanyalar', href: '/campaigns', permissions: ['campaigns.view'], enabled: true, group: 'İçerik yönetimi' },
  { label: 'Sadakat', href: '/loyalty', permissions: ['loyalty.manageSettings'], enabled: true, group: 'İçerik yönetimi' },
  { label: 'Mağazalar', href: '/stores', permissions: ['settings.update'], enabled: true },
  { label: 'Teslimat Bölgeleri', href: '/delivery-zones', permissions: ['settings.update'], enabled: true },
  { label: 'Sistem ayarları', href: '/settings', permissions: ['settings.view'], enabled: true, group: 'Sistem' },
  { label: 'Bildirim gönder', href: '/notifications', permissions: ['notifications.send'], enabled: true, group: 'Sistem' },
  { label: 'Denetim kayıtları', href: '/audit', permissions: ['audit.view'], enabled: true, group: 'Sistem' },
  { label: 'Kullanıcılar', href: '/users', permissions: ['users.view'], enabled: true, group: 'Sistem' },
  { label: 'Roller', href: '/roles', permissions: ['roles.view'], enabled: true, group: 'Sistem' },
  { label: 'İzinler', href: '/permissions', permissions: ['permissions.view'], enabled: true, group: 'Sistem' },
  { label: 'Siparişler', href: '/orders', permissions: ['orders.viewAll'], enabled: true },
  { label: 'Kurye Atama', href: '/courier-assignment', permissions: ['orders.assignCourier', 'couriers.view'], enabled: true },
  { label: 'Kurye yönetimi', href: '/couriers', permissions: ['couriers.create', 'couriers.update'], enabled: true },
  { label: 'Yorumlar', href: '/reviews', permissions: ['reviews.moderate'], enabled: true },
  { label: 'Raporlar', href: '/reports', permissions: ['reports.sales', 'reports.products'], enabled: true },
] as const;
