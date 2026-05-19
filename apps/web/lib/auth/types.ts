export type AppRole = 'ADMIN' | 'ORDER_OPERATOR' | 'PRODUCT_MANAGER' | 'COURIER' | 'CUSTOMER';

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  isPhoneVerified?: boolean;
  role: { name: AppRole };
}

export interface CustomerSession {
  user: SessionUser;
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    isPhoneVerified?: boolean;
    role: AppRole;
  };
}
