import type { AdminRole } from '../auth/types';
export const ADMIN_APP_ROLES: readonly AdminRole[] = ['ADMIN', 'ORDER_OPERATOR', 'PRODUCT_MANAGER'];
export type AdminNavItem = {
  label: string;
  href: string;
  permissions: readonly string[];
  enabled: boolean;
  group?: string;
};
export const NAV_ITEMS: readonly AdminNavItem[] = [
  // Genel
  { label: 'Gösterge paneli', href: '/dashboard', permissions: [], enabled: true, group: 'Genel' },

  // Sipariş & Operasyon — en kritik akış, üstte
  { label: 'Siparişler', href: '/orders', permissions: ['orders.viewAll'], enabled: true, group: 'Sipariş & Operasyon' },
  { label: 'Kurye Atama', href: '/courier-assignment', permissions: ['orders.assignCourier', 'couriers.view'], enabled: true, group: 'Sipariş & Operasyon' },
  { label: 'Kurye yönetimi', href: '/couriers', permissions: ['couriers.create', 'couriers.update'], enabled: true, group: 'Sipariş & Operasyon' },

  // Katalog — ürün yönetimi
  { label: 'Ürünler', href: '/products', permissions: ['products.view'], enabled: true, group: 'Katalog' },
  { label: 'Kategoriler', href: '/categories', permissions: ['categories.view'], enabled: true, group: 'Katalog' },
  { label: 'Birimler', href: '/product-units', permissions: ['productUnits.view'], enabled: true, group: 'Katalog' },
  { label: 'Alerjenler', href: '/allergens', permissions: ['allergens.view'], enabled: true, group: 'Katalog' },
  { label: 'Media Galeri', href: '/media-gallery', permissions: ['media.view'], enabled: true, group: 'Katalog' },

  // İçerik & Kampanya — pazarlama
  { label: 'Ana sayfa bannerları', href: '/banners', permissions: ['banners.view'], enabled: true, group: 'İçerik & Kampanya' },
  { label: 'Kampanyalar', href: '/campaigns', permissions: ['campaigns.view'], enabled: true, group: 'İçerik & Kampanya' },
  { label: 'Sadakat', href: '/loyalty', permissions: ['loyalty.manageSettings'], enabled: true, group: 'İçerik & Kampanya' },

  // Mağaza & Teslimat — operasyonel
  { label: 'Mağazalar', href: '/stores', permissions: ['settings.update'], enabled: true, group: 'Mağaza & Teslimat' },
  { label: 'Teslimat Bölgeleri', href: '/delivery-zones', permissions: ['settings.update'], enabled: true, group: 'Mağaza & Teslimat' },

  // Müşteri & İletişim — müşteri odaklı
  { label: 'Müşteriler', href: '/customers', permissions: ['customers.view'], enabled: true, group: 'Müşteri & İletişim' },
  { label: 'Yorumlar', href: '/reviews', permissions: ['reviews.moderate'], enabled: true, group: 'Müşteri & İletişim' },
  { label: 'Bildirim gönder', href: '/notifications', permissions: ['notifications.send'], enabled: true, group: 'Müşteri & İletişim' },

  // Analitik
  { label: 'Raporlar', href: '/reports', permissions: ['reports.sales', 'reports.products'], enabled: true, group: 'Analitik' },

  // Sistem — teknik/admin
  { label: 'Personel', href: '/users', permissions: ['users.view'], enabled: true, group: 'Sistem' },
  { label: 'Roller', href: '/roles', permissions: ['roles.view'], enabled: true, group: 'Sistem' },
  { label: 'İzinler', href: '/permissions', permissions: ['permissions.view'], enabled: true, group: 'Sistem' },
  { label: 'Sistem ayarları', href: '/settings', permissions: ['settings.view'], enabled: true, group: 'Sistem' },
  { label: 'Denetim kayıtları', href: '/audit', permissions: ['audit.view'], enabled: true, group: 'Sistem' },
] as const;

export function getNavIcon(href: string): string {
  const icons: Record<string, string> = {
    '/dashboard': 'analytics',
    '/products': 'bakery_dining',
    '/categories': 'category',
    '/allergens': 'no_meals',
    '/product-units': 'straighten',
    '/media-gallery': 'photo_library',
    '/banners': 'image',
    '/campaigns': 'campaign',
    '/loyalty': 'card_membership',
    '/stores': 'storefront',
    '/delivery-zones': 'map',
    '/settings': 'settings',
    '/notifications': 'notifications_active',
    '/audit': 'history',
    '/users': 'group',
    '/customers': 'group_add',
    '/roles': 'admin_panel_settings',
    '/permissions': 'lock_person',
    '/orders': 'shopping_bag',
    '/courier-assignment': 'local_shipping',
    '/couriers': 'electric_bike',
    '/reviews': 'star_rate',
    '/reports': 'bar_chart',
  };

  return icons[href] ?? 'fiber_manual_record';
}
