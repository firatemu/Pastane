export type OrderStatus='NEW'|'PAYMENT_PENDING'|'CONFIRMED'|'PREPARING'|'READY'|'ASSIGNED_TO_COURIER'|'OUT_FOR_DELIVERY'|'DELIVERED'|'DELIVERY_FAILED'|'CANCELLED';
export interface OrderListItem{ id:string; orderNumber:string; createdAt:string; scheduledAt:string|null; deliveryType:'HOME_DELIVERY'|'PICKUP'; status:OrderStatus; grandTotal:string; user:{id:string;firstName:string;lastName:string;phone:string}; payments:Array<{status:string}>; delivery:null|{courier:null|{id:string;user:{firstName:string;lastName:string;phone:string}}}; }
export interface OrderDetail extends OrderListItem{ items:Array<{id:string;productNameSnapshot:string;quantity:number;unitPriceSnapshot:string;options:Array<{optionNameSnapshot:string;priceModifierSnapshot:string}>}>; statusHistory:Array<{id:string;status:OrderStatus;note:string|null;createdAt:string}>; pickupStore:null|{name:string}; addressSnapshot:unknown; note:string|null; subtotal?:string; deliveryFee?:string; serviceFee?:string; loyaltyDiscount?:string; loyaltyPointsUsed?:number; }
export interface Courier{
  id:string;
  status:string;
  vehicle:string|null;
  deletedAt?:string|null;
  user:{firstName:string;lastName:string;phone:string;email:string|null;status?:string};
  _count?:{deliveries:number};
}
export interface PendingReview{ id:string; rating:number; comment:string|null; createdAt:string; user:{firstName:string;lastName:string}; product:{name:string}; }
export interface DashboardSummary{ awaitingAction:number; inPreparation:number; readyForAssignment:number; unpublishedProducts:number; pendingReviews:number; }
export interface SalesSummary{ orderCount:number; grossSales:string; }
export interface ProductSummary { productNameSnapshot: string; quantity: number; }

export interface AuditLogRow {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  oldValues?: unknown;
  newValues?: unknown;
}

export interface SettingRow {
  id: string;
  key: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  value: string;
  status: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LoyaltySettingRow {
  id: string;
  earnRate: string;
  pointValue: string;
  minimumRedeem: number;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: string;
  isPhoneVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
  role: { name: string };
  courier?: {
    id: string;
    status: string;
    deletedAt?: string | null;
    _count?: { deliveries: number };
  } | null;
}

export interface AdminRoleRow {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ permission: { code: string } }>;
}

export interface AdminPermissionRow {
  id: string;
  code: string;
  description: string | null;
}

export interface ManagementRoleRow {
  id: string;
  name: string;
  description: string | null;
  editable: boolean;
  permissionIds: string[];
}

export interface PermissionsManagementResponse {
  permissions: AdminPermissionRow[];
  roles: ManagementRoleRow[];
}

export interface CustomerListRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: string;
  isPhoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
  defaultAddress: {
    id: string;
    title: string;
    city: string;
    district: string;
  } | null;
  loyalty: {
    id: string;
    points: number;
    qrCode: string;
  } | null;
  metrics: {
    orderCount: number;
    lifetimeSpent: string;
    lastOrderAt: string | null;
  };
}

export interface CustomersListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: {
    activeCount: number;
    inactiveCount: number;
    bannedCount: number;
    withOrdersCount: number;
    loyaltyCount: number;
  };
}

export interface CustomerDetailAddress {
  id: string;
  title: string;
  city: string;
  district: string;
  neighborhood: string | null;
  fullAddress: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  directions: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetailNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface CustomerDetailReview {
  id: string;
  rating: number;
  comment: string | null;
  status: string;
  rejectedReason: string | null;
  createdAt: string;
  product: { id: string; name: string };
  orderItem: { orderId: string; productNameSnapshot: string };
}

export interface CustomerDetailOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  scheduledAt: string | null;
  deliveryType: string;
  status: string;
  grandTotal: string;
  note: string | null;
  _count: { items: number };
  payments: Array<{
    id: string;
    status: string;
    amount: string;
    providerStatus: string | null;
    createdAt: string;
  }>;
  delivery: null | {
    status: string;
    courier: null | { user: { firstName: string; lastName: string } };
  };
}

export interface CustomerDetail {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    status: string;
    isPhoneVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    totalOrders: number;
    deliveredOrders: number;
    lifetimeSpent: string;
    lastOrderAt: string | null;
    loyaltyPoints: number;
    addressCount: number;
    reviewCount: number;
    unreadNotificationsCount: number;
  };
  addresses: CustomerDetailAddress[];
  loyaltyAccount: null | {
    id: string;
    points: number;
    qrCode: string;
    createdAt: string;
    updatedAt: string;
    movements: Array<{
      id: string;
      type: string;
      points: number;
      balanceAfter: number;
      note: string | null;
      createdAt: string;
    }>;
  };
  notifications: CustomerDetailNotification[];
  reviews: CustomerDetailReview[];
  recentOrders: CustomerDetailOrder[];
}
