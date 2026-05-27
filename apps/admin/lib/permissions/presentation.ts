import type { AdminRole } from '../auth/types';

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Sistem Yöneticisi',
  ORDER_OPERATOR: 'Operasyon Sorumlusu',
  PRODUCT_MANAGER: 'Ürün Yöneticisi',
  COURIER: 'Kurye',
  CUSTOMER: 'Müşteri',
};

export const ROLE_ORDER: readonly AdminRole[] = [
  'ADMIN',
  'ORDER_OPERATOR',
  'PRODUCT_MANAGER',
  'COURIER',
  'CUSTOMER',
];

export const ROLE_HINTS: Record<string, string> = {
  ADMIN: 'Tüm yönetim paneli ve sistem ayarlarına tam erişime sahiptir.',
  ORDER_OPERATOR: 'Sipariş akışını, müşteri operasyonunu ve saha koordinasyonunu yürütür.',
  PRODUCT_MANAGER: 'Katalog, ürün içeriği, medya ve kampanya operasyonlarını yönetir.',
  COURIER: 'Kendi teslimatlarını görüntüler ve teslimat durumlarını günceller.',
  CUSTOMER: 'Müşteri uygulamasında sipariş, ödeme, adres ve sadakat işlemlerini yürütür.',
};

const MODULE_LABELS: Record<string, string> = {
  addresses: 'Adresler',
  allergens: 'Alerjenler',
  audit: 'Denetim',
  banners: 'Bannerlar',
  campaigns: 'Kampanyalar',
  cart: 'Sepet',
  categories: 'Kategoriler',
  couriers: 'Kuryeler',
  customers: 'Müşteriler',
  deliveries: 'Teslimatlar',
  loyalty: 'Sadakat',
  media: 'Medya',
  notifications: 'Bildirimler',
  orders: 'Siparişler',
  payments: 'Ödemeler',
  permissions: 'İzinler',
  productUnits: 'Ürün birimleri',
  products: 'Ürünler',
  reports: 'Raporlar',
  reviews: 'Yorumlar',
  roles: 'Roller',
  settings: 'Ayarlar',
  users: 'Kullanıcılar',
};

const ACTION_LABELS: Record<string, string> = {
  assignCourier: 'Kurye atama',
  cancel: 'İptal',
  changeStatus: 'Durum değiştirme',
  couriers: 'Kurye raporları',
  create: 'Oluşturma',
  customers: 'Müşteri raporları',
  delete: 'Silme',
  initiate: 'Başlatma',
  loyalty: 'Sadakat raporları',
  manage: 'Yönetim',
  manageAllergens: 'Alerjen yönetimi',
  manageImages: 'Görsel yönetimi',
  manageOptions: 'Seçenek yönetimi',
  manageOwn: 'Kendi kayıtlarını yönetme',
  manageSettings: 'Ayar yönetimi',
  moderate: 'Moderasyon',
  performance: 'Performans',
  products: 'Ürün raporları',
  redeem: 'Puan kullandırma',
  refund: 'İade',
  reorder: 'Sıralama',
  sales: 'Satış raporları',
  scan: 'QR puan işlemi',
  send: 'Gönderim',
  update: 'Güncelleme',
  updateOwn: 'Kendi teslimatını güncelleme',
  updateStatus: 'Durum güncelleme',
  upload: 'Yükleme',
  view: 'Görüntüleme',
  viewAll: 'Tüm kayıtları görüntüleme',
  viewOwn: 'Kendi kayıtlarını görüntüleme',
  viewReports: 'Rapor görüntüleme',
};

export function roleLabel(roleName: string): string {
  return ROLE_LABELS[roleName] ?? roleName;
}

export function roleHint(roleName: string): string {
  return ROLE_HINTS[roleName] ?? 'Bu rol için erişim kapsamı bu sayfadan yönetilir.';
}

export function roleSortIndex(roleName: string): number {
  const index = ROLE_ORDER.findIndex((option) => option === roleName);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function roleIcon(roleName: string): string {
  const icons: Record<string, string> = {
    ADMIN: 'admin_panel_settings',
    ORDER_OPERATOR: 'support_agent',
    PRODUCT_MANAGER: 'inventory_2',
    COURIER: 'local_shipping',
    CUSTOMER: 'person',
  };

  return icons[roleName] ?? 'badge';
}

export function permissionModuleName(code: string): string {
  return code.split('.')[0] ?? code;
}

export function permissionActionName(code: string): string {
  return code.split('.')[1] ?? '';
}

export function moduleLabel(moduleName: string): string {
  return MODULE_LABELS[moduleName] ?? moduleName;
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function permissionLabel(code: string): string {
  return `${moduleLabel(permissionModuleName(code))} - ${actionLabel(permissionActionName(code))}`;
}

export function moduleIcon(moduleName: string): string {
  const icons: Record<string, string> = {
    addresses: 'location_on',
    allergens: 'no_meals',
    audit: 'history',
    banners: 'view_carousel',
    campaigns: 'campaign',
    cart: 'shopping_cart',
    categories: 'category',
    couriers: 'electric_bike',
    customers: 'group_add',
    deliveries: 'local_shipping',
    loyalty: 'card_membership',
    media: 'perm_media',
    notifications: 'notifications_active',
    orders: 'shopping_bag',
    payments: 'payments',
    permissions: 'lock_person',
    productUnits: 'straighten',
    products: 'bakery_dining',
    reports: 'bar_chart',
    reviews: 'star_rate',
    roles: 'admin_panel_settings',
    settings: 'settings',
    users: 'group',
  };

  return icons[moduleName] ?? 'tune';
}
