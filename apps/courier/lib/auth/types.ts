export type AppRole='ADMIN'|'ORDER_OPERATOR'|'PRODUCT_MANAGER'|'COURIER'|'CUSTOMER';
export interface SessionUser { id:string; firstName:string; lastName:string; phone:string; email:string|null; role:{name:AppRole}; }
export interface CourierSession { user:SessionUser; permissions:string[]; }
export interface AuthResponse { accessToken:string; refreshToken:string; user:{id:string;firstName:string;lastName:string;phone:string;email:string|null;role:AppRole}; }
