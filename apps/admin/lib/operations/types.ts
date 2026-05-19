export type OrderStatus='NEW'|'PAYMENT_PENDING'|'CONFIRMED'|'PREPARING'|'READY'|'ASSIGNED_TO_COURIER'|'OUT_FOR_DELIVERY'|'DELIVERED'|'DELIVERY_FAILED'|'CANCELLED';
export interface OrderListItem{ id:string; orderNumber:string; createdAt:string; scheduledAt:string|null; deliveryType:'HOME_DELIVERY'|'PICKUP'; status:OrderStatus; grandTotal:string; user:{id:string;firstName:string;lastName:string;phone:string}; payments:Array<{status:string}>; delivery:null|{courier:null|{id:string;user:{firstName:string;lastName:string;phone:string}}}; }
export interface OrderDetail extends OrderListItem{ items:Array<{id:string;productNameSnapshot:string;quantity:number;unitPriceSnapshot:string;options:Array<{optionNameSnapshot:string;priceModifierSnapshot:string}>}>; statusHistory:Array<{id:string;status:OrderStatus;note:string|null;createdAt:string}>; pickupStore:null|{name:string}; addressSnapshot:unknown; note:string|null; }
export interface Courier{
  id:string;
  status:string;
  vehicle:string|null;
  deletedAt?:string|null;
  user:{firstName:string;lastName:string;phone:string;email:string|null;status?:string};
  _count?:{deliveries:number};
}
export interface PendingReview{ id:string; rating:number; comment:string|null; createdAt:string; user:{firstName:string;lastName:string}; product:{name:string}; }
export interface DashboardSummary{ awaitingAction:number; inPreparation:number; readyForAssignment:number; lowStock:number; outOfStock:number; pendingReviews:number; }
export interface SalesSummary{ orderCount:number; grossSales:string; }
export interface ProductSummary { productNameSnapshot: string; quantity: number; }

export interface AuditLogRow {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
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
  role: { name: string };
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
}
